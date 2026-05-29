"use client";

import { useState } from "react";
import type { Facility } from "@/lib/types";

interface ParsedFacilityManagerProps {
  facilities: Facility[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function ParsedFacilityManager({
  facilities,
  onRemove,
  onClear,
}: ParsedFacilityManagerProps) {
  const [open, setOpen] = useState(true);

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
          {facilities.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 px-4 py-2.5"
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {f.name}
                </p>
                <p className="truncate text-xs text-slate-400">{f.address}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                aria-label={`${f.name}を削除`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100"
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
