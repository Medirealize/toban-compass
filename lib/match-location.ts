import type { Municipality, Prefecture } from "./types";
import { normalizeAddressText } from "./address-text";
import type { TownOption } from "./towns";

export function matchPrefecture(
  prefectures: Prefecture[],
  name: string
): Prefecture | undefined {
  const n = normalizeAddressText(name);
  return (
    prefectures.find((p) => normalizeAddressText(p.name) === n) ??
    prefectures.find((p) => n.includes(normalizeAddressText(p.name)))
  );
}

export function matchMunicipality(
  municipalities: Municipality[],
  name: string,
  prefectureName?: string
): Municipality | undefined {
  let n = normalizeAddressText(name);
  if (prefectureName) {
    n = n.replace(normalizeAddressText(prefectureName), "");
  }
  return (
    [...municipalities]
      .sort((a, b) => b.name.length - a.name.length)
      .find((m) => normalizeAddressText(m.name) === n) ??
    [...municipalities]
      .sort((a, b) => b.name.length - a.name.length)
      .find((m) => n.includes(normalizeAddressText(m.name))) ??
    [...municipalities]
      .sort((a, b) => b.name.length - a.name.length)
      .find((m) => normalizeAddressText(m.name).includes(n))
  );
}

export function matchTown(towns: TownOption[], townName: string): TownOption {
  const n = normalizeAddressText(townName);
  return (
    towns.find((t) => normalizeAddressText(t.name) === n) ??
    towns.find((t) => n.includes(normalizeAddressText(t.name))) ??
    towns.find((t) => normalizeAddressText(t.name).includes(n)) ??
    towns[0]
  );
}
