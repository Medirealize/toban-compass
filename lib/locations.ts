import type { HomeLocation, Municipality, Prefecture } from "./types";
import { loadTownsByMunicipality } from "./towns";

const DATA_BASE = "/data/locations";

/** デフォルト: 宮崎県宮崎市 */
export const DEFAULT_PREFECTURE_ID = "45";
export const DEFAULT_MUNICIPALITY_ID = "452017";

let prefecturesCache: Prefecture[] | null = null;
const municipalitiesCache = new Map<string, Municipality[]>();

export async function loadPrefectures(): Promise<Prefecture[]> {
  if (prefecturesCache) return prefecturesCache;
  const res = await fetch(`${DATA_BASE}/prefectures.json`);
  if (!res.ok) throw new Error("都道府県データの読み込みに失敗しました");
  const data: Prefecture[] = await res.json();
  prefecturesCache = data;
  return data;
}

export async function loadMunicipalities(
  prefectureId: string
): Promise<Municipality[]> {
  const cached = municipalitiesCache.get(prefectureId);
  if (cached) return cached;

  const res = await fetch(`${DATA_BASE}/${prefectureId}.json`);
  if (!res.ok) throw new Error("市区町村データの読み込みに失敗しました");
  const data: Municipality[] = await res.json();
  municipalitiesCache.set(prefectureId, data);
  return data;
}

export function resolveHomeLocation(
  prefecture: Prefecture,
  municipality: Municipality
): HomeLocation {
  return {
    prefectureId: prefecture.id,
    prefectureName: prefecture.name,
    municipalityId: municipality.id,
    municipalityName: municipality.name,
    townName: municipality.name,
    lat: municipality.lat,
    lng: municipality.lng,
  };
}

export async function getDefaultHomeLocation(): Promise<HomeLocation> {
  const prefectures = await loadPrefectures();
  const prefecture =
    prefectures.find((p) => p.id === DEFAULT_PREFECTURE_ID) ?? prefectures[0];
  const municipalities = await loadMunicipalities(prefecture.id);
  const municipality =
    municipalities.find((m) => m.id === DEFAULT_MUNICIPALITY_ID) ??
    municipalities[0];

  const base = resolveHomeLocation(prefecture, municipality);
  try {
    const towns = await loadTownsByMunicipality(
      prefecture.name,
      municipality.name
    );
    const town = towns[0];
    if (town) {
      return { ...base, townName: town.name, lat: town.lat, lng: town.lng };
    }
  } catch {
    // 町字データ未取得時は市区町村座標を使う
  }
  return base;
}

export async function getDefaultLocationSelection(): Promise<{
  location: HomeLocation;
  townId: string;
}> {
  const location = await getDefaultHomeLocation();
  try {
    const towns = await loadTownsByMunicipality(
      location.prefectureName,
      location.municipalityName
    );
    const town = towns.find((t) => t.name === location.townName) ?? towns[0];
    if (town) {
      return { location, townId: town.id };
    }
  } catch {
    // フォールバック
  }
  return { location, townId: location.municipalityId };
}

export function filterMunicipalities(
  municipalities: Municipality[],
  query: string
): Municipality[] {
  const q = query.trim().toLowerCase();
  if (!q) return municipalities;
  return municipalities.filter((m) => m.name.toLowerCase().includes(q));
}
