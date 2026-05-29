"use client";

import { useState } from "react";
import type { HomeLocation, FacilityWithDistance } from "@/lib/types";
import { formatHomeLocationLabel, formatHomeLocationShort } from "@/lib/types";
import { polarToCartesian } from "@/lib/geo";

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_RADIUS = 130;
const RING_STEPS = [0.25, 0.5, 0.75, 1];

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
  // Japanese chars ≈10px, ASCII ≈6px at font-size 10; add 16px padding
  const estWidth = Math.min(name.length * 10 + 80, 210);
  const height = 24;
  // Show above dot when in lower half, below when in upper half
  const above = cy > CENTER - 20;
  const boxY = above ? cy - height - 8 : cy + 12;
  // Clamp so box stays within SVG
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
      {/* Arrow pointing to dot */}
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

  const activeFacility = facilities.find((f) => f.id === activeId) ?? null;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-center text-sm font-medium text-slate-600">
        中心: {fullLabel}（患者の自宅）
      </p>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[360px]"
        role="img"
        aria-label={`${fullLabel}を中心とした当番施設レーダー`}
        onMouseLeave={() => setActiveId(null)}
      >
        {/* Distance rings */}
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

        {/* Cardinal labels */}
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

        {/* Home marker */}
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

        {/* Facility dots */}
        {facilities.map((f) => {
          const normalized = Math.min(f.distanceKm / safeMax, 1);
          const radius = normalized * MAX_RADIUS;
          const { x, y } = polarToCartesian(CENTER, CENTER, radius, f.bearingDeg);
          const color = f.type === "hospital" ? "#2563eb" : "#16a34a";
          const cx = Math.round(x * 100) / 100;
          const cy = Math.round(y * 100) / 100;
          const isActive = activeId === f.id;

          return (
            <g
              key={f.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setActiveId(f.id)}
              onClick={() => setActiveId((prev) => (prev === f.id ? null : f.id))}
            >
              <line
                x1={CENTER}
                y1={CENTER}
                x2={cx}
                y2={cy}
                stroke={color}
                strokeWidth={1}
                opacity={0.2}
              />
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 9 : 7}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
              {/* Larger invisible hit area for easy tapping */}
              <circle cx={cx} cy={cy} r={18} fill="transparent" />
            </g>
          );
        })}

        {/* Tooltip rendered last so it appears above all dots */}
        {activeFacility &&
          (() => {
            const normalized = Math.min(activeFacility.distanceKm / safeMax, 1);
            const { x, y } = polarToCartesian(
              CENTER,
              CENTER,
              normalized * MAX_RADIUS,
              activeFacility.bearingDeg
            );
            return (
              <TooltipLabel
                cx={Math.round(x * 100) / 100}
                cy={Math.round(y * 100) / 100}
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
