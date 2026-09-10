import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import {
  FONT_ARABIC_BOLD,
  FONT_ARABIC_REGULAR,
  FONT_BOLD,
  FONT_MEDIUM,
  FONT_REGULAR,
  FONT_SEMIBOLD,
} from "./fonts";
import { useEffect, useMemo, useRef, useState } from "react";
import Svg, { Polyline as SvgPolyline } from "react-native-svg";
import type { Coordinate, RoadKind, RoutePlan } from "./domain";
import type { MapPreviewProps } from "./MapPreview";
import {
  hasFiniteCoordinate,
  shouldShowMinimalMapControls,
  shouldShowUserLocationControl,
} from "./mapPreviewContract";
import {
  mapIsLoop,
  mapLineModel,
  mapMarkerPoints,
  mapSegmentIndexForLine,
  normalizeSelectedSegment,
} from "./mapModel";
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
const tileTemplate =
  process.env.EXPO_PUBLIC_WEB_TILE_URL?.trim() ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const tileAttribution =
  process.env.EXPO_PUBLIC_WEB_TILE_ATTRIBUTION?.trim() ||
  "© OpenStreetMap contributors";

export function MapPreview({
  route,
  compact = false,
  fullScreen = false,
  minimal = false,
  selectedSegment,
  rtl = false,
  showUserLocation = false,
  onReset,
  onMapPress,
  userCoordinate,
  roadLabels,
  mapText,
}: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const width = Math.max(260, Math.min(728, viewportWidth - 32));
  const height = fullScreen ? 448 : compact ? 248 : 352;
  const { linePoints, roadMatched, status: mapStatus } = mapLineModel(
    route,
    mapText?.status,
  );
  const geometryKey = linePoints
    .map(({ latitude, longitude }) => `${latitude},${longitude}`)
    .join("|");
  const routeCenter = centerOf(linePoints);
  const [mapCenter, setMapCenter] = useState(routeCenter);
  const [zoomOffset, setZoomOffset] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
    startedAt: number;
  }>({ startX: 0, startY: 0, panX: 0, panY: 0, moved: false, startedAt: 0 });
  panRef.current = pan;
  const zoom = Math.max(
    9,
    Math.min(16, fitZoom(linePoints, width, height) + zoomOffset),
  );
  const center = mapCenter;
  const markerEntries = mapMarkerPoints(route, linePoints, roadMatched);
  const centerWorld = project(center, zoom);
  const centerTileX = Math.floor(centerWorld.x / 256);
  const centerTileY = Math.floor(centerWorld.y / 256);
  const markerPositions = markerEntries.map((entry) => ({
    ...entry,
    position: toPosition(
      entry.coordinate,
      zoom,
      centerWorld,
      width,
      height,
      pan,
    ),
  }));
  const linePositions = linePoints.map((point) =>
    toPosition(point, zoom, centerWorld, width, height, pan),
  );
  const linePaths = buildLinePaths(linePoints, linePositions, route);
  const roadLabelFor = (kind: RoadKind) =>
    roadLabels?.[kind] ??
    (kind === "unknown"
      ? rtl
        ? "لا تتوفر أدلة طرق"
        : "Road evidence unavailable"
      : LABELS[kind]);
  const userPosition = hasFiniteCoordinate(userCoordinate)
    ? toPosition(userCoordinate, zoom, centerWorld, width, height, pan)
    : undefined;
  const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
  // Four-by-four coverage keeps hand panning filled without requesting a
  // full tile atlas for every render.
  for (let dx = -1; dx <= 2; dx += 1)
    for (let dy = -1; dy <= 2; dy += 1) {
      const x = centerTileX + dx;
      const y = centerTileY + dy;
      tiles.push({
        x,
        y,
        left: width / 2 + x * 256 - centerWorld.x + pan.x,
        top: height / 2 + y * 256 - centerWorld.y + pan.y,
      });
    }
  const text = {
    native: rtl
      ? "خريطة Apple / Google · تظهر أدلة المسار حسب المقطع"
      : "Apple / Google map · route evidence shown by segment",
    web: rtl
      ? "معاينة OpenStreetMap على الويب"
      : "Supplied route preview; road verification pending",
    fit: rtl ? "ملاءمة المسار" : "Fit route",
    loop: rtl ? "حلقة" : "loop",
    gestures: rtl
      ? "اسحب لتحريك الخريطة · استخدم + و - للتكبير"
      : "Drag to move · use + / - to zoom",
    statusMatched: rtl ? "مطابق للطرق" : "ROAD-MATCHED",
    statusLoading: rtl ? "جارٍ مطابقة الطرق" : "MATCHING ROADS",
    statusPilot: rtl ? "معاينة المسار" : "ROUTE PREVIEW",
    tilesUnavailable: rtl
      ? "بلاطات الخريطة غير متاحة؛ يبقى المسار ظاهراً."
      : "Map tiles are unavailable; the route remains visible.",
    zoomIn: rtl ? "تكبير الخريطة" : "Zoom in",
    zoomOut: rtl ? "تصغير الخريطة" : "Zoom out",
    distanceUnit: rtl ? "كم" : "km",
    routeLabel: rtl ? "مسار" : "route",
    mapLabel: rtl ? `خريطة المسار: ${route.name}` : `${route.name} route map`,
    mapHint: onMapPress
      ? rtl
        ? "استخدم مفاتيح الأسهم لتحريك الخريطة، ثم اضغط Enter أو المسافة لإضافة نقطة في المركز."
        : "Use the arrow keys to move the map, then press Enter or Space to add a point at the center."
      : rtl
        ? "استخدم مفاتيح الأسهم لتحريك الخريطة، أو استخدم أدوات التكبير وملاءمة المسار."
        : "Use the arrow keys to move the map, or use the zoom and Fit route controls.",
    addPoint: rtl ? "إضافة نقطة" : "Add point",
    addPointHint: rtl
      ? "إضافة نقطة عند مركز الخريطة"
      : "Add a point at the map center",
    routePoints: rtl ? "نقاط المسار" : "Route points",
    startPoint: rtl ? "البداية" : "Start",
    startEndPoint: rtl ? "البداية والنهاية" : "Start and finish",
    destinationPoint: rtl ? "الوجهة" : "Destination",
    waypoint: rtl ? "نقطة طريق" : "Waypoint",
    userLocation: rtl ? "موقعك الحالي" : "Current location",
    ...mapText,
  };
  const showMinimalControls = shouldShowMinimalMapControls(compact, minimal);
  const showUserLocationControl = shouldShowUserLocationControl(
    showUserLocation,
    userCoordinate,
  );
  const isLoopRoute = mapIsLoop(route);
  const mapStatusLabel =
    mapStatus === "matched"
      ? text.statusMatched
      : mapStatus === "loading"
        ? text.statusLoading
        : text.statusPilot;
  const focusSegment = normalizeSelectedSegment(selectedSegment);
  const [tileUnavailable, setTileUnavailable] = useState(false);
  const [mapFocused, setMapFocused] = useState(false);
  const suppressClickRef = useRef(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const localPoint = (event: any) => {
    const rawEvent = event as GestureResponderEvent & {
      currentTarget?: {
        getBoundingClientRect?: () => { left: number; top: number };
      };
    };
    const native = event.nativeEvent as GestureResponderEvent["nativeEvent"] & {
      offsetX?: number;
      offsetY?: number;
      pageX?: number;
      pageY?: number;
    };
    const x =
      typeof native.locationX === "number" ? native.locationX : native.offsetX;
    const y =
      typeof native.locationY === "number" ? native.locationY : native.offsetY;
    if (typeof x === "number" && typeof y === "number") return { x, y };
    const rect = rawEvent.currentTarget?.getBoundingClientRect?.();
    if (
      rect &&
      typeof native.pageX === "number" &&
      typeof native.pageY === "number"
    )
      return { x: native.pageX - rect.left, y: native.pageY - rect.top };
    return undefined;
  };
  const pointAtMapCenter = () => {
    if (!onMapPress) return;
    onMapPress(
      unproject(
        {
          x: centerWorld.x - panRef.current.x,
          y: centerWorld.y - panRef.current.y,
        },
        zoom,
      ),
    );
  };
  const clampPan = (next: { x: number; y: number }) => ({
    x: Math.max(-width * 0.45, Math.min(width * 0.45, next.x)),
    y: Math.max(-height * 0.45, Math.min(height * 0.45, next.y)),
  });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, state) =>
          Math.hypot(state.dx, state.dy) > 7,
        onPanResponderGrant: (event) => {
          const point = localPoint(event);
          if (!point) return;
          gestureRef.current = {
            startX: point.x,
            startY: point.y,
            panX: panRef.current.x,
            panY: panRef.current.y,
            moved: false,
            startedAt: Date.now(),
          };
        },
        onPanResponderMove: (event, state) => {
          event.preventDefault?.();
          const gesture = gestureRef.current;
          if (Math.hypot(state.dx, state.dy) > 5) gesture.moved = true;
          setPan(
            clampPan({
              x: gesture.panX + state.dx,
              y: gesture.panY + state.dy,
            }),
          );
        },
        onPanResponderRelease: (event, state) => {
          event.preventDefault?.();
          const gesture = gestureRef.current;
          suppressClickRef.current = Boolean(
            gesture.moved || Math.hypot(state.dx, state.dy) > 8,
          );
          if (suppressClickRef.current)
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
        },
        onPanResponderTerminate: () => {
          gestureRef.current.moved = false;
          suppressClickRef.current = true;
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [height, width],
  );
  const handleWheel = (event: any) => {
    const delta = Number(event?.deltaY ?? event?.nativeEvent?.deltaY ?? 0);
    if (!Number.isFinite(delta) || delta === 0) return;
    event?.preventDefault?.();
    setZoomOffset((current) =>
      Math.max(-4, Math.min(4, current + (delta < 0 ? 1 : -1))),
    );
  };
  useEffect(() => {
    setMapCenter(routeCenter);
    setPan({ x: 0, y: 0 });
    setZoomOffset(0);
    setTileUnavailable(false);
    return () => {
      if (clickTimeoutRef.current !== undefined) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = undefined;
      }
    };
  }, [route.id, route.revisionId, geometryKey]);
  const centerOnUserLocation = () => {
    if (!showUserLocationControl || !hasFiniteCoordinate(userCoordinate)) return;
    setMapCenter({
      latitude: userCoordinate.latitude,
      longitude: userCoordinate.longitude,
    });
    setPan({ x: 0, y: 0 });
  };
  const reset = () => {
    setMapCenter(routeCenter);
    setZoomOffset(0);
    setPan({ x: 0, y: 0 });
    onReset?.();
  };
  const handleMapClick = (event: any) => {
    if (!onMapPress || suppressClickRef.current) return;
    const point = localPoint(event);
    if (!point) return;
    const coordinate = unproject(
      {
        x: centerWorld.x + point.x - width / 2 - panRef.current.x,
        y: centerWorld.y + point.y - height / 2 - panRef.current.y,
      },
      zoom,
    );
    if (clickTimeoutRef.current !== undefined)
      clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = undefined;
      if (!suppressClickRef.current) onMapPress(coordinate);
    }, 180);
  };
  const handleDoubleClick = (event: any) => {
    event?.preventDefault?.();
    if (clickTimeoutRef.current !== undefined) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = undefined;
    }
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 220);
    setZoomOffset((current) => Math.min(4, current + 1));
  };
  const handleKeyDown = (event: any) => {
    const key = event?.key;
    if (key === "+" || key === "=") {
      event.preventDefault?.();
      setZoomOffset((current) => Math.min(4, current + 1));
    } else if (key === "-" || key === "_") {
      event.preventDefault?.();
      setZoomOffset((current) => Math.max(-4, current - 1));
    } else if (
      (key === "Enter" || key === " " || key === "Spacebar") &&
      onMapPress
    ) {
      event.preventDefault?.();
      pointAtMapCenter();
    } else if (
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown"
    ) {
      event.preventDefault?.();
      const amount =
        key === "ArrowLeft"
          ? { x: 42, y: 0 }
          : key === "ArrowRight"
            ? { x: -42, y: 0 }
            : key === "ArrowUp"
              ? { x: 0, y: 42 }
              : { x: 0, y: -42 };
      setPan((current) =>
        clampPan({ x: current.x + amount.x, y: current.y + amount.y }),
      );
    }
  };
  const mapLabel =
    text.mapLabel ??
    (rtl ? `خريطة المسار: ${route.name}` : `${route.name} route map`);
  const mapHint =
    text.mapHint ??
    (onMapPress
      ? "Use the arrow keys to move the map, then press Enter or Space to add a point at the center."
      : "Use the arrow keys to move the map, or use the zoom and Fit route controls.");
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
  const mapSummary = `${mapLabel}. ${statusLabel}.${compact ? "" : ` ${text.web}. ${routePointsLabel}: ${accessiblePointLabels.length ? accessiblePointLabels.join(". ") : rtl ? "لا توجد نقاط مسار." : "No route points."}`}`;
  const mapDetailsId = `map-details-${route.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        fullScreen && styles.fullScreen,
        rtl && styles.rtlContainer,
        rtl && ({ direction: "rtl" } as any),
        { height, width },
      ]}
      accessibilityLabel={mapLabel}
    >
      <View
        testID="route-map"
        style={[
          styles.gestureLayer,
          { touchAction: "none" } as any,
          mapFocused && styles.focusRing,
        ]}
        {...panResponder.panHandlers}
        {...({
          onWheel: handleWheel,
          onClick: handleMapClick,
          onDoubleClick: handleDoubleClick,
          onKeyDown: handleKeyDown,
          tabIndex: 0,
          "aria-keyshortcuts":
            "ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space + -",
          "aria-describedby": mapDetailsId,
        } as any)}
        role="application"
        accessibilityLabel={mapLabel}
        accessibilityHint={mapHint}
        aria-label={mapLabel}
        onFocus={() => setMapFocused(true)}
        onBlur={() => setMapFocused(false)}
      >
        <View style={styles.tileLayer} pointerEvents="none" accessible={false}>
          {tiles.map((tile) => (
            <Image
              key={`${tile.x}-${tile.y}`}
              accessible={false}
              onError={() => setTileUnavailable(true)}
              source={{
                uri: tileTemplate
                  .replace("{z}", String(zoom))
                  .replace("{x}", String(tile.x))
                  .replace("{y}", String(tile.y)),
              }}
              style={{
                position: "absolute",
                width: 256,
                height: 256,
                left: tile.left,
                top: tile.top,
              }}
            />
          ))}
        </View>
        <View style={styles.routeOverlay} pointerEvents="none">
          {linePaths.length > 0 && (
            <Svg
              width={width}
              height={height}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {linePaths.map((path, index) => (
                <SvgPolyline
                  key={`${route.id}-under-path-${index}`}
                  points={path.points
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.84}
                  strokeDasharray={roadMatched ? undefined : [8, 8]}
                />
              ))}
              {linePaths.map((path, index) => (
                <SvgPolyline
                  key={`${route.id}-path-${index}`}
                  points={path.points
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                  fill="none"
                  stroke={path.color}
                  strokeWidth={
                    focusSegment === undefined ||
                    path.segmentIndexes.includes(focusSegment)
                      ? 6
                      : 4
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={
                    focusSegment === undefined ||
                    path.segmentIndexes.includes(focusSegment)
                      ? 1
                      : 0.34
                  }
                  strokeDasharray={roadMatched ? undefined : [8, 8]}
                />
              ))}
            </Svg>
          )}
          {markerPositions.map((entry, index) => {
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
              <View
                key={`${route.id}-marker-${entry.sourceIndex}`}
                accessible
                accessibilityRole="image"
                accessibilityLabel={pointLabels[index]}
                style={[
                  styles.webMarker,
                  { left: entry.position.x - 10, top: entry.position.y - 10 },
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
            );
          })}
          {userPosition && (
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={text.userLocation}
              style={[
                styles.userMarker,
                { left: userPosition.x - 8, top: userPosition.y - 8 },
              ]}
            />
          )}
        </View>
      </View>
      {showUserLocationControl && (
        <Pressable
          testID="map-center-user-location"
          accessibilityRole="button"
          accessibilityLabel={text.userLocation}
          aria-label={text.userLocation}
          onPress={centerOnUserLocation}
          style={styles.currentLocationButton}
        >
          <View
            accessible={false}
            style={styles.currentLocationIcon}
            pointerEvents="none"
          >
            <View style={styles.currentLocationIconCore} />
          </View>
        </Pressable>
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
            aria-label={text.zoomIn}
            onPress={() => setZoomOffset((current) => Math.min(4, current + 1))}
            style={styles.zoomButton}
          >
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
          <Pressable
            testID="map-zoom-out"
            accessibilityRole="button"
            accessibilityLabel={text.zoomOut}
            aria-label={text.zoomOut}
            onPress={() =>
              setZoomOffset((current) => Math.max(-4, current - 1))
            }
            style={styles.zoomButton}
          >
            <Text style={styles.zoomText}>-</Text>
          </Pressable>
        </View>
      )}
      {!compact && !minimal && onMapPress && (
        <Pressable
          testID="map-add-point"
          accessibilityRole="button"
          accessibilityLabel={text.addPoint}
          accessibilityHint={text.addPointHint}
          onPress={pointAtMapCenter}
          style={styles.addPointButton}
        >
          <Text style={[styles.addPointText, rtl && styles.arabicControl]}>
            {text.addPoint}
          </Text>
        </Pressable>
      )}
      {!compact && !minimal && (
        <View
          style={[styles.legend, compact && styles.compactLegend]}
          pointerEvents="none"
        >
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
        <View style={styles.gestureHint} pointerEvents="none">
          <Text style={[styles.gestureHintText, rtl && styles.arabicMeta]}>
            {text.gestures}
          </Text>
        </View>
      )}
      {tileUnavailable && (
        <View
          style={styles.providerNotice}
          pointerEvents="none"
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          aria-live="polite"
        >
          <Text style={[styles.providerNoticeText, rtl && styles.arabicMeta]}>
            {text.tilesUnavailable}
          </Text>
        </View>
      )}
      {!compact && !minimal && (
        <>
          <View style={styles.mapFoot} pointerEvents="none">
            <Text
              style={[
                styles.mapFootText,
                rtl && styles.textRight,
                rtl && styles.arabicMeta,
              ]}
            >
              {text.web}
            </Text>
          </View>
        </>
      )}
      <Text style={[styles.attribution, rtl && styles.arabicMeta]}>
        {tileAttribution}
      </Text>
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
              onPress={() =>
                setZoomOffset((current) => Math.min(4, current + 1))
              }
              style={styles.zoomButton}
            >
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
            <Pressable
              testID="map-zoom-out"
              accessibilityRole="button"
              accessibilityLabel={text.zoomOut}
              onPress={() =>
                setZoomOffset((current) => Math.max(-4, current - 1))
              }
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

type ScreenPoint = { x: number; y: number };
type ColoredPath = {
  points: ScreenPoint[];
  color: string;
  segmentIndexes: number[];
};

function buildLinePaths(
  linePoints: Coordinate[],
  positions: ScreenPoint[],
  route: RoutePlan,
): ColoredPath[] {
  if (positions.length < 2) return [];
  const paths: ColoredPath[] = [];
  let current: ColoredPath = {
    points: [positions[0]],
    color: COLORS[route.points[0]?.suitability.kind ?? "unknown"],
    segmentIndexes: [],
  };
  for (let index = 0; index < positions.length - 1; index += 1) {
    const segmentIndex = mapSegmentIndexForLine(route, index, positions.length);
    const kind = route.points[segmentIndex]?.suitability.kind ?? "unknown";
    const color = COLORS[kind];
    if (current.points.length > 1 && current.color !== color) {
      paths.push(current);
      current = {
        points: [positions[index], positions[index + 1]],
        color,
        segmentIndexes: [segmentIndex],
      };
    } else {
      current.points.push(positions[index + 1]);
      current.segmentIndexes.push(segmentIndex);
    }
  }
  if (current.points.length > 1) paths.push(current);
  return paths;
}

function toPosition(
  point: Coordinate,
  zoom: number,
  centerWorld: { x: number; y: number },
  width: number,
  height: number,
  pan = { x: 0, y: 0 },
) {
  const projected = project(point, zoom);
  return {
    x: width / 2 + projected.x - centerWorld.x + pan.x,
    y: height / 2 + projected.y - centerWorld.y + pan.y,
  };
}
function centerOf(points: Coordinate[]) {
  if (!points.length) return { latitude: 26.18, longitude: 50.53 };
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}
function fitZoom(points: Coordinate[], width: number, height: number) {
  if (points.length < 2) return 13;
  for (let zoom = 16; zoom >= 9; zoom -= 1) {
    const projected = points.map((point) => project(point, zoom));
    const xSpan =
      Math.max(...projected.map((point) => point.x)) -
      Math.min(...projected.map((point) => point.x));
    const ySpan =
      Math.max(...projected.map((point) => point.y)) -
      Math.min(...projected.map((point) => point.y));
    if (xSpan <= width - 48 && ySpan <= height - 74) return zoom;
  }
  return 9;
}
function project(point: Coordinate, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const x = ((point.longitude + 180) / 360) * scale;
  const sinLatitude = Math.sin((point.latitude * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
    scale;
  return { x, y };
}
function unproject(point: { x: number; y: number }, zoom: number): Coordinate {
  const scale = 256 * 2 ** zoom;
  const longitude = (point.x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * point.y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude, longitude };
}
export const roadColor = (kind: RoadKind) => COLORS[kind];

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
  // Direction is established on the web document; RN Web does not accept a
  // `direction` style property here.
  rtlContainer: {},
  compact: { height: 248 },
  fullScreen: { minHeight: 448 },
  gestureLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  focusRing: {
    borderWidth: 3,
    borderColor: "#006B6F",
    outlineStyle: "solid",
    outlineWidth: 2,
    outlineColor: "#006B6F",
    outlineOffset: -2,
  },
  tileLayer: { ...StyleSheet.absoluteFill, backgroundColor: "#E5EEEE" },
  routeOverlay: { ...StyleSheet.absoluteFill },
  webMarker: {
    position: "absolute",
    height: 22,
    minWidth: 22,
    paddingHorizontal: 3,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#102A2E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userMarker: {
    position: "absolute",
    height: 16,
    width: 16,
    borderRadius: 8,
    backgroundColor: "#3778F5",
    borderWidth: 3,
    borderColor: "#FFFFFF",
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
  startMarker: { backgroundColor: "#A94B31" },
  loopMarker: { minWidth: 30, borderRadius: 15 },
  midMarker: { backgroundColor: "#006B6F" },
  markerText: {
    color: "#FFFFFF",
    fontFamily: FONT_BOLD,
    fontSize: 10,
    fontWeight: "800",
  },
  mapHeader: {
    position: "absolute",
    top: 12,
    insetInlineStart: 12,
    insetInlineEnd: 104,
    zIndex: 3,
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
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
  minimalControls: {
    position: "absolute",
    insetInlineEnd: 12,
    bottom: 20,
    gap: 8,
    alignItems: "flex-end",
    zIndex: 4,
  },
  minimalControlsRtl: { alignItems: "flex-start" },
  minimalFit: {
    minHeight: 44,
    minWidth: 80,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#102A2E",
  },
  minimalZoomStack: { gap: 6 },
  zoomButton: {
    minWidth: 44,
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
  addPointButton: {
    position: "absolute",
    top: 116,
    insetInlineStart: 12,
    minHeight: 44,
    maxWidth: "48%",
    justifyContent: "center",
    backgroundColor: "#102A2E",
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    zIndex: 4,
  },
  addPointText: {
    color: "#FFFFFF",
    fontFamily: FONT_BOLD,
    fontSize: 11,
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
    zIndex: 3,
  },
  gestureHintText: {
    color: "#5C6B70",
    fontFamily: FONT_MEDIUM,
    fontSize: 10,
    fontWeight: "700",
  },
  legend: {
    position: "absolute",
    insetInlineStart: 12,
    bottom: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "88%",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 3,
  },
  compactLegend: { bottom: 30 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { height: 8, width: 8, borderRadius: 4 },
  legendText: { color: "#52666A", fontFamily: FONT_REGULAR, fontSize: 10 },
  providerNotice: {
    position: "absolute",
    top: 168,
    insetInlineStart: 12,
    maxWidth: "40%",
    backgroundColor: "rgba(255,248,237,0.96)",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    zIndex: 3,
  },
  providerNoticeText: {
    color: "#8B4D22",
    fontFamily: FONT_SEMIBOLD,
    fontSize: 10,
    fontWeight: "800",
  },
  mapFoot: {
    position: "absolute",
    insetInlineStart: 12,
    insetInlineEnd: 112,
    bottom: 8,
    zIndex: 3,
  },
  textRight: { textAlign: "right" },
  mapFootText: { color: "#52666A", fontFamily: FONT_REGULAR, fontSize: 10 },
  attribution: {
    position: "absolute",
    insetInlineEnd: 8,
    bottom: 8,
    color: "#52666A",
    fontFamily: FONT_REGULAR,
    fontSize: 9,
    backgroundColor: "rgba(255,255,255,0.86)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 4,
  },
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
    zIndex: 5,
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
