"use client";

import { useCallback, useRef, useState } from "react";
import type { Facility } from "@/lib/types";

interface ManualFacilityAdderProps {
  facilities: Facility[];
  onAdd: (facility: Facility) => void;
  onRemove: (id: string) => void;
}

export function ManualFacilityAdder({
  facilities,
  onAdd,
  onRemove,
}: ManualFacilityAdderProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resolve-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "追加に失敗しました");

      onAdd({
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: data.name || trimmed,
        address: data.address || "",
        region: "",
        type: data.type ?? "hospital",
        lat: data.lat,
        lng: data.lng,
        hours: "要確認",
      });
      setText("");
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [text, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) void handleAdd();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        施設・場所を手動で追加
      </h3>

      {/* 入力欄 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 大江整形外科病院、清武のドラッグストア…"
          disabled={loading}
          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-3 text-base disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={loading || !text.trim()}
          className="min-h-[44px] rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? "検索中…" : "追加"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* 追加済みリスト */}
      {facilities.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {facilities.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
            >
              <span
                className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold ${
                  f.type === "pharmacy"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {f.type === "pharmacy" ? "薬局" : "病院"}
              </span>
              <span className="flex-1 truncate text-sm font-medium text-slate-800">
                {f.name}
              </span>
              <span className="shrink-0 truncate text-xs text-slate-400 max-w-[120px] hidden sm:block">
                {f.address}
              </span>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                aria-label={`${f.name}を削除`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
