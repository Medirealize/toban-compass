import { NextRequest, NextResponse } from "next/server";
import { parseScheduleWithGemini } from "@/lib/gemini";
import { simulateScheduleParse } from "@/lib/mock-parser";
import {
  resolveUploadMimeType,
  toUserFriendlyParseError,
} from "@/lib/schedule-normalize";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

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

    if (file.size === 0) {
      return NextResponse.json(
        { error: "空のファイルは解析できません" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは15MB以下にしてください" },
        { status: 400 }
      );
    }

    const mimeType = resolveUploadMimeType(file);
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "画像（JPEG/PNG/WebP/GIF）またはPDFのみ対応しています" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      const result = await simulateScheduleParse(file);
      return NextResponse.json({
        ...result,
        notice: "AI APIキー未設定のため、サンプルデータを表示しています。",
        mode: "mock",
      });
    }

    const result = await parseScheduleWithGemini({
      fileName: file.name,
      mimeType,
      base64Data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });

    return NextResponse.json({ ...result, mode: "ai" });
  } catch (error) {
    const message = toUserFriendlyParseError(error);
    const status = message.includes("利用上限") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
