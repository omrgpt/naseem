export const BAHRAIN_TIME_ZONE = 'Asia/Bahrain' as const;

export const BAHRAIN_LOCALES = {
  en: 'en-BH',
  ar: 'ar-BH',
} as const;

export type BahrainInstant = { instant: string; timeZone: typeof BAHRAIN_TIME_ZONE };
export type InstantInput = string | Date | BahrainInstant;
export type BahrainLocale = (typeof BAHRAIN_LOCALES)[keyof typeof BAHRAIN_LOCALES];
export type DepartureDay = 'today' | 'tomorrow';
export type DayRelation = 'today' | 'tomorrow' | 'yesterday' | 'other';
export type DepartureClockTime = { hour: number; minute?: number; second?: number };
export type BahrainTimeFormatOptions = { hour12?: boolean };
export type BahrainDateFormatOptions = Omit<Intl.DateTimeFormatOptions, 'timeZone'>;

export const DEFAULT_DEPARTURE_TIME: Readonly<Required<DepartureClockTime>> = {
  hour: 17,
  minute: 40,
  second: 0,
};

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function localeTag(locale: string): string {
  return locale === 'en' ? BAHRAIN_LOCALES.en : locale === 'ar' ? BAHRAIN_LOCALES.ar : locale;
}

function parseInstant(value: InstantInput): Date {
  const rawValue = typeof value === 'object' && !(value instanceof Date) ? value.instant : value;
  const parsed = rawValue instanceof Date ? new Date(rawValue.getTime()) : new Date(rawValue);
  if (!Number.isFinite(parsed.getTime())) throw new RangeError('Expected a valid instant.');
  return parsed;
}

export function toIsoInstant(value: InstantInput): string {
  return parseInstant(value).toISOString();
}

export function createBahrainInstant(value: InstantInput): BahrainInstant {
  return { instant: toIsoInstant(value), timeZone: BAHRAIN_TIME_ZONE };
}

function getZonedParts(value: InstantInput, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parseInstant(value));
  const part = (type: keyof ZonedParts) => {
    const valuePart = parts.find((item) => item.type === type)?.value;
    if (!valuePart) throw new Error(`Missing ${type} from the localized instant.`);
    return Number(valuePart);
  };
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') };
}

function asUtcMilliseconds(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function localDateTimeToInstant(parts: ZonedParts, timeZone: string): string {
  const localAsUtc = asUtcMilliseconds(parts);
  let candidate = new Date(localAsUtc);

  // Iterating lets the conversion follow the zone's actual offset instead of
  // assuming a fixed Bahrain offset. Asia/Bahrain is currently UTC+03:00.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = getZonedParts(candidate, timeZone);
    const offset = asUtcMilliseconds(observed) - candidate.getTime();
    const adjusted = new Date(localAsUtc - offset);
    if (adjusted.getTime() === candidate.getTime()) return adjusted.toISOString();
    candidate = adjusted;
  }

  return candidate.toISOString();
}

function shiftedCalendarDate(parts: ZonedParts, days: number): Pick<ZonedParts, 'year' | 'month' | 'day'> {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function validateClockTime(time: DepartureClockTime): Required<DepartureClockTime> {
  const normalized = { hour: time.hour, minute: time.minute ?? 0, second: time.second ?? 0 };
  if (!Number.isInteger(normalized.hour) || normalized.hour < 0 || normalized.hour > 23) throw new RangeError('Departure hour must be between 0 and 23.');
  if (!Number.isInteger(normalized.minute) || normalized.minute < 0 || normalized.minute > 59) throw new RangeError('Departure minute must be between 0 and 59.');
  if (!Number.isInteger(normalized.second) || normalized.second < 0 || normalized.second > 59) throw new RangeError('Departure second must be between 0 and 59.');
  return normalized;
}

export function departureInstant(day: DepartureDay, time?: DepartureClockTime, referenceInstant?: InstantInput): string;
export function departureInstant(day: DepartureDay, hour?: number, referenceInstant?: InstantInput): string;
export function departureInstant(day: DepartureDay, hour?: number, minute?: number, referenceInstant?: InstantInput): string;
export function departureInstant(
  day: DepartureDay,
  timeOrHour: DepartureClockTime | number = DEFAULT_DEPARTURE_TIME,
  minuteOrReference: number | InstantInput = DEFAULT_DEPARTURE_TIME.minute,
  referenceInstant: InstantInput = new Date(),
): string {
  if (day !== 'today' && day !== 'tomorrow') throw new RangeError('Departure day must be today or tomorrow.');

  let time: DepartureClockTime;
  let reference: InstantInput;
  if (typeof timeOrHour === 'number') {
    time = { hour: timeOrHour, minute: typeof minuteOrReference === 'number' ? minuteOrReference : DEFAULT_DEPARTURE_TIME.minute };
    reference = typeof minuteOrReference === 'number' ? referenceInstant : minuteOrReference;
  } else {
    time = timeOrHour;
    reference = typeof minuteOrReference === 'number' ? referenceInstant : minuteOrReference;
  }

  const clock = validateClockTime(time);
  const referenceParts = getZonedParts(reference, BAHRAIN_TIME_ZONE);
  const calendarDate = shiftedCalendarDate(referenceParts, day === 'tomorrow' ? 1 : 0);
  return localDateTimeToInstant({ ...calendarDate, ...clock }, BAHRAIN_TIME_ZONE);
}

export const getDepartureInstant = departureInstant;
export const createDepartureInstant = departureInstant;

function calendarDayNumber(value: InstantInput, timeZone: string): number {
  const parts = getZonedParts(value, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

export function dayRelation(value: InstantInput, referenceInstant: InstantInput = new Date()): DayRelation {
  const difference = calendarDayNumber(value, BAHRAIN_TIME_ZONE) - calendarDayNumber(referenceInstant, BAHRAIN_TIME_ZONE);
  if (difference === 0) return 'today';
  if (difference === 1) return 'tomorrow';
  if (difference === -1) return 'yesterday';
  return 'other';
}

export const getDayRelation = dayRelation;

export function formatBahrainTime(value: InstantInput, locale: string = BAHRAIN_LOCALES.en, options: BahrainTimeFormatOptions = {}): string {
  const formatterOptions: Intl.DateTimeFormatOptions = { timeZone: BAHRAIN_TIME_ZONE, hour: 'numeric', minute: '2-digit' };
  if (options.hour12 !== undefined) formatterOptions.hour12 = options.hour12;
  return new Intl.DateTimeFormat(localeTag(locale), formatterOptions).format(parseInstant(value));
}

export function formatBahrainDate(value: InstantInput, locale: string = BAHRAIN_LOCALES.en, options: BahrainDateFormatOptions = {}): string {
  const formatterOptions: Intl.DateTimeFormatOptions = options.dateStyle
    ? { ...options }
    : { weekday: 'long', day: 'numeric', month: 'short', ...options };
  return new Intl.DateTimeFormat(localeTag(locale), { ...formatterOptions, timeZone: BAHRAIN_TIME_ZONE }).format(parseInstant(value));
}

export function formatBahrainDateTime(value: InstantInput, locale: string = BAHRAIN_LOCALES.en, options: BahrainDateFormatOptions = {}): string {
  const formatterOptions: Intl.DateTimeFormatOptions = options.dateStyle || options.timeStyle
    ? { ...options }
    : { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...options };
  return new Intl.DateTimeFormat(localeTag(locale), { ...formatterOptions, timeZone: BAHRAIN_TIME_ZONE }).format(parseInstant(value));
}

export function formatNumber(value: number, locale: string = BAHRAIN_LOCALES.en, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(localeTag(locale), options).format(value);
}

export type AnalysisKeyInput = {
  routeId: string;
  revision: number;
  departureAt?: InstantInput;
  departureInstant?: InstantInput;
  zone?: string;
  timeZone?: string;
};

export function analysisKey(input: AnalysisKeyInput): string;
export function analysisKey(routeId: string, revision: number, departureAt: InstantInput, timeZone?: string): string;
export function analysisKey(
  inputOrRouteId: AnalysisKeyInput | string,
  revision?: number,
  departureAt?: InstantInput,
  timeZone: string = BAHRAIN_TIME_ZONE,
): string {
  const input: AnalysisKeyInput = typeof inputOrRouteId === 'string'
    ? { routeId: inputOrRouteId, revision: revision as number, departureAt, timeZone }
    : inputOrRouteId;
  const instant = input.departureInstant ?? input.departureAt;
  if (instant === undefined) throw new TypeError('An analysis departure instant is required.');
  const zone = input.timeZone ?? input.zone ?? BAHRAIN_TIME_ZONE;
  return [input.routeId, String(input.revision), toIsoInstant(instant), zone].join('|');
}

export const routeAnalysisKey = analysisKey;
export const getAnalysisKey = analysisKey;

// Compatibility names for existing callers and the eventual screen foundation.
export const formatTime = formatBahrainTime;
export const formatDate = formatBahrainDate;
export const formatDateTime = formatBahrainDateTime;
export const formatLocalizedTime = formatBahrainTime;
export const formatLocalizedDate = formatBahrainDate;
export const formatLocalizedDateTime = formatBahrainDateTime;
export const formatLocalizedNumber = formatNumber;
