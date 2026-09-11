import { useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type Region } from "react-native-maps";
import type { Coordinate, RoadKind } from "./domain";
import type { MapPreviewProps, MapText } from "./MapPreview";
import {
  MAP_BOTTOM_SAFE_ZONE,
  MAP_CONTROL_CLEARANCE,
  MAP_MARKER_HIT_SIZE,
  hasFiniteCoordinate,
  mapDisplayBounds,
  selectMapProvider,
  shouldShowMinimalMapControls,
  shouldShowUserLocationControl,
} from "./mapPreviewContract";
import {
  mapDisplayPoints,
  mapIsLoop,
  mapLineModel,
  mapMarkerPoints,
  mapRoadKindAt,
  mapSegmentIndexForLine,
  mapViewportPoints,
  normalizeSelectedSegment,
} from "./mapModel";
import {
  FONT_ARABIC_BOLD,
  FONT_ARABIC_REGULAR,
  FONT_BOLD,
  FONT_MEDIUM,
  FONT_REGULAR,
  FONT_SEMIBOLD,
} from "./fonts";

type Props = MapPreviewProps;

const COLORS: Record<RoadKind, string> = {
  dedicated: "#006B6F",
  mixed: "#A94B31",
  restricted: "#B64B4B",
  unknown: "#6B7B7D",
};
const LABELS: Record<RoadKind, string> = {
  dedicated: "Dedicated",
  mixed: "Mixed traffic",
  restricted: "Restricted",
  unknown: "Unknown",
};

export function MapPreview({
  route,
  compact = false,
  fullScreen = false,
  minimal = false,
  selectedSegment,
  rtl = false,
  showUserLocation = false,
  userCoordinate,
  onReset,
  onMapPress,
  activeEndpoint,
  onSelectPoint,
  roadLabels,
  mapText,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const mapProvider = selectMapProvider({
    platform: Platform.OS === "android" ? "android" : "ios",
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
  const nativeMapUnavailable = mapProvider === "native-fallback";
  const showUserLocationControl = shouldShowUserLocationControl(
    showUserLocation,
    userCoordinate,
  );
  const lineModel = mapLineModel(route, mapText?.status);
  const { linePoints, lineStyle, roadMatched } = lineModel;
  const markerEntries = mapMarkerPoints(route, linePoints, roadMatched);
  const displayPoints = mapDisplayPoints(route);
  const focusSegment = normalizeSelectedSegment(selectedSegment);
  const roadLabelFor = (kind: RoadKind) =>
    roadLabels?.[kind] ??
    (kind === "unknown"
      ? rtl
        ? "لا تتوفر أدلة طرق"
        : "Road evidence unavailable"
      : LABELS[kind]);
  const coordinates = linePoints.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));
  const displayCoordinates = displayPoints.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));
  const viewportPoints = mapViewportPoints(
    route,
    linePoints.length >= 2 ? linePoints : displayCoordinates,
  );
  const viewportBounds = mapDisplayBounds(viewportPoints);
  const viewportCoordinates = viewportPoints.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));
  const geometryKey = linePoints
    .map(({ latitude, longitude }) => `${latitude},${longitude}`)
    .join("|");
  const viewportKey = viewportPoints
    .map(({ latitude, longitude }) => `${latitude},${longitude}`)
    .join("|");
  const first = viewportBounds.center;
  const initialRegion = {
    latitude: first.latitude,
    longitude: first.longitude,
    latitudeDelta: viewportCoordinates.length
      ? clamp(viewportBounds.latitudeDelta, 0.002, 3)
      : route.id === "nbh-loop"
        ? 0.19
        : 0.08,
    longitudeDelta: viewportCoordinates.length
      ? clamp(viewportBounds.longitudeDelta, 0.002, 3)
      : route.id === "nbh-loop"
        ? 0.23
        : 0.12,
  };
  const regionRef = useRef<Region>(initialRegion);
  const fitToRoute = () => {
    if (nativeMapUnavailable) return;
    const fitCoordinates = coordinates.length >= 2 ? coordinates : viewportCoordinates;
    if (fitCoordinates.length >= 2) {
      mapRef.current?.fitToCoordinates(fitCoordinates, {
        edgePadding: {
          top: 70,
          right: 34,
          bottom: MAP_BOTTOM_SAFE_ZONE + MAP_CONTROL_CLEARANCE,
          left: 34,
        },
        animated: true,
      });
      return;
    }
    if (fitCoordinates.length === 1) {
      const next = {
        ...regionRef.current,
        latitude: viewportBounds.center.latitude,
        longitude: viewportBounds.center.longitude,
        latitudeDelta: clamp(viewportBounds.latitudeDelta, 0.002, 3),
        longitudeDelta: clamp(viewportBounds.longitudeDelta, 0.002, 3),
      };
      regionRef.current = next;
      mapRef.current?.animateToRegion(next, 180);
    }
  };
  useEffect(() => {
    fitToRoute();
  }, [route.id, route.revisionId, geometryKey, viewportKey, nativeMapUnavailable]);
  const reset = () => {
    fitToRoute();
    onReset?.();
  };
  const centerOnUserLocation = () => {
    if (!showUserLocationControl || !hasFiniteCoordinate(userCoordinate)) return;
    const next = {
      ...regionRef.current,
      latitude: userCoordinate.latitude,
      longitude: userCoordinate.longitude,
    };
    regionRef.current = next;
    mapRef.current?.animateToRegion(next, 220);
  };
  const adjustZoom = (factor: number) => {
    const current = regionRef.current;
    const next = {
      ...current,
      latitudeDelta: clamp(current.latitudeDelta * factor, 0.002, 3),
      longitudeDelta: clamp(current.longitudeDelta * factor, 0.002, 3),
    };
    regionRef.current = next;
    mapRef.current?.animateToRegion(next, 180);
  };
  const text: MapText = {
    native: rtl
      ? "خريطة الجهاز · تظهر أدلة المسار حسب المقطع"
      : "Device map · route evidence shown by segment",
    web: rtl
      ? "معاينة OpenStreetMap على الويب"
      : "Supplied route preview; road verification pending",
    fit: rtl ? "ملاءمة المسار" : "Fit route",
    loop: rtl ? "حلقة" : "loop",
    gestures: rtl
      ? "اسحب لتحريك الخريطة · استخدم + و - للتكبير"
      : "Drag to move · use pinch or + / - to zoom",
    statusMatched: rtl ? "مطابق للطرق" : "ROAD-MATCHED",
    statusLoading: rtl ? "جارٍ مطابقة الطرق" : "MATCHING ROADS",
    statusPilot: rtl ? "معاينة المسار" : "ROUTE PREVIEW",
    statusUnavailable: rtl ? "المسار غير متاح" : "ROUTE UNAVAILABLE",
    statusDraft: rtl ? "مسودة المسار" : "ROUTE DRAFT",
    statusEmpty: rtl ? "لا توجد هندسة للمسار" : "NO ROUTE GEOMETRY",
    providerUnavailable: rtl
      ? "يحتاج مزود الخريطة إلى إعداد؛ يبقى المسار متاحاً."
      : "Map provider needs configuration; the route remains available.",
    zoomIn: rtl ? "تكبير الخريطة" : "Zoom in",
    zoomOut: rtl ? "تصغير الخريطة" : "Zoom out",
    distanceUnit: rtl ? "كم" : "km",
    routeLabel: rtl ? "مسار" : "route",
    mapLabel: rtl ? `خريطة المسار: ${route.name}` : `${route.name} native map`,
    mapHint: rtl
      ? onMapPress
        ? "اضغط على الخريطة لإضافة نقطة؛ تحتوي الخريطة على أدلة المقطع."
        : "تحتوي الخريطة على نقاط المسار وأدلة المقطع."
      : onMapPress
        ? "Tap the map to add a point; the map contains segment evidence."
        : "The map contains route points and segment evidence.",
    routePoints: rtl ? "نقاط المسار" : "Route points",
    startPoint: rtl ? "البداية" : "Start",
    startEndPoint: rtl ? "البداية والنهاية" : "Start and finish",
    destinationPoint: rtl ? "الوجهة" : "Destination",
    waypoint: rtl ? "نقطة طريق" : "Waypoint",
    activeEndpointLabel: activeEndpoint
      ? rtl
        ? `اختر ${activeEndpoint === "start" ? "البداية" : "الوجهة"} على الخريطة`
        : `Choose ${activeEndpoint === "start" ? "Start" : "Destination"} on the map`
      : undefined,
    userLocation: rtl ? "موقعك الحالي" : "Current location",
    ...mapText,
  };
  const activeEndpointLabel = activeEndpoint
    ? text.activeEndpointLabel ??
      (rtl
        ? `اختر ${activeEndpoint === "start" ? "البداية" : "الوجهة"} على الخريطة`
        : `Choose ${activeEndpoint === "start" ? "Start" : "Destination"} on the map`)
      : undefined;
  const nativeProviderMessage =
    text.nativeNeedsKey ??
    text.providerUnavailable ??
    (rtl
      ? "يحتاج مزود الخريطة إلى إعداد؛ يبقى المسار متاحاً."
      : "Map provider needs configuration; the route remains available.");
  const showMinimalControls = shouldShowMinimalMapControls(compact, minimal);
  const mapStatus = lineModel.status;
  const isLoopRoute = mapIsLoop(route);
  const mapStatusLabel =
    mapStatus === "matched"
      ? text.statusMatched
      : mapStatus === "loading"
        ? text.statusLoading
        : mapStatus === "unavailable"
          ? text.statusUnavailable
          : mapStatus === "draft"
            ? text.statusDraft
            : mapStatus === "empty"
              ? text.statusEmpty
              : text.statusPilot;
  const mapLabel =
    text.mapLabel ??
    (rtl ? `خريطة المسار: ${route.name}` : `${route.name} native map`);
  const mapHint =
    text.mapHint ??
    (rtl
      ? "تحتوي الخريطة على نقاط المسار وأدلة المقطع."
      : "The map contains route points and segment evidence.");
  const statusLabel =
    mapStatusLabel ??
    (rtl ? "حالة المسار غير معروفة" : "Route status unavailable");
  const routePointsLabel =
    text.routePoints ?? (rtl ? "نقاط المسار" : "Route points");
  const pointLabel = (entry: (typeof markerEntries)[number], index: number) => {
    const pointIndex = text.formatNumber
      ? text.formatNumber(index, { maximumFractionDigits: 0 })
      : String(index);
    const positionLabel =
      entry.isLoop && entry.isStart
        ? text.startEndPoint
        : entry.isStart
          ? text.startPoint
          : entry.isEnd
            ? text.destinationPoint
            : `${text.waypoint} ${pointIndex}`;
    const roadLabel = roadLabelFor(entry.routePoint.suitability.kind);
    const distance = text.formatNumber
      ? text.formatNumber(entry.routePoint.distanceKm, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : entry.routePoint.distanceKm.toFixed(1);
    const pointName = rtl
      ? (entry.routePoint.nameAr ?? entry.routePoint.name)
      : entry.routePoint.name;
    return `${positionLabel}: ${pointName}; ${distance} ${text.distanceUnit}; ${roadLabel}`;
  };
  const pointLabels = markerEntries.map(pointLabel);
  const accessiblePointLabels = pointLabels;
  const mapSummary = `${mapLabel}. ${statusLabel}.${nativeMapUnavailable ? ` ${nativeProviderMessage}.` : ""}${activeEndpointLabel ? ` ${activeEndpointLabel}.` : ""}${compact ? "" : ` ${text.native}. ${routePointsLabel}: ${accessiblePointLabels.length ? accessiblePointLabels.join(". ") : rtl ? "لا توجد نقاط مسار." : "No route points."}`}`;
  const mapDetailsId = `map-details-${route.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        fullScreen && styles.fullScreen,
        rtl && styles.rtlContainer,
      ]}
      accessibilityLabel={mapLabel}
      role="group"
    >
      {nativeMapUnavailable ? (
        <View
          testID="native-map-provider-fallback"
          style={styles.providerFallback}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={nativeProviderMessage}
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.providerNoticeText, rtl && styles.arabicMeta]}>
            {nativeProviderMessage}
          </Text>
          <Text style={[styles.mapFootText, rtl && styles.arabicMeta]}>
            {text.native}
          </Text>
          <View
            role="list"
            accessibilityLabel={routePointsLabel}
            style={styles.providerFallbackPoints}
          >
            {accessiblePointLabels.map((label, index) => (
              <Text
                key={`${route.id}-fallback-point-${index}`}
                role="listitem"
                accessibilityLabel={label}
                style={[styles.providerFallbackPoint, rtl && styles.arabicMeta]}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      ) : (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        mapType="standard"
        showsCompass
        showsScale
        showsUserLocation={showUserLocation && hasFiniteCoordinate(userCoordinate)}
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        zoomTapEnabled
        zoomControlEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        onMapReady={fitToRoute}
        accessibilityLabel={mapLabel}
        accessibilityHint={mapHint}
        role="application"
        {...({ "aria-describedby": mapDetailsId } as any)}
        onRegionChangeComplete={(next) => {
          regionRef.current = next;
        }}
        onPress={(event) => {
          const coordinate = event.nativeEvent?.coordinate;
          if (hasFiniteCoordinate(coordinate)) onMapPress?.(coordinate);
        }}
      >
        {linePoints.slice(0, -1).map((point, index) => {
          const next = linePoints[index + 1];
          if (!next) return null;
          const segmentIndex = mapSegmentIndexForLine(
            route,
            index,
            linePoints.length,
          );
          const kind = mapRoadKindAt(route, segmentIndex);
          return (
            <Polyline
              key={`${route.id}-line-${index}`}
              coordinates={[point, next]}
              strokeColor={COLORS[kind]}
              strokeWidth={focusSegment === segmentIndex ? 8 : 5}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={lineStyle === "dashed" ? [8, 8] : undefined}
              zIndex={focusSegment === segmentIndex ? 2 : 1}
            />
          );
        })}
        {markerEntries.map((entry, index) => {
          const markerIndex = text.formatNumber
            ? text.formatNumber(index, { maximumFractionDigits: 0 })
            : String(index);
          const markerText =
            entry.isLoop && entry.isStart
              ? rtl
                ? "ب"
                : "S/E"
              : entry.isStart
                ? rtl
                  ? "ب"
                  : "S"
                : entry.isEnd
                  ? rtl
                    ? "ن"
                    : "E"
                  : markerIndex;
          return (
            <Marker
              key={`${route.id}-marker-${entry.sourceIndex}`}
              coordinate={entry.coordinate}
              onPress={onSelectPoint ? () => onSelectPoint(entry.routePoint) : undefined}
              accessibilityRole={onSelectPoint ? "button" : "image"}
              accessibilityLabel={pointLabels[index]}
              accessibilityHint={onSelectPoint ? activeEndpointLabel : undefined}
              title={
                entry.isLoop && entry.isStart
                  ? `${rtl ? (entry.routePoint.nameAr ?? entry.routePoint.name) : entry.routePoint.name} · ${text.loop}`
                  : rtl
                    ? (entry.routePoint.nameAr ?? entry.routePoint.name)
                    : entry.routePoint.name
              }
              description={roadLabelFor(entry.routePoint.suitability.kind)}
            >
              <View style={styles.markerHitTarget} accessible={false}>
                <View
                  accessible={false}
                  style={[
                    styles.marker,
                    entry.isStart && styles.startMarker,
                    entry.isLoop && entry.isStart && styles.loopMarker,
                    !entry.isLoop &&
                      !entry.isStart &&
                      !entry.isEnd &&
                      styles.midMarker,
                  ]}
                >
                  <Text style={styles.markerText}>{markerText}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
        {hasFiniteCoordinate(userCoordinate) && (
          <Marker
            coordinate={userCoordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityRole="image"
            accessibilityLabel={text.userLocation}
          >
            <View style={styles.userMarker} />
          </Marker>
        )}
      </MapView>
      )}
      {!minimal && (
        <View
          style={[styles.mapHeader, rtl && styles.overlayRtl]}
          pointerEvents="none"
        >
          <View
            style={[styles.mapHeaderPlate, rtl && styles.mapHeaderPlateRtl]}
          >
            <Text
              style={[
                styles.mapTitle,
                rtl && styles.textRight,
                rtl && styles.arabicTitle,
              ]}
            >
              {route.name}
            </Text>
            <Text
              style={[
                styles.mapMeta,
                rtl && styles.textRight,
                rtl && styles.arabicMeta,
              ]}
            >
              <Text style={styles.ltrText}>
                {text.formatNumber
                  ? text.formatNumber(route.distanceKm, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : route.distanceKm.toFixed(1)}{" "}
                {text.distanceUnit}
              </Text>{" "}
              · {isLoopRoute ? text.loop : text.routeLabel}
            </Text>
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={statusLabel}
              accessibilityLiveRegion="polite"
              aria-live="polite"
              style={[
                styles.statusPill,
                mapStatus === "matched"
                  ? styles.statusMatched
                  : mapStatus === "loading"
                    ? styles.statusLoading
                    : mapStatus === "unavailable" || mapStatus === "draft"
                      ? styles.statusLoading
                    : styles.statusPilot,
                rtl && styles.statusPillRtl,
              ]}
            >
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, rtl && styles.arabicStatus]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>
      )}
      {activeEndpoint && (
        <View
          testID="map-active-endpoint"
          pointerEvents="none"
          accessible
          accessibilityRole="text"
          accessibilityLabel={activeEndpointLabel}
          accessibilityLiveRegion="polite"
          aria-live="polite"
          style={styles.activeEndpointOverlay}
        >
          <View style={styles.activeEndpointCrosshair} />
          <View style={styles.activeEndpointBadge}>
            <Text style={[styles.activeEndpointText, rtl && styles.arabicControl]}>
              {activeEndpointLabel}
            </Text>
          </View>
        </View>
      )}
      {showUserLocationControl && (
        <Pressable
          testID="map-center-user-location"
          accessibilityRole="button"
          accessibilityLabel={text.userLocation}
          onPress={centerOnUserLocation}
          style={styles.currentLocationButton}
        >
          <View accessible={false} style={styles.currentLocationIcon}>
            <View style={styles.currentLocationIconCore} />
          </View>
        </Pressable>
      )}
      {!compact && !minimal && (
        <View
          style={styles.zoomControls}
          accessibilityRole="toolbar"
          accessibilityLabel={rtl ? "أدوات الخريطة" : "Map controls"}
        >
          <Pressable
            testID="map-zoom-in"
            accessibilityRole="button"
            accessibilityLabel={text.zoomIn}
            onPress={() => adjustZoom(0.72)}
            style={styles.zoomButton}
          >
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
          <Pressable
            testID="map-zoom-out"
            accessibilityRole="button"
            accessibilityLabel={text.zoomOut}
            onPress={() => adjustZoom(1.38)}
            style={styles.zoomButton}
          >
            <Text style={styles.zoomText}>-</Text>
          </Pressable>
        </View>
      )}
      {!compact && !minimal && (
        <View style={styles.gestureHint} pointerEvents="none">
          <Text style={[styles.gestureHintText, rtl && styles.arabicMeta]}>
            {text.gestures}
          </Text>
        </View>
      )}
      {!compact && !minimal && (
        <View style={styles.legend} pointerEvents="none">
          {(["dedicated", "mixed", "restricted", "unknown"] as RoadKind[]).map(
            (kind) => (
              <View
                key={kind}
                accessible
                accessibilityRole="text"
                accessibilityLabel={roadLabelFor(kind)}
                style={styles.legendItem}
              >
                <View
                  style={[styles.legendDot, { backgroundColor: COLORS[kind] }]}
                />
                <Text style={[styles.legendText, rtl && styles.arabicMeta]}>
                  {roadLabelFor(kind)}
                </Text>
              </View>
            ),
          )}
        </View>
      )}
      {!compact && !minimal && (
        <View style={styles.mapFoot} pointerEvents="none">
          <Text
            style={[
              styles.mapFootText,
              rtl && styles.textRight,
              rtl && styles.arabicMeta,
            ]}
          >
            {text.native}
          </Text>
        </View>
      )}
      {!compact && !minimal && (
        <Pressable
          testID="map-fit-route"
          accessibilityRole="button"
          accessibilityLabel={text.fit}
          onPress={reset}
          style={styles.resetButton}
        >
          <Text style={[styles.resetText, rtl && styles.arabicControl]}>
            {text.fit}
          </Text>
        </Pressable>
      )}
      {showMinimalControls && (
        <View
          style={[styles.minimalControls, rtl && styles.minimalControlsRtl]}
          accessibilityRole="toolbar"
          accessibilityLabel={rtl ? "أدوات الخريطة" : "Map controls"}
        >
          <Pressable
            testID="map-fit-route"
            accessibilityRole="button"
            accessibilityLabel={text.fit}
            onPress={reset}
            style={styles.minimalFit}
          >
            <Text style={[styles.resetText, rtl && styles.arabicControl]}>
              {text.fit}
            </Text>
          </Pressable>
          <View style={styles.minimalZoomStack}>
            <Pressable
              testID="map-zoom-in"
              accessibilityRole="button"
              accessibilityLabel={text.zoomIn}
              onPress={() => adjustZoom(0.72)}
              style={styles.zoomButton}
            >
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <Pressable
              testID="map-zoom-out"
              accessibilityRole="button"
              accessibilityLabel={text.zoomOut}
              onPress={() => adjustZoom(1.38)}
              style={styles.zoomButton}
            >
              <Text style={styles.zoomText}>-</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View
        nativeID={mapDetailsId}
        style={styles.accessibilitySummary}
        accessible={false}
      >
        <Text
          accessible
          accessibilityRole="summary"
          accessibilityLabel={mapSummary}
        >
          {mapSummary}
        </Text>
        <View role="list" accessibilityLabel={routePointsLabel}>
          {accessiblePointLabels.map((label, index) => (
            <Text
              key={`${route.id}-accessible-point-${index}`}
              accessible
              role="listitem"
              accessibilityLabel={label}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export const roadColor = (kind: RoadKind) => COLORS[kind];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

const styles = StyleSheet.create({
  container: {
    height: 352,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E9F0F0",
    borderWidth: 1,
    borderColor: "#C9D9DB",
    position: "relative",
  },
  rtlContainer: { direction: "rtl" },
  compact: { height: 248 },
  fullScreen: { minHeight: 448 },
  userMarker: {
    height: 16,
    width: 16,
    borderRadius: 8,
    backgroundColor: "#3778F5",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  providerFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#E9F0F0",
  },
  providerFallbackPoints: {
    alignSelf: "stretch",
    marginTop: 12,
    gap: 6,
  },
  providerFallbackPoint: {
    color: "#38575B",
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    textAlign: "center",
  },
  activeEndpointOverlay: {
    position: "absolute",
    top: "50%",
    left: 12,
    right: 12,
    alignItems: "center",
    transform: [{ translateY: -20 }],
    zIndex: 4,
  },
  activeEndpointCrosshair: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#A94B31",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  activeEndpointBadge: {
    marginTop: 6,
    maxWidth: "100%",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(16,42,46,0.94)",
  },
  activeEndpointText: {
    color: "#FFFFFF",
    fontFamily: FONT_SEMIBOLD,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  currentLocationButton: {
    position: "absolute",
    top: 64,
    insetInlineStart: 12,
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "#C9D9DB",
    zIndex: 5,
  },
  currentLocationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#102A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocationIconCore: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#3778F5",
  },
  minimalFit: {
    minHeight: 44,
    minWidth: 80,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#102A2E",
  },
  minimalControls: {
    position: "absolute",
    insetInlineEnd: 14,
    bottom: MAP_BOTTOM_SAFE_ZONE + MAP_CONTROL_CLEARANCE,
    gap: 8,
    alignItems: "flex-end",
    zIndex: 4,
  },
  minimalControlsRtl: { alignItems: "flex-start" },
  minimalZoomStack: { gap: 6 },
  marker: {
    height: 28,
    minWidth: 28,
    paddingHorizontal: 3,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#102A2E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  markerHitTarget: {
    width: MAP_MARKER_HIT_SIZE,
    height: MAP_MARKER_HIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  startMarker: { backgroundColor: "#A94B31" },
  loopMarker: { minWidth: 38, borderRadius: 19 },
  midMarker: { backgroundColor: "#006B6F" },
  markerText: {
    color: "#FFFFFF",
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: "800",
  },
  mapHeader: {
    position: "absolute",
    top: 12,
    insetInlineStart: 12,
    insetInlineEnd: 104,
  },
  overlayRtl: { alignItems: "flex-end" },
  mapHeaderPlate: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#102A2E",
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },
  mapHeaderPlateRtl: { alignSelf: "flex-end" },
  mapTitle: {
    color: "#102A2E",
    fontFamily: FONT_BOLD,
    fontSize: 13,
    fontWeight: "800",
  },
  arabicTitle: {
    fontFamily: FONT_ARABIC_BOLD,
    fontWeight: "700",
    letterSpacing: 0,
  },
  mapMeta: {
    color: "#5C6B70",
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    marginTop: 2,
  },
  ltrText: { writingDirection: "ltr" },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusPillRtl: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  statusMatched: { backgroundColor: "#DCEFED" },
  statusLoading: { backgroundColor: "#F8E8D4" },
  statusPilot: { backgroundColor: "#E6ECEC" },
  statusDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#006B6F",
  },
  statusText: {
    color: "#38575B",
    fontFamily: FONT_BOLD,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  arabicStatus: {
    fontFamily: FONT_ARABIC_BOLD,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0,
  },
  zoomControls: {
    position: "absolute",
    top: 64,
    insetInlineEnd: 12,
    gap: 6,
    zIndex: 4,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "#C9D9DB",
  },
  zoomText: {
    color: "#102A2E",
    fontFamily: FONT_BOLD,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: "800",
  },
  gestureHint: {
    position: "absolute",
    top: 168,
    insetInlineEnd: 12,
    maxWidth: "40%",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  gestureHintText: {
    color: "#5C6B70",
    fontFamily: FONT_MEDIUM,
    fontSize: 10,
    fontWeight: "700",
  },
  providerNotice: {
    position: "absolute",
    top: 168,
    insetInlineStart: 12,
    maxWidth: "40%",
    backgroundColor: "rgba(255,248,237,0.96)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  providerNoticeText: {
    color: "#8B4D22",
    fontFamily: FONT_SEMIBOLD,
    fontSize: 10,
    fontWeight: "800",
  },
  legend: {
    position: "absolute",
    insetInlineStart: 12,
    bottom: 32,
    maxWidth: "88%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compactLegend: { bottom: 28 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { height: 8, width: 8, borderRadius: 4 },
  legendText: { color: "#52666A", fontFamily: FONT_REGULAR, fontSize: 10 },
  mapFoot: {
    position: "absolute",
    insetInlineStart: 12,
    insetInlineEnd: 12,
    bottom: 8,
  },
  textRight: { textAlign: "right" },
  mapFootText: { color: "#52666A", fontFamily: FONT_REGULAR, fontSize: 10 },
  resetButton: {
    position: "absolute",
    top: 12,
    insetInlineEnd: 12,
    minHeight: 44,
    minWidth: 80,
    justifyContent: "center",
    backgroundColor: "#102A2E",
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  resetText: {
    color: "#FFFFFF",
    fontFamily: FONT_BOLD,
    fontSize: 11,
    fontWeight: "800",
  },
  arabicMeta: {
    fontFamily: FONT_ARABIC_REGULAR,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
  arabicControl: {
    fontFamily: FONT_ARABIC_BOLD,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
  accessibilitySummary: {
    position: "absolute",
    left: -10000,
    top: 0,
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0.01,
  },
});
