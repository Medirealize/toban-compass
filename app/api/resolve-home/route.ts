import { NextRequest, NextResponse } from "next/server";
import { parseHomeAddressWithGemini } from "@/lib/gemini";
import { findTown } from "@/lib/match-location";
import {
  parseAddressLocally,
  toUserFriendlyAiError,
} from "@/lib/parse-address";
import { loadTownsByMunicipality } from "@/lib/towns";

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

    let parsed = null;
    let mode: "ai" | "local" = "local";
    let notice: string | undefined;

    if (process.env.GEMINI_API_KEY) {
      try {
        parsed = await parseHomeAddressWithGemini(rawAddress);
        mode = "ai";
      } catch (error) {
        notice = toUserFriendlyAiError(error);
        parsed = await parseAddressLocally(rawAddress);
      }
    } else {
      notice = "AI APIキー未設定のため、ルールベースで解析しました。";
      parsed = await parseAddressLocally(rawAddress);
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "住所を解析できませんでした。例: 宮崎県宮崎市清武町加納 の形式で入力してください。",
        },
        { status: 400 }
      );
    }

    let lat: number | undefined;
    let lng: number | undefined;
    let townId: string | undefined;
    let resolvedTownName = parsed.townName;

    try {
      const towns = await loadTownsByMunicipality(
        parsed.prefectureName,
        parsed.municipalityName
      );
      const matched = findTown(towns, parsed.townName);
      if (matched) {
        lat = matched.lat;
        lng = matched.lng;
        townId = matched.id;
        resolvedTownName = matched.name;
      }
    } catch {
      // 町字データ未取得時は parsed のみ返す
    }

    return NextResponse.json({
      ...parsed,
      townName: resolvedTownName,
      lat,
      lng,
      townId,
      mode,
      notice,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "住所解析に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
