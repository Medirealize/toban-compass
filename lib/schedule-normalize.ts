import type { Facility, FacilityType } from "./types";
import {
  loadMunicipalitiesFromDisk,
  loadPrefecturesFromDisk,
  parseAddressLocally,
} from "./parse-address";

function isValidCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value !== 0;
}

export async function geocodeAddressFallback(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const parsed = await parseAddressLocally(address);
  if (!parsed) return null;

  const prefectures = await loadPrefecturesFromDisk();
  const pref = prefectures.find((p) => p.name === parsed.prefectureName);
  if (!pref) return null;

  const municipalities = await loadMunicipalitiesFromDisk(pref.id);
  const municipality = municipalities.find(
    (m) =>
      m.name === parsed.municipalityName ||
      parsed.municipalityName.includes(m.name) ||
      m.name.includes(parsed.municipalityName)
  );
  if (!municipality) return null;

  return { lat: municipality.lat, lng: municipality.lng };
}

function normalizeType(value: unknown): FacilityType {
  const text = String(value ?? "").toLowerCase();
  if (
    text.includes("pharmacy") ||
    text.includes("薬") ||
    text.includes("調剤")
  ) {
    return "pharmacy";
  }
  return "hospital";
}

function inferRegion(address: string, name: string): string {
  const combined = `${address}${name}`;
  const match = combined.match(
    /(?:都|道|府|県)?(.+?(?:市|区|町|村|郡))/
  );
  return match?.[1] ?? "";
}

export async function normalizeFacilities(
  raw: Array<Partial<Facility> & Record<string, unknown>>
): Promise<Facility[]> {
  const results: Facility[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const name = String(item.name ?? "").trim();
    const address = String(item.address ?? "").trim();
    if (!name && !address) continue;

    let lat = isValidCoord(item.lat) ? item.lat : null;
    let lng = isValidCoord(item.lng) ? item.lng : null;

    if (lat === null || lng === null) {
      const geocoded = address ? await geocodeAddressFallback(address) : null;
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
      }
    }

    if (lat === null || lng === null) continue;

    results.push({
      id: String(item.id ?? `parsed-${i + 1}`),
      name: name || "名称不明",
      address: address || name,
      region: String(item.region ?? "").trim() || inferRegion(address, name),
      type: normalizeType(item.type),
      lat,
      lng,
      hours: String(item.hours ?? "要確認").trim() || "要確認",
    });
  }

  return results;
}

export function resolveUploadMimeType(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

export function toUserFriendlyParseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "AIの利用上限に達しました。Google Cloudの課金設定を確認してください。";
  }
  if (message.includes("403") || message.toLowerCase().includes("denied")) {
    return "AI APIへのアクセスが拒否されました。APIキーと権限を確認してください。";
  }
  if (
    message.includes(" 400 ") ||
    message.includes(" 401 ") ||
    message.toLowerCase().includes("api key not valid") ||
    message.toLowerCase().includes("api_key_invalid") ||
    message.toLowerCase().includes("invalid_argument")
  ) {
    return "Gemini APIキーが無効です。.env.local の GEMINI_API_KEY を確認してください。";
  }
  if (message.includes("GEMINI_API_KEY")) {
    return "AI APIキーが未設定です。.env.local に GEMINI_API_KEY を設定してください。";
  }
  if (message.toLowerCase().includes("empty") || message.includes("0件")) {
    return "当番表から施設を読み取れませんでした。画像が鮮明か確認してください。";
  }
  return message.length > 120 ? "解析中にエラーが発生しました" : message;
}
