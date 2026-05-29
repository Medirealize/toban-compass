"use client";

import { useCallback, useRef, useState } from "react";
import type { Facility } from "@/lib/types";

interface ManualFacilityAdderProps {
  facilities: Facility[];
  regionHint?: string;
  onAdd: (facility: Facility) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updated: Facility) => void;
}

async function resolvePlace(text: string, regionHint?: string) {
  const res = await fetch("/api/resolve-place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, regionHint }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "検索に失敗しました");
  return data as { name: string; address: string; type: string; lat: number; lng: number };
}

export function ManualFacilityAdder({
  facilities,
  regionHint,
  onAdd,
  onRemove,
  onUpdate,
}: ManualFacilityAdderProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  // 編集中の施設
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editComposingRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── 新規追加 ──────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resolvePlace(trimmed, regionHint);
      onAdd({
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: data.name || trimmed,
        address: data.address || "",
        region: "",
        type: data.type === "pharmacy" ? "pharmacy" : "hospital",
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
  }, [text, regionHint, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading && !composingRef.current) void handleAdd();
  };

  // ── 編集 ──────────────────────────────────────────────────────────────────

  const startEdit = (f: Facility) => {
    setEditingId(f.id);
    setEditText(f.name);
    setEditError(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditError(null);
  };

  const handleUpdate = useCallback(
    async (id: string, originalFacility: Facility) => {
      const trimmed = editText.trim();
      if (!trimmed) return;
      setEditLoading(true);
      setEditError(null);
      try {
        const data = await resolvePlace(trimmed, regionHint);
        onUpdate(id, {
          ...originalFacility,
          name: data.name || trimmed,
          address: data.address || originalFacility.address,
          type: data.type === "pharmacy" ? "pharmacy" : "hospital",
          lat: data.lat,
          lng: data.lng,
        });
        setEditingId(null);
        setEditText("");
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "更新に失敗しました");
      } finally {
        setEditLoading(false);
      }
    },
    [editText, regionHint, onUpdate]
  );

  const handleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    f: Facility
  ) => {
    if (e.key === "Enter" && !editLoading && !editComposingRef.current) {
      void handleUpdate(f.id, f);
    }
    if (e.key === "Escape") cancelEdit();
  };

  // ── レンダリング ──────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">
        施設・場所を手動で追加
      </h3>

      {/* 新規追加入力欄 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* 追加済みリスト */}
      {facilities.length > 0 && (
        <ul className="mt-3 space-y-2">
          {facilities.map((f) => (
            <li key={f.id} className="rounded-xl bg-slate-50 px-3 py-2">
              {editingId === f.id ? (
                /* ── 編集モード ── */
                <div className="space-y-2">
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, f)}
                    onCompositionStart={() => { editComposingRef.current = true; }}
                    onCompositionEnd={() => { editComposingRef.current = false; }}
                    disabled={editLoading}
                    placeholder="施設名や住所を入力"
                    className="min-h-[40px] w-full rounded-lg border border-sky-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-50"
                  />
                  {editError && (
                    <p className="text-xs text-red-600">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdate(f.id, f)}
                      disabled={editLoading || !editText.trim()}
                      className="flex-1 rounded-lg bg-sky-600 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {editLoading ? "検索中…" : "再検索して更新"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={editLoading}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm text-slate-600"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                /* ── 表示モード ── */
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold ${
                      f.type === "pharmacy"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {f.type === "pharmacy" ? "薬局" : "病院"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {f.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">{f.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(f)}
                    aria-label={`${f.name}を編集`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    aria-label={`${f.name}を削除`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
