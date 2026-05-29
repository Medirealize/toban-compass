"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getImageFileFromClipboard,
  isTypingTarget,
} from "@/lib/clipboard";

interface ScheduleUploaderProps {
  onFile: (file: File) => void | Promise<void>;
  isParsing: boolean;
  parseResult: ParseResult | null;
}

export type ParseResultStatus = "success" | "warning" | "error";

export interface ParseResult {
  status: ParseResultStatus;
  title: string;
  detail?: string;
  count?: number;
}

function ParseResultBanner({ result }: { result: ParseResult }) {
  const styles = {
    success: {
      box: "border-green-300 bg-green-50 ring-green-100",
      icon: "bg-green-600 text-white",
      title: "text-green-900",
      detail: "text-green-800",
    },
    warning: {
      box: "border-amber-300 bg-amber-50 ring-amber-100",
      icon: "bg-amber-500 text-white",
      title: "text-amber-900",
      detail: "text-amber-800",
    },
    error: {
      box: "border-red-300 bg-red-50 ring-red-100",
      icon: "bg-red-600 text-white",
      title: "text-red-900",
      detail: "text-red-800",
    },
  }[result.status];

  const icon = result.status === "success" ? "✓" : result.status === "warning" ? "!" : "×";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-3 flex items-start gap-3 rounded-2xl border px-4 py-4 ring-2 ${styles.box}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-bold ${styles.icon}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-lg font-bold ${styles.title}`}>{result.title}</p>
        {result.detail && (
          <p className={`mt-1 text-base ${styles.detail}`}>{result.detail}</p>
        )}
        {typeof result.count === "number" && result.status === "success" && (
          <p className={`mt-1 text-sm font-medium ${styles.detail}`}>
            レーダーとリストを更新しました
          </p>
        )}
      </div>
    </div>
  );
}

/** clipboard.read() でClipboardItem から画像を取り出す */
async function readImageFromClipboardAPI(): Promise<File | null> {
  if (!navigator.clipboard?.read) return null;
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((t) => t.startsWith("image/"));
    if (!imageType) continue;
    const blob = await item.getType(imageType);
    const ext = imageType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    return new File([blob], `pasted-${Date.now()}.${ext}`, { type: imageType });
  }
  return null;
}

export function ScheduleUploader({
  onFile,
  isParsing,
  parseResult,
}: ScheduleUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPasteReady, setIsPasteReady] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setIsPasteReady(false);
      setPasteHint(null);
      void onFile(file);
    },
    [onFile]
  );

  // デスクトップ: document レベルの paste イベントで ⌘V に対応
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (isParsing || isTypingTarget(event.target)) return;
      const file = getImageFileFromClipboard(event);
      if (!file) return;
      event.preventDefault();
      processFile(file);
    },
    [isParsing, processFile]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  /**
   * 「貼り付け準備」ボタン
   * iOS Safari: ユーザージェスチャー内で clipboard.read() を呼ぶことで
   *   「〇〇からペースト」ダイアログを発動できる
   * デスクトップ: dropZone にフォーカスして ⌘V を待つ従来の動作
   */
  const handlePasteButton = useCallback(async () => {
    setPasteHint(null);

    // Clipboard API が使える場合（iOS 16+, Android Chrome, デスクトップ）
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.read === "function") {
      try {
        const file = await readImageFromClipboardAPI();
        if (file) {
          processFile(file);
        } else {
          // クリップボードに画像なし
          setPasteHint(
            "クリップボードに画像がありません。先に写真を「コピー」してから押してください。"
          );
          setIsPasteReady(true);
          dropZoneRef.current?.focus();
        }
      } catch {
        // 権限拒否 or 未対応 → フォーカス方式にフォールバック
        setIsPasteReady(true);
        dropZoneRef.current?.focus();
      }
    } else {
      // Clipboard API 未対応ブラウザ（古いiOS など）→ フォーカスで ⌘V を待つ
      setIsPasteReady(true);
      dropZoneRef.current?.focus();
    }
  }, [processFile]);

  return (
    <section aria-label="当番表の取り込み">
      <h2 className="mb-2 text-base font-semibold text-slate-700">
        当番表（スクショ・PDF）
      </h2>

      <div
        ref={dropZoneRef}
        tabIndex={0}
        role="button"
        aria-label="当番表の画像を貼り付け、ドロップ、または選択"
        onFocus={() => setIsPasteReady(true)}
        onBlur={() => setIsPasteReady(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "v") {
            setIsPasteReady(true);
          }
        }}
        className={`relative flex min-h-[148px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 transition-colors outline-none ${
          isDragging
            ? "border-sky-500 bg-sky-50"
            : isPasteReady
              ? "border-sky-400 bg-sky-50/70 ring-2 ring-sky-200"
              : "border-slate-300 bg-white"
        } ${isParsing ? "pointer-events-none opacity-60" : ""}`}
      >
        {isParsing ? (
          <p className="text-base font-medium text-sky-700">AI解析中…</p>
        ) : (
          <>
            <p className="text-center text-base font-medium text-slate-700">
              画面キャプチャ・切り取り写真を貼り付け
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              ⌘V / Ctrl+V（この枠を選択してから貼り付け）
            </p>
            <p className="mt-2 text-center text-sm text-slate-400">
              または ドラッグ＆ドロップ / ファイル選択
            </p>
            <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => void handlePasteButton()}
                className="min-h-[44px] rounded-xl bg-sky-600 px-5 text-base font-semibold text-white active:bg-sky-700"
              >
                貼り付け準備
              </button>
              <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-slate-100 px-5 text-base font-semibold text-slate-800 active:bg-slate-200">
                ファイルを選択
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={onFileInput}
                />
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-slate-100 px-5 text-base font-semibold text-slate-800 active:bg-slate-200 sm:hidden">
                写真を撮影
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onFileInput}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {pasteHint && (
        <p className="mt-2 text-sm text-amber-700">{pasteHint}</p>
      )}

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        iPhone/iPad: スクショ後「コピー」→「貼り付け準備」を押すと自動で取り込みます。
        初回は「〇〇からペースト」の許可ダイアログが出ます。
        Mac: ⌘⇧4 キャプチャ後、そのまま ⌘V で取り込みできます。
      </p>

      {parseResult && <ParseResultBanner result={parseResult} />}
    </section>
  );
}
