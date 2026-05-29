"use client";

import { useEffect } from "react";
import type { FacilityWithDistance, HomeLocation } from "@/lib/types";
import { formatHomeLocationShort, getFacilityTypeConfig } from "@/lib/types";
import { bearingDeg, haversineDistanceKm } from "@/lib/geo";
import { polarToCartesian } from "@/lib/geo";

const SIZE = 280;
const CENTER = SIZE / 2;
const MAX_RADIUS = 106;
const RING_STEPS = [0.33, 0.67, 1];

function bearingToDirection(deg: number): string {
  const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  return dirs[Math.round(deg / 45) % 8];
}

interface PointConfig {
  key: string;
  label: string;
  lat: number;
  lng: number;
  color: string;
}

interface FacilityRadarModalProps {
  facility: FacilityWithDistance;
  homeLocation: HomeLocation;
  gpsLocation: HomeLocation | null;
  onClose: () => void;
}

export function FacilityRadarModal({
  facility,
  homeLocation,
  gpsLocation,
  onClose,
}: FacilityRadarModalProps) {
  // Escキーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const points: PointConfig[] = [
    {
      key: "home",
      label: formatHomeLocationShort(homeLocation) || "お住まいエリア",
      lat: homeLocation.lat,
      lng: homeLocation.lng,
      color: "#0ea5e9",
    },
  ];

  if (gpsLocation) {
    points.push({
      key: "gps",
      label: "現在地",
      lat: gpsLocation.lat,
      lng: gpsLocation.lng,
      color: "#16a34a",
    });
  }

  const distances = points.map((p) =>
    haversineDistanceKm(facility.lat, facility.lng, p.lat, p.lng)
  );
  const safeMax = Math.max(...distances, 0.5);

  const facilityShort =
    facility.name.length > 12 ? facility.name.slice(0, 12) + "…" : facility.name;

  return (
    /* オーバーレイ：背景クリックで閉じる */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">おおよその位置</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold leading-snug text-slate-900">{facility.name}</h3>
              {(() => {
                const { label, badge } = getFacilityTypeConfig(facility.type);
                return <span className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold ${badge}`}>{label}</span>;
              })()}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{facility.address}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {/* 逆レーダー：施設が中心 */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto w-full max-w-[300px]"
          aria-label={`${facility.name}を中心とした位置レーダー`}
        >
          {/* 距離リング */}
          {RING_STEPS.map((step) => (
            <circle
              key={step}
              cx={CENTER}
              cy={CENTER}
              r={MAX_RADIUS * step}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={step < 1 ? "4 4" : undefined}
            />
          ))}

          {/* 方角ラベル */}
          {[
            { label: "北", x: CENTER, y: 11 },
            { label: "東", x: SIZE - 11, y: CENTER + 4 },
            { label: "南", x: CENTER, y: SIZE - 5 },
            { label: "西", x: 11, y: CENTER + 4 },
          ].map(({ label, x, y }) => (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={9}
            >
              {label}
            </text>
          ))}

          {/* 各ポイント（お住まいエリア・現在地） */}
          {points.map((point, idx) => {
            const dist = distances[idx];
            const bearing = bearingDeg(
              facility.lat,
              facility.lng,
              point.lat,
              point.lng
            );
            const normalized = Math.min(dist / safeMax, 1);
            const { x, y } = polarToCartesian(
              CENTER,
              CENTER,
              normalized * MAX_RADIUS,
              bearing
            );
            const cx = Math.round(x * 100) / 100;
            const cy = Math.round(y * 100) / 100;

            // ラベルをドットの外側に配置
            const above = cy > CENTER;
            const labelOffsetY = above ? -14 : 20;
            const distOffsetY = above ? -26 : 32;

            return (
              <g key={point.key}>
                {/* 中心→ポイントへの線 */}
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={cx}
                  y2={cy}
                  stroke={point.color}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
                {/* ドット */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={9}
                  fill={point.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {/* ラベル */}
                <text
                  x={Math.max(28, Math.min(SIZE - 28, cx))}
                  y={cy + labelOffsetY}
                  textAnchor="middle"
                  fill={point.color}
                  fontSize={9}
                  fontWeight={700}
                >
                  {point.label}
                </text>
                {/* 距離 */}
                <text
                  x={Math.max(28, Math.min(SIZE - 28, cx))}
                  y={cy + distOffsetY}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={8}
                >
                  {dist.toFixed(1)} km
                </text>
              </g>
            );
          })}

          {/* 中心マーカー（施設） */}
          <circle cx={CENTER} cy={CENTER} r={13} fill="#f97316" stroke="#fff" strokeWidth={2} />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={18}
            fill="none"
            stroke="#f97316"
            strokeWidth={1.5}
            opacity={0.35}
          />
          <text
            x={CENTER}
            y={CENTER + 30}
            textAnchor="middle"
            fill="#ea580c"
            fontSize={9}
            fontWeight={700}
          >
            {facilityShort}
          </text>
        </svg>

        {/* 距離サマリー */}
        <div className="mt-4 space-y-2">
          {points.map((point, idx) => {
            const dist = distances[idx];
            const bearing = bearingDeg(
              facility.lat,
              facility.lng,
              point.lat,
              point.lng
            );
            return (
              <div
                key={point.key}
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: point.color }}
                />
                <span className="flex-1 text-sm text-slate-700">
                  {point.label}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {dist.toFixed(1)} km
                </span>
                <span className="w-6 text-right text-xs text-slate-400">
                  {bearingToDirection(bearing)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
