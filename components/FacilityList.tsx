"use client";

import type { FacilityWithDistance, HomeLocation } from "@/lib/types";
import { buildGoogleMapsDirectionsUrl, formatDistanceKm } from "@/lib/geo";


interface FacilityListProps {
  facilities: FacilityWithDistance[];
  homeLocation: HomeLocation | null;
}

function TypeBadge({ type }: { type: FacilityWithDistance["type"] }) {
  const isHospital = type === "hospital";
  return (
    <span
      className={`inline-flex min-h-[28px] shrink-0 items-center rounded-full px-3 py-1 text-sm font-semibold ${
        isHospital
          ? "bg-blue-100 text-blue-800"
          : "bg-green-100 text-green-800"
      }`}
    >
      {isHospital ? "病院" : "薬局"}
    </span>
  );
}

export function FacilityList({ facilities, homeLocation }: FacilityListProps) {
  if (facilities.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-base text-slate-500">
        当番表をアップロードすると、距離順のリストが表示されます
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {facilities.map((f, index) => (
        <li
          key={f.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <TypeBadge type={f.type} />
                <span className="text-sm font-medium text-sky-700">
                  {formatDistanceKm(f.distanceKm)}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-slate-900">
                {f.name}
              </h3>
              <p className="mt-1 text-base text-slate-600">{f.address}</p>
              <p className="mt-1 text-sm text-slate-500">
                対応時間: {f.hours}
              </p>
              <a
                href={buildGoogleMapsDirectionsUrl(
                  f.lat,
                  f.lng,
                  homeLocation?.lat,
                  homeLocation?.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-base font-semibold text-white transition-colors active:bg-slate-700"
              >
                ここへのルート（Googleマップ）
              </a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
