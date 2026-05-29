"use client";

import { useMemo, useState } from "react";
import type { Facility, HomeLocation } from "@/lib/types";
import { getFacilityTypeConfig } from "@/lib/types";
import { haversineDistanceKm } from "@/lib/geo";

interface ParsedFacilityManagerProps {
  facilities: Facility[];
  gpsLocation: HomeLocation | null;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function ParsedFacilityManager({
  facilities,
  gpsLocation,
  onRemove,
  onClear,
}: ParsedFacilityManagerProps) {
  const [open, setOpen] = useState(true);

  // 現在地がある場合は距離付きで近い順にソート
  const sorted = useMemo(() => {
    if (!gpsLocation) return facilities;
    return [...facilities]
      .map((f) => ({
        ...f,
        _dist: haversineDistanceKm(gpsLocation.lat, gpsLocation.lng, f.lat, f.lng),
      }))
      .sort((a, b) => a._dist - b._dist);
  }, [facilities, gpsLocation]);

  if (facilities.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-sm font-semibold text-slate-700">
            取り込み済み施設
          </span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
            {facilities.length}件
          </span>
          {gpsLocation && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
              現在地から近い順
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {open ? "▲ 閉じる" : "▼ 開く"}
          </span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 active:bg-red-100"
        >
          全て削除
        </button>
      </div>

      {/* リスト */}
      {open && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {sorted.map((f) => {
            const dist = gpsLocation
              ? haversineDistanceKm(gpsLocation.lat, gpsLocation.lng, f.lat, f.lng)
              : null;
            return (
              <li key={f.id} className="flex items-center gap-2 px-4 py-2.5">
                {(() => {
                  const { label, badge } = getFacilityTypeConfig(f.type);
                  return (
                    <span className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold ${badge}`}>
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
                {dist !== null && (
                  <span className="shrink-0 text-sm font-semibold text-emerald-700">
                    {dist.toFixed(1)} km
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  aria-label={`${f.name}を削除`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
