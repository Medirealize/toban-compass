export type FacilityType = "hospital" | "pharmacy";

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
