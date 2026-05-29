import { NextRequest, NextResponse } from "next/server";
import { resolvePlaceWithGemini } from "@/lib/gemini";
import { toUserFriendlyParseError } from "@/lib/schedule-normalize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const regionHint = typeof body.regionHint === "string" ? body.regionHint.trim() : undefined;
    if (!text) {
      return NextResponse.json(
        { error: "施設名または住所を入力してください" },
        { status: 400 }
      );
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI APIキーが未設定です" },
        { status: 500 }
      );
    }
    const result = await resolvePlaceWithGemini(text, regionHint);
    return NextResponse.json(result);
  } catch (error) {
    const message = toUserFriendlyParseError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
