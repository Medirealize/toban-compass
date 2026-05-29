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
画像またはPDFに写っている当番医・当番薬局を、見落としなくすべて抽出してください。

【読み取りルール】
- 表形式・リスト形式・複数列レイアウトすべてに対応
- 病院/クリニック/診療所/医療センター → type: "hospital"
- 薬局/調剤薬局 → type: "pharmacy"
- 施設名(name)は正式名称に近い形で
- 住所(address)は「都道府県」から始める（不明なら地域名+推定住所）
- 対応時間(hours)は「18:00-22:00」「19:00〜23:00」「24時間」等をそのまま
- region は市区町村や地域名
- lat/lng は住所から推定（日本国内、小数点6桁）
- 電話番号だけの行、ヘッダー行、注釈は除外
- 1施設 = 1要素。重複は統合
- 判読困難でも、読める文字から最善推定（空配列は最終手段）

【出力】
JSONのみ。facilities 配列に格納。
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
