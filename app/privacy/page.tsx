import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | どこ近？",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <Link href="/" className="text-sm text-sky-600 hover:underline">
          ← トップへ戻る
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">プライバシーポリシー</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6 text-sm leading-relaxed text-slate-700">

          <section>
            <p>
              メディリアライズ（以下「当社」）は、
              「どこ近？」（以下「本アプリ」）における
              利用者の個人情報・データの取り扱いについて、以下の通り定めます。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第1条 収集する情報</h2>
            <p>本アプリは、以下の情報を処理します。</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium">位置情報：</span>
                「現在地を取得」機能を使用した場合、ブラウザのGeolocation APIにより
                現在地の緯度・経度を取得します。この情報は端末内のみで処理され、
                外部サーバーへは送信されません。
              </li>
              <li>
                <span className="font-medium">アップロード画像・テキスト：</span>
                当番表の画像や貼り付けテキストは、AIによる解析のために
                Google Gemini API（Google LLC）へ送信されます。
                解析後のデータは当社サーバーには保存されません。
              </li>
              <li>
                <span className="font-medium">入力した住所・施設名：</span>
                住所検索や施設追加の際に入力された情報は、
                Gemini APIでの解析処理に使用されます。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第2条 情報の利用目的</h2>
            <p>収集した情報は以下の目的にのみ使用します。</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>当番施設・場所の一覧抽出と座標特定（AI解析）</li>
              <li>住所から緯度経度への変換（ジオコーディング）</li>
              <li>施設との距離・方向の計算と表示</li>
              <li>サービス品質の維持・改善</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第3条 データの保存</h2>
            <p>
              本アプリはアカウント登録不要で利用できます。
              施設一覧や選択エリアなどのデータはお使いの端末（ブラウザ）内にのみ保存され、
              当社のサーバーには保存されません。
              ブラウザを閉じると入力データはリセットされます。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第4条 第三者サービスの利用</h2>
            <p>本アプリは以下の外部サービスを利用しています。</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium">Google Gemini API（Google LLC）：</span>
                画像・テキストからの施設情報抽出、住所解析に使用。
                Googleのプライバシーポリシーが適用されます。
              </li>
            </ul>
            <p className="mt-2">
              各外部サービスのプライバシーポリシーについては、各社の公式サイトをご確認ください。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第5条 第三者への提供</h2>
            <p>
              当社は、法令に基づく場合または利用者の同意がある場合を除き、
              個人情報を第三者に提供しません。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第6条 未成年者のご利用</h2>
            <p>
              未成年者が本アプリを利用する場合は、保護者の同意のもとでご利用ください。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第7条 プライバシーポリシーの変更</h2>
            <p>
              当社は必要に応じて本ポリシーを変更することがあります。
              変更後は本ページに掲載します。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-slate-900">第8条 お問い合わせ</h2>
            <p>
              個人情報の取り扱いに関するお問い合わせは下記までお願いします。
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
