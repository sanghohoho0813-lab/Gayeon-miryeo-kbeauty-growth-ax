import type { ProductCategory } from "@/lib/types";

/* 실제 제품 이미지가 없는 동안 사용하는 Premium Cosmetic Placeholder.
   실제 이미지 수령 시 이 컴포넌트만 <Image>로 교체하면 된다. */

const NAVY = "#1d2a44";
const NAVY_DARK = "#141d31";
const GOLD = "#c9a24b";
const GOLD_LIGHT = "#e3c987";
const IVORY = "#f2ede3";
const IVORY_DARK = "#ddd5c4";

function Ampoule() {
  return (
    <svg viewBox="0 0 120 160" className="h-full w-auto drop-shadow-md" aria-hidden>
      <rect x="40" y="8" width="40" height="26" rx="4" fill={GOLD} />
      <rect x="40" y="8" width="40" height="8" rx="4" fill={GOLD_LIGHT} />
      <rect x="52" y="34" width="16" height="10" fill={NAVY_DARK} />
      <rect x="32" y="44" width="56" height="106" rx="10" fill={NAVY} />
      <rect x="38" y="52" width="10" height="88" rx="5" fill="#33415f" opacity="0.85" />
      <rect x="44" y="92" width="32" height="26" rx="2" fill={IVORY} opacity="0.94" />
      <text x="60" y="103" textAnchor="middle" fontSize="7" fill={NAVY} fontFamily="Georgia, serif" letterSpacing="1">
        MIRYEO
      </text>
      <line x1="48" y1="109" x2="72" y2="109" stroke={NAVY} strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

function Essence() {
  return (
    <svg viewBox="0 0 120 160" className="h-full w-auto drop-shadow-md" aria-hidden>
      <rect x="44" y="6" width="32" height="20" rx="3" fill={IVORY_DARK} />
      <rect x="48" y="26" width="24" height="8" fill="#c8bfae" />
      <path d="M36 40 Q36 34 42 34 L78 34 Q84 34 84 40 L84 144 Q84 152 76 152 L44 152 Q36 152 36 144 Z" fill={IVORY} />
      <path d="M40 44 Q40 38 46 38 L52 38 L52 148 L44 148 Q40 148 40 142 Z" fill="#ffffff" opacity="0.6" />
      <rect x="44" y="86" width="32" height="30" rx="1.5" fill="#ffffff" stroke={IVORY_DARK} strokeWidth="0.8" />
      <text x="60" y="98" textAnchor="middle" fontSize="7" fill={NAVY} fontFamily="Georgia, serif" letterSpacing="1">
        MIRYEO
      </text>
      <line x1="49" y1="104" x2="71" y2="104" stroke={NAVY} strokeWidth="0.6" opacity="0.45" />
    </svg>
  );
}

function Jar() {
  return (
    <svg viewBox="0 0 140 160" className="h-full w-auto drop-shadow-md" aria-hidden>
      <ellipse cx="70" cy="52" rx="44" ry="10" fill={GOLD_LIGHT} />
      <rect x="26" y="40" width="88" height="14" rx="7" fill={GOLD} />
      <path d="M28 54 L112 54 L108 138 Q107 150 94 150 L46 150 Q33 150 32 138 Z" fill={NAVY} />
      <path d="M34 60 L48 60 L46 144 L40 144 Q36 143 36 136 Z" fill="#33415f" opacity="0.8" />
      <rect x="48" y="88" width="44" height="30" rx="2" fill={IVORY} opacity="0.95" />
      <text x="70" y="101" textAnchor="middle" fontSize="8" fill={NAVY} fontFamily="Georgia, serif" letterSpacing="1">
        MIRYEO
      </text>
      <line x1="55" y1="108" x2="85" y2="108" stroke={NAVY} strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

function Toner() {
  return (
    <svg viewBox="0 0 110 160" className="h-full w-auto drop-shadow-md" aria-hidden>
      <rect x="40" y="6" width="30" height="18" rx="3" fill={NAVY_DARK} />
      <rect x="36" y="24" width="38" height="128" rx="9" fill={IVORY} />
      <rect x="41" y="30" width="9" height="116" rx="4.5" fill="#ffffff" opacity="0.65" />
      <rect x="42" y="76" width="26" height="34" rx="1.5" fill="#ffffff" stroke={IVORY_DARK} strokeWidth="0.8" />
      <text x="55" y="90" textAnchor="middle" fontSize="6.5" fill={NAVY} fontFamily="Georgia, serif" letterSpacing="1">
        MIRYEO
      </text>
      <line x1="46" y1="96" x2="64" y2="96" stroke={NAVY} strokeWidth="0.5" opacity="0.45" />
    </svg>
  );
}

function Tube({ light = false }: { light?: boolean }) {
  const body = light ? IVORY : NAVY;
  const label = light ? NAVY : IVORY;
  return (
    <svg viewBox="0 0 110 160" className="h-full w-auto drop-shadow-md" aria-hidden>
      <rect x="42" y="8" width="26" height="16" rx="3" fill={light ? IVORY_DARK : GOLD} />
      <path d="M40 24 L70 24 L76 60 L76 140 Q76 152 64 152 L46 152 Q34 152 34 140 L34 60 Z" fill={body} />
      <path d="M38 62 L48 62 L48 148 L44 148 Q38 147 38 140 Z" fill={light ? "#ffffff" : "#33415f"} opacity="0.6" />
      <rect x="41" y="84" width="28" height="30" rx="2" fill={label} opacity={light ? 1 : 0.95} />
      <text x="55" y="97" textAnchor="middle" fontSize="6.5" fill={light ? IVORY : NAVY} fontFamily="Georgia, serif" letterSpacing="1">
        MIRYEO
      </text>
      <line x1="46" y1="103" x2="64" y2="103" stroke={light ? IVORY : NAVY} strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

function Mask() {
  return (
    <svg viewBox="0 0 130 160" className="h-full w-auto drop-shadow-md" aria-hidden>
      <path d="M20 30 Q20 22 28 22 L102 22 Q110 22 110 30 L110 132 Q110 140 102 140 L28 140 Q20 140 20 132 Z" fill={IVORY} />
      <path d="M20 30 Q20 22 28 22 L102 22 Q110 22 110 30 L110 40 L20 40 Z" fill={IVORY_DARK} />
      <rect x="34" y="62" width="62" height="44" rx="3" fill="#ffffff" stroke={IVORY_DARK} strokeWidth="1" />
      <text x="65" y="82" textAnchor="middle" fontSize="9" fill={NAVY} fontFamily="Georgia, serif" letterSpacing="1.5">
        MIRYEO
      </text>
      <line x1="44" y1="90" x2="86" y2="90" stroke={NAVY} strokeWidth="0.7" opacity="0.5" />
      <circle cx="65" cy="120" r="6" fill="none" stroke={GOLD} strokeWidth="1.2" />
    </svg>
  );
}

const visualByCategory: Record<ProductCategory, () => React.ReactNode> = {
  "에센스/앰플": Ampoule,
  크림: Jar,
  "토너/미스트": Toner,
  클렌저: () => <Tube />,
  선케어: () => <Tube light />,
  마스크: Mask,
};

/** 라인별로 앰플/에센스 형태를 다르게 보여 시각적 다양성 확보 */
export function ProductVisual({
  category,
  variant = 0,
  className = "",
}: {
  category: ProductCategory;
  variant?: number;
  className?: string;
}) {
  let node: React.ReactNode;
  if (category === "에센스/앰플" && variant % 2 === 1) node = <Essence />;
  else node = visualByCategory[category]();
  return (
    <div className={`flex items-center justify-center ${className}`} role="img" aria-label="제품 이미지 준비 중">
      {node}
    </div>
  );
}
