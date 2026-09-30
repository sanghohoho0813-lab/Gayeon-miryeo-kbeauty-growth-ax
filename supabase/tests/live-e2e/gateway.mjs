// 로컬 Live 검증용 게이트웨이 — 개발·QA 전용 (운영 사용 금지)
//   /auth/v1/*  → Supabase Auth(GoTrue) 프록시 (소스에서 빌드한 실제 서버)
//   /rest/v1/*  → PostgREST 호환 최소 구현: 이 앱이 supabase-js로 호출하는 범위만
//                 (select/insert/upsert/update/delete, eq·neq·gt·gte·lt·lte·is·in, order, limit, rpc)
//   요청마다 JWT(HS256)를 검증하고 트랜잭션 안에서 role + request.jwt.claims를 설정 → 실제 RLS가 적용된다.
//   SMTP 수신(메일 발송 대신 보관) + GET /__mail 로 최근 메일 확인 (초대 링크 검증용)
import http from "node:http";
import net from "node:net";
import crypto from "node:crypto";
import pg from "pg";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 2500);
const GOTRUE = process.env.GOTRUE_URL ?? "http://127.0.0.1:9999";
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET required");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

// ---------- JWT ----------
const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
function verifyJwt(token) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("malformed jwt");
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest());
  if (sig.length !== s.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(s))) throw new Error("bad signature");
  const claims = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  if (claims.exp && claims.exp * 1000 < Date.now()) throw new Error("JWT expired");
  return claims;
}

// ---------- 스키마 메타 (PK, 컬럼) ----------
let meta = null;
async function loadMeta() {
  const cols = await pool.query(`select table_name, column_name from information_schema.columns where table_schema = 'public'`);
  const pks = await pool.query(`select tc.table_name, kcu.column_name from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY' order by kcu.ordinal_position`);
  meta = { cols: {}, pk: {} };
  for (const r of cols.rows) (meta.cols[r.table_name] ??= new Set()).add(r.column_name);
  for (const r of pks.rows) (meta.pk[r.table_name] ??= []).push(r.column_name);
}
const q = (id) => `"${String(id).replace(/"/g, '""')}"`;
function col(table, c) {
  if (!meta.cols[table]?.has(c)) throw httpErr(400, "42703", `column ${table}.${c} does not exist`);
  return q(c);
}
function httpErr(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

// ---------- 쿼리 파싱 ----------
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function buildWhere(table, params, args) {
  const parts = [];
  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    const m = raw.match(/^(not\.)?(eq|neq|gt|gte|lt|lte|is|in|like|ilike)\.(.*)$/s);
    if (!m) throw httpErr(400, "PGRST100", `unsupported filter ${key}=${raw}`);
    const [, not, op, val] = m;
    const c = col(table, key);
    let expr;
    if (op === "is") expr = `${c} is ${val === "null" ? "null" : val === "true" ? "true" : val === "false" ? "false" : "null"}`;
    else if (op === "in") {
      const list = val.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, ""));
      args.push(list);
      expr = `${c}::text = any($${args.length}::text[])`;
    } else {
      args.push(val);
      const sqlOp = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" }[op];
      expr = `${c} ${sqlOp} $${args.length}`;
    }
    parts.push(not ? `not (${expr})` : expr);
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}
function selectList(table, s) {
  if (!s || s === "*") return "*";
  return s.split(",").map((x) => x.trim()).filter(Boolean).map((c) => col(table, c)).join(", ");
}
function orderBy(table, o) {
  if (!o) return "";
  return " order by " + o.split(",").map((part) => {
    const [c, dir, nulls] = part.split(".");
    return `${col(table, c)} ${dir === "desc" ? "desc" : "asc"}${nulls === "nullsfirst" ? " nulls first" : nulls === "nullslast" ? " nulls last" : ""}`;
  }).join(", ");
}

// ---------- 실행 (role + claims) ----------
async function withRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('role', $1, true), set_config('request.jwt.claims', $2, true), set_config('request.jwt.claim.sub', $3, true), set_config('request.jwt.claim.role', $1, true)", [claims.role, JSON.stringify(claims), claims.sub ?? ""]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

function pgToHttp(e, role) {
  if (e.status) return e;
  const map = { "42501": role === "anon" ? 401 : 403, "23505": 409, "23503": 409, "23514": 400, "23502": 400, "22P02": 400, "P0001": 400, "42P01": 404, "42883": 404 };
  return Object.assign(new Error(e.message), { status: map[e.code] ?? 400, code: e.code, details: e.detail ?? null, hint: e.hint ?? null });
}

async function handleRest(req, res, url, body) {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? req.headers.apikey;
  if (!auth) throw httpErr(401, "PGRST301", "missing JWT");
  let claims;
  try { claims = verifyJwt(auth); } catch (e) { throw httpErr(401, "PGRST301", e.message); }
  if (!["anon", "authenticated", "service_role"].includes(claims.role)) throw httpErr(401, "PGRST301", "bad role");

  const path = url.pathname.replace(/^\/rest\/v1\/?/, "");
  const params = [...url.searchParams.entries()];
  const sp = url.searchParams;
  const prefer = String(req.headers.prefer ?? "");
  const wantObject = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
  const returning = prefer.includes("return=representation");

  try {
    const rows = await withRole(claims, async (c) => {
      if (path.startsWith("rpc/")) {
        const fn = path.slice(4);
        if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw httpErr(404, "PGRST202", "bad function");
        const argsObj = body ? JSON.parse(body) : {};
        const names = Object.keys(argsObj);
        const r = await c.query(`select public.${q(fn)}(${names.map((n, i) => `${q(n)} => $${i + 1}`).join(", ")}) as r`, names.map((n) => argsObj[n]));
        return { scalar: r.rows[0]?.r ?? null };
      }
      const table = path;
      if (!meta.cols[table]) throw httpErr(404, "42P01", `relation public.${table} does not exist`);
      const args = [];
      if (req.method === "GET" || req.method === "HEAD") {
        const limit = sp.get("limit") ? ` limit ${Number(sp.get("limit"))}` : "";
        const offset = sp.get("offset") ? ` offset ${Number(sp.get("offset"))}` : "";
        const sql = `select ${selectList(table, sp.get("select"))} from public.${q(table)}${buildWhere(table, params, args)}${orderBy(table, sp.get("order"))}${limit}${offset}`;
        return (await c.query(sql, args)).rows;
      }
      if (req.method === "POST") {
        const payload = JSON.parse(body || "[]");
        const list = Array.isArray(payload) ? payload : [payload];
        if (list.length === 0) return [];
        const keys = [...new Set(list.flatMap((o) => Object.keys(o)))];
        keys.forEach((k) => col(table, k));
        args.push(JSON.stringify(list));
        let sql = `insert into public.${q(table)} (${keys.map(q).join(", ")}) select ${keys.map(q).join(", ")} from json_populate_recordset(null::public.${q(table)}, $1)`;
        const merge = prefer.includes("resolution=merge-duplicates");
        const ignore = prefer.includes("resolution=ignore-duplicates");
        if (merge || ignore) {
          const target = (sp.get("on_conflict")?.split(",") ?? meta.pk[table] ?? []).map((k) => col(table, k.trim()));
          const updates = keys.filter((k) => !target.includes(q(k)));
          sql += ` on conflict (${target.join(", ")}) ` + (ignore || updates.length === 0 ? "do nothing" : `do update set ${updates.map((k) => `${q(k)} = excluded.${q(k)}`).join(", ")}`);
        }
        // PostgREST와 동일: return=representation(또는 단건 요청)일 때만 RETURNING → 이때만 SELECT 정책이 필요
        if (returning || wantObject) sql += ` returning ${selectList(table, sp.get("select"))}`;
        const r = await c.query(sql, args);
        return returning || wantObject ? r.rows : [];
      }
      if (req.method === "PATCH") {
        const patch = JSON.parse(body || "{}");
        const keys = Object.keys(patch);
        keys.forEach((k) => col(table, k));
        args.push(JSON.stringify(patch));
        const where = buildWhere(table, params, args);
        const set = keys.length === 1 ? `${q(keys[0])} = (select ${q(keys[0])} from json_populate_record(null::public.${q(table)}, $1))` : `(${keys.map(q).join(", ")}) = (select ${keys.map(q).join(", ")} from json_populate_record(null::public.${q(table)}, $1))`;
        const sql = `update public.${q(table)} set ${set}${where}${returning || wantObject ? ` returning ${selectList(table, sp.get("select"))}` : ""}`;
        const r = await c.query(sql, args);
        return returning || wantObject ? r.rows : [];
      }
      if (req.method === "DELETE") {
        const sql = `delete from public.${q(table)}${buildWhere(table, params, args)}${returning || wantObject ? ` returning ${selectList(table, sp.get("select"))}` : ""}`;
        const r = await c.query(sql, args);
        return returning || wantObject ? r.rows : [];
      }
      throw httpErr(405, "PGRST", "method not allowed");
    });

    if (rows && "scalar" in rows) return send(res, 200, rows.scalar);
    if (wantObject) {
      if (rows.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows`, hint: null });
      return send(res, req.method === "POST" ? 201 : 200, rows[0]);
    }
    if (req.method !== "GET" && !returning) return send(res, req.method === "POST" ? 201 : 204, null);
    return send(res, req.method === "POST" ? 201 : 200, rows);
  } catch (e) {
    const h = pgToHttp(e, claims.role);
    return send(res, h.status, { code: h.code ?? "PGRST", message: h.message, details: h.details ?? null, hint: h.hint ?? null });
  }
}

function cors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, x-client-info, x-supabase-api-version, range");
  res.setHeader("access-control-allow-methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader("access-control-expose-headers", "content-range, x-total-count");
}
function send(res, status, body) {
  cors(res);
  if (body === null || status === 204) { res.writeHead(status); return res.end(); }
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

// ---------- SMTP sink ----------
const mails = [];
net.createServer((sock) => {
  let data = false, buf = "", cur = { to: [], body: "" };
  sock.write("220 local-sink ESMTP\r\n");
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (data) {
        if (line === ".") { data = false; mails.push({ ...cur, at: new Date().toISOString() }); cur = { to: [], body: "" }; sock.write("250 OK\r\n"); }
        else cur.body += (line.startsWith("..") ? line.slice(1) : line) + "\n";
        continue;
      }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") sock.write("250 local-sink\r\n");
      else if (cmd === "MAIL") sock.write("250 OK\r\n");
      else if (cmd === "RCPT") { cur.to.push(line.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, "")); sock.write("250 OK\r\n"); }
      else if (cmd === "DATA") { data = true; sock.write("354 End data with <CR><LF>.<CR><LF>\r\n"); }
      else if (cmd === "QUIT") { sock.write("221 Bye\r\n"); sock.end(); }
      else sock.write("250 OK\r\n");
    }
  });
}).listen(SMTP_PORT, "127.0.0.1");

// ---------- HTTP ----------
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); return res.end(); }
  if (url.pathname === "/__mail") return send(res, 200, mails.slice(-20));
  if (url.pathname === "/__reload") { await loadMeta(); return send(res, 200, { ok: true }); }
  if (url.pathname.startsWith("/auth/v1/")) {
    const target = new URL(url.pathname.replace(/^\/auth\/v1/, "") + url.search, GOTRUE);
    const headers = { ...req.headers, host: target.host };
    const p = http.request(target, { method: req.method, headers }, (up) => {
      cors(res);
      const h = { ...up.headers };
      delete h["access-control-allow-origin"];
      res.writeHead(up.statusCode ?? 502, h);
      up.pipe(res);
    });
    p.on("error", (e) => send(res, 502, { message: e.message }));
    return req.pipe(p);
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => handleRest(req, res, url, body).catch((e) => send(res, 500, { message: e.message })));
    return;
  }
  send(res, 404, { message: "not found" });
}).listen(PORT, "127.0.0.1", async () => {
  await loadMeta();
  console.log(`gateway :${PORT} (rest + auth proxy), smtp sink :${SMTP_PORT}`);
});

export function signJwt(claims) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify(claims));
  return `${h}.${p}.${b64url(crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest())}`;
}
