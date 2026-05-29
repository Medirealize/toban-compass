/** クリップボードから画像ファイルを取得（画面キャプチャ・切り取り写真など） */
export function getImageFileFromClipboard(
  event: ClipboardEvent
): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (const item of items) {
    if (!item.type.startsWith("image/")) continue;
    const blob = item.getAsFile();
    if (!blob) continue;

    const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    return new File([blob], `pasted-${Date.now()}.${ext}`, { type: blob.type });
  }

  return null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
