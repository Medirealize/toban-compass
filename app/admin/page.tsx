import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "管理画面 | どこ近？", robots: "noindex" };

// Vercel Analytics API でデータを取得
async function fetchAnalytics() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;

  try {
    const [viewsRes, visitorsRes] = await Promise.all([
      fetch(
        `https://vercel.com/api/web-analytics/timeseries?projectId=${projectId}&range=30d&environment=production&filter=%7B%7D`,
        { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
      ),
      fetch(
        `https://vercel.com/api/web-analytics/summary?projectId=${projectId}&range=30d&environment=production&filter=%7B%7D`,
        { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
      ),
    ]);

    const summary = visitorsRes.ok ? await visitorsRes.json() : null;
    return summary;
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token || token !== process.env.ADMIN_SECRET) redirect("/admin/login");

  const analytics = await fetchAnalytics();
  const hasVercelConfig = !!(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
        <div>
          <h1 className="text-lg font-bold">どこ近？ 管理画面</h1>
          <p className="text-xs text-slate-400">Medirealize Analytics Dashboard</p>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* Vercel Analytics カード */}
        {analytics ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "ページビュー (30日)", value: analytics.pageViews?.total?.toLocaleString() ?? "—" },
              { label: "ユニーク訪問者", value: analytics.visitors?.total?.toLocaleString() ?? "—" },
              { label: "直帰率",   value: analytics.bounceRate != null ? `${(analytics.bounceRate * 100).toFixed(1)}%` : "—" },
              { label: "平均滞在時間", value: analytics.avgDuration != null ? `${Math.round(analytics.avgDuration)}秒` : "—" },
            ].map((card) => (
              <div key={card.label} className="rounded-xl bg-slate-800 p-4">
                <p className="text-xs text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-800 p-6 text-center">
            <p className="text-slate-300 font-medium mb-2">
              {hasVercelConfig ? "Analytics データ取得中…" : "Vercel Analytics 未設定"}
            </p>
            {!hasVercelConfig && (
              <p className="text-xs text-slate-500 leading-relaxed">
                Vercel ダッシュボードで Analytics を有効化後、<br />
                環境変数 <code className="text-sky-400">VERCEL_TOKEN</code> と{" "}
                <code className="text-sky-400">VERCEL_PROJECT_ID</code> を設定してください。
              </p>
            )}
          </div>
        )}

        {/* Vercel Analytics へのリンク */}
        <div className="rounded-xl bg-slate-800 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Vercel Analytics（詳細データ）</h2>
          <p className="mb-4 text-xs text-slate-400 leading-relaxed">
            ページ別閲覧数・流入元・デバイス・地域などの詳細分析はVercelダッシュボードで確認できます。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://vercel.com/medirealize/toban-compass/analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Analytics を開く →
            </a>
            <a
              href="https://vercel.com/medirealize/toban-compass/speed-insights"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600"
            >
              Speed Insights →
            </a>
          </div>
        </div>

        {/* 環境変数チェック */}
        <div className="rounded-xl bg-slate-800 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">環境変数ステータス</h2>
          <ul className="space-y-2">
            {[
              { key: "GEMINI_API_KEY",    set: !!process.env.GEMINI_API_KEY },
              { key: "ADMIN_SECRET",      set: !!process.env.ADMIN_SECRET },
              { key: "VERCEL_TOKEN",      set: !!process.env.VERCEL_TOKEN },
              { key: "VERCEL_PROJECT_ID", set: !!process.env.VERCEL_PROJECT_ID },
            ].map(({ key, set }) => (
              <li key={key} className="flex items-center gap-2 text-xs">
                <span className={set ? "text-green-400" : "text-red-400"}>{set ? "✓" : "✗"}</span>
                <code className="text-slate-300">{key}</code>
                <span className={set ? "text-green-400" : "text-slate-500"}>
                  {set ? "設定済み" : "未設定"}
                </span>
              </li>
            ))}
          </ul>
        </div>

      </main>
    </div>
  );
}
