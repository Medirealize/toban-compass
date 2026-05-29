import { NextRequest, NextResponse } from "next/server";
import { geocodeAddressFallback } from "@/lib/schedule-normalize";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return NextResponse.json({ error: "住所を入力してください" }, { status: 400 });
    }
    const result = await geocodeAddressFallback(address);
    if (!result) {
      return NextResponse.json(
        { error: "住所から位置を特定できませんでした。都道府県・市区町村を含む形式で入力してください" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "ジオコーディングに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
