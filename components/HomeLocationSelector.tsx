"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterMunicipalities,
  loadMunicipalities,
  loadPrefectures,
  resolveHomeLocation,
} from "@/lib/locations";
import { filterTowns, loadTownsByMunicipality, type TownOption } from "@/lib/towns";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [townSearchQuery, setTownSearchQuery] = useState("");
  const [rawAddress, setRawAddress] = useState("");
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isLoadingTowns, setIsLoadingTowns] = useState(true);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrefectures()
      .then(setPrefectures)
      .catch(() => setError("都道府県データの読み込みに失敗しました"))
      .finally(() => setIsLoadingPrefs(false));
  }, []);

  useEffect(() => {
    if (!value.prefectureId) return;
    setIsLoadingCities(true);
    setSearchQuery("");
    loadMunicipalities(value.prefectureId)
      .then(setMunicipalities)
      .catch(() => setError("市区町村データの読み込みに失敗しました"))
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

  const filteredMunicipalities = useMemo(
    () => filterMunicipalities(municipalities, searchQuery),
    [municipalities, searchQuery]
  );
  const filteredTowns = useMemo(
    () => filterTowns(towns, townSearchQuery),
    [towns, townSearchQuery]
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
    setIsLoadingTowns(true);
    setTownSearchQuery("");
    loadTownsByMunicipality(prefecture.name, municipality.name)
      .then((nextTowns) => {
        setTowns(nextTowns);
        const matched = nextTowns.find((item) => item.id === value.townId);
        if (!matched && nextTowns[0]) {
          notifyChange(prefecture, municipality, nextTowns[0]);
        }
      })
      .catch(() => {
        const fallback = {
          id: municipality.id,
          name: municipality.name,
          lat: municipality.lat,
          lng: municipality.lng,
        };
        setTowns([fallback]);
        if (value.townId !== fallback.id) {
          notifyChange(prefecture, municipality, fallback);
        }
      })
      .finally(() => setIsLoadingTowns(false));
  }, [municipality, notifyChange, prefecture, value.townId]);

  const handlePrefectureChange = async (prefectureId: string) => {
    const pref = prefectures.find((p) => p.id === prefectureId);
    if (!pref) return;
    const cities = await loadMunicipalities(prefectureId);
    setMunicipalities(cities);
    setSearchQuery("");
    const muni = cities[0];
    const nextTowns = await loadTownsByMunicipality(pref.name, muni.name).catch(
      () => [{ id: muni.id, name: muni.name, lat: muni.lat, lng: muni.lng }]
    );
    setTowns(nextTowns);
    setTownSearchQuery("");
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
    setTownSearchQuery("");
    notifyChange(prefecture, muni, nextTowns[0]);
  };

  const handleTownChange = (townId: string) => {
    if (!prefecture || !municipality) return;
    const town = towns.find((item) => item.id === townId);
    if (!town) return;
    notifyChange(prefecture, municipality, town);
  };

  const handleResolveByGemini = async () => {
    if (!rawAddress.trim()) return;
    setError(null);
    setIsResolvingAddress(true);
    try {
      const res = await fetch("/api/resolve-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gemini住所解析に失敗しました");

      const matchedPref =
        prefectures.find((item) => item.name === data.prefectureName) ??
        prefectures.find((item) => data.prefectureName.includes(item.name));
      if (!matchedPref) throw new Error("都道府県を特定できませんでした");

      const nextMunicipalities = await loadMunicipalities(matchedPref.id);
      setMunicipalities(nextMunicipalities);
      const matchedMunicipality =
        nextMunicipalities.find((item) => item.name === data.municipalityName) ??
        nextMunicipalities.find((item) =>
          data.municipalityName.includes(item.name)
        ) ??
        nextMunicipalities[0];

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

      const matchedTown =
        nextTowns.find((item) => item.name === data.townName) ??
        nextTowns.find((item) => item.name.includes(data.townName)) ??
        nextTowns.find((item) => data.townName.includes(item.name)) ??
        nextTowns[0];

      notifyChange(matchedPref, matchedMunicipality, matchedTown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gemini住所解析に失敗しました");
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

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
        {error}
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
          住所入力（Gemini補助）
        </label>
        <input
          id="raw-address"
          value={rawAddress}
          onChange={(e) => setRawAddress(e.target.value)}
          placeholder="例: 宮崎県宮崎市清武町加納"
          className="min-h-[48px] w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <button
          type="button"
          onClick={() => void handleResolveByGemini()}
          disabled={isResolvingAddress || isLoadingPrefs}
          className="mt-2 min-h-[44px] w-full rounded-xl bg-sky-600 px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
        >
          {isResolvingAddress ? "Gemini解析中…" : "Geminiで住所を解析"}
        </button>
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
            prefectures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="municipality-search"
          className="mb-1.5 block text-sm font-medium text-slate-600"
        >
          市区町村を検索
        </label>
        <input
          id="municipality-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="例: 宮崎市、札幌市中央区"
          disabled={isLoadingCities}
          className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
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
          disabled={isLoadingCities || filteredMunicipalities.length === 0}
          className={selectClassName}
        >
          {isLoadingCities ? (
            <option>読み込み中…</option>
          ) : filteredMunicipalities.length === 0 ? (
            <option>該当なし</option>
          ) : (
            filteredMunicipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="town-search"
          className="mb-1.5 block text-sm font-medium text-slate-600"
        >
          町・字を検索
        </label>
        <input
          id="town-search"
          type="search"
          value={townSearchQuery}
          onChange={(e) => setTownSearchQuery(e.target.value)}
          placeholder="例: 清武町加納"
          disabled={isLoadingTowns}
          className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
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
          disabled={isLoadingTowns || filteredTowns.length === 0}
          className={selectClassName}
        >
          {isLoadingTowns ? (
            <option>読み込み中…</option>
          ) : filteredTowns.length === 0 ? (
            <option>該当なし</option>
          ) : (
            filteredTowns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))
          )}
        </select>
      </div>

      {resolved && (
        <div className="rounded-xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
          <p className="text-sm text-sky-700">選択中の自宅</p>
          <p className="mt-0.5 text-lg font-bold text-sky-900">
            {formatHomeLocationLabel(resolved)}
          </p>
        </div>
      )}
    </div>
  );
}
