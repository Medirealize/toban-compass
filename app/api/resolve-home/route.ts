import { NextRequest, NextResponse } from "next/server";
import { parseHomeAddressWithGemini } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawAddress = String(body?.rawAddress ?? "").trim();
    if (!rawAddress) {
      return NextResponse.json(
        { error: "住所文字列を入力してください" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が未設定です" },
        { status: 400 }
      );
    }

    const parsed = await parseHomeAddressWithGemini(rawAddress);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "住所解析に失敗しました" },
      { status: 500 }
    );
  }
}
