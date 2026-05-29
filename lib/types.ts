// 既知タイプ + 任意文字列を許容（体育館・公民館など新しい種別も通る）
export type FacilityType = string;

/** 都道府県（一覧用） */
export interface Prefecture {
  id: string;
  name: string;
}

/** 市区町村（基準座標付き） */
export interface Municipality {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/** 患者の自宅（選択確定後の起点） */
export interface HomeLocation {
  prefectureId: string;
  prefectureName: string;
  municipalityId: string;
  municipalityName: string;
  townName: string;
  lat: number;
  lng: number;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  region: string;
  type: FacilityType;
  lat: number;
  lng: number;
  hours: string;
}

export interface FacilityWithDistance extends Facility {
  distanceKm: number;
  bearingDeg: number;
}

export interface ParsedScheduleResult {
  facilities: Facility[];
  parsedAt: string;
  source: string;
}

export function formatHomeLocationLabel(loc: HomeLocation): string {
  return `${loc.prefectureName}${loc.municipalityName}${loc.townName}`;
}

export function formatHomeLocationShort(loc: HomeLocation): string {
  return loc.townName || loc.municipalityName;
}

// ── 施設タイプ表示設定 ─────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  badge: string;   // Tailwind classes for badge
  dot: string;     // hex color for radar dot
}

const KNOWN_TYPES: Record<string, TypeConfig> = {
  hospital:         { label: "病院",     badge: "bg-blue-100 text-blue-800",    dot: "#2563eb" },
  pharmacy:         { label: "薬局",     badge: "bg-green-100 text-green-800",  dot: "#16a34a" },
  gym:              { label: "体育館",   badge: "bg-orange-100 text-orange-800",dot: "#ea580c" },
  school:           { label: "学校",     badge: "bg-purple-100 text-purple-800",dot: "#7c3aed" },
  community_center: { label: "公民館",   badge: "bg-teal-100 text-teal-800",    dot: "#0891b2" },
  park:             { label: "公園",     badge: "bg-lime-100 text-lime-700",    dot: "#65a30d" },
  shelter:          { label: "避難所",   badge: "bg-red-100 text-red-800",      dot: "#dc2626" },
  hotel:            { label: "ホテル",   badge: "bg-pink-100 text-pink-800",    dot: "#db2777" },
  restaurant:       { label: "飲食店",   badge: "bg-amber-100 text-amber-800",  dot: "#d97706" },
  convenience:      { label: "コンビニ", badge: "bg-yellow-100 text-yellow-800",dot: "#ca8a04" },
  station:          { label: "駅",       badge: "bg-indigo-100 text-indigo-800",dot: "#4f46e5" },
};

export function getFacilityTypeConfig(type: FacilityType): TypeConfig {
  const known = KNOWN_TYPES[type];
  if (known) return known;
  // 未知タイプはそのまま表示
  return { label: type, badge: "bg-slate-100 text-slate-700", dot: "#64748b" };
}
