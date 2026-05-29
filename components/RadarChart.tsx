"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HomeLocation, FacilityWithDistance } from "@/lib/types";
import { formatHomeLocationLabel, formatHomeLocationShort } from "@/lib/types";
import { polarToCartesian } from "@/lib/geo";

const SIZE = 320;
const CENTER = SIZE / 2;
const MAX_RADIUS = 130;
const RING_STEPS = [0.25, 0.5, 0.75, 1];
const TAP_RADIUS = 22;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

// ── Zoom state ────────────────────────────────────────────────────────────────

interface ZoomState {
  zoom: number;
  originX: number;
  originY: number;
}

const DEFAULT_ZOOM: ZoomState = { zoom: 1, originX: 0, originY: 0 };

function clampOrigin(x: number, y: number, vs: number) {
  return {
    x: Math.max(0, Math.min(SIZE - vs, x)),
    y: Math.max(0, Math.min(SIZE - vs, y)),
  };
}

function zoomAround(
  prev: ZoomState,
  factor: number,
  svgFocusX: number,
  svgFocusY: number
): ZoomState {
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
  const newVs = SIZE / newZoom;
  const { x, y } = clampOrigin(svgFocusX - newVs / 2, svgFocusY - newVs / 2, newVs);
  return { zoom: newZoom, originX: x, originY: y };
}

// ── Dot separation ────────────────────────────────────────────────────────────

function calcRawPos(f: FacilityWithDistance, safeMax: number) {
  const normalized = Math.min(f.distanceKm / safeMax, 1);
  const { x, y } = polarToCartesian(CENTER, CENTER, normalized * MAX_RADIUS, f.bearingDeg);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

function separateDots(
  inputs: Array<{ id: string; x: number; y: number }>
): Map<string, { x: number; y: number }> {
  const MIN_SEP = 20;
  const SPRING = 0.12;
  const ITERS = 80;
  const orig = inputs.map((d) => ({ ...d }));
  const cur = inputs.map((d) => ({ ...d }));
  for (let iter = 0; iter < ITERS; iter++) {
    let anyPushed = false;
    for (let i = 0; i < cur.length; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const dx = cur[j].x - cur[i].x;
        const dy = cur[j].y - cur[i].y;
        const dist = Math.hypot(dx, dy);
        if (dist < MIN_SEP) {
          const push = (MIN_SEP - dist) / 2 + 0.5;
          const angle = dist < 0.1 ? ((j - i) * Math.PI * 2) / cur.length : Math.atan2(dy, dx);
          cur[i].x -= Math.cos(angle) * push;
          cur[i].y -= Math.sin(angle) * push;
          cur[j].x += Math.cos(angle) * push;
          cur[j].y += Math.sin(angle) * push;
          anyPushed = true;
        }
      }
    }
    for (let i = 0; i < cur.length; i++) {
      cur[i].x += (orig[i].x - cur[i].x) * SPRING;
      cur[i].y += (orig[i].y - cur[i].y) * SPRING;
    }
    if (!anyPushed) break;
  }
  const margin = 12;
  for (const p of cur) {
    p.x = Math.max(margin, Math.min(SIZE - margin, p.x));
    p.y = Math.max(margin, Math.min(SIZE - margin, p.y));
  }
  return new Map(cur.map((p) => [p.id, { x: p.x, y: p.y }]));
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function TooltipLabel({
  cx, cy, name, distanceKm,
}: { cx: number; cy: number; name: string; distanceKm: number }) {
  const label = `${name}（${distanceKm.toFixed(1)} km）`;
  const estWidth = Math.min(name.length * 10 + 80, 210);
  const height = 24;
  const above = cy > CENTER - 20;
  const boxY = above ? cy - height - 10 : cy + 12;
  const boxX = Math.max(4, Math.min(SIZE - estWidth - 4, cx - estWidth / 2));
  return (
    <g pointerEvents="none">
      <rect x={boxX} y={boxY} width={estWidth} height={height} rx={5} fill="#1e293b" opacity={0.92} />
      <polygon
        points={above
          ? `${cx},${cy - 6} ${cx - 5},${boxY + height} ${cx + 5},${boxY + height}`
          : `${cx},${cy + 6} ${cx - 5},${boxY} ${cx + 5},${boxY}`}
        fill="#1e293b" opacity={0.92}
      />
      <text x={boxX + estWidth / 2} y={boxY + 16} textAnchor="middle" fill="white" fontSize={10} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RadarChartProps {
  homeLocation: HomeLocation;
  facilities: FacilityWithDistance[];
  maxDistanceKm: number;
}

export function RadarChart({ homeLocation, facilities, maxDistanceKm }: RadarChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [zs, setZs] = useState<ZoomState>(DEFAULT_ZOOM);
  const safeMax = maxDistanceKm > 0 ? maxDistanceKm : 1;
  const fullLabel = formatHomeLocationLabel(homeLocation);
  const shortLabel = formatHomeLocationShort(homeLocation);

  const visibleSize = SIZE / zs.zoom;
  const viewBox = `${zs.originX} ${zs.originY} ${visibleSize} ${visibleSize}`;

  // Ref for non-passive wheel listener
  const svgRef = useRef<SVGSVGElement>(null);
  const zsRef = useRef(zs);
  zsRef.current = zs;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const cur = zsRef.current;
      const vs = SIZE / cur.zoom;
      const svgX = (e.clientX - rect.left) / rect.width * vs + cur.originX;
      const svgY = (e.clientY - rect.top) / rect.height * vs + cur.originY;
      const factor = e.deltaY < 0 ? 1.25 : 0.8;
      setZs((prev) => zoomAround(prev, factor, svgX, svgY));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // Touch tracking ref
  const touchRef = useRef<{ x?: number; y?: number; pinchDist?: number }>({});

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      touchRef.current = {
        pinchDist: Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        ),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.touches.length === 1 && touchRef.current.x !== undefined && zs.zoom > 1) {
      const scale = visibleSize / rect.width;
      const dx = (e.touches[0].clientX - touchRef.current.x) * scale;
      const dy = (e.touches[0].clientY - (touchRef.current.y ?? 0)) * scale;
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setZs((prev) => {
        const vs = SIZE / prev.zoom;
        const { x, y } = clampOrigin(prev.originX - dx, prev.originY - dy, vs);
        return { ...prev, originX: x, originY: y };
      });
    } else if (e.touches.length === 2 && touchRef.current.pinchDist !== undefined) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / touchRef.current.pinchDist;
      touchRef.current.pinchDist = newDist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setZs((prev) => {
        const vs = SIZE / prev.zoom;
        const svgX = (midX - rect.left) / rect.width * vs + prev.originX;
        const svgY = (midY - rect.top) / rect.height * vs + prev.originY;
        return zoomAround(prev, factor, svgX, svgY);
      });
    }
  };

  const handleTouchEnd = () => { touchRef.current = {}; };

  // Dot positions
  const rawPositions = useMemo(
    () => facilities.map((f) => ({ id: f.id, ...calcRawPos(f, safeMax) })),
    [facilities, safeMax]
  );
  const displayPositions = useMemo(() => separateDots(rawPositions), [rawPositions]);
  const activeFacility = facilities.find((f) => f.id === activeId) ?? null;

  // Click/tap handler — converts screen → SVG coords accounting for zoom
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const vs = SIZE / zs.zoom;
      const px = (e.clientX - rect.left) / rect.width * vs + zs.originX;
      const py = (e.clientY - rect.top) / rect.height * vs + zs.originY;
      let closestId: string | null = null;
      let minDist = TAP_RADIUS / zs.zoom; // tap radius shrinks as we zoom in
      for (const [id, pos] of displayPositions) {
        const dist = Math.hypot(px - pos.x, py - pos.y);
        if (dist < minDist) { minDist = dist; closestId = id; }
      }
      setActiveId((prev) => (prev === closestId ? null : closestId));
    },
    [displayPositions, zs]
  );

  // ── Zoom button helpers ──
  const zoomIn = () => setZs((prev) => {
    const vs = SIZE / prev.zoom;
    const cx = prev.originX + vs / 2;
    const cy = prev.originY + vs / 2;
    return zoomAround(prev, 1.5, cx, cy);
  });
  const zoomOut = () => setZs((prev) => {
    const vs = SIZE / prev.zoom;
    const cx = prev.originX + vs / 2;
    const cy = prev.originY + vs / 2;
    return zoomAround(prev, 1 / 1.5, cx, cy);
  });
  const resetZoom = () => { setZs(DEFAULT_ZOOM); setActiveId(null); };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-center text-sm font-medium text-slate-600 flex-1 truncate">
          中心: {fullLabel}
        </p>
        {/* Zoom controls */}
        <div className="flex shrink-0 items-center gap-1 ml-2">
          {zs.zoom > 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 active:bg-slate-200"
            >
              全体
            </button>
          )}
          <button
            type="button"
            onClick={zoomOut}
            disabled={zs.zoom <= MIN_ZOOM}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-600 disabled:opacity-30 active:bg-slate-200"
            aria-label="縮小"
          >
            −
          </button>
          <span className="w-7 text-center text-xs font-semibold tabular-nums text-slate-500">
            {zs.zoom.toFixed(1)}×
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zs.zoom >= MAX_ZOOM}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-600 disabled:opacity-30 active:bg-slate-200"
            aria-label="拡大"
          >
            ＋
          </button>
        </div>
      </div>

      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="mx-auto h-auto w-full max-w-[360px] cursor-default"
          style={{ touchAction: "none" }}
          role="img"
          aria-label={`${fullLabel}を中心とした当番施設レーダー`}
          onClick={handleSvgClick}
          onMouseLeave={() => setActiveId(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Distance rings */}
          {RING_STEPS.map((step) => (
            <circle key={step} cx={CENTER} cy={CENTER} r={MAX_RADIUS * step}
              fill="none" stroke="#e2e8f0" strokeWidth={1}
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
            <text key={label} x={x} y={y} className="fill-slate-400 text-[10px]" textAnchor="middle">
              {label}
            </text>
          ))}

          {/* Home marker */}
          <circle cx={CENTER} cy={CENTER} r={10} fill="#0ea5e9" />
          <circle cx={CENTER} cy={CENTER} r={14} fill="none" stroke="#0ea5e9" strokeWidth={2} opacity={0.4} />
          <text x={CENTER} y={CENTER + 28} textAnchor="middle" className="fill-sky-700 text-[11px] font-semibold">
            {shortLabel}
          </text>

          {/* Facility dots */}
          {facilities.map((f) => {
            const raw = rawPositions.find((p) => p.id === f.id)!;
            const disp = displayPositions.get(f.id)!;
            const color = f.type === "hospital" ? "#2563eb" : "#16a34a";
            const isActive = activeId === f.id;
            const moved = Math.hypot(disp.x - raw.x, disp.y - raw.y) > 3;
            return (
              <g key={f.id} onMouseEnter={() => setActiveId(f.id)} style={{ cursor: "pointer" }}>
                <line x1={CENTER} y1={CENTER} x2={raw.x} y2={raw.y}
                  stroke={color} strokeWidth={1} opacity={0.18} />
                {moved && (
                  <>
                    <line x1={raw.x} y1={raw.y} x2={disp.x} y2={disp.y}
                      stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.35} />
                    <circle cx={raw.x} cy={raw.y} r={2.5} fill={color} opacity={0.4} />
                  </>
                )}
                <circle cx={disp.x} cy={disp.y} r={isActive ? 9 : 7}
                  fill={color} stroke="#fff" strokeWidth={2} />
              </g>
            );
          })}

          {/* Tooltip (on top) */}
          {activeFacility && (() => {
            const disp = displayPositions.get(activeFacility.id)!;
            return <TooltipLabel cx={disp.x} cy={disp.y} name={activeFacility.name} distanceKm={activeFacility.distanceKm} />;
          })()}
        </svg>

        {/* Zoom hint when at default */}
        {zs.zoom === 1 && facilities.length > 0 && (
          <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] text-slate-300">
            ピンチまたは ＋ でズーム
          </p>
        )}
      </div>

      <div className="mt-2 flex justify-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />病院
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600" />薬局
        </span>
      </div>
    </div>
  );
}
