"use client";

import { useCallback, useMemo, useState } from "react";
import type { HomeLocation, FacilityWithDistance } from "@/lib/types";
import { formatHomeLocationLabel, formatHomeLocationShort } from "@/lib/types";
import { polarToCartesian } from "@/lib/geo";

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_RADIUS = 130;
const RING_STEPS = [0.25, 0.5, 0.75, 1];
const TAP_RADIUS = 20;

/** 各ドットの「元の位置」を計算 */
function calcRawPos(
  f: FacilityWithDistance,
  safeMax: number
): { x: number; y: number } {
  const normalized = Math.min(f.distanceKm / safeMax, 1);
  const { x, y } = polarToCartesian(
    CENTER,
    CENTER,
    normalized * MAX_RADIUS,
    f.bearingDeg
  );
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/**
 * フォース指向で重なりを解消する。
 * - 近すぎるドット同士を MIN_SEP だけ押し離す
 * - 各ドットは元位置へ SPRING 力で引き戻される
 * → 方向感を保ちながら全ドットが個別にタップできる位置に落ち着く
 */
function separateDots(
  inputs: Array<{ id: string; x: number; y: number }>
): Map<string, { x: number; y: number }> {
  const MIN_SEP = 20;   // ドット中心間の最低距離 (px)
  const SPRING = 0.12;  // 元位置への引き戻し強さ (0〜1)
  const ITERS = 80;

  const orig = inputs.map((d) => ({ ...d }));
  const cur = inputs.map((d) => ({ ...d }));

  for (let iter = 0; iter < ITERS; iter++) {
    let anyPushed = false;

    // 押し離し力
    for (let i = 0; i < cur.length; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const dx = cur[j].x - cur[i].x;
        const dy = cur[j].y - cur[i].y;
        const dist = Math.hypot(dx, dy);
        if (dist < MIN_SEP) {
          const push = (MIN_SEP - dist) / 2 + 0.5;
          const angle =
            dist < 0.1
              ? ((j - i) * Math.PI * 2) / cur.length
              : Math.atan2(dy, dx);
          cur[i].x -= Math.cos(angle) * push;
          cur[i].y -= Math.sin(angle) * push;
          cur[j].x += Math.cos(angle) * push;
          cur[j].y += Math.sin(angle) * push;
          anyPushed = true;
        }
      }
    }

    // バネ引き戻し力
    for (let i = 0; i < cur.length; i++) {
      cur[i].x += (orig[i].x - cur[i].x) * SPRING;
      cur[i].y += (orig[i].y - cur[i].y) * SPRING;
    }

    if (!anyPushed) break;
  }

  // SVG 内に収める
  const margin = 12;
  for (const p of cur) {
    p.x = Math.max(margin, Math.min(SIZE - margin, p.x));
    p.y = Math.max(margin, Math.min(SIZE - margin, p.y));
  }

  return new Map(cur.map((p) => [p.id, { x: p.x, y: p.y }]));
}

interface RadarChartProps {
  homeLocation: HomeLocation;
  facilities: FacilityWithDistance[];
  maxDistanceKm: number;
}

function TooltipLabel({
  cx,
  cy,
  name,
  distanceKm,
}: {
  cx: number;
  cy: number;
  name: string;
  distanceKm: number;
}) {
  const label = `${name}（${distanceKm.toFixed(1)} km）`;
  const estWidth = Math.min(name.length * 10 + 80, 210);
  const height = 24;
  const above = cy > CENTER - 20;
  const boxY = above ? cy - height - 10 : cy + 12;
  const boxX = Math.max(4, Math.min(SIZE - estWidth - 4, cx - estWidth / 2));

  return (
    <g pointerEvents="none">
      <rect
        x={boxX}
        y={boxY}
        width={estWidth}
        height={height}
        rx={5}
        fill="#1e293b"
        opacity={0.92}
      />
      <polygon
        points={
          above
            ? `${cx},${cy - 6} ${cx - 5},${boxY + height} ${cx + 5},${boxY + height}`
            : `${cx},${cy + 6} ${cx - 5},${boxY} ${cx + 5},${boxY}`
        }
        fill="#1e293b"
        opacity={0.92}
      />
      <text
        x={boxX + estWidth / 2}
        y={boxY + 16}
        textAnchor="middle"
        fill="white"
        fontSize={10}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

export function RadarChart({
  homeLocation,
  facilities,
  maxDistanceKm,
}: RadarChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const safeMax = maxDistanceKm > 0 ? maxDistanceKm : 1;
  const fullLabel = formatHomeLocationLabel(homeLocation);
  const shortLabel = formatHomeLocationShort(homeLocation);

  // 元の座標（真の方向・距離を示す）
  const rawPositions = useMemo(
    () =>
      facilities.map((f) => ({ id: f.id, ...calcRawPos(f, safeMax) })),
    [facilities, safeMax]
  );

  // 分離後の描画座標
  const displayPositions = useMemo(
    () => separateDots(rawPositions),
    [rawPositions]
  );

  const activeFacility = facilities.find((f) => f.id === activeId) ?? null;

  // タップ・クリック: 表示位置から最近傍ドットを選ぶ
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = SIZE / rect.width;
      const scaleY = SIZE / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      let closestId: string | null = null;
      let minDist = TAP_RADIUS;

      for (const [id, pos] of displayPositions) {
        const dist = Math.hypot(px - pos.x, py - pos.y);
        if (dist < minDist) {
          minDist = dist;
          closestId = id;
        }
      }

      setActiveId((prev) => (prev === closestId ? null : closestId));
    },
    [displayPositions]
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-center text-sm font-medium text-slate-600">
        中心: {fullLabel}
      </p>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[360px] cursor-default"
        role="img"
        aria-label={`${fullLabel}を中心とした当番施設レーダー`}
        onClick={handleSvgClick}
        onMouseLeave={() => setActiveId(null)}
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
          { label: "北", x: CENTER, y: 12 },
          { label: "東", x: SIZE - 16, y: CENTER + 4 },
          { label: "南", x: CENTER - 8, y: SIZE - 8 },
          { label: "西", x: 8, y: CENTER + 4 },
        ].map(({ label, x, y }) => (
          <text
            key={label}
            x={x}
            y={y}
            className="fill-slate-400 text-[10px]"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        {/* 自宅マーカー */}
        <circle cx={CENTER} cy={CENTER} r={10} fill="#0ea5e9" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={14}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
          opacity={0.4}
        />
        <text
          x={CENTER}
          y={CENTER + 28}
          textAnchor="middle"
          className="fill-sky-700 text-[11px] font-semibold"
        >
          {shortLabel}
        </text>

        {/* 施設ドット（分離後の表示座標を使用） */}
        {facilities.map((f) => {
          const raw = rawPositions.find((p) => p.id === f.id)!;
          const disp = displayPositions.get(f.id)!;
          const color = f.type === "hospital" ? "#2563eb" : "#16a34a";
          const isActive = activeId === f.id;
          const moved =
            Math.hypot(disp.x - raw.x, disp.y - raw.y) > 3;

          return (
            <g
              key={f.id}
              onMouseEnter={() => setActiveId(f.id)}
              style={{ cursor: "pointer" }}
            >
              {/* 中心→真の方向への補助線 */}
              <line
                x1={CENTER}
                y1={CENTER}
                x2={raw.x}
                y2={raw.y}
                stroke={color}
                strokeWidth={1}
                opacity={0.18}
              />
              {/* 表示位置が真位置からずれた場合のリーダー線 */}
              {moved && (
                <line
                  x1={raw.x}
                  y1={raw.y}
                  x2={disp.x}
                  y2={disp.y}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.35}
                />
              )}
              {/* 真の位置に小さなアンカー点 */}
              {moved && (
                <circle
                  cx={raw.x}
                  cy={raw.y}
                  r={2.5}
                  fill={color}
                  opacity={0.4}
                />
              )}
              {/* メインドット（分離後の表示位置） */}
              <circle
                cx={disp.x}
                cy={disp.y}
                r={isActive ? 9 : 7}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          );
        })}

        {/* ツールチップ（最前面に描画） */}
        {activeFacility &&
          (() => {
            const disp = displayPositions.get(activeFacility.id)!;
            return (
              <TooltipLabel
                cx={disp.x}
                cy={disp.y}
                name={activeFacility.name}
                distanceKm={activeFacility.distanceKm}
              />
            );
          })()}
      </svg>

      <div className="mt-2 flex justify-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
          病院
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600" />
          薬局
        </span>
      </div>
    </div>
  );
}
