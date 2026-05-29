import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "使い方 | どこ近？",
};

const examples = [
  {
    icon: "🏥",
    title: "休日・夜間の当番医を探す",
    steps: [
      "お住まいエリアを入力",
      "当番表のスクショを「貼り付け準備」で貼り付け",
      "AIが自動で施設一覧を読み取り",
      "レーダーで最寄りの病院・薬局を確認",
    ],
    note: "iPhoneはスクショを「コピー」してから「貼り付け準備」を押してください",
  },
  {
    icon: "🏟️",
    title: "体育館・公民館など地域施設を比較",
    steps: [
      "ウェブページの施設一覧をコピー",
      "「リストをテキストで一括貼り付け」に貼り付け",
      "「一括読み込み」でAIが施設名を解析・座標を特定",
      "現在地または指定エリアから近い順に確認",
    ],
    note: "施設名と電話番号が混在していても自動で解析します",
  },
  {
    icon: "✈️",
    title: "旅行・お出かけの候補地を比べる",
    steps: [
      "「施設・場所を手動で追加」に行きたい場所を1件ずつ入力",
      "AIが住所と座標を特定して追加",
      "出発地（現在地 or 宿泊先エリア）を設定",
      "レーダーで距離・方向を一覧で比較",
    ],
    note: "「清武のドラッグストア」など曖昧な入力でも検索できます",
  },
  {
    icon: "🏠",
    title: "病院コンシェルジュ・ケアマネとして使う",
    steps: [
      "患者さんの「お住まいエリア」を入力",
      "「現在地を取得」で自分の現在地も取得",
      "2つのレーダーで「ここから近い病院」と「患者宅から近い病院」を同時確認",
      "「おおよその位置」ボタンで施設から見た位置関係も確認可能",
    ],
    note: "訪問看護ステーションや居宅介護支援事業所にも対応",
  },
];

const tips = [
  {
    icon: "🔍",
    text: "レーダーはピンチ操作（スマホ）またはマウスホイール（PC）でズームできます",
  },
  {
    icon: "👆",
    text: "レーダーのドットをタップ・クリックすると施設名と距離が表示されます",
  },
  {
    icon: "✏️",
    text: "手動追加した施設は ✏️ ボタンで住所を修正できます",
  },
  {
    icon: "🗑️",
    text: "取り込み済み施設の一覧から不要な施設を個別削除してレーダーを整理できます",
  },
  {
    icon: "🗺️",
    text: "「ここへのルート」でGoogleマップを開き、現在地からナビを開始できます",
  },
];

export default function HowtoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <Link href="/" className="text-sm text-sky-600 hover:underline">
          ← 戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">使い方</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          どこ近？ — 候補地を比べて、一番近いところを見つけよう
        </p>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-8">

        {/* 使い方例 */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-slate-700">使い方の例</h2>
          <div className="space-y-4">
            {examples.map((ex) => (
              <div
                key={ex.title}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">{ex.icon}</span>
                  <h3 className="text-base font-semibold text-slate-900">{ex.title}</h3>
                </div>
                <ol className="space-y-1.5 pl-1">
                  {ex.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                {ex.note && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    💡 {ex.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-700">便利な機能</h2>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li
                key={tip.text}
                className="flex gap-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm border border-slate-100"
              >
                <span className="text-lg">{tip.icon}</span>
                {tip.text}
              </li>
            ))}
          </ul>
        </section>

        {/* 対応ファイル */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-700">対応している入力形式</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>📷 画像（JPEG / PNG / WebP）</li>
            <li>📄 PDFファイル</li>
            <li>📋 コピーしたテキスト（ウェブページ・表など）</li>
            <li>⌨️ 施設名・住所の手動入力（1件ずつ）</li>
          </ul>
        </section>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-sky-600 px-6 text-base font-semibold text-white"
          >
            アプリを使ってみる
          </Link>
        </div>
      </main>
    </div>
  );
}
