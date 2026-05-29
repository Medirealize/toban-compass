"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MUNICIPALITY_ID,
  DEFAULT_PREFECTURE_ID,
  getDefaultHomeLocation,
} from "@/lib/locations";
import { bearingDeg, haversineDistanceKm } from "@/lib/geo";
import { SAMPLE_FACILITIES } from "@/lib/mock-data";
import type { Facility, FacilityWithDistance, HomeLocation } from "@/lib/types";
import { HomeLocationSelector } from "@/components/HomeLocationSelector";
import type { HomeLocationSelection } from "@/components/HomeLocationSelector";
import { RadarChart } from "@/components/RadarChart";
import { FacilityList } from "@/components/FacilityList";
import { ScheduleUploader } from "@/components/ScheduleUploader";

function enrichFacilities(
  facilities: Facility[],
  lat: number,
  lng: number
): FacilityWithDistance[] {
  return facilities
    .map((f) => ({
      ...f,
      distanceKm: haversineDistanceKm(lat, lng, f.lat, f.lng),
      bearingDeg: bearingDeg(lat, lng, f.lat, f.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export default function HomePage() {
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [locationSelection, setLocationSelection] =
    useState<HomeLocationSelection>({
      prefectureId: DEFAULT_PREFECTURE_ID,
      municipalityId: DEFAULT_MUNICIPALITY_ID,
      townId: DEFAULT_MUNICIPALITY_ID,
    });
  const [facilities, setFacilities] = useState<Facility[]>(SAMPLE_FACILITIES);
  const [isParsing, setIsParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);

  useEffect(() => {
    getDefaultHomeLocation().then((loc) => {
      setHomeLocation(loc);
      setLocationSelection({
        prefectureId: loc.prefectureId,
        municipalityId: loc.municipalityId,
        townId: loc.municipalityId,
      });
    });
  }, []);

  const sortedFacilities = useMemo(
    () =>
      homeLocation
        ? enrichFacilities(
            facilities,
            homeLocation.lat,
            homeLocation.lng
          )
        : [],
    [facilities, homeLocation]
  );

  const maxDistanceKm = useMemo(
    () =>
      sortedFacilities.length > 0
        ? Math.max(...sortedFacilities.map((f) => f.distanceKm))
        : 10,
    [sortedFacilities]
  );

  const handleLocationChange = useCallback(
    (selection: HomeLocationSelection, location: HomeLocation) => {
      setLocationSelection(selection);
      setHomeLocation(location);
    },
    []
  );

  const handleParseFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "解析に失敗しました");
      }

      const data = await res.json();
      if (data.facilities?.length) {
        setFacilities(data.facilities);
      }
      const sourceLabel = file.name.startsWith("pasted-")
        ? "貼り付け画像"
        : `「${file.name}」`;
      if (data.notice) {
        setParseMessage(`${sourceLabel}: ${data.notice}`);
      } else if (data.facilities?.length) {
        setParseMessage(
          `${sourceLabel}から ${data.facilities.length} 件を読み込みました`
        );
      } else {
        throw new Error("施設データが空です");
      }
    } catch (e) {
      setParseMessage(
        e instanceof Error ? e.message : "解析中にエラーが発生しました"
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <h1 className="text-center text-xl font-bold text-slate-900">
          休日夜間 当番コンパス
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          患者の自宅から最寄りの当番医・薬局へ
        </p>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        <section aria-label="患者の自宅">
          <h2 className="mb-2 text-base font-semibold text-slate-700">
            患者の自宅
          </h2>
          <HomeLocationSelector
            value={locationSelection}
            onChange={handleLocationChange}
          />
        </section>

        {!homeLocation ? (
          <p className="mt-8 text-center text-slate-500">読み込み中…</p>
        ) : (
          <>
            <div className="mt-6">
              <ScheduleUploader
                onFile={handleParseFile}
                isParsing={isParsing}
                parseMessage={parseMessage}
              />
            </div>

            <section className="mt-6" aria-label="距離レーダー">
              <h2 className="mb-2 text-base font-semibold text-slate-700">
                距離レーダー
              </h2>
              <RadarChart
                homeLocation={homeLocation}
                facilities={sortedFacilities}
                maxDistanceKm={maxDistanceKm}
              />
            </section>

            <section className="mt-6" aria-label="距離順リスト">
              <h2 className="mb-2 text-base font-semibold text-slate-700">
                距離が近い順
              </h2>
              <FacilityList facilities={sortedFacilities} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
