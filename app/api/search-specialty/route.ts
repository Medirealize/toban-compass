import { NextRequest, NextResponse } from "next/server";
import { searchFacilitiesBySpecialty } from "@/lib/gemini";
import { normalizeFacilities } from "@/lib/schedule-normalize";
import { toUserFriendlyParseError } from "@/lib/schedule-normalize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const specialty  = typeof body.specialty   === "string" ? body.specialty.trim()   : "";
    const regionHint = typeof body.regionHint  === "string" ? body.regionHint.trim()  : "";

    if (!specialty) {
      return NextResponse.json({ error: "診療科を入力してください" }, { status: 400 });
    }
    if (!regionHint) {
      return NextResponse.json({ error: "先にお住まいエリアまたは現在地を設定してください" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI APIキーが未設定です" }, { status: 500 });
    }

    const raw = await searchFacilitiesBySpecialty(specialty, regionHint);
    const facilities = await normalizeFacilities(raw);
    if (facilities.length === 0) {
      return NextResponse.json(
        { error: `「${specialty}」の施設が見つかりませんでした。別の診療科や地域で試してください。` },
        { status: 422 }
      );
    }
    return NextResponse.json({ facilities, specialty });
  } catch (error) {
    const message = toUserFriendlyParseError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
