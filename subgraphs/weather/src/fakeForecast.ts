// A stand-in for a third-party forecast API. Like a real one, it takes a
// location and a date and knows nothing about projects. The same inputs always
// return the same one-line summary, with no network and no randomness.
//
//   forecastFor(45.5231, -122.6765, '2026-10-07')  ->  'Overcast, high 58°F, 30% chance of rain'

const SKIES = ['Clear', 'Partly cloudy', 'Overcast', 'Showers'];

export function forecastFor(latitude: number, longitude: number, date: string): string {
  // Round to ~1 km so tiny coordinate differences give the same forecast.
  const n = hash(`${latitude.toFixed(2)},${longitude.toFixed(2)}:${date}`);
  const sky = SKIES[n % SKIES.length]!;
  const highF = 50 + (n % 45); // 50–94°F
  const rainChance = (n % 11) * 10; // 0–100%, in steps of 10
  return `${sky}, high ${highF}°F, ${rainChance}% chance of rain`;
}

// FNV-1a: a small, stable string hash (deterministic across runs and machines).
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
