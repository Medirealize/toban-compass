"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MUNICIPALITY_ID,
  DEFAULT_PREFECTURE_ID,
  getDefaultLocationSelection,
} from "@/lib/locations";
import { bearingDeg, haversineDistanceKm } from "@/lib/geo";
import type { Facility, FacilityWithDistance, HomeLocation } from "@/lib/types";
import { HomeLocationSelector } from "@/components/HomeLocationSelector";
import type { HomeLocationSelection } from "@/components/HomeLocationSelector";
import { RadarChart } from "@/components/RadarChart";
import { FacilityList } from "@/components/FacilityList";
import { ScheduleUploader } from "@/components/ScheduleUploader";
import type { ParseResult } from "@/components/ScheduleUploader";
import { ManualFacilityAdder } from "@/components/ManualFacilityAdder";
import { ParsedFacilityManager } from "@/components/ParsedFacilityManager";

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

function maxDist(list: FacilityWithDistance[]): number {
  return list.length > 0 ? Math.max(...list.map((f) => f.distanceKm)) : 10;
}

/** GPS座標をHomeLocation型として扱うためのアダプタ */
function gpsToHomeLocation(lat: number, lng: number): HomeLocation {
  return {
    prefectureId: "",
    prefectureName: "",
    municipalityId: "",
    municipalityName: "",
    townName: "現在地",
    lat,
    lng,
  };
}

export default function HomePage() {
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [locationSelection, setLocationSelection] =
    useState<HomeLocationSelection>({
      prefectureId: DEFAULT_PREFECTURE_ID,
      municipalityId: DEFAULT_MUNICIPALITY_ID,
      townId: "",
    });
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [manualFacilities, setManualFacilities] = useState<Facility[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // 現在地GPS
  const [gpsLocation, setGpsLocation] = useState<HomeLocation | null>(null);
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultLocationSelection().then(({ location, townId }) => {
      setHomeLocation(location);
      setLocationSelection({
        prefectureId: location.prefectureId,
        municipalityId: location.municipalityId,
        townId,
      });
    });
  }, []);

  const handleRequestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("このブラウザは位置情報に対応していません");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    setGpsAccuracyM(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation(
          gpsToHomeLocation(pos.coords.latitude, pos.coords.longitude)
        );
        setGpsAccuracyM(pos.coords.accuracy);
        setGpsLoading(false);
      },
      () => {
        setGpsError("位置情報を取得できませんでした。\nブラウザの許可設定を確認してください。");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // スケジュール + 手動のマージ
  const allFacilities = useMemo(
    () => [...facilities, ...manualFacilities],
    [facilities, manualFacilities]
  );

  // お住まいエリア基準
  const homeFacilities = useMemo(
    () =>
      homeLocation
        ? enrichFacilities(allFacilities, homeLocation.lat, homeLocation.lng)
        : [],
    [allFacilities, homeLocation]
  );

  // 現在地基準
  const gpsFacilities = useMemo(
    () =>
      gpsLocation
        ? enrichFacilities(allFacilities, gpsLocation.lat, gpsLocation.lng)
        : [],
    [allFacilities, gpsLocation]
  );

  const handleManualAdd = useCallback((facility: Facility) => {
    setManualFacilities((prev) => [...prev, facility]);
  }, []);

  const handleManualRemove = useCallback((id: string) => {
    setManualFacilities((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleManualUpdate = useCallback((id: string, updated: Facility) => {
    setManualFacilities((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }, []);

  const handleParsedRemove = useCallback((id: string) => {
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleParsedClear = useCallback(() => {
    setFacilities([]);
  }, []);

  const handleLocationChange = useCallback(
    (selection: HomeLocationSelection, location: HomeLocation) => {
      setLocationSelection(selection);
      setHomeLocation(location);
    },
    []
  );

  const handleParseFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseResult(null);

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
      const sourceLabel = file.name.startsWith("pasted-")
        ? "貼り付け画像"
        : file.name;

      if (data.facilities?.length) {
        setFacilities(data.facilities);
        if (data.notice) {
          setParseResult({
            status: "warning",
            title: "読み込み完了（注意あり）",
            detail: data.notice,
            count: data.facilities.length,
          });
        } else {
          setParseResult({
            status: "success",
            title: "読み込み成功",
            detail: `${sourceLabel}から ${data.facilities.length} 件の当番施設を読み込みました`,
            count: data.facilities.length,
          });
        }
      } else {
        throw new Error("施設データが空です");
      }
    } catch (e) {
      setParseResult({
        status: "error",
        title: "読み込み失敗",
        detail:
          e instanceof Error ? e.message : "解析中にエラーが発生しました",
      });
    } finally {
      setIsParsing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="w-12" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              どこ近？
            </h1>
            <p className="text-xs text-slate-500">
              近い場所を、距離レーダーで比べよう
            </p>
          </div>
          <a
            href="/howto"
            className="flex h-9 w-12 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 text-sm font-medium"
            aria-label="使い方"
          >
            使い方
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        {/* 現在地取得（任意・先に取得しておくと施設一覧に距離が表示される） */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xl">📍</span>
          <div className="flex-1 min-w-0">
            {gpsLocation ? (
              <>
                <p className="text-sm font-semibold text-emerald-700">現在地取得済み</p>
                {gpsAccuracyM !== null && (
                  <p className={`text-xs ${gpsAccuracyM > 3000 ? "text-amber-600" : "text-slate-400"}`}>
                    {gpsAccuracyM > 3000
                      ? `⚠️ 精度が低い（±${(gpsAccuracyM / 1000).toFixed(1)}km）— MacはWiFi/IP測位のため誤差が大きい場合があります`
                      : `精度 ±${gpsAccuracyM < 1000 ? `${Math.round(gpsAccuracyM)}m` : `${(gpsAccuracyM / 1000).toFixed(1)}km`}`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">現在地を取得</p>
                <p className="text-xs text-slate-400">取得すると施設一覧に距離が表示されます</p>
              </>
            )}
            {gpsError && (
              <p className="mt-0.5 text-xs text-red-600">{gpsError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRequestGps}
            disabled={gpsLoading}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
              gpsLocation
                ? "bg-slate-100 text-slate-600"
                : "bg-emerald-600 text-white"
            }`}
          >
            {gpsLoading ? "取得中…" : gpsLocation ? "再取得" : "取得"}
          </button>
        </div>

        <section aria-label="お住まいエリア">
          <h2 className="mb-2 text-base font-semibold text-slate-700">
            お住まいエリア
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
                parseResult={parseResult}
              />
            </div>

            {facilities.length > 0 && (
              <div className="mt-3">
                <ParsedFacilityManager
                  facilities={facilities}
                  gpsLocation={gpsLocation}
                  onRemove={handleParsedRemove}
                  onClear={handleParsedClear}
                />
              </div>
            )}

            <div className="mt-4">
              <ManualFacilityAdder
                facilities={manualFacilities}
                gpsLocation={gpsLocation}
                regionHint={
                  homeLocation
                    ? `${homeLocation.prefectureName}${homeLocation.municipalityName}`
                    : undefined
                }
                onAdd={handleManualAdd}
                onRemove={handleManualRemove}
                onUpdate={handleManualUpdate}
              />
            </div>

            {/* ── 2つのレーダー ── */}
            <section className="mt-6" aria-label="距離レーダー">
              <h2 className="mb-3 text-base font-semibold text-slate-700">
                距離レーダー
              </h2>
              {/* スマホ: 縦積み（現在地→お住まい）/ PC: 横並び */}
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-3">

                {/* 上/左: 現在地基準（先に表示） */}
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs font-semibold text-emerald-700">
                    現在地基準
                  </p>
                  {gpsLocation ? (
                    <>
                      <RadarChart
                        homeLocation={gpsLocation}
                        facilities={gpsFacilities}
                        maxDistanceKm={maxDist(gpsFacilities)}
                      />
                      {gpsFacilities[0] && (
                        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800">
                          最寄り: <span className="font-semibold">{gpsFacilities[0].name}</span>
                          <br />
                          {gpsFacilities[0].distanceKm.toFixed(1)} km
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleRequestGps}
                        className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-500 active:bg-slate-200"
                      >
                        位置情報を再取得
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-8 text-center">
                      <p className="text-xs leading-relaxed text-slate-500">
                        現在地から各施設の方向・距離を表示します
                      </p>
                      <button
                        type="button"
                        onClick={handleRequestGps}
                        disabled={gpsLoading}
                        className="min-h-[40px] w-full rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {gpsLoading ? "取得中…" : "現在地を取得"}
                      </button>
                      {gpsError && (
                        <p className="whitespace-pre-line text-xs text-red-600">
                          {gpsError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 下/右: お住まいエリア基準 */}
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs font-semibold text-sky-700">
                    お住まいエリア基準
                  </p>
                  <RadarChart
                    homeLocation={homeLocation}
                    facilities={homeFacilities}
                    maxDistanceKm={maxDist(homeFacilities)}
                  />
                  {homeFacilities[0] && (
                    <p className="rounded-xl bg-sky-50 px-3 py-2 text-center text-xs text-sky-800">
                      最寄り: <span className="font-semibold">{homeFacilities[0].name}</span>
                      <br />
                      {homeFacilities[0].distanceKm.toFixed(1)} km
                    </p>
                  )}
                </div>

              </div>
            </section>

            {/* ── 距離順リスト（お住まいエリア基準） ── */}
            <section className="mt-6" aria-label="距離順リスト">
              <h2 className="mb-2 text-base font-semibold text-slate-700">
                距離が近い順
                <span className="ml-2 text-xs font-normal text-slate-400">
                  お住まいエリア基準
                </span>
              </h2>
              <FacilityList
                facilities={homeFacilities}
                homeLocation={homeLocation}
                gpsLocation={gpsLocation}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
