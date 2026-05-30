"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Facility, HomeLocation } from "@/lib/types";
import { getFacilityTypeConfig } from "@/lib/types";
import { haversineDistanceKm } from "@/lib/geo";

interface ManualFacilityAdderProps {
  facilities: Facility[];
  gpsLocation?: HomeLocation | null;
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
  gpsLocation,
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

  // 現在地からの距離でソート
  const sortedFacilities = useMemo(() => {
    if (!gpsLocation) return facilities;
    return [...facilities]
      .map((f) => ({
        ...f,
        _dist: haversineDistanceKm(gpsLocation.lat, gpsLocation.lng, f.lat, f.lng),
      }))
      .sort((a, b) => a._dist - b._dist);
  }, [facilities, gpsLocation]);

  // テキスト一括貼り付け
  const [bulkText, setBulkText] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkComposingRef = useRef(false);

  const handleBulkImport = useCallback(async () => {
    const trimmed = bulkText.trim();
    if (!trimmed) return;
    setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, regionHint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "読み込みに失敗しました");
      const imported = data.facilities as Array<{
        name: string; address: string; type: string; lat: number; lng: number;
      }>;
      for (const f of imported) {
        onAdd({
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: f.name,
          address: f.address,
          region: "",
          type: f.type,
          lat: f.lat,
          lng: f.lng,
          hours: "要確認",
        });
      }
      setBulkText("");
      setBulkOpen(false);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setBulkLoading(false);
    }
  }, [bulkText, regionHint, onAdd]);

  // 編集中の施設
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editComposingRef = useRef(false);
  const editNameRef = useRef<HTMLInputElement>(null);

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
    setEditName(f.name);
    setEditAddress(f.address);
    setEditError(null);
    setTimeout(() => editNameRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditAddress("");
    setEditError(null);
  };

  const handleUpdate = useCallback(
    async (id: string, originalFacility: Facility) => {
      const name = editName.trim() || originalFacility.name;
      const address = editAddress.trim();
      if (!address) {
        setEditError("住所を入力してください");
        return;
      }
      setEditLoading(true);
      setEditError(null);
      try {
        // 住所から直接ローカルジオコーディング（Geminiに頼らない）
        const geoRes = await fetch("/api/geocode-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const geoData = await geoRes.json();
        if (!geoRes.ok) throw new Error(geoData.error ?? "位置の特定に失敗しました");

        onUpdate(id, {
          ...originalFacility,
          name,
          address,
          lat: geoData.lat,
          lng: geoData.lng,
        });
        setEditingId(null);
        setEditName("");
        setEditAddress("");
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "更新に失敗しました");
      } finally {
        setEditLoading(false);
      }
    },
    [editName, editAddress, onUpdate]
  );

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
          placeholder="例: 駅前の内科クリニック、〇〇調剤薬局…"
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

      {/* テキスト一括貼り付け */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => { setBulkOpen((v) => !v); setBulkError(null); }}
          className="flex w-full items-center gap-2 text-left text-sm font-semibold text-sky-700"
        >
          <span className="text-base">{bulkOpen ? "▲" : "▼"}</span>
          リストをテキストで一括貼り付け
          <span className="ml-1 text-xs font-normal text-slate-400">
            ウェブページ・表からのコピペに対応
          </span>
        </button>

        {bulkOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              onCompositionStart={() => { bulkComposingRef.current = true; }}
              onCompositionEnd={() => { bulkComposingRef.current = false; }}
              disabled={bulkLoading}
              placeholder={"例:\n市立中央体育館\n区民スポーツセンター\n総合武道館\n\n施設名・住所・電話番号が混在していても解析します"}
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
            <button
              type="button"
              onClick={() => void handleBulkImport()}
              disabled={bulkLoading || !bulkText.trim()}
              className="min-h-[44px] w-full rounded-xl bg-sky-600 text-sm font-semibold text-white disabled:opacity-40"
            >
              {bulkLoading ? "AI解析中…" : "一括読み込み"}
            </button>
          </div>
        )}
      </div>

      {/* 追加済みリスト */}
      {facilities.length > 0 && (
        <ul className="mt-3 space-y-2">
          {gpsLocation && (
            <p className="mb-1 text-xs text-emerald-700">
              現在地から近い順
            </p>
          )}
          {sortedFacilities.map((f) => (
            <li key={f.id} className="rounded-xl bg-slate-50 px-3 py-2">
              {editingId === f.id ? (
                /* ── 編集モード ── */
                <div className="space-y-2">
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-500">施設名</label>
                    <input
                      ref={editNameRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onCompositionStart={() => { editComposingRef.current = true; }}
                      onCompositionEnd={() => { editComposingRef.current = false; }}
                      disabled={editLoading}
                      placeholder="施設名"
                      className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-500">
                      住所 <span className="text-slate-400">（正しい住所を入力すると座標も更新されます）</span>
                    </label>
                    <input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      onCompositionStart={() => { editComposingRef.current = true; }}
                      onCompositionEnd={() => { editComposingRef.current = false; }}
                      disabled={editLoading}
                      placeholder="例: 東京都新宿区西新宿1-1-1"
                      className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
                    />
                  </div>
                  {editError && (
                    <p className="text-xs text-red-600">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdate(f.id, f)}
                      disabled={editLoading || !editAddress.trim()}
                      className="flex-1 rounded-lg bg-sky-600 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {editLoading ? "位置を特定中…" : "住所で更新"}
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
                  {(() => {
                    const { label, badge } = getFacilityTypeConfig(f.type);
                    return (
                      <span className={`mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold ${badge}`}>
                        {label}
                      </span>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {f.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">{f.address}</p>
                  </div>
                  {gpsLocation && (
                    <span className="shrink-0 text-sm font-semibold text-emerald-700">
                      {haversineDistanceKm(gpsLocation.lat, gpsLocation.lng, f.lat, f.lng).toFixed(1)} km
                    </span>
                  )}
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
