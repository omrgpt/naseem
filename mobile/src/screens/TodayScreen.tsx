import { Pressable, Text, View } from "react-native";
import { MapPreview } from "../MapPreview";
import { NoticeAlert, StatusBadge } from "../UiPatterns";
import type { BahrainConditions } from "../weather";
import type { RoutePlan, RoadKind } from "../domain";
import {
  asCanonicalRoute,
  routeChipFor,
  text as tx,
  type Copy,
  type RoadLabels,
  type ScreenBaseProps,
  type ScreenStyles,
} from "../screenTypes";

export type HomeMapText = {
  native: string;
  web: string;
  fit: string;
  loop: string;
  gestures?: string;
  zoomIn?: string;
  zoomOut?: string;
  distanceUnit?: string;
  mapLabel?: string;
  status?: "matched" | "loading" | "pilot";
};

export type TodayScreenProps = ScreenBaseProps & {
  route: RoutePlan | null;
  conditions: BahrainConditions | null;
  refreshing: boolean;
  recommendationTitle: string;
  recommendationReason: string;
  departureTime: string;
  routeStatus: "draft" | "matching" | "ready" | "unavailable" | "trace_ready";
  variantLabel?: string;
  roadLabels?: RoadLabels;
  mapText: HomeMapText;
  onReviewRoute: () => void;
  onPlanRoute: () => void;
  onChooseRoute: () => void;
  onRefresh: () => void;
};

export function TodayScreen({
  t,
  rtl,
  palette,
  styles,
  formatNumber,
  route,
  conditions,
  refreshing,
  recommendationTitle,
  recommendationReason,
  departureTime,
  routeStatus,
  variantLabel,
  roadLabels,
  mapText,
  onReviewRoute,
  onPlanRoute,
  onChooseRoute,
  onRefresh,
}: TodayScreenProps) {
  const canonicalRoute = asCanonicalRoute(route);
  const mapRoute =
    canonicalRoute && rtl && canonicalRoute.nameAr
      ? {
          ...canonicalRoute,
          name: canonicalRoute.nameAr,
          points: canonicalRoute.points.map((point) => ({
            ...point,
            name: point.nameAr || point.name,
          })),
        }
      : canonicalRoute;
  const routeName = mapRoute?.name;
  const chip = canonicalRoute ? routeChipFor(canonicalRoute, t) : null;
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : String(value);
  const statusCopy =
    routeStatus === "ready"
      ? tx(t, "routeReady", "Ready to review")
      : routeStatus === "matching"
        ? tx(t, "matchingRoads", "Finding a road route…")
        : routeStatus === "unavailable"
          ? tx(t, "routeUnavailable", "Road match unavailable")
          : routeStatus === "trace_ready"
            ? tx(
                t,
                "previewRouteStatus",
                "Preview route · road verification pending",
              )
            : tx(t, "routeDraft", "Choose a route");
  return (
    <View style={[styles.screen, rtl && styles.screenRtl]}>
      <View style={styles.pageIntro}>
        <Text style={[styles.title, rtl && styles.textRight]}>
          {canonicalRoute
            ? tx(t, "yourNextRide", "Your next ride")
            : tx(t, "todayTitle", "Plan a ride")}
        </Text>
      </View>

      {canonicalRoute && (
        <View style={styles.decision} accessibilityRole="summary">
          <Text style={[styles.decisionLabel, rtl && styles.textRight]}>
            {tx(t, "departureOutlook", "Departure outlook")}
          </Text>
          <Text style={[styles.decisionTitle, rtl && styles.textRight]}>
            {recommendationTitle || departureTime}
          </Text>
          <Text style={[styles.decisionMeta, rtl && styles.textRight]}>
            {recommendationReason ||
              tx(
                t,
                "forecastReviewSummary",
                "Review the route map for forecast context.",
              )}
          </Text>
        </View>
      )}

      {canonicalRoute ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${tx(t, "selectedRoute", "Selected route")}: ${routeName}`}
          onPress={onReviewRoute}
          style={[styles.routeRow, rtl && styles.rowRtl]}
        >
          <View style={styles.routeRowCopy}>
            <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
              <Text
                style={[styles.routeName, rtl && styles.textRight]}
                numberOfLines={2}
              >
                {routeName}
              </Text>
              {chip && (
                <StatusBadge
                  label={chip.label}
                  tone={chip.tone}
                  palette={palette}
                />
              )}
            </View>
            <Text style={[styles.routeMeta, rtl && styles.textRight]}>
              {variantLabel ? `${variantLabel} · ` : ""}
              {numberText(canonicalRoute.distanceKm, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              {tx(t, "km", "km")} ·{" "}
              {routeStatus === "ready" && canonicalRoute.durationMinutes
                ? `${numberText(canonicalRoute.durationMinutes, {
                    maximumFractionDigits: 0,
                  })} ${tx(t, "minutes", "min")} · `
                : ""}
              {statusCopy}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.routeRow}>
          <Text style={[styles.routeName, rtl && styles.textRight]}>
            {tx(t, "noSelectedRoute", "Choose a route")}
          </Text>
          <Text style={[styles.routeMeta, rtl && styles.textRight]}>
            {tx(
              t,
              "noSelectedRouteCopy",
              "Choose a route in Plan and it will appear here with its forecast context.",
            )}
          </Text>
        </View>
      )}

      <View style={styles.mapWrap}>
        {canonicalRoute ? (
          <MapPreview
            route={mapRoute!}
            compact
            minimal
            rtl={rtl}
            roadLabels={roadLabels}
            mapText={{
              ...mapText,
              status: routeStatus === "trace_ready" ? "pilot" : "matched",
              mapLabel: rtl ? `خريطة المسار: ${routeName}` : mapText.mapLabel,
            }}
          />
        ) : (
          <EmptyMap palette={palette} t={t} rtl={rtl} />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={canonicalRoute ? onReviewRoute : onPlanRoute}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>
          {canonicalRoute
            ? tx(t, "openRouteMap", "Open route map")
            : tx(t, "planRoute", "Plan a route")}
        </Text>
      </Pressable>
      {canonicalRoute && (
        <Pressable
          accessibilityRole="button"
          onPress={onChooseRoute}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            {tx(t, "changeRoute", "Change route")}
          </Text>
        </Pressable>
      )}

      {canonicalRoute && (
        <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
          <View style={styles.routeRowCopy}>
            <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
              {tx(t, "forecast", "Forecast")}
            </Text>
            <Text style={[styles.sectionCaption, rtl && styles.textRight]}>
              {conditions
                ? `${numberText(Math.round(conditions.temperature), { maximumFractionDigits: 0 })}° · ${numberText(Math.round(conditions.wind.speed), { maximumFractionDigits: 0 })} ${tx(t, "speedUnit", "km/h")}`
                : tx(
                    t,
                    "forecastFallback",
                    "Forecast unavailable; using a fallback",
                  )}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {refreshing
                ? tx(t, "loading", "Loading")
                : tx(t, "refresh", "Refresh")}
            </Text>
          </Pressable>
        </View>
      )}

      {routeStatus !== "ready" &&
        routeStatus !== "draft" &&
        routeStatus !== "matching" && (
          <NoticeAlert
            tone="warning"
            title={statusCopy}
            description={tx(
              t,
              "previewRouteNote",
              "This route can be reviewed on the map, but Live Ride stays unavailable until road evidence is verified.",
            )}
            palette={palette}
            rtl={rtl}
          />
        )}
      {routeStatus === "unavailable" && (
        <NoticeAlert
          tone="warning"
          title={tx(t, "routeUnavailable", "Road match unavailable")}
          description={tx(
            t,
            "routeMatchFailure",
            "We couldn't match these points to roads. Move a point or try again.",
          )}
          palette={palette}
          rtl={rtl}
        />
      )}
      {!canonicalRoute && (
        <Pressable
          accessibilityRole="button"
          onPress={onChooseRoute}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            {tx(t, "chooseRoute", "Choose route")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function EmptyMap({
  palette,
  t,
  rtl,
}: {
  palette: ScreenBaseProps["palette"];
  t: Copy;
  rtl: boolean;
}) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={tx(t, "emptyMapLabel", "Empty route map")}
      style={{
        height: 220,
        borderRadius: 18,
        backgroundColor: palette.panelAlt,
        borderWidth: 1,
        borderColor: palette.line,
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
      }}
    >
      <Text
        style={[
          {
            color: palette.muted,
            fontFamily: rtl
              ? "NotoSansArabic_400Regular"
              : "Manrope_400Regular",
            fontSize: 13,
            lineHeight: 20,
            textAlign: rtl ? "right" : "center",
          },
        ]}
      >
        {tx(
          t,
          "emptyMapCopy",
          "Your route map will appear here after you choose a route in Plan.",
        )}
      </Text>
    </View>
  );
}

export function homeRoadLabels(t: Copy): RoadLabels {
  return {
    dedicated: tx(t, "dedicated", "Dedicated"),
    mixed: tx(t, "mixedTraffic", "Mixed traffic"),
    restricted: tx(t, "restricted", "Restricted"),
    unknown: tx(t, "unknown", "Unknown"),
  } as Record<RoadKind, string>;
}
