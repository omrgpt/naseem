import type { WindForecast } from './domain';

export type HourlyCondition = WindForecast & { time: string; temperature: number; apparentTemperature: number };
export type AirQuality = { pm25: number; usAqi: number };
export type BahrainConditions = { temperature: number; apparentTemperature: number; wind: WindForecast; hourly: HourlyCondition[]; airQuality?: AirQuality; fetchedAt: string; source: 'Open-Meteo' | 'fallback' };
const fallback: BahrainConditions = { temperature: 31, apparentTemperature: 33, wind: { speed: 18, directionFrom: 330, gusts: 29 }, hourly: [], fetchedAt: new Date().toISOString(), source: 'fallback' };
export const WEATHER_CACHE_TTL_MS = 10 * 60_000;
const WEATHER_CACHE_MAX_ENTRIES = 64;
const weatherCache = new Map<string, { expiresAt: number; value: BahrainConditions }>();
const pendingWeather = new Map<string, Promise<BahrainConditions>>();

export function weatherGridKey(latitude: number, longitude: number) { return `${latitude.toFixed(2)},${longitude.toFixed(2)}`; }

export async function getBahrainConditions(latitude = 26.2235, longitude = 50.5876): Promise<BahrainConditions> {
  const key = weatherGridKey(latitude, longitude);
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = pendingWeather.get(key);
  if (pending) return pending;
  const request = fetchBahrainConditions(latitude, longitude).then((value) => {
    if (value.source !== 'fallback') {
      while (weatherCache.size >= WEATHER_CACHE_MAX_ENTRIES) weatherCache.delete(weatherCache.keys().next().value as string);
      weatherCache.set(key, { value, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS });
    }
    return value;
  }).finally(() => pendingWeather.delete(key));
  pendingWeather.set(key, request);
  return request;
}

async function fetchBahrainConditions(latitude: number, longitude: number): Promise<BahrainConditions> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: latitude.toFixed(4), longitude: longitude.toFixed(4), current: 'temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m', hourly: 'temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m', forecast_days: '2', wind_speed_unit: 'kmh', timezone: 'Asia/Bahrain' }).toString();
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error('Weather unavailable');
    const data = await response.json();
    const hourly = (data.hourly?.time ?? []).map((time: string, index: number) => ({ time, temperature: data.hourly.temperature_2m[index], apparentTemperature: data.hourly.apparent_temperature[index], speed: data.hourly.wind_speed_10m[index], directionFrom: data.hourly.wind_direction_10m[index], gusts: data.hourly.wind_gusts_10m[index] })).filter((item: HourlyCondition) => Number.isFinite(item.speed));
    let airQuality: AirQuality | undefined;
    try {
      const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
      airUrl.search = new URLSearchParams({ latitude: latitude.toFixed(4), longitude: longitude.toFixed(4), current: 'pm2_5,us_aqi', timezone: 'Asia/Bahrain' }).toString();
      const airResponse = await fetchWithTimeout(airUrl, 4_000);
      if (airResponse.ok) {
        const air = await airResponse.json() as { current?: { pm2_5?: number; us_aqi?: number } };
        if (Number.isFinite(air.current?.pm2_5) && Number.isFinite(air.current?.us_aqi)) airQuality = { pm25: air.current?.pm2_5 as number, usAqi: air.current?.us_aqi as number };
      }
    } catch { airQuality = undefined; }
    return { temperature: data.current.temperature_2m, apparentTemperature: data.current.apparent_temperature, wind: { speed: data.current.wind_speed_10m, directionFrom: data.current.wind_direction_10m, gusts: data.current.wind_gusts_10m }, hourly, airQuality, fetchedAt: data.current.time, source: 'Open-Meteo' };
  } catch { return fallback; }
}

async function fetchWithTimeout(input: URL, milliseconds = 5_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try { return await fetch(input, { signal: controller.signal }); } finally { clearTimeout(timer); }
}
