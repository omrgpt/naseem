import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MapPreview } from "../MapPreview";
import { RouteLayerLegend } from "../RouteLayerLegend";
import { StatusBadge } from "../UiPatterns";
import {
  asCanonicalRoute,
  routeGeometryKind,
  routeIsNavigable,
  text as tx,
  type RouteDetailScreenProps,
} from "../screenTypes";

/** Map canvas plus one explainable route sheet. */
export function RouteDetailScreen({
  t,
  rtl,
  palette,
  styles,
  formatNumber,
  route,
  routeStatus,
  departureLabel,
  arrivalLabel,
  departureChoices,
  mapText,
  roadLabels,
  onDeparture,
  onBack,
  onUse,
  onChangeRoute,
  variantLabel,
  entryLabel,
  finishLabel,
  entryDistanceLabel,
  comparisonReason,
  comparisonStatus,
  layers,
  onlyVariant,
  entryActionsEnabled = true,
  onStartAtEntry,
  onConnectFromLocation,
}: RouteDetailScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const canonical = asCanonicalRoute(route);
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : String(value);

  if (!canonical)
    return (
      <View style={[styles.screen, rtl && styles.screenRtl]}>
        <Text style={[styles.title, rtl && styles.textRight]}>
          {tx(t, "noRouteSelected", "No route selected")}
        </Text>
        <Text style={[styles.subtitle, rtl && styles.textRight]}>
          {tx(
            t,
            "chooseRouteCopy",
            "Choose a route to review its timing and wind.",
          )}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onChangeRoute}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>
            {tx(t, "chooseRoute", "Choose route")}
          </Text>
        </Pressable>
      </View>
    );

  const catalogPreview = canonical.familyId === "nbh-loop";
  const navigable = routeIsNavigable(canonical) && routeStatus === "ready";
  const status =
    routeStatus === "matching"
      ? tx(t, "matchingRoads", "Finding a road route…")
      : routeStatus === "unavailable"
        ? tx(t, "routeUnavailable", "Road match unavailable")
        : catalogPreview
          ? tx(
              t,
              "routeCheckPending",
              "Route preview · road check not complete",
            )
          : navigable
            ? tx(t, "roadMatched", "Road-matched")
            : tx(t, "routeReviewPending", "Route review pending");
  const tone =
    routeStatus === "unavailable"
      ? "danger"
      : navigable
        ? "success"
        : "warning";

  return (
    <View style={[styles.atlas, rtl && styles.screenRtl]}>
      <View style={styles.atlasMap}>
        <MapPreview
          route={canonical}
          fullScreen
          minimal
          rtl={rtl}
          roadLabels={roadLabels}
          mapText={{
            ...mapText,
            status: navigable
              ? "matched"
              : routeStatus === "matching"
                ? "loading"
                : "pilot",
          }}
        />
        <View style={[styles.atlasTopbar, rtl && styles.atlasTopbarRtl]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx(t, "back", "Back")}
            onPress={onBack}
            style={styles.atlasMapButton}
          >
            <Text style={styles.atlasMapButtonText}>
              {tx(t, "back", "Back")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onChangeRoute}
            style={styles.atlasMapButton}
          >
            <Text style={styles.atlasMapButtonText}>
              {tx(t, "changeRoute", "Change route")}
            </Text>
          </Pressable>
        </View>
      </View>
      <View
        style={[styles.atlasSheet, expanded && styles.atlasSheetExpanded]}
        accessibilityRole="summary"
        accessibilityLabel={`${canonical.name}. ${status}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={[styles.atlasSheetHandle, rtl && styles.rowRtl]}
        >
          <View style={styles.atlasHandle} />
          <Text style={styles.atlasDisclosure}>
            {expanded
              ? tx(t, "showLess", "Show less")
              : tx(t, "showDetails", "Route details")}
          </Text>
        </Pressable>
        <View style={[styles.atlasIdentity, rtl && styles.rowRtl]}>
          <View style={styles.routeRowCopy}>
            <Text
              style={[styles.atlasTitle, rtl && styles.textRight]}
              numberOfLines={2}
            >
              {canonical.name}
            </Text>
            <Text style={[styles.atlasMeta, rtl && styles.textRight]}>
              {numberText(canonical.distanceKm, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              {tx(t, "km", "km")}
              {variantLabel ? ` · ${variantLabel}` : ""}
            </Text>
          </View>
          <StatusBadge label={status} tone={tone} palette={palette} />
        </View>
        <Text style={[styles.atlasCondition, rtl && styles.textRight]}>
          {comparisonReason ||
            tx(
              t,
              "forecastReviewSummary",
              "Forecast and route evidence are shown separately when available.",
            )}
        </Text>
        {routeStatus === "unavailable" && (
          <View style={styles.alert} accessibilityRole="alert">
            <Text style={[styles.alertTitle, rtl && styles.textRight]}>
              {status}
            </Text>
            <Text style={[styles.alertText, rtl && styles.textRight]}>
              {tx(
                t,
                "routeMatchFailure",
                "We couldn't match these points to roads. Move a point or try again.",
              )}
            </Text>
          </View>
        )}
        {expanded && (
          <View style={styles.atlasDetails}>
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "startFinish", "Start / finish")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {entryLabel || tx(t, "startPoint", "Start")} →{" "}
                {finishLabel || tx(t, "destination", "Finish")}
              </Text>
            </View>
            {entryDistanceLabel && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {entryDistanceLabel}
              </Text>
            )}
            {onlyVariant && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {tx(
                  t,
                  "onlyVariantNote",
                  "This is the available route option for now.",
                )}
              </Text>
            )}
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "chooseDeparture", "Choose departure")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {tx(t, "leavingAt", "Leaving at")} {departureLabel}
                {arrivalLabel !== "—"
                  ? ` · ${tx(t, "arrival", "Finish by")} ${arrivalLabel}`
                  : ""}
              </Text>
              <View style={[styles.manualActions, rtl && styles.rowRtl]}>
                {departureChoices.map((choice) => (
                  <Pressable
                    key={choice.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: choice.selected }}
                    onPress={() => onDeparture(choice.value)}
                    style={[
                      styles.smallButton,
                      choice.selected && styles.atlasChoiceSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.smallButtonText,
                        choice.selected && styles.atlasChoiceSelectedText,
                      ]}
                    >
                      {choice.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {layers && layers.length > 0 && (
              <RouteLayerLegend
                layers={layers}
                palette={palette}
                rtl={rtl}
                title={tx(t, "mapLayers", "Map layers")}
              />
            )}
            {catalogPreview && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {tx(
                  t,
                  "nbhPublicIdentityNote",
                  "Bahrain Tourism describes a 50 km track. This preview shows only the supplied 21.8 km geometry; the full track is not supplied.",
                )}
              </Text>
            )}
            {!catalogPreview &&
              routeGeometryKind(canonical) === "recorded_trace" && (
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {tx(t, "recordedTrack", "Recorded track")}
                </Text>
              )}
          </View>
        )}
        {catalogPreview ? (
          entryActionsEnabled ? (
            <View style={[styles.atlasActions, rtl && styles.rowRtl]}>
              <Pressable
                accessibilityRole="button"
                onPress={onStartAtEntry || onUse}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>
                  {tx(t, "startAtEntry", "Start at NBH entry")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onConnectFromLocation || onUse}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {tx(t, "connectFromLocation", "Connect from my location")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.atlasActions}>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {tx(
                  t,
                  "previewOnlyRideCopy",
                  "You can review this route now. Starting a route-following ride will be available after the road check is complete.",
                )}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onChangeRoute}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {tx(t, "chooseAnotherRoute", "Choose another route")}
                </Text>
              </Pressable>
            </View>
          )
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onUse}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {tx(t, "useRoute", "Use this route")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
