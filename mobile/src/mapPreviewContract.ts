import type { Coordinate } from "./domain";

/**
 * Compact previews are intentionally quiet. The minimal fit/zoom toolbar is
 * reserved for full route-review surfaces so web and native expose the same
 * controls for the same map mode.
 */
export function shouldShowMinimalMapControls(
  compact: boolean,
  minimal: boolean,
): boolean {
  return !compact && minimal;
}

export function hasFiniteCoordinate(
  coordinate?: Coordinate,
): coordinate is Coordinate {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude),
  );
}

export function shouldShowUserLocationControl(
  showUserLocation: boolean,
  coordinate?: Coordinate,
): boolean {
  return showUserLocation && hasFiniteCoordinate(coordinate);
}
