import { NextRequest, NextResponse } from "next/server";
import { parseTextListWithGemini } from "@/lib/gemini";
import { normalizeFacilities } from "@/lib/schedule-normalize";
import { toUserFriendlyParseError } from "@/lib/schedule-normalize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const regionHint = typeof body.regionHint === "string" ? body.regionHint.trim() : undefined;

    if (!text) {
      return NextResponse.json({ error: "テキストを入力してください" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI APIキーが未設定です" }, { status: 500 });
    }

    const raw = await parseTextListWithGemini(text, regionHint);
    if (raw.length === 0) {
      return NextResponse.json({ error: "施設を抽出できませんでした" }, { status: 422 });
    }

    const facilities = await normalizeFacilities(raw);
    if (facilities.length === 0) {
      return NextResponse.json({ error: "座標を特定できる施設がありませんでした" }, { status: 422 });
    }

    return NextResponse.json({ facilities });
  } catch (error) {
    const message = toUserFriendlyParseError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
