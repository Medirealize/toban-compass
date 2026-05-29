import { NextRequest, NextResponse } from "next/server";
import { parseScheduleWithGemini } from "@/lib/gemini";
import { simulateScheduleParse } from "@/lib/mock-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 400 }
      );
    }

    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "画像（JPEG/PNG/WebP/GIF）またはPDFのみ対応しています" },
        { status: 400 }
      );
    }

    const result =
      process.env.GEMINI_API_KEY && file.size > 0
        ? await parseScheduleWithGemini({
            fileName: file.name,
            mimeType: file.type,
            base64Data: Buffer.from(await file.arrayBuffer()).toString("base64"),
          })
        : await simulateScheduleParse(file);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "解析中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
