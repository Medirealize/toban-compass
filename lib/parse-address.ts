import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { normalizeAddressText } from "./address-text";
import type { Municipality, Prefecture } from "./types";

const DATA_DIR = path.join(process.cwd(), "public/data/locations");

interface MunicipalityEntry {
  lat: number;
  lng: number;
  name: string;
  prefName: string;
}

// ── キャッシュ ────────────────────────────────────────────────────────────────
let prefecturesCache: Prefecture[] | null = null;
const municipalitiesByPrefCache = new Map<string, Municipality[]>();
let allMunicipalitiesCache: MunicipalityEntry[] | null = null;
// 進行中のPromiseを保持してダブルロードを防ぐ
let allMunicipalitiesLoading: Promise<MunicipalityEntry[]> | null = null;

// ── ファイルロード ──────────────────────────────────────────────────────────

export async function loadPrefecturesFromDisk(): Promise<Prefecture[]> {
  if (prefecturesCache) return prefecturesCache;
  const raw = await readFile(path.join(DATA_DIR, "prefectures.json"), "utf8");
  prefecturesCache = JSON.parse(raw) as Prefecture[];
  return prefecturesCache;
}

export async function loadMunicipalitiesFromDisk(
  prefectureId: string
): Promise<Municipality[]> {
  const cached = municipalitiesByPrefCache.get(prefectureId);
  if (cached) return cached;
  const raw = await readFile(path.join(DATA_DIR, `${prefectureId}.json`), "utf8");
  const data = JSON.parse(raw) as Municipality[];
  municipalitiesByPrefCache.set(prefectureId, data);
  return data;
}

// ── 全国市区町村インデックス（並列ロード） ────────────────────────────────

async function getAllMunicipalities(): Promise<MunicipalityEntry[]> {
  if (allMunicipalitiesCache) return allMunicipalitiesCache;
  // 複数の並列呼び出しが同時に来てもロードは1回だけ
  if (allMunicipalitiesLoading) return allMunicipalitiesLoading;

  allMunicipalitiesLoading = (async () => {
    const prefectures = await loadPrefecturesFromDisk();
    // 47都道府県を並列ロード（逐次→並列で大幅高速化）
    const chunks = await Promise.all(
      prefectures.map((pref) =>
        loadMunicipalitiesFromDisk(pref.id).then((muns) =>
          muns.map((m) => ({
            lat: m.lat,
            lng: m.lng,
            name: m.name,
            prefName: pref.name,
          }))
        )
      )
    );
    // 長い名前を先に置くことで「宮崎市」が「崎市」より先にマッチ
    allMunicipalitiesCache = chunks
      .flat()
      .sort((a, b) => b.name.length - a.name.length);
    return allMunicipalitiesCache;
  })();

  return allMunicipalitiesLoading;
}

/** 都道府県名なしでも市区町村名から座標を引く */
export async function geocodeByMunicipalityName(
  text: string
): Promise<{ lat: number; lng: number } | null> {
  const normalized = normalizeAddressText(text);
  if (!normalized) return null;
  const all = await getAllMunicipalities();
  const match = all.find((m) => m.name.length >= 2 && normalized.includes(m.name));
  return match ? { lat: match.lat, lng: match.lng } : null;
}

// ── 住所パース ──────────────────────────────────────────────────────────────

export interface ParsedAddressParts {
  prefectureName: string;
  municipalityName: string;
  townName: string;
}

/** AI未使用時のルールベース住所分解 */
export async function parseAddressLocally(
  rawAddress: string
): Promise<ParsedAddressParts | null> {
  const normalized = normalizeAddressText(rawAddress);
  if (!normalized) return null;

  const prefectures = await loadPrefecturesFromDisk();
  const prefecture = prefectures.find((p) => normalized.includes(p.name));
  if (!prefecture) return null;

  const municipalities = await loadMunicipalitiesFromDisk(prefecture.id);
  const municipality = [...municipalities]
    .sort((a, b) => b.name.length - a.name.length)
    .find((m) => normalized.includes(m.name));
  if (!municipality) return null;

  const afterCity = normalized.slice(
    normalized.indexOf(municipality.name) + municipality.name.length
  );
  return {
    prefectureName: prefecture.name,
    municipalityName: municipality.name,
    townName: afterCity || municipality.name,
  };
}

export function toUserFriendlyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "AIの利用上限に達したため、ルールベースで解析しました。";
  }
  if (message.includes("403") || message.toLowerCase().includes("denied")) {
    return "AI APIへのアクセスが制限されているため、ルールベースで解析しました。";
  }
  if (message.includes("GEMINI_API_KEY")) {
    return "AI APIキー未設定のため、ルールベースで解析しました。";
  }
  return "AI解析に失敗したため、ルールベースで解析しました。";
}
