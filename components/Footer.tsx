import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-6">
      <div className="mx-auto max-w-lg space-y-3">
        {/* 免責事項 */}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          本アプリはAIを活用した施設位置の参照ツールです。
          表示される情報は参考目的であり、医療上の判断・診断の根拠にはなりません。
          緊急時は <span className="font-semibold">119番</span> または最寄りの医療機関にご連絡ください。
        </p>

        {/* リンク */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-slate-600 hover:underline">
            プライバシーポリシー
          </Link>
          <a
            href="mailto:info@medirealize.jp"
            className="hover:text-slate-600 hover:underline"
          >
            お問い合わせ
          </a>
        </div>

        {/* コピーライト */}
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} メディリアライズ
        </p>
      </div>
    </footer>
  );
}
