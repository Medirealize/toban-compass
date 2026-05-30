import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/parse-address";

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(request.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const result = await reverseGeocode(lat, lng);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
