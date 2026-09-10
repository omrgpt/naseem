export type DistanceUnit = "km" | "mi";

export const MILES_PER_KILOMETRE = 0.621371192237334;
export const KILOMETRES_PER_MILE = 1 / MILES_PER_KILOMETRE;

export type DisplayNumberFormatter = (
  value: number,
  options?: Intl.NumberFormatOptions,
) => string;

export type DistanceDisplay = {
  unit: DistanceUnit;
  distanceLabel: string;
  speedLabel: string;
  formatDistance: (
    distanceKm: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
  formatDistanceValue: (
    distanceKm: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
  formatSpeed: (
    speedKph: number,
    options?: Intl.NumberFormatOptions,
  ) => string;
};

export type DistanceDisplayInput = {
  unit: DistanceUnit;
  distanceLabels: Readonly<Record<DistanceUnit, string>>;
  speedLabels: Readonly<Record<DistanceUnit, string>>;
  formatNumber: DisplayNumberFormatter;
};

const DEFAULT_DISTANCE_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};
const DEFAULT_SPEED_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 0,
};

/** Convert a canonical kilometre value only for presentation. */
export function distanceInUnit(distanceKm: number, unit: DistanceUnit) {
  return unit === "mi" ? distanceKm * MILES_PER_KILOMETRE : distanceKm;
}

/** Convert a user-entered display value back to canonical kilometres. */
export function kilometresFromDisplayValue(
  value: number,
  unit: DistanceUnit,
) {
  return unit === "mi" ? value * KILOMETRES_PER_MILE : value;
}

export function createDistanceDisplay({
  unit,
  distanceLabels,
  speedLabels,
  formatNumber,
}: DistanceDisplayInput): DistanceDisplay {
  const formatDistanceValue = (
    distanceKm: number,
    options?: Intl.NumberFormatOptions,
  ) =>
    formatNumber(
      distanceInUnit(distanceKm, unit),
      options ?? DEFAULT_DISTANCE_FORMAT,
    );
  const formatDistance = (
    distanceKm: number,
    options?: Intl.NumberFormatOptions,
  ) => `${formatDistanceValue(distanceKm, options)} ${distanceLabels[unit]}`;
  const formatSpeed = (
    speedKph: number,
    options?: Intl.NumberFormatOptions,
  ) =>
    `${formatNumber(
      distanceInUnit(speedKph, unit),
      options ?? DEFAULT_SPEED_FORMAT,
    )} ${speedLabels[unit]}`;

  return {
    unit,
    distanceLabel: distanceLabels[unit],
    speedLabel: speedLabels[unit],
    formatDistance,
    formatDistanceValue,
    formatSpeed,
  };
}
