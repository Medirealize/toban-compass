export function normalizeAddressText(value: string): string {
  return value.replace(/[\s　]/g, "").trim();
}
