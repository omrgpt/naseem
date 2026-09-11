import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MapPreview } from "../MapPreview";
import { RouteLayerLegend } from "../RouteLayerLegend";
import { routePlanHasAuthoritativeGeometry } from "../routeRepository";
import { StatusBadge } from "../UiPatterns";
import {
  asCanonicalRoute,
  text as tx,
  type RouteDetailScreenProps,
} from "../screenTypes";

const routeDetailInlineStyles = {
  root: { flex: 1, minHeight: 0 },
  sheetScroll: { maxHeight: 430, minHeight: 0 },
  sheetContent: { gap: 13, flexGrow: 1 },
  stickyActions: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 8,
  },
  factValue: { flex: 1 },
  stopOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stopOrderText: { fontSize: 12, fontWeight: "700" },
} as const;

/** Map canvas plus one independently scrollable, explainable route sheet. */
export function RouteDetailScreen({
  t,
  rtl,
  palette,
  styles,
  formatNumber,
  distanceDisplay,
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
  onRetry,
  onAddStop,
  onReverse,
  onEdit,
  onSave,
}: RouteDetailScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const [stopEditorOpen, setStopEditorOpen] = useState(false);
  const [reversePreviewOpen, setReversePreviewOpen] = useState(false);
  const [editPointsOpen, setEditPointsOpen] = useState(false);
  const canonical = asCanonicalRoute(route);
  const localText = (english: string, arabic: string) =>
    rtl ? arabic : english;
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : String(value);

  const openRouteChooser = () => {
    setStopEditorOpen(false);
    setReversePreviewOpen(false);
    setEditPointsOpen(false);
    onChangeRoute();
  };

  const openStopEditor = () => {
    setExpanded(true);
    setStopEditorOpen(true);
    setReversePreviewOpen(false);
    setEditPointsOpen(false);
  };

  const openReversePreview = () => {
    setExpanded(true);
    setReversePreviewOpen(true);
    setStopEditorOpen(false);
    setEditPointsOpen(false);
  };

  const openEditPoints = () => {
    setExpanded(true);
    setEditPointsOpen(true);
    setStopEditorOpen(false);
    setReversePreviewOpen(false);
  };
  const onEditPoints = onEdit;

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
          accessibilityLabel={tx(t, "chooseRoute", "Choose route")}
          onPress={openRouteChooser}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>
            {tx(t, "chooseRoute", "Choose route")}
          </Text>
        </Pressable>
      </View>
    );

  const explicitGeometryKind = canonical.geometryKind;
  const explicitGeometryStatus = canonical.geometryStatus;
  const geometryKind =
    explicitGeometryKind ??
    (routeStatus === "trace_ready" ? "recorded_trace" : "waypoint_trace");
  const geometryStatus =
    explicitGeometryStatus ??
    (routeStatus === "matching"
      ? "matching"
      : routeStatus === "unavailable"
        ? "unavailable"
        : routeStatus === "trace_ready"
          ? "ready"
          : "draft");
  const isRoadRouteReady = routePlanHasAuthoritativeGeometry(canonical);
  const isUnavailable = geometryStatus === "unavailable";
  const isSample =
    canonical.ownership === "catalog" || canonical.origin === "pilot";
  const isNbhPreview = canonical.familyId === "nbh-loop" && isSample;
  const isImported = canonical.origin === "gpx";
  const provenanceSource = canonical.provenance?.source;
  const ownershipLabel =
    canonical.ownership === "catalog"
      ? localText("Sample", "عينة")
      : canonical.ownership === "personal"
        ? localText("Yours", "مسارك")
        : localText("Route", "مسار");
  const identityLabel = isSample
    ? localText("Selected sample for review", "العينة المحددة للمراجعة")
    : ownershipLabel;
  const sourceLabel = routeSourceLabel(
    canonical.origin,
    canonical.ownership,
    provenanceSource ?? canonical.source,
    t,
    rtl,
  );
  const originLabel = routeOriginLabel(
    canonical.origin,
    canonical.ownership,
    t,
    rtl,
  );
  const geometryStateLabel =
    geometryStatus === "matching"
      ? tx(t, "matchingRoads", "Finding a road route…")
      : isUnavailable
        ? tx(t, "routeUnavailable", "Route unavailable")
        : isRoadRouteReady
          ? tx(t, "roadMatched", "Road route ready")
          : isImported
            ? tx(t, "importedTrack", "Imported track")
            : isSample
              ? tx(
                  t,
                  "routeCheckPending",
                  "Route preview · road check not complete",
                )
              : geometryKind === "waypoint_trace"
                ? tx(t, "waypointTrace", "Point-to-point preview")
                : tx(t, "routeReviewPending", "Route review pending");
  const statusTone =
    isUnavailable
      ? "danger"
      : isRoadRouteReady
        ? "success"
        : "warning";
  const previewDistanceKm =
    canonical.provisionalDistanceKm ?? canonical.distanceKm;
  const hasAuthoritativeDistance =
    canonical.distanceStatus === "authoritative" && isRoadRouteReady;
  const displayedDistanceKm = hasAuthoritativeDistance
    ? canonical.distanceKm
    : previewDistanceKm;
  const previewDistanceLabel = `${localText(
    "Preview distance",
    "مسافة المعاينة",
  )}: ${distanceDisplay.formatDistance(displayedDistanceKm)}`;
  const publicReferenceDistance = numberText(50);
  const referenceDistanceLabel = isNbhPreview
    ? localText(
        `Public route identity: Bahrain Tourism describes a ${publicReferenceDistance} km track. This supplied preview measures ${distanceDisplay.formatDistance(
          displayedDistanceKm,
        )}; the full-track geometry is not supplied here.`,
        `هوية المسار العامة: تصف هيئة البحرين للسياحة مساراً بطول ${publicReferenceDistance} كم. تبلغ المعاينة المقدمة ${distanceDisplay.formatDistance(
          displayedDistanceKm,
        )}؛ ولم تُقدَّم هندسة المسار الكامل هنا.`,
      )
    : undefined;
  const distanceLabel = hasAuthoritativeDistance
    ? distanceDisplay.formatDistance(canonical.distanceKm)
    : previewDistanceLabel;
  const timeLabel =
    isRoadRouteReady && canonical.durationMinutes > 0
      ? `${numberText(canonical.durationMinutes)} ${tx(t, "minutes", "min")}`
      : isImported
        ? localText(
            "Not supplied for this imported track",
            "غير متوفر لهذا التتبع المستورد",
          )
        : tx(
            t,
            "noFinalMetrics",
            "Final distance, time, and wind details appear after this route is checked against mapped roads.",
          );
  const rideAvailabilityLabel = isRoadRouteReady
    ? tx(t, "roadRouteReady", "Road route ready")
    : tx(
        t,
        "liveRouteNotReady",
        "Route-following ride is unavailable until a road route is ready.",
      );
  const status = geometryStateLabel;
  const departureSummary = departureLabel || localText("Not set", "لم يحدد");
  const reverseUnavailable =
    canonical.points.length < 2 ||
    sameCoordinate(canonical.points[0], canonical.points.at(-1));
  const reversedPoints = canonical.points.slice().reverse();
  const orderedStops = canonical.points.map((point, index) => ({
    index,
    label:
      index === 0
        ? entryLabel || point.name
        : index === canonical.points.length - 1
          ? finishLabel || point.name
          : point.name,
  }));
  const committedEndpoints = `${
    entryLabel || tx(t, "startPoint", "Start")
  } → ${finishLabel || tx(t, "destination", "Destination")}`;
  const comparisonSummary =
    comparisonReason ||
    (comparisonStatus === "suppressed"
      ? tx(t, "comparisonPaused", "Comparison paused")
      : tx(
          t,
          "forecastReviewSummary",
          "Forecast and route evidence are shown separately when available.",
        ));
  const primaryAction = isRoadRouteReady
    ? isNbhPreview && entryActionsEnabled
      ? {
          label: tx(t, "startAtEntry", "Start at the NBH Loop entry"),
          onPress: onStartAtEntry || onUse,
        }
      : {
          label: tx(t, "useRoute", "Use this route"),
          onPress: onUse,
        }
    : onRetry && isUnavailable
      ? { label: tx(t, "retry", "Try again"), onPress: onRetry }
      : {
          label: tx(t, "chooseAnotherRoute", "Choose another route"),
          onPress: openRouteChooser,
        };

  return (
    <View
      style={[styles.atlas, routeDetailInlineStyles.root, rtl && styles.screenRtl]}
    >
      <View style={styles.atlasMap}>
        <MapPreview
          route={canonical}
          fullScreen
          minimal
          rtl={rtl}
          roadLabels={roadLabels}
          mapText={{
            ...mapText,
            status: isRoadRouteReady
              ? "matched"
              : geometryStatus === "matching"
                ? "loading"
                : "pilot",
          }}
        />
        <View style={[styles.atlasTopbar, rtl && styles.atlasTopbarRtl]}>
          <Pressable
            testID="route-detail-sticky-back"
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
            accessibilityLabel={tx(t, "changeRoute", "Change route")}
            onPress={openRouteChooser}
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
        accessibilityLabel={`${canonical.name}. ${identityLabel}. ${status}`}
      >
        <ScrollView
          testID="route-detail-decision-sheet"
          style={routeDetailInlineStyles.sheetScroll}
          contentContainerStyle={[
            routeDetailInlineStyles.sheetContent,
            styles.sheetSafeArea,
          ]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          accessibilityLabel={localText(
            "Scrollable route decision sheet",
            "ورقة قرار المسار القابلة للتمرير",
          )}
        >
          <Pressable
            testID="route-detail-evidence-disclosure"
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded
                ? tx(t, "showLess", "Show less")
                : tx(t, "evidenceSheet", "Route evidence and actions")
            }
            onPress={() => setExpanded((value) => !value)}
            style={[styles.atlasSheetHandle, rtl && styles.rowRtl]}
          >
            <View style={styles.atlasHandle} />
            <Text style={styles.atlasDisclosure}>
              {expanded
                ? tx(t, "showLess", "Show less")
                : tx(t, "evidenceSheet", "Route evidence and actions")}
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
                {identityLabel}
                {variantLabel ? ` · ${variantLabel}` : ""}
              </Text>
            </View>
            <StatusBadge label={status} tone={statusTone} palette={palette} />
          </View>
          <Text style={[styles.atlasCondition, rtl && styles.textRight]}>
            {comparisonSummary}
          </Text>

          <View testID="route-detail-default-facts" style={styles.atlasDetails}>
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {localText("Ownership", "الملكية")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {ownershipLabel}
              </Text>
            </View>
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "routeSource", "Route source")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {sourceLabel}
              </Text>
            </View>
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "origin", "Added from")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {originLabel}
              </Text>
            </View>
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "geometry", "Route line")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {geometryStateLabel}
              </Text>
            </View>
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "startFinish", "Start / finish")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {committedEndpoints}
              </Text>
              {entryDistanceLabel ? (
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {entryDistanceLabel}
                </Text>
              ) : null}
            </View>
            <View style={[styles.atlasIdentity, rtl && styles.rowRtl]}>
              <View style={[styles.atlasFact, routeDetailInlineStyles.factValue]}>
                <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                  {tx(t, "distance", "Distance")}
                </Text>
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {distanceLabel}
                </Text>
              </View>
              <View style={[styles.atlasFact, routeDetailInlineStyles.factValue]}>
                <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                  {tx(t, "duration", "Moving time")}
                </Text>
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {timeLabel}
                </Text>
              </View>
            </View>
            {referenceDistanceLabel ? (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {referenceDistanceLabel}
              </Text>
            ) : null}
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {localText("Ride availability", "إتاحة الركوب")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {rideAvailabilityLabel}
              </Text>
            </View>
          </View>

          {isUnavailable && (
            <View style={styles.atlasActions}>
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
              <View style={[styles.atlasActions, rtl && styles.rowRtl]}>
                {onRetry && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>
                      {tx(t, "retry", "Try again")}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={openEditPoints}
                  style={styles.secondary}
                >
                  <Text style={styles.secondaryText}>
                    {tx(t, "editPoints", "Change points")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {expanded && (
            <View testID="route-detail-deep-evidence" style={styles.atlasDetails}>
              <View style={styles.atlasFact}>
                <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                  {tx(t, "chooseDeparture", "Choose departure")}
                </Text>
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {tx(t, "leavingAt", "Leaving at")} {departureSummary}
                  {arrivalLabel !== "—" && arrivalLabel
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
              <View style={styles.atlasFact}>
                <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                  {tx(t, "sourceEvidence", "Source evidence")}
                </Text>
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {sourceLabel}
                  {canonical.revision !== undefined
                    ? ` · ${tx(t, "snapshotRevision", "Route version")} ${numberText(
                        canonical.revision,
                      )}`
                    : ""}
                </Text>
                {canonical.roadEvidenceStatus ? (
                  <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                    {canonical.roadEvidenceStatus === "sourced"
                      ? tx(t, "roadEvidenceSourced", "Road evidence sourced")
                      : canonical.roadEvidenceStatus === "unknown"
                        ? tx(t, "roadEvidenceUnknown", "Road evidence unknown")
                        : tx(
                            t,
                            "roadEvidencePilotPending",
                            "Road check pending",
                          )}
                  </Text>
                ) : null}
              </View>
              {onlyVariant ? (
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {tx(
                    t,
                    "onlyVariantNote",
                    "This is the only route option available right now.",
                  )}
                </Text>
              ) : null}
              {isNbhPreview ? (
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {referenceDistanceLabel}
                </Text>
              ) : null}
              {isImported ? (
                <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                  {tx(
                    t,
                    "recordedTrackCopy",
                    "This is an imported recorded track. It is not silently treated as a road route.",
                  )}
                </Text>
              ) : null}
              {layers && layers.length > 0 ? (
                <RouteLayerLegend
                  layers={layers}
                  palette={palette}
                  rtl={rtl}
                  title={tx(t, "mapLayers", "Map layers")}
                />
              ) : null}

              <View style={[styles.manualActions, rtl && styles.rowRtl]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tx(t, "addStop", "Add stop")}
                  onPress={openStopEditor}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>
                    {tx(t, "addStop", "Add stop")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tx(t, "reverse", "Reverse")}
                  onPress={openReversePreview}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>
                    {tx(t, "reverse", "Reverse")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tx(t, "editPoints", "Edit points")}
                  onPress={openEditPoints}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>
                    {tx(t, "editPoints", "Edit points")}
                  </Text>
                </Pressable>
                {onSave && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tx(t, "saveRoute", "Save route")}
                    onPress={onSave}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>
                      {tx(t, "saveRoute", "Save route")}
                    </Text>
                  </Pressable>
                )}
              </View>

              {stopEditorOpen && (
                <View testID="route-detail-stop-editor" style={styles.panelAlt}>
                  <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                    {localText("Add a stop", "أضف محطة")}
                  </Text>
                  <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                    {localText(
                      "Your committed Start and Finish stay in this order while you add a stop in Plan.",
                      "تبقى نقطة البداية والوجهة المؤكدتان بهذا الترتيب أثناء إضافة محطة في التخطيط.",
                    )}
                  </Text>
                  <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                    {committedEndpoints}
                  </Text>
                  <View style={styles.mapPointList}>
                    {orderedStops.map((stop) => (
                      <View
                        key={`${stop.index}-${stop.label}`}
                        style={[styles.row, rtl && styles.rowRtl]}
                      >
                        <View
                          style={[
                            routeDetailInlineStyles.stopOrder,
                            { backgroundColor: palette.accent },
                          ]}
                        >
                          <Text
                            style={[
                              routeDetailInlineStyles.stopOrderText,
                              { color: palette.bg },
                            ]}
                          >
                            {numberText(stop.index + 1)}
                          </Text>
                        </View>
                        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                          {stop.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.manualActions, rtl && styles.rowRtl]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={onAddStop}
                      style={styles.primary}
                    >
                      <Text style={styles.primaryText}>
                        {localText("Continue in Plan", "المتابعة إلى التخطيط")}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setStopEditorOpen(false)}
                      style={styles.secondary}
                    >
                      <Text style={styles.secondaryText}>
                        {tx(t, "cancel", "Cancel")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {reversePreviewOpen && (
                <View testID="route-detail-reverse-preview" style={styles.panelAlt}>
                  <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                    {tx(t, "reverse", "Reverse")}
                  </Text>
                  {reverseUnavailable ? (
                    <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                      {localText(
                        "This route shares its Start and Finish, so reversing it would not create a different route.",
                        "تشترك نقطة البداية والوجهة في هذا المسار، لذلك لن ينتج عن عكسه مسار مختلف.",
                      )}
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                        {localText(
                          "Preview: Start and Finish will swap. Review the changed route in Plan before using it.",
                          "معاينة: ستتبدل نقطة البداية والوجهة. راجع المسار المتغير في التخطيط قبل استخدامه.",
                        )}
                      </Text>
                      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                        {`${reversedPoints[0]?.name ?? tx(t, "startPoint", "Start")} → ${
                          reversedPoints.at(-1)?.name ??
                          tx(t, "destination", "Destination")
                        }`}
                      </Text>
                    </>
                  )}
                  <View style={[styles.manualActions, rtl && styles.rowRtl]}>
                    {!reverseUnavailable && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={onReverse}
                        style={styles.primary}
                      >
                        <Text style={styles.primaryText}>
                          {localText("Reverse and review", "اعكس وراجع")}
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setReversePreviewOpen(false)}
                      style={styles.secondary}
                    >
                      <Text style={styles.secondaryText}>
                        {tx(t, "cancel", "Cancel")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {editPointsOpen && (
                <View testID="route-detail-edit-points" style={styles.panelAlt}>
                  <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                    {tx(t, "editPoints", "Edit points")}
                  </Text>
                  <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                    {localText(
                      "Plan will open with these committed Start and Finish points preserved. Review the updated route there before returning here.",
                      "سيفتح التخطيط مع الحفاظ على نقطتي البداية والوجهة المؤكدتين. راجع المسار المحدث هناك قبل العودة إلى هنا.",
                    )}
                  </Text>
                  <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                    {committedEndpoints}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onEditPoints}
                    style={styles.primary}
                  >
                    <Text style={styles.primaryText}>
                      {localText("Open Plan", "فتح التخطيط")}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
        <View
          testID="route-detail-sticky-actions"
          style={[styles.atlasActions, routeDetailInlineStyles.stickyActions]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            onPress={primaryAction.onPress}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{primaryAction.label}</Text>
          </Pressable>
          {!isRoadRouteReady && (
            <Text style={[styles.fieldHint, rtl && styles.textRight]}>
              {tx(
                t,
                "previewOnlyRideCopy",
                "You can review this route now. Starting a route-following ride will be available after the road check is complete.",
              )}
            </Text>
          )}
          {isRoadRouteReady && isNbhPreview && entryActionsEnabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx(
                t,
                "connectFromLocation",
                "Connect from my location",
              )}
              onPress={onConnectFromLocation || onUse}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {tx(t, "connectFromLocation", "Connect from my location")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function routeSourceLabel(
  origin: string | undefined,
  ownership: string | undefined,
  source: string,
  t: RouteDetailScreenProps["t"],
  rtl: boolean,
) {
  if (origin === "gpx") return tx(t, "sourceGpx", "GPX import");
  if (origin === "drawn") return tx(t, "drawnRoute", "Drawn on device");
  if (origin === "generated")
    return tx(t, "generatedRoute", "Generated route");
  if (source === "Bahrain Tourism")
    return tx(t, "sourceBahrain", "Bahrain Tourism");
  if (source === "OpenStreetMap") return tx(t, "sourceOsm", "OpenStreetMap");
  if (source === "Naseem planner")
    return rtl ? "منشئ نسيم" : "Created in Naseem";
  if (source === "Generated route candidate")
    return rtl ? "مسار منشأ" : "Generated route";
  if (ownership === "catalog")
    return rtl ? "مصدر المسار النموذجي" : "Sample route source";
  return rtl ? "تفاصيل المصدر" : "Source details";
}

function routeOriginLabel(
  origin: string | undefined,
  ownership: string | undefined,
  t: RouteDetailScreenProps["t"],
  rtl: boolean,
) {
  if (origin === "gpx") return tx(t, "imported", "Imported");
  if (origin === "drawn") return tx(t, "drawn", "Drawn");
  if (origin === "generated") return tx(t, "generated", "Generated");
  if (ownership === "catalog" || origin === "pilot")
    return rtl ? "مسار نموذجي" : "Sample route";
  return rtl ? "مسار محفوظ" : "Saved route";
}

function sameCoordinate(
  first: { latitude: number; longitude: number } | undefined,
  second: { latitude: number; longitude: number } | undefined,
) {
  if (!first || !second) return false;
  return (
    Math.abs(first.latitude - second.latitude) < 0.000001 &&
    Math.abs(first.longitude - second.longitude) < 0.000001
  );
}
