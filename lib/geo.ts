const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** ヒュベニの公式による直線距離（km） */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 起点から施設への方角（0°=北、時計回り） */
export function bearingDeg(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistanceKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function buildGoogleMapsDirectionsUrl(
  name: string,
  address: string,
  originLat?: number,
  originLng?: number
): string {
  const destination = encodeURIComponent(`${name} ${address}`);
  if (originLat !== undefined && originLng !== undefined) {
    // Path format with precise coordinates — most reliable across web and native app
    return `https://www.google.com/maps/dir/${originLat},${originLng}/${destination}/`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/** レーダー上の座標（SVG中心原点、北=上） */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  bearing: number
): { x: number; y: number } {
  const rad = toRad(bearing);
  return {
    x: centerX + radius * Math.sin(rad),
    y: centerY - radius * Math.cos(rad),
  };
}
