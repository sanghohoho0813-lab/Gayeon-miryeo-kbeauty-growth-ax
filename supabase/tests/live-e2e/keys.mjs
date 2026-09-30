// anon / service_role 키 생성 (로컬 검증용 HS256, 10년 만료)
import crypto from "node:crypto";
const SECRET = process.env.JWT_SECRET;
const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const sign = (claims) => {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify(claims));
  return `${h}.${p}.${b64url(crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest())}`;
};
const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 86400;
console.log(`ANON_KEY=${sign({ role: "anon", iss: "local", exp })}`);
console.log(`SERVICE_ROLE_KEY=${sign({ role: "service_role", iss: "local", exp })}`);
