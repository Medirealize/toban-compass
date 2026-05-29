#!/bin/bash
# icon-1024.png を public/ に置いてから実行してください
set -e
SRC="$(dirname "$0")/../public/icon-1024.png"

if [ ! -f "$SRC" ]; then
  echo "❌ public/icon-1024.png が見つかりません。先に保存してください。"
  exit 1
fi

echo "🎨 アイコンを生成中..."
cd "$(dirname "$0")/.."

# iOS ホーム画面用 (apple-touch-icon)
sips -z 180 180 "$SRC" --out public/apple-touch-icon.png

# PWA アイコン
sips -z 192 192 "$SRC" --out public/icon-192.png
sips -z 512 512 "$SRC" --out public/icon-512.png

# ブラウザタブ用 favicon
sips -z 32 32  "$SRC" --out public/favicon-32.png
sips -z 16 16  "$SRC" --out public/favicon-16.png

echo "✅ 生成完了:"
ls -lh public/apple-touch-icon.png public/icon-192.png public/icon-512.png public/favicon-32.png
