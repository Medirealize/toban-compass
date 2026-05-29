import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { normalizeAddressText } from "./address-text";
import type { Municipality, Prefecture } from "./types";

const DATA_DIR = path.join(process.cwd(), "public/data/locations");

export interface ParsedAddressParts {
  prefectureName: string;
  municipalityName: string;
  townName: string;
}

export async function loadPrefecturesFromDisk(): Promise<Prefecture[]> {
  const raw = await readFile(path.join(DATA_DIR, "prefectures.json"), "utf8");
  return JSON.parse(raw) as Prefecture[];
}

export async function loadMunicipalitiesFromDisk(
  prefectureId: string
): Promise<Municipality[]> {
  const raw = await readFile(path.join(DATA_DIR, `${prefectureId}.json`), "utf8");
  return JSON.parse(raw) as Municipality[];
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
  const townName = afterCity || municipality.name;

  return {
    prefectureName: prefecture.name,
    municipalityName: municipality.name,
    townName,
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
