"use client";

import { useCallback, useRef, useState } from "react";
import type { Facility } from "@/lib/types";

const COMMON_SPECIALTIES = [
  "内科", "外科", "整形外科", "皮膚科", "眼科",
  "耳鼻咽喉科", "小児科", "産婦人科", "泌尿器科",
  "歯科・口腔外科", "精神科・心療内科", "循環器科",
  "消化器科", "脳神経外科", "放射線科", "リハビリ科",
];

interface SpecialtySearchProps {
  regionHint: string;
  onAdd: (facilities: Facility[]) => void;
}

export function SpecialtySearch({ regionHint, onAdd }: SpecialtySearchProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSpecialty, setLastSpecialty] = useState<string | null>(null);
  const composingRef = useRef(false);

  const search = useCallback(
    async (specialty: string) => {
      const trimmed = specialty.trim();
      if (!trimmed) return;
      if (!regionHint) {
        setError("先にお住まいエリアまたは現在地を設定してください");
        return;
      }
      setLoading(true);
      setError(null);
      setLastSpecialty(trimmed);
      try {
        const res = await fetch("/api/search-specialty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specialty: trimmed, regionHint }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "検索に失敗しました");

        const imported = (data.facilities as Facility[]).map((f) => ({
          ...f,
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          hours: "要確認",
        }));
        onAdd(imported);
        setQuery("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "検索に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [regionHint, onAdd]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading && !composingRef.current) {
      void search(query);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-700">近くの診療科を探す</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          対応外の診療科を受診した患者さんへの案内など
        </p>
      </div>

      {/* 診療科クイック選択 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {COMMON_SPECIALTIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void search(s)}
            disabled={loading}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 active:bg-sky-50 active:border-sky-300 active:text-sky-700 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* フリーテキスト検索 */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          disabled={loading}
          placeholder="その他の診療科を入力…"
          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-3 text-sm disabled:opacity-50 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <button
          type="button"
          onClick={() => void search(query)}
          disabled={loading || !query.trim()}
          className="min-h-[44px] rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? "検索中…" : "検索"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {loading && (
        <p className="mt-2 text-xs text-slate-400">
          「{lastSpecialty}」{regionHint && `（${regionHint}周辺）`}を検索中…
        </p>
      )}

      {!regionHint && (
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ お住まいエリアか現在地を先に設定してください
        </p>
      )}
    </div>
  );
}
