import type { Language } from './i18n';
import type { ExternalDataFlowDisclosure } from './api';
import type { WindForecast } from './domain';

export type HourlyCondition = WindForecast & {
  time: string;
  temperature: number;
  apparentTemperature: number;
};
export type AirQuality = { pm25: number; usAqi: number };
export type WeatherCacheStatus = 'network' | 'memory' | 'fallback';
export type BahrainConditions = {
  temperature: number;
  apparentTemperature: number;
  wind: WindForecast;
  hourly: HourlyCondition[];
  airQuality?: AirQuality;
  fetchedAt: string;
  source: 'Open-Meteo' | 'fallback';
  cacheStatus?: WeatherCacheStatus;
  error?: string;
};

export const WEATHER_CACHE_TTL_MS = 10 * 60_000;
export const WEATHER_CACHE_KEY_DECIMALS = 2;
export const WEATHER_NETWORK_COORDINATE_DECIMALS = 4;
export const WEATHER_CACHE_MAX_ENTRIES = 64;

export const WEATHER_REFRESH_DISCLOSURE = {
  en: {
    title: 'Before weather refresh',
    body: 'Refreshing weather sends the selected route point coordinates (latitude and longitude) to Open-Meteo for forecast and air-quality data; this is a network request, not a device-location request.',
    providerName: 'Open-Meteo forecast and air-quality APIs',
    providerUrls: [
      'https://api.open-meteo.com/v1/forecast',
      'https://air-quality-api.open-meteo.com/v1/air-quality',
    ],
    coordinates: 'The selected route point is sent to Open-Meteo rounded to four decimal places for the network request; its in-memory cache key groups points to two decimal places.',
    retention: 'Successful results stay in a bounded in-memory cache for 10 minutes; failed results are not cached.',
  },
  ar: {
    title: 'قبل تحديث الطقس',
    body: 'يرسل تحديث الطقس إحداثيات نقطة المسار المحددة (خط العرض وخط الطول) إلى Open-Meteo لبيانات التوقع وجودة الهواء؛ هذا طلب عبر الشبكة وليس طلباً لموقع الجهاز.',
    providerName: 'واجهتا Open-Meteo للتوقعات وجودة الهواء',
    providerUrls: [
      'https://api.open-meteo.com/v1/forecast',
      'https://air-quality-api.open-meteo.com/v1/air-quality',
    ],
    coordinates: 'تُرسل نقطة المسار المحددة إلى Open-Meteo بعد تقريبها إلى أربع منازل عشرية لطلب الشبكة؛ ويجمع مفتاح الذاكرة النقاط إلى منزلتين عشريتين.',
    retention: 'تبقى النتائج الناجحة في ذاكرة محدودة لمدة 10 دقائق؛ ولا تُحفظ النتائج الفاشلة في الذاكرة المؤقتة.',
  },
} as const satisfies Record<Language, ExternalDataFlowDisclosure>;

export function getWeatherRefreshDisclosure(language: Language) {
  return WEATHER_REFRESH_DISCLOSURE[language];
}

export type WeatherRefreshStatus = 'idle' | 'loading' | 'success' | 'error';
export type WeatherRefreshState = {
  status: WeatherRefreshStatus;
  conditions: BahrainConditions | null;
  updatedAt: string | null;
  error: string | null;
  canRetry: boolean;
};

export function createWeatherRefreshState(
  conditions: BahrainConditions | null = null,
): WeatherRefreshState {
  const successful = conditions?.source === 'Open-Meteo' && !conditions.error;
  return {
    status: !conditions ? 'idle' : successful ? 'success' : 'error',
    conditions,
    updatedAt: successful ? conditions.fetchedAt : null,
    error: successful ? null : conditions?.error ?? (conditions ? 'Weather unavailable' : null),
    canRetry: Boolean(conditions && !successful),
  };
}

export function beginWeatherRefresh(
  previous: WeatherRefreshState,
): WeatherRefreshState {
  return {
    status: 'loading',
    conditions: previous.conditions,
    updatedAt: previous.updatedAt,
    error: null,
    canRetry: false,
  };
}

export const startWeatherRefresh = beginWeatherRefresh;

export function completeWeatherRefresh(
  previous: WeatherRefreshState,
  conditions: BahrainConditions,
): WeatherRefreshState {
  if (conditions.source !== 'Open-Meteo' || conditions.error) {
    return failWeatherRefresh(
      previous,
      conditions.error ?? 'Weather unavailable',
      conditions,
    );
  }
  return {
    status: 'success',
    conditions,
    updatedAt: conditions.fetchedAt,
    error: null,
    canRetry: false,
  };
}

export function failWeatherRefresh(
  previous: WeatherRefreshState,
  error: unknown,
  fallbackConditions?: BahrainConditions,
): WeatherRefreshState {
  return {
    status: 'error',
    conditions: previous.conditions ?? fallbackConditions ?? null,
    updatedAt: previous.updatedAt,
    error: errorMessage(error),
    canRetry: true,
  };
}

export function retryWeatherRefresh(
  previous: WeatherRefreshState,
): WeatherRefreshState {
  return beginWeatherRefresh(previous);
}

export async function refreshBahrainConditions(
  previous: WeatherRefreshState,
  latitude = 26.2235,
  longitude = 50.5876,
  options: WeatherRequestOptions = {},
): Promise<WeatherRefreshState> {
  const loading = beginWeatherRefresh(previous);
  try {
    const conditions = await getBahrainConditions(latitude, longitude, {
      ...options,
      forceRefresh: options.forceRefresh ?? true,
    });
    return completeWeatherRefresh(loading, conditions);
  } catch (error) {
    return failWeatherRefresh(loading, error);
  }
}

export type WeatherRequestOptions = { forceRefresh?: boolean };
type WeatherCacheEntry = { expiresAt: number; value: BahrainConditions };
const weatherCache = new Map<string, WeatherCacheEntry>();
const pendingWeather = new Map<string, Promise<BahrainConditions>>();

export function weatherGridKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(WEATHER_CACHE_KEY_DECIMALS)},${longitude.toFixed(WEATHER_CACHE_KEY_DECIMALS)}`;
}

export async function getBahrainConditions(
  latitude = 26.2235,
  longitude = 50.5876,
  options: WeatherRequestOptions = {},
): Promise<BahrainConditions> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return fallbackConditions('Weather coordinates are invalid');
  }

  const key = weatherGridKey(latitude, longitude);
  const cached = weatherCache.get(key);
  if (!options.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, cacheStatus: 'memory' };
  }
  if (cached && cached.expiresAt <= Date.now()) weatherCache.delete(key);
  const pending = pendingWeather.get(key);
  if (pending) return pending;

  const request = fetchBahrainConditions(latitude, longitude)
    .then((value) => {
      if (value.source !== 'fallback') {
        while (weatherCache.size >= WEATHER_CACHE_MAX_ENTRIES) {
          const oldest = weatherCache.keys().next().value;
          if (typeof oldest === 'string') weatherCache.delete(oldest);
          else break;
        }
        const cacheValue = { ...value, cacheStatus: 'network' as const };
        weatherCache.set(key, {
          value: cacheValue,
          expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
        });
        return cacheValue;
      }
      return value;
    })
    .finally(() => pendingWeather.delete(key));
  pendingWeather.set(key, request);
  return request;
}

export function clearWeatherCache() {
  weatherCache.clear();
  pendingWeather.clear();
}

export function getWeatherCacheSize() {
  return weatherCache.size;
}

async function fetchBahrainConditions(
  latitude: number,
  longitude: number,
): Promise<BahrainConditions> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: latitude.toFixed(WEATHER_NETWORK_COORDINATE_DECIMALS),
      longitude: longitude.toFixed(WEATHER_NETWORK_COORDINATE_DECIMALS),
      current:
        'temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      hourly:
        'temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
      forecast_days: '2',
      wind_speed_unit: 'kmh',
      timezone: 'Asia/Bahrain',
    }).toString();
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Weather unavailable (${response.status})`);
    const data = (await response.json()) as unknown;
    if (!isRecord(data) || !isRecord(data.current)) {
      throw new Error('Weather response was incomplete');
    }

    const temperature = finiteNumber(data.current.temperature_2m);
    const apparentTemperature = finiteNumber(data.current.apparent_temperature);
    const speed = finiteNumber(data.current.wind_speed_10m);
    const directionFrom = finiteNumber(data.current.wind_direction_10m);
    const gusts = finiteNumber(data.current.wind_gusts_10m);
    const fetchedAt = validDateString(data.current.time) ? data.current.time : null;
    if (
      temperature === null ||
      apparentTemperature === null ||
      speed === null ||
      directionFrom === null ||
      gusts === null ||
      fetchedAt === null
    ) {
      throw new Error('Weather response was incomplete');
    }

    const hourly = parseHourly(data.hourly);
    const airQuality = await fetchAirQuality(latitude, longitude);
    return {
      temperature,
      apparentTemperature,
      wind: { speed, directionFrom, gusts },
      hourly,
      airQuality,
      fetchedAt,
      source: 'Open-Meteo',
      cacheStatus: 'network',
    };
  } catch (error) {
    return fallbackConditions(errorMessage(error));
  }
}

async function fetchAirQuality(
  latitude: number,
  longitude: number,
): Promise<AirQuality | undefined> {
  try {
    const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    airUrl.search = new URLSearchParams({
      latitude: latitude.toFixed(WEATHER_NETWORK_COORDINATE_DECIMALS),
      longitude: longitude.toFixed(WEATHER_NETWORK_COORDINATE_DECIMALS),
      current: 'pm2_5,us_aqi',
      timezone: 'Asia/Bahrain',
    }).toString();
    const airResponse = await fetchWithTimeout(airUrl, 4_000);
    if (!airResponse.ok) return undefined;
    const air = (await airResponse.json()) as unknown;
    if (!isRecord(air) || !isRecord(air.current)) return undefined;
    const pm25 = finiteNumber(air.current.pm2_5);
    const usAqi = finiteNumber(air.current.us_aqi);
    return pm25 !== null && usAqi !== null ? { pm25, usAqi } : undefined;
  } catch {
    return undefined;
  }
}

function parseHourly(value: unknown): HourlyCondition[] {
  if (!isRecord(value)) return [];
  const times = Array.isArray(value.time) ? value.time : [];
  const temperatures = Array.isArray(value.temperature_2m)
    ? value.temperature_2m
    : [];
  const apparentTemperatures = Array.isArray(value.apparent_temperature)
    ? value.apparent_temperature
    : [];
  const speeds = Array.isArray(value.wind_speed_10m) ? value.wind_speed_10m : [];
  const directions = Array.isArray(value.wind_direction_10m)
    ? value.wind_direction_10m
    : [];
  const gusts = Array.isArray(value.wind_gusts_10m) ? value.wind_gusts_10m : [];
  const hourly: HourlyCondition[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index];
    const temperature = finiteNumber(temperatures[index]);
    const apparentTemperature = finiteNumber(apparentTemperatures[index]);
    const speed = finiteNumber(speeds[index]);
    const directionFrom = finiteNumber(directions[index]);
    const gust = finiteNumber(gusts[index]);
    if (
      typeof time !== 'string' ||
      temperature === null ||
      apparentTemperature === null ||
      speed === null ||
      directionFrom === null
    ) {
      continue;
    }
    hourly.push({
      time,
      temperature,
      apparentTemperature,
      speed,
      directionFrom,
      ...(gust === null ? {} : { gusts: gust }),
    });
  }
  return hourly;
}

function fallbackConditions(error?: string): BahrainConditions {
  return {
    temperature: 31,
    apparentTemperature: 33,
    wind: { speed: 18, directionFrom: 330, gusts: 29 },
    hourly: [],
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
    cacheStatus: 'fallback',
    ...(error ? { error } : {}),
  };
}

async function fetchWithTimeout(input: URL, milliseconds = 5_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(input, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function validDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Weather unavailable';
}
