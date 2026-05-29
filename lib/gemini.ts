import "server-only";

import type { Facility, ParsedScheduleResult } from "./types";

const GEMINI_MODEL = "gemini-2.0-flash";

interface GeminiInlineFile {
  mimeType: string;
  data: string;
}

interface HomeAddressResult {
  prefectureName: string;
  municipalityName: string;
  townName: string;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return key;
}

async function requestGeminiJson<T>(
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
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response is empty");
  }
  return JSON.parse(text) as T;
}

export async function parseHomeAddressWithGemini(
  rawAddress: string
): Promise<HomeAddressResult> {
  return requestGeminiJson<HomeAddressResult>(
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
}): Promise<ParsedScheduleResult> {
  const result = await requestGeminiJson<{ facilities: Facility[] }>(
    [
      "休日夜間の当番表（画像またはPDF）を解析し、医療機関一覧を抽出してください。",
      "施設ごとに以下を抽出: name,address,region,type,lat,lng,hours。",
      "type は hospital または pharmacy。",
      "lat/lng は住所から推定して小数点以下6桁まで。",
      "抽出不可の項目は可能な範囲で補完してください。",
    ].join("\n"),
    {
      type: "OBJECT",
      required: ["facilities"],
      properties: {
        facilities: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            required: [
              "id",
              "name",
              "address",
              "region",
              "type",
              "lat",
              "lng",
              "hours",
            ],
            properties: {
              id: { type: "STRING" },
              name: { type: "STRING" },
              address: { type: "STRING" },
              region: { type: "STRING" },
              type: { type: "STRING", enum: ["hospital", "pharmacy"] },
              lat: { type: "NUMBER" },
              lng: { type: "NUMBER" },
              hours: { type: "STRING" },
            },
          },
        },
      },
    },
    {
      mimeType: params.mimeType,
      data: params.base64Data,
    }
  );

  return {
    facilities: result.facilities,
    parsedAt: new Date().toISOString(),
    source: params.fileName,
  };
}
