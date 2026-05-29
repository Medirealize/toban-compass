import type { Facility, FacilityType } from "./types";
import {
  loadMunicipalitiesFromDisk,
  loadPrefecturesFromDisk,
  parseAddressLocally,
  geocodeByMunicipalityName,
} from "./parse-address";

function isValidCoord(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value !== 0 &&
    Math.abs(value) > 0.001
  );
}

/**
 * 3段階フォールバックで座標を取得:
 * 1. 都道府県 → 市区町村 を正規パースで解決
 * 2. 都道府県なしでも全国市区町村名スキャン
 * 3. region フィールドで再試行
 */
export async function geocodeAddressFallback(
  address: string,
  region?: string
): Promise<{ lat: number; lng: number } | null> {
  // Step 1: 正規パス（都道府県 → 市区町村）
  const parsed = await parseAddressLocally(address);
  if (parsed) {
    const prefectures = await loadPrefecturesFromDisk();
    const pref = prefectures.find((p) => p.name === parsed.prefectureName);
    if (pref) {
      const municipalities = await loadMunicipalitiesFromDisk(pref.id);
      const municipality = municipalities.find(
        (m) =>
          m.name === parsed.municipalityName ||
          parsed.municipalityName.includes(m.name) ||
          m.name.includes(parsed.municipalityName)
      );
      if (municipality) return { lat: municipality.lat, lng: municipality.lng };
    }
  }

  // Step 2: 都道府県なしでも住所から市区町村名を全国スキャン
  const fromAddress = await geocodeByMunicipalityName(address);
  if (fromAddress) return fromAddress;

  // Step 3: region フィールドで再試行
  if (region) {
    const fromRegion = await geocodeByMunicipalityName(region);
    if (fromRegion) return fromRegion;
  }

  return null;
}

function normalizeType(value: unknown): FacilityType {
  const raw = String(value ?? "").trim();
  if (!raw) return "other";
  // hospital / pharmacy はそのまま返す
  if (raw === "hospital" || raw === "pharmacy") return raw;
  // 日本語の場合も既知タイプへマップ
  const lower = raw.toLowerCase();
  if (lower.includes("pharmacy") || lower.includes("薬") || lower.includes("調剤")) return "pharmacy";
  if (lower.includes("visiting_nurse") || lower.includes("訪問看護") || lower.includes("訪問介護")) return "visiting_nurse";
  if (lower.includes("care_manager") || lower.includes("居宅介護支援") || lower.includes("ケアマネ")) return "care_manager";
  if (lower.includes("nursing_home") || lower.includes("特養") || lower.includes("老健") || lower.includes("グループホーム") || lower.includes("デイサービス")) return "nursing_home";
  if (lower.includes("hospital") || lower.includes("clinic") || lower.includes("病院") || lower.includes("クリニック") || lower.includes("診療所")) return "hospital";
  // それ以外は Gemini が返した文字列をそのまま使う（汎用化）
  return raw;
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
  // ── Step 1: 同期で各アイテムを前処理 ──────────────────────────────────────
  type Candidate = {
    item: (typeof raw)[number];
    i: number;
    name: string;
    address: string;
    region: string;
    lat: number | null;
    lng: number | null;
  };

  const candidates: Candidate[] = raw
    .map((item, i) => {
      const name = String(item.name ?? "").trim();
      const address = String(item.address ?? "").trim();
      const region = String(item.region ?? "").trim();
      if (!name && !address) return null;

      let lat = isValidCoord(item.lat) ? (item.lat as number) : null;
      let lng = isValidCoord(item.lng) ? (item.lng as number) : null;

      // 日本の領域外座標を破棄
      if (
        lat !== null &&
        lng !== null &&
        !(lat >= 24 && lat <= 46 && lng >= 122 && lng <= 154)
      ) {
        lat = null;
        lng = null;
      }

      return { item, i, name, address, region, lat, lng };
    })
    .filter((c): c is Candidate => c !== null);

  // ── Step 2: 座標が不足している施設を並列ジオコーディング ─────────────────
  // シリアルで awaiting するのではなく Promise.all で一括実行
  await Promise.all(
    candidates
      .filter((c) => c.lat === null || c.lng === null)
      .map(async (c) => {
        const geocoded = await geocodeAddressFallback(c.address, c.region);
        if (geocoded) {
          c.lat = geocoded.lat;
          c.lng = geocoded.lng;
        }
      })
  );

  // ── Step 3: 座標が確定した施設だけ返す ────────────────────────────────────
  return candidates
    .filter((c): c is Candidate & { lat: number; lng: number } =>
      c.lat !== null && c.lng !== null
    )
    .map((c) => ({
      id: String(c.item.id ?? `parsed-${c.i + 1}`),
      name: c.name || "名称不明",
      address: c.address || c.name,
      region: c.region || inferRegion(c.address, c.name),
      type: normalizeType(c.item.type),
      lat: c.lat,
      lng: c.lng,
      hours: String(c.item.hours ?? "要確認").trim() || "要確認",
    }));
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
