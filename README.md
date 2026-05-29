# 休日夜間 当番コンパス

患者の自宅（都道府県・市区町村・町字）から、休日夜間の当番医・当番薬局を距離順に案内する Web アプリです。

## 機能

- 全国の市区町村 + 町・字レベルの自宅選択
- 当番表（スクショ / PDF / クリップボード貼り付け）の AI 解析
- 地図タイルなしの距離レーダー表示
- Google マップへのルート連携

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に GEMINI_API_KEY を設定
npm run dev
```

## 環境変数

| 変数 | 説明 |
|------|------|
| `GEMINI_API_KEY` | Gemini API キー（住所解析・当番表解析）。未設定時はモック動作 |

## 市区町村データの再生成

```bash
curl -fsSL https://code4fukui.github.io/localgovjp/localgovjp.json \
  -o scripts/source-localgovjp.json
npm run build:locations
```

データソース: [code4fukui/localgovjp](https://github.com/code4fukui/localgovjp)

## Vercel デプロイ

1. [GitHub リポジトリ](https://github.com/Medirealize/toban-compass) を Vercel にインポート
2. Environment Variables に `GEMINI_API_KEY` を設定
3. Deploy
