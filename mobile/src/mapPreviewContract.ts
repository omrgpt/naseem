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
