"use client";

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

export function RadarChart({
  homeLocation,
  facilities,
  maxDistanceKm,
}: RadarChartProps) {
  const safeMax = maxDistanceKm > 0 ? maxDistanceKm : 1;
  const fullLabel = formatHomeLocationLabel(homeLocation);
  const shortLabel = formatHomeLocationShort(homeLocation);

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
      >
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

        {facilities.map((f) => {
          const normalized = Math.min(f.distanceKm / safeMax, 1);
          const radius = normalized * MAX_RADIUS;
          const { x, y } = polarToCartesian(
            CENTER,
            CENTER,
            radius,
            f.bearingDeg
          );
          const color = f.type === "hospital" ? "#2563eb" : "#16a34a";
          const cx = Math.round(x * 100) / 100;
          const cy = Math.round(y * 100) / 100;

          return (
            <g key={f.id}>
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
                r={7}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
              <title>{`${f.name}（${f.distanceKm.toFixed(1)} km）`}</title>
            </g>
          );
        })}
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
