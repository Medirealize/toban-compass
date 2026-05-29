export interface TownOption {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface GeoloniaTownRow {
  town: string;
  koaza?: string;
  lat: number;
  lng: number;
}

export async function loadTownsByMunicipality(
  prefectureName: string,
  municipalityName: string
): Promise<TownOption[]> {
  const pref = encodeURIComponent(prefectureName);
  const city = encodeURIComponent(municipalityName);
  const url = `https://geolonia.github.io/japanese-addresses/api/ja/${pref}/${city}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("町・字データの読み込みに失敗しました");
  }

  const rows = (await res.json()) as GeoloniaTownRow[];
  const map = new Map<string, TownOption>();

  for (const row of rows) {
    const town = row.town?.trim();
    if (!town) continue;
    const koaza = row.koaza?.trim();
    const name = koaza ? `${town} ${koaza}` : town;
    const id = `${town}::${koaza ?? ""}`;
    if (!map.has(id)) {
      map.set(id, {
        id,
        name,
        lat: Number(row.lat),
        lng: Number(row.lng),
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ja", { sensitivity: "base" })
  );
}

export function filterTowns(options: TownOption[], query: string): TownOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((item) => item.name.toLowerCase().includes(q));
}
