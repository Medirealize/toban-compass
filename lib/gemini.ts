import "server-only";

import type { Facility, ParsedScheduleResult } from "./types";
import { normalizeFacilities } from "./schedule-normalize";

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
].filter(Boolean) as string[];

interface GeminiInlineFile {
  mimeType: string;
  data: string;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

const SCHEDULE_SCHEMA = {
  type: "OBJECT",
  required: ["facilities"],
  properties: {
    facilities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          address: { type: "STRING" },
          region: { type: "STRING" },
          type: { type: "STRING" },
          lat: { type: "NUMBER" },
          lng: { type: "NUMBER" },
          hours: { type: "STRING" },
        },
      },
    },
  },
};

const SCHEDULE_PROMPT = `
あなたは日本の「休日・夜間当番表」読み取りの専門AIです。
画像またはPDFに写っているすべての当番医・当番薬局を、1件も漏らさず抽出してください。

【読み取り方針】
- 表・リスト・複数列・縦書き・斜め文字・低解像度すべて対応
- かすれ・影・折り目で読みにくい文字は、前後の文脈と施設名の一般的なパターンから補完
- 画像内のヘッダーや見出し（「○○市休日当番」等）から地域を特定し、住所補完に使う

【施設の判定】
- 病院・クリニック・診療所・医療センター・外科・内科 → type: "hospital"
- 薬局・調剤薬局・ドラッグストア（調剤あり） → type: "pharmacy"
- 電話番号のみの行・日付行・ヘッダー行・注釈行は除外
- 同一施設の重複は1件に統合

【各フィールドの入力ルール】
- name: 施設の正式名称。読めない文字は「□」で代替
- address: 必ず「都道府県」から始める。省略されている場合はヘッダーの地域名から都道府県を補い「○○県○○市…」の形式にする
- region: 市区町村名（ヘッダーや見出しから取得可）
- hours: 記載の時間をそのまま記録。複数時間帯は「/」で結合。不明は「要確認」
- lat/lng: 住所・地域名から推定した日本国内の座標（緯度24〜46、経度123〜154）
  ★ 0は絶対禁止。住所が不明瞭でも region や name から市区町村レベルで必ず推定すること
  ★ 推定できない場合でも近隣の代表座標を使い、0は返さないこと

【厳守事項】
- facilities は空配列禁止。1件でも読めたら必ず出力する
- name と address は必ず別フィールドに格納（address に施設名を入れない）
`.trim();

async function requestGeminiJson<T>(
  model: string,
  prompt: string,
  schema: Record<string, unknown>,
  inlineFile?: GeminiInlineFile
): Promise<T> {
  const apiKey = getApiKey();
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (inlineFile) {
    parts.push({
      inline_data: {
        mime_type: inlineFile.mimeType,
        data: inlineFile.data,
      },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status} (${model}): ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini response is empty (${model})`);
  return JSON.parse(text) as T;
}

async function requestWithModelFallback<T>(
  prompt: string,
  schema: Record<string, unknown>,
  inlineFile?: GeminiInlineFile
): Promise<T> {
  let lastError: Error | null = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      return await requestGeminiJson<T>(model, prompt, schema, inlineFile);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message;
      if (msg.includes("429") || msg.includes("403") || msg.includes(" 400 ") || msg.includes(" 401 ")) break;
    }
  }
  throw lastError ?? new Error("Gemini API failed");
}

export async function resolvePlaceWithGemini(
  text: string,
  regionHint?: string
): Promise<{
  name: string;
  address: string;
  type: "hospital" | "pharmacy";
  lat: number;
  lng: number;
}> {
  const lines = [
    "日本の施設・場所名が入力されます。以下のルールで最も妥当な施設を特定してください。",
    "",
    "【漢字バリアント・誤字への対応】",
    "- 入力の漢字が正式名称と異なる場合がある（例: 渡辺/渡邉/渡部、斎藤/齋藤/斉藤、吉/𠮷、崎/﨑）",
    "- 読み方（ふりがな）が同じ・似た施設を優先して特定すること",
    "- 略称・通称・誤字でも文脈から最も近い実在施設を推定する",
    "- 入力と完全一致しなくても、最も可能性の高い候補を1件返す",
    "",
    "【地域の優先度】",
    regionHint
      ? `- 検索エリアの優先地域: ${regionHint}（この地域に実在する施設を最優先で返す）`
      : "- 日本全国から最も可能性の高い施設を返す",
    "",
    "【出力ルール】",
    "- name: 実在する可能性が最も高い正式名称",
    "- address: 都道府県から始まる完全な住所",
    "- type: hospital（病院・クリニック・診療所）または pharmacy（薬局）。医療以外も hospital",
    "- lat/lng: 実在する日本国内の座標（緯度24〜46、経度122〜154）。0は絶対禁止",
    "",
    `入力: ${text}`,
  ];

  const raw = await requestWithModelFallback<{
    name: string;
    address: string;
    type: string;
    lat: number;
    lng: number;
  }>(
    lines.join("\n"),
    {
      type: "OBJECT",
      required: ["name", "address", "type", "lat", "lng"],
      properties: {
        name: { type: "STRING" },
        address: { type: "STRING" },
        type: { type: "STRING" },
        lat: { type: "NUMBER" },
        lng: { type: "NUMBER" },
      },
    }
  );
  return {
    ...raw,
    type: raw.type === "pharmacy" ? "pharmacy" : "hospital",
  };
}

export async function parseHomeAddressWithGemini(rawAddress: string) {
  return requestWithModelFallback<{
    prefectureName: string;
    municipalityName: string;
    townName: string;
  }>(
    [
      "入力された日本の住所を、都道府県・市区町村・町字に分解してください。",
      "入力が曖昧でも、最も妥当な候補を返してください。",
      `住所: ${rawAddress}`,
    ].join("\n"),
    {
      type: "OBJECT",
      required: ["prefectureName", "municipalityName", "townName"],
      properties: {
        prefectureName: { type: "STRING" },
        municipalityName: { type: "STRING" },
        townName: { type: "STRING" },
      },
    }
  );
}

export async function parseScheduleWithGemini(params: {
  fileName: string;
  mimeType: string;
  base64Data: string;
}): Promise<ParsedScheduleResult & { notice?: string }> {
  const inlineFile = {
    mimeType: params.mimeType,
    data: params.base64Data,
  };

  let rawFacilities: Array<Partial<Facility>> = [];
  let notice: string | undefined;

  try {
    const primary = await requestWithModelFallback<{ facilities: Facility[] }>(
      SCHEDULE_PROMPT,
      SCHEDULE_SCHEMA,
      inlineFile
    );
    rawFacilities = primary.facilities ?? [];
  } catch (primaryError) {
    notice = "高精度モデルが利用できないため、代替モデルで再試行しました。";
    try {
      const retryPrompt = `${SCHEDULE_PROMPT}\n\n前回読み取れなかった可能性があるため、特に小さい文字・斜めの表・複数列も丁寧に読み取ってください。`;
      const secondary = await requestWithModelFallback<{ facilities: Facility[] }>(
        retryPrompt,
        SCHEDULE_SCHEMA,
        inlineFile
      );
      rawFacilities = secondary.facilities ?? [];
    } catch {
      throw primaryError;
    }
  }

  const facilities = await normalizeFacilities(rawFacilities);
  if (facilities.length === 0) {
    throw new Error("当番表から施設を0件抽出しました");
  }

  return {
    facilities,
    parsedAt: new Date().toISOString(),
    source: params.fileName,
    notice,
  };
}
