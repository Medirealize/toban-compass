import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | どこ近？",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <Link href="/" className="text-sm text-sky-600 hover:underline">
          ← トップへ戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">利用規約</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6 text-sm leading-relaxed text-slate-700">

          <section>
            <p>
              本利用規約（以下「本規約」）は、メディリアライズ（以下「当社」）が提供する
              「どこ近？」（以下「本アプリ」）の利用条件を定めるものです。
              本アプリをご利用いただいた時点で、本規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第1条 サービスの性質</h2>
            <p>
              本アプリは、休日・夜間の当番医・当番薬局・各種施設の位置情報を
              AI技術を活用して検索・表示する参照支援ツールです。
              本アプリは医療診断、医学的判断、または専門的なアドバイスを提供するものでは
              ありません。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第2条 免責事項</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                本アプリが表示する施設情報・距離・方向は参考情報であり、
                正確性・完全性を保証するものではありません。
              </li>
              <li>
                AIによる画像解析・テキスト解析の結果には誤りが含まれる場合があります。
                必ず一次情報（公式サイト・電話等）でご確認ください。
              </li>
              <li>
                医療上の判断が必要な場合は、医師・医療機関にご相談ください。
                緊急時は 119番 または最寄りの救急医療機関にご連絡ください。
              </li>
              <li>
                本アプリの利用により生じた損害について、当社は一切の責任を負いません。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第3条 禁止事項</h2>
            <p>利用者は以下の行為を行ってはなりません。</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>法令または公序良俗に違反する行為</li>
              <li>当社または第三者の知的財産権・プライバシーを侵害する行為</li>
              <li>本アプリのシステムへの不正アクセスまたは過度な負荷をかける行為</li>
              <li>本アプリを商業目的で無断利用する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第4条 サービスの変更・終了</h2>
            <p>
              当社は、利用者への事前通知なく本アプリの内容を変更、
              または提供を終了することができます。
              これにより利用者に生じた損害について、当社は責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第5条 知的財産権</h2>
            <p>
              本アプリに関する著作権その他の知的財産権は当社に帰属します。
              利用者は、個人的な非営利目的の範囲内でのみ本アプリを使用することができます。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第6条 準拠法・管轄裁判所</h2>
            <p>
              本規約は日本法を準拠法とします。
              本アプリに関する紛争については、当社所在地を管轄する裁判所を
              第一審専属管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第7条 お問い合わせ</h2>
            <p>
              本規約に関するお問い合わせは下記までお願いします。
            </p>
            <p className="mt-1">
              メディリアライズ<br />
              メール：
              <a href="mailto:info@medirealize.jp" className="text-sky-600 hover:underline">
                info@medirealize.jp
              </a>
            </p>
          </section>

          <p className="text-xs text-slate-400">制定日：2024年1月</p>
        </div>
      </main>
    </div>
  );
}
