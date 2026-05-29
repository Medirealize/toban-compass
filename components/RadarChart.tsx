"use client";

import { useCallback, useState } from "react";
import type { HomeLocation, FacilityWithDistance } from "@/lib/types";
import { formatHomeLocationLabel, formatHomeLocationShort } from "@/lib/types";
import { polarToCartesian } from "@/lib/geo";

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_RADIUS = 130;
const RING_STEPS = [0.25, 0.5, 0.75, 1];
const TAP_RADIUS = 22; // SVG units — max distance to activate a dot

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

function facilityPos(
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

  // Find the closest dot to the tap/click point — avoids wrong-dot selection
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = SIZE / rect.width;
      const scaleY = SIZE / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      let closestId: string | null = null;
      let minDist = TAP_RADIUS;

      for (const f of facilities) {
        const { x, y } = facilityPos(f, safeMax);
        const dist = Math.hypot(px - x, py - y);
        if (dist < minDist) {
          minDist = dist;
          closestId = f.id;
        }
      }

      setActiveId((prev) => (prev === closestId ? null : closestId));
    },
    [facilities, safeMax]
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

        {/* Facility dots — hover activates tooltip on desktop */}
        {facilities.map((f) => {
          const { x: cx, y: cy } = facilityPos(f, safeMax);
          const color = f.type === "hospital" ? "#2563eb" : "#16a34a";
          const isActive = activeId === f.id;

          return (
            <g
              key={f.id}
              onMouseEnter={() => setActiveId(f.id)}
              style={{ cursor: "pointer" }}
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
            </g>
          );
        })}

        {/* Tooltip rendered last — always on top of all dots */}
        {activeFacility && (() => {
          const { x: cx, y: cy } = facilityPos(activeFacility, safeMax);
          return (
            <TooltipLabel
              cx={cx}
              cy={cy}
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
