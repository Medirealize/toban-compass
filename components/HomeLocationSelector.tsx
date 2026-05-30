"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadMunicipalities,
  loadPrefectures,
  resolveHomeLocation,
} from "@/lib/locations";
import {
  matchMunicipality,
  matchPrefecture,
  findTown,
} from "@/lib/match-location";
import { loadTownsByMunicipality, type TownOption } from "@/lib/towns";
import type { HomeLocation, Municipality, Prefecture } from "@/lib/types";
import { formatHomeLocationLabel } from "@/lib/types";

export interface HomeLocationSelection {
  prefectureId: string;
  municipalityId: string;
  townId: string;
}

interface HomeLocationSelectorProps {
  value: HomeLocationSelection;
  onChange: (selection: HomeLocationSelection, location: HomeLocation) => void;
}

const selectClassName =
  "min-h-[52px] w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

export function HomeLocationSelector({
  value,
  onChange,
}: HomeLocationSelectorProps) {
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [rawAddress, setRawAddress] = useState("");
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isLoadingTowns, setIsLoadingTowns] = useState(true);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const initialTownSyncedRef = useRef(false);

  useEffect(() => {
    loadPrefectures()
      .then(setPrefectures)
      .catch(() => setLoadError("都道府県データの読み込みに失敗しました"))
      .finally(() => setIsLoadingPrefs(false));
  }, []);

  useEffect(() => {
    if (!value.prefectureId) return;
    setIsLoadingCities(true);
    loadMunicipalities(value.prefectureId)
      .then(setMunicipalities)
      .catch(() => setLoadError("市区町村データの読み込みに失敗しました"))
      .finally(() => setIsLoadingCities(false));
  }, [value.prefectureId]);

  const prefecture = useMemo(
    () => prefectures.find((p) => p.id === value.prefectureId),
    [prefectures, value.prefectureId]
  );

  const municipality = useMemo(
    () => municipalities.find((m) => m.id === value.municipalityId),
    [municipalities, value.municipalityId]
  );

  const selectedTown = useMemo(
    () => towns.find((item) => item.id === value.townId),
    [towns, value.townId]
  );

  const notifyChange = useCallback(
    (pref: Prefecture, muni: Municipality, town: TownOption) => {
      onChange(
        { prefectureId: pref.id, municipalityId: muni.id, townId: town.id },
        {
          ...resolveHomeLocation(pref, muni),
          townName: town.name,
          lat: town.lat,
          lng: town.lng,
        }
      );
    },
    [onChange]
  );

  useEffect(() => {
    if (!prefecture || !municipality) return;
    let cancelled = false;
    setIsLoadingTowns(true);
    loadTownsByMunicipality(prefecture.name, municipality.name)
      .then((nextTowns) => {
        if (cancelled) return;
        setTowns(nextTowns);
      })
      .catch(() => {
        if (cancelled) return;
        setTowns([
          {
            id: municipality.id,
            name: municipality.name,
            lat: municipality.lat,
            lng: municipality.lng,
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTowns(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prefecture?.id, municipality?.id]);

  // 初回のみ、町字未選択なら先頭を起点に設定（以降の自動上書きはしない）
  useEffect(() => {
    if (
      initialTownSyncedRef.current ||
      !prefecture ||
      !municipality ||
      isLoadingTowns ||
      towns.length === 0 ||
      value.townId
    ) {
      return;
    }
    initialTownSyncedRef.current = true;
    notifyChange(prefecture, municipality, towns[0]);
  }, [
    isLoadingTowns,
    municipality,
    notifyChange,
    prefecture,
    towns,
    value.townId,
  ]);

  const handlePrefectureChange = async (prefectureId: string) => {
    const pref = prefectures.find((p) => p.id === prefectureId);
    if (!pref) return;
    const cities = await loadMunicipalities(prefectureId);
    setMunicipalities(cities);
    const muni = cities[0];
    const nextTowns = await loadTownsByMunicipality(pref.name, muni.name).catch(
      () => [{ id: muni.id, name: muni.name, lat: muni.lat, lng: muni.lng }]
    );
    setTowns(nextTowns);
    notifyChange(pref, muni, nextTowns[0]);
  };

  const handleMunicipalityChange = async (municipalityId: string) => {
    if (!prefecture) return;
    const muni = municipalities.find((m) => m.id === municipalityId);
    if (!muni) return;
    const nextTowns = await loadTownsByMunicipality(prefecture.name, muni.name).catch(
      () => [{ id: muni.id, name: muni.name, lat: muni.lat, lng: muni.lng }]
    );
    setTowns(nextTowns);
    notifyChange(prefecture, muni, nextTowns[0]);
  };

  const handleTownChange = (townId: string) => {
    if (!prefecture || !municipality) return;
    const town = towns.find((item) => item.id === townId);
    if (!town) return;
    notifyChange(prefecture, municipality, town);
  };

  const handleSearchAddress = async () => {
    if (!rawAddress.trim()) return;
    setAddressError(null);
    setAddressNotice(null);
    setIsResolvingAddress(true);
    try {
      const res = await fetch("/api/resolve-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "住所の検索に失敗しました");
      }

      const matchedPref = matchPrefecture(prefectures, data.prefectureName);
      if (!matchedPref) throw new Error("都道府県を特定できませんでした");

      const nextMunicipalities = await loadMunicipalities(matchedPref.id);
      setMunicipalities(nextMunicipalities);
      const matchedMunicipality = matchMunicipality(
        nextMunicipalities,
        data.municipalityName,
        matchedPref.name
      );
      if (!matchedMunicipality) {
        throw new Error("市区町村を特定できませんでした");
      }

      const nextTowns = await loadTownsByMunicipality(
        matchedPref.name,
        matchedMunicipality.name
      ).catch(() => [
        {
          id: matchedMunicipality.id,
          name: matchedMunicipality.name,
          lat: matchedMunicipality.lat,
          lng: matchedMunicipality.lng,
        },
      ]);
      setTowns(nextTowns);

      const matchedTown = findTown(nextTowns, data.townName);
      const town: TownOption = matchedTown
        ? { ...matchedTown }
        : {
            id:
              typeof data.townId === "string" && data.townId
                ? data.townId
                : `${data.townName}::`,
            name: data.townName,
            lat: matchedMunicipality.lat,
            lng: matchedMunicipality.lng,
          };

      if (typeof data.lat === "number" && typeof data.lng === "number") {
        town.lat = data.lat;
        town.lng = data.lng;
      }

      notifyChange(matchedPref, matchedMunicipality, town);

      if (data.notice) {
        setAddressNotice(data.notice);
      } else {
        setAddressNotice("住所を特定しました。");
      }
    } catch (e) {
      setAddressError(
        e instanceof Error ? e.message : "住所の検索に失敗しました"
      );
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const resolved =
    prefecture && municipality && selectedTown
      ? {
          ...resolveHomeLocation(prefecture, municipality),
          townName: selectedTown.name,
          lat: selectedTown.lat,
          lng: selectedTown.lng,
        }
      : null;

  if (loadError) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <label
          htmlFor="raw-address"
          className="mb-1.5 block text-sm font-medium text-slate-600"
        >
          住所入力
        </label>
        <input
          id="raw-address"
          value={rawAddress}
          onChange={(e) => setRawAddress(e.target.value)}
          placeholder="例: 東京都新宿区、大阪府大阪市北区、名古屋市中区"
          className="min-h-[48px] w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <button
          type="button"
          onClick={() => void handleSearchAddress()}
          disabled={isResolvingAddress || isLoadingPrefs}
          className="mt-2 min-h-[44px] w-full rounded-xl bg-sky-600 px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
        >
          {isResolvingAddress ? "検索中…" : "住所を検索"}
        </button>
        {addressError && (
          <p className="mt-2 text-sm text-red-600">{addressError}</p>
        )}
        {addressNotice && !addressError && (
          <p className="mt-2 text-sm text-amber-700">{addressNotice}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="prefecture-select"
          className="mb-1.5 block text-sm font-medium text-slate-600"
        >
          都道府県
        </label>
        <select
          id="prefecture-select"
          value={value.prefectureId}
          onChange={(e) => void handlePrefectureChange(e.target.value)}
          disabled={isLoadingPrefs}
          className={selectClassName}
        >
          {isLoadingPrefs ? (
            <option>読み込み中…</option>
          ) : (
            <>
              <option value="">都道府県を選択</option>
              {prefectures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="municipality-select"
          className="mb-1.5 block text-sm font-medium text-slate-600"
        >
          市区町村
          {!isLoadingCities && (
            <span className="ml-2 font-normal text-slate-400">
              （{municipalities.length}件）
            </span>
          )}
        </label>
        <select
          id="municipality-select"
          value={value.municipalityId}
          onChange={(e) => void handleMunicipalityChange(e.target.value)}
          disabled={isLoadingCities || municipalities.length === 0}
          className={selectClassName}
        >
          {isLoadingCities ? (
            <option>読み込み中…</option>
          ) : (
            <>
              {municipalities.length > 0 && <option value="">市区町村を選択</option>}
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="town-select"
          className="mb-1.5 block text-sm font-medium text-slate-600"
        >
          町・字
          {!isLoadingTowns && (
            <span className="ml-2 font-normal text-slate-400">
              （{towns.length}件）
            </span>
          )}
        </label>
        <select
          id="town-select"
          value={value.townId}
          onChange={(e) => handleTownChange(e.target.value)}
          disabled={isLoadingTowns || towns.length === 0}
          className={selectClassName}
        >
          {isLoadingTowns ? (
            <option>読み込み中…</option>
          ) : (
            towns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))
          )}
        </select>
      </div>

      {resolved && (
        <div className="rounded-xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
          <p className="text-sm text-sky-700">選択中のエリア</p>
          <p className="mt-0.5 text-lg font-bold text-sky-900">
            {formatHomeLocationLabel(resolved)}
          </p>
        </div>
      )}
    </div>
  );
}
