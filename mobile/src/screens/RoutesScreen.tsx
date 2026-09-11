import { useRef, useState, type RefObject } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MapPreview } from "../MapPreview";
import { RouteLayerLegend } from "../RouteLayerLegend";
import { NoticeAlert, StatusBadge } from "../UiPatterns";
import type { Coordinate, RoutePlan } from "../domain";
import {
  plannerValidationMessage,
  validatePlannerEndpoints,
  type PlannerField,
} from "../routeBuilder";
import {
  asCanonicalRoute,
  routeChipFor,
  routeCollection,
  routeGeometryKind,
  routeGeometryStatus,
  routeOwnership,
  text as tx,
  type BuilderRouteState,
  type CanonicalRouteView,
  type CollectionKind,
  type Copy,
  type KnownRouteFamilyProps,
  type PlannerPoint,
  type RoadLabels,
  type ScreenBaseProps,
} from "../screenTypes";
import { PLAN_ACTIONS, type PlanActionId } from "./screenTypes";

export type RoutesMapText = {
  native: string;
  web: string;
  fit: string;
  loop: string;
  gestures?: string;
  zoomIn?: string;
  zoomOut?: string;
  distanceUnit?: string;
  status?: "matched" | "loading" | "pilot";
  statusMatched?: string;
  statusLoading?: string;
  statusPilot?: string;
  tilesUnavailable?: string;
};

export type RoutesScreenProps = ScreenBaseProps & {
  builder: BuilderRouteState;
  builderPreview: RoutePlan | null;
  activeField: "start" | "destination" | null;
  startText: string;
  destinationText: string;
  targetDistanceInput?: string;
  mapText: RoutesMapText;
  roadLabels?: RoadLabels;
  samples: RoutePlan[];
  myRoutes: RoutePlan[];
  imports: RoutePlan[];
  selectedRouteId?: string | null;
  manualMode: boolean;
  manualRoute: RoutePlan | null;
  manualPoints: Coordinate[];
  importReview: RoutePlan | null;
  importReviewFileName?: string;
  generatedReview: RoutePlan | null;
  routeMessage?: string;
  loopGenerationFailed?: boolean;
  manualReview?: RoutePlan | null;
  knownRouteFamily?: KnownRouteFamilyProps;
  onStartText: (value: string) => void;
  onDestinationText: (value: string) => void;
  onGenerationDistance?: (value: string) => void;
  onFocusField: (field: "start" | "destination") => void;
  onChooseOnMap: (field: "start" | "destination") => void;
  onUseCurrentLocation: (field: "start" | "destination") => void;
  onUseSavedPoint: (
    field: "start" | "destination",
    point: PlannerPoint,
  ) => void;
  onMapPress: (coordinate: Coordinate) => void;
  onRetryMatch: () => void;
  onEditPoints: () => void;
  onUseMatchedRoute: () => void;
  onAddStop: () => void;
  onReverse: () => void;
  onImport: () => void;
  onGenerate: () => void;
  onOpenManual: () => void;
  onCancelManual: () => void;
  onUndoManual: () => void;
  onRedoManual: () => void;
  onClearManual: () => void;
  onDoneManual: () => void;
  onUseManual?: () => void;
  onSaveManual?: () => void;
  onEditManual?: () => void;
  onDiscardManual?: () => void;
  onRemoveManualPoint: (index: number) => void;
  onMoveManualPoint?: (index: number, direction: -1 | 1) => void;
  onUseImport: () => void;
  onCancelImport: () => void;
  onUseGenerated: () => void;
  onCancelGenerated: () => void;
  onRetryLoop?: () => void;
  onSelect: (route: RoutePlan) => void;
};

export function RoutesScreen({
  t,
  rtl,
  palette,
  styles,
  formatNumber,
  formatTime,
  distanceDisplay,
  builder,
  builderPreview,
  activeField,
  startText,
  destinationText,
  targetDistanceInput,
  mapText,
  roadLabels,
  samples,
  myRoutes,
  imports,
  selectedRouteId,
  manualMode,
  manualRoute,
  manualPoints,
  importReview,
  importReviewFileName,
  generatedReview,
  routeMessage,
  loopGenerationFailed,
  manualReview,
  knownRouteFamily,
  onStartText,
  onDestinationText,
  onGenerationDistance,
  onFocusField,
  onChooseOnMap,
  onUseCurrentLocation,
  onUseSavedPoint,
  onMapPress,
  onRetryMatch,
  onEditPoints,
  onUseMatchedRoute,
  onAddStop,
  onReverse,
  onImport,
  onGenerate,
  onOpenManual,
  onCancelManual,
  onUndoManual,
  onRedoManual,
  onClearManual,
  onDoneManual,
  onUseManual,
  onSaveManual,
  onEditManual,
  onDiscardManual,
  onRemoveManualPoint,
  onMoveManualPoint,
  onUseImport,
  onCancelImport,
  onUseGenerated,
  onCancelGenerated,
  onRetryLoop,
  onSelect,
}: RoutesScreenProps) {
  const [showSamples, setShowSamples] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [planAction, setPlanAction] = useState<PlanActionId | null>(null);
  const [pendingMapPoint, setPendingMapPoint] = useState<{
    field: PlannerField;
    coordinate: Coordinate;
  } | null>(null);
  const [plannerValidation, setPlannerValidation] = useState<string | null>(
    null,
  );
  const [completedManualRoute, setCompletedManualRoute] =
    useState<RoutePlan | null>(null);
  const [manualDecision, setManualDecision] = useState<
    "pending" | "use" | "save" | "edit"
  >("pending");
  const destinationRef = useRef<TextInput>(null);
  const preview = manualMode ? manualRoute : builderPreview;
  const retainedManualRoute =
    manualReview ??
    completedManualRoute ??
    (!manualMode && manualRoute && manualPoints.length >= 2 ? manualRoute : null);
  const mapStatus = manualMode
    ? "pilot"
    : builder.status === "matching"
      ? "loading"
      : builder.status === "ready"
        ? "matched"
        : "pilot";
  const previewMapLabel = preview
    ? rtl
      ? `${preview.name} · ${tx(t, "route", "route")}`
      : `${preview.name} route map`
    : undefined;
  const statusText =
    builder.status === "matching"
      ? tx(t, "matchingRoads", "Finding a road route…")
      : builder.status === "ready"
        ? tx(t, "routeReady", "Road route ready")
        : builder.status === "failed"
          ? tx(t, "routeUnavailable", "Road match unavailable")
          : tx(t, "chooseStartDestination", "Choose Start and Destination");
  const hasPlanningWork =
    showBuilder ||
    manualMode ||
    builder.status !== "empty" ||
    Boolean(preview) ||
    Boolean(retainedManualRoute);
  const showFirstRouteGuide = planAction === "first-route" && !showBuilder;
  const isEndpointCommitted = (field: PlannerField) => {
    const point = field === "start" ? builder.start : builder.destination;
    const text = field === "start" ? startText : destinationText;
    const trimmed = text.trim();
    return Boolean(
      point &&
        (trimmed === point.name.trim() || trimmed === point.nameAr?.trim()),
    );
  };
  const suggestionsField =
    activeField && !isEndpointCommitted(activeField) ? activeField : null;
  const mapPickerField =
    activeField ?? (builder.start ? ("destination" as const) : ("start" as const));
  const formatCoordinate = (value: number) =>
    formatNumber
      ? formatNumber(value, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
          useGrouping: false,
        })
      : value.toFixed(4);
  const handleMapPress = (coordinate: Coordinate) => {
    if (manualMode) {
      onMapPress(coordinate);
      return;
    }
    setPlannerValidation(null);
    setPendingMapPoint({ field: mapPickerField, coordinate });
  };
  const confirmMapPoint = () => {
    if (!pendingMapPoint) return;
    const nextStart =
      pendingMapPoint.field === "start"
        ? { ...builder.start, ...pendingMapPoint.coordinate, name: startText || "Start" }
        : builder.start;
    const nextDestination =
      pendingMapPoint.field === "destination"
        ? {
            ...builder.destination,
            ...pendingMapPoint.coordinate,
            name: destinationText || "Destination",
          }
        : builder.destination;
    const validation = validatePlannerEndpoints(nextStart, nextDestination);
    if (validation === "sameEndpoints") {
      setPlannerValidation(plannerValidationMessage(validation, rtl ? "ar" : "en"));
      return;
    }
    onMapPress(pendingMapPoint.coordinate);
    setPendingMapPoint(null);
    setPlannerValidation(null);
  };
  const handleSavedPoint = (
    field: "start" | "destination",
    point: PlannerPoint,
  ) => {
    const nextStart = field === "start" ? point : builder.start;
    const nextDestination = field === "destination" ? point : builder.destination;
    const validation = validatePlannerEndpoints(nextStart, nextDestination);
    if (validation === "sameEndpoints") {
      setPlannerValidation(plannerValidationMessage(validation, rtl ? "ar" : "en"));
      return;
    }
    onUseSavedPoint(field, point);
    setPlannerValidation(null);
  };
  const beginPlanAction = (action: PlanActionId) => {
    setPlanAction(action);
    setPlannerValidation(null);
    setPendingMapPoint(null);
    if (action === "first-route") {
      setShowBuilder(false);
      setShowSamples(false);
      return;
    }
    if (action === "samples") {
      setShowBuilder(false);
      setShowSamples(true);
      return;
    }
    setShowSamples(false);
    setShowBuilder(true);
    onFocusField("start");
  };
  const openManual = () => {
    setCompletedManualRoute(null);
    setManualDecision("pending");
    onOpenManual();
  };
  const cancelManual = () => {
    setCompletedManualRoute(null);
    setManualDecision("pending");
    onCancelManual();
  };
  const doneManual = () => {
    if (manualRoute) setCompletedManualRoute(manualRoute);
    setManualDecision("pending");
    onDoneManual();
  };
  const decideManual = (decision: "use" | "save") => {
    setManualDecision(decision);
    if (decision === "use") onUseManual?.();
    else onSaveManual?.();
  };
  const editManual = () => {
    setManualDecision("edit");
    onEditManual?.();
  };
  const discardManual = () => {
    setCompletedManualRoute(null);
    setManualDecision("pending");
    if (onDiscardManual) onDiscardManual();
    else onCancelManual();
  };
  samples = samples.map((route) =>
    rtl && route.nameAr
      ? {
          ...route,
          name: route.nameAr,
          points: route.points.map((point) => ({
            ...point,
            name: point.nameAr || point.name,
          })),
        }
      : route,
  );

  if (manualMode) {
    return (
      <View
        style={[styles.screen, styles.manualScreen, rtl && styles.screenRtl]}
      >
        <View style={styles.manualMapViewport}>
          {preview ? (
            <MapPreview
              route={asCanonicalRoute(preview)!}
              fullScreen
              rtl={rtl}
              onMapPress={handleMapPress}
              roadLabels={roadLabels}
              mapText={{
                ...mapText,
                mapLabel: previewMapLabel,
                status: mapStatus,
                statusPilot: tx(t, "straightLine", "Straight line"),
              }}
            />
          ) : (
            <EmptyBuilderMap
              palette={palette}
              t={t}
              rtl={rtl}
              onMapPress={handleMapPress}
            />
          )}
        </View>
        <ScrollView
          style={styles.manualControlTray}
          contentContainerStyle={styles.manualControlTrayContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <ManualPanel
            t={t}
            rtl={rtl}
            styles={styles}
            formatNumber={formatNumber}
            points={manualPoints}
            onUndo={onUndoManual}
            onRedo={onRedoManual}
            onClear={onClearManual}
            onDone={doneManual}
            onCancel={cancelManual}
            onRemove={onRemoveManualPoint}
            onMove={onMoveManualPoint}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, rtl && styles.screenRtl]}>
      <View style={styles.pageIntro}>
        <Text style={[styles.eyebrow, rtl && styles.textRight]}>
          {tx(t, "planEyebrow", "PLAN")}
        </Text>
        <Text style={[styles.title, rtl && styles.textRight]}>
          {tx(t, "planTitle", "Plan a route")}
        </Text>
        <Text style={[styles.subtitle, rtl && styles.textRight]}>
          {tx(
            t,
            "planSubtitle",
            "Choose two places and review the road route before you ride.",
          )}
        </Text>
      </View>

      {knownRouteFamily && (
        <KnownRouteCard
          family={knownRouteFamily}
          t={t}
          rtl={rtl}
          styles={styles}
          palette={palette}
          formatNumber={formatNumber}
          distanceDisplay={distanceDisplay}
          mapText={mapText}
          roadLabels={roadLabels}
        />
      )}

      <PlanActionChooser
        t={t}
        rtl={rtl}
        styles={styles}
        activeAction={planAction}
        onChoose={beginPlanAction}
      />

      {showFirstRouteGuide && (
        <View style={styles.panel}>
          <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
            {rtl ? "خطّط لمسارك الأول" : "Plan your first route"}
          </Text>
          <Text style={[styles.sectionCaption, rtl && styles.textRight]}>
            {rtl
              ? "اختر نقطة بداية ووجهة، ثم راجع مسار الطرق قبل الركوب."
              : "Choose a Start and Destination, then review the road route before you ride."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => beginPlanAction("endpoints")}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {rtl
                ? "اختر البداية والوجهة"
                : "Choose Start and Destination"}
            </Text>
          </Pressable>
        </View>
      )}

      {hasPlanningWork && (
        <View style={styles.panel}>
          <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
            <View style={styles.routeRowCopy}>
              <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
                {tx(t, "routeBuilder", "Route builder")}
              </Text>
              <Text style={[styles.sectionCaption, rtl && styles.textRight]}>
                {tx(t, "roadCyclingMode", "Road cycling · Follow roads")}
              </Text>
            </View>
            <View style={styles.modePill}>
              <Text style={styles.modePillText}>
                {tx(t, "followRoads", "Follow roads")}
              </Text>
            </View>
          </View>
          <LocationField
            t={t}
            label={tx(t, "start", "Start")}
            value={startText}
            placeholder={tx(t, "searchStart", "Name a start or choose a point")}
            focused={activeField === "start"}
            rtl={rtl}
            styles={styles}
            onChangeText={onStartText}
            onFocus={() => onFocusField("start")}
            onChooseOnMap={() => onChooseOnMap("start")}
            onUseCurrent={() => onUseCurrentLocation("start")}
            committedPoint={builder.start}
            textIsCommitted={isEndpointCommitted("start")}
            onClearPoint={() => onStartText("")}
          />
          <LocationField
            t={t}
            inputRef={destinationRef}
            label={tx(t, "destination", "Destination")}
            value={destinationText}
            placeholder={tx(
              t,
              "searchDestination",
              "Name a destination or choose a point",
            )}
            focused={activeField === "destination"}
            autoFocus={builder.status === "start-selected"}
            rtl={rtl}
            styles={styles}
            onChangeText={onDestinationText}
            onFocus={() => onFocusField("destination")}
            onChooseOnMap={() => onChooseOnMap("destination")}
            onUseCurrent={() => onUseCurrentLocation("destination")}
            committedPoint={builder.destination}
            textIsCommitted={isEndpointCommitted("destination")}
            onClearPoint={() => onDestinationText("")}
          />
          <SavedPointChoices
            t={t}
            rtl={rtl}
            styles={styles}
            samples={[...samples, ...myRoutes]}
            field={suggestionsField}
            onUse={handleSavedPoint}
          />
          {!manualMode && (
            <View style={styles.statusLine} accessibilityLiveRegion="polite">
              <View
                style={[
                  styles.statusDot,
                  builder.status === "failed" && {
                    backgroundColor: palette.caution,
                  },
                ]}
              />
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {statusText}
              </Text>
            </View>
          )}
        </View>
      )}

      {pendingMapPoint && (
        <View style={styles.panelAlt}>
          <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
            {rtl
              ? `سيغيّر محدد الخريطة ${pendingMapPoint.field === "start" ? "البداية" : "الوجهة"} فقط`
              : `Map picker changes ${pendingMapPoint.field === "start" ? "Start" : "Destination"} only`}
          </Text>
          <Text style={[styles.fieldHint, rtl && styles.textRight]}>
            {rtl ? "النقطة المحددة:" : "Selected point:"}{" "}
            {formatCoordinate(pendingMapPoint.coordinate.latitude)}, {" "}
            {formatCoordinate(pendingMapPoint.coordinate.longitude)}
          </Text>
          <View style={[styles.manualActions, rtl && styles.rowRtl]}>
            <Pressable
              accessibilityRole="button"
              onPress={confirmMapPoint}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>
                {rtl
                  ? `تأكيد ${pendingMapPoint.field === "start" ? "البداية" : "الوجهة"}`
                  : `Confirm ${pendingMapPoint.field === "start" ? "Start" : "Destination"}`}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPendingMapPoint(null)}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{tx(t, "cancel", "Cancel")}</Text>
            </Pressable>
          </View>
        </View>
      )}
      {plannerValidation && (
        <NoticeAlert
          tone="warning"
          title={tx(t, "routeUnavailable", "Route needs another point")}
          description={plannerValidation}
          palette={palette}
          rtl={rtl}
        />
      )}

      {hasPlanningWork &&
        (preview ? (
          <MapPreview
            route={asCanonicalRoute(preview)!}
            fullScreen
            rtl={rtl}
            onMapPress={handleMapPress}
            roadLabels={roadLabels}
            mapText={{
              ...mapText,
              mapLabel: previewMapLabel,
              status: mapStatus,
              statusPilot: manualMode
                ? tx(t, "straightLine", "Straight line")
                : mapText.statusPilot,
            }}
          />
        ) : (
          <EmptyBuilderMap
            palette={palette}
            t={t}
            rtl={rtl}
            onMapPress={handleMapPress}
          />
        ))}

      {hasPlanningWork && !manualMode && builder.status === "failed" && (
        <NoticeAlert
          tone="warning"
          title={tx(t, "routeUnavailable", "Road match unavailable")}
          description={
            builder.error ||
            tx(
              t,
              "routeMatchFailure",
              "We couldn't match these points to roads. Move a point or try again.",
            )
          }
          palette={palette}
          rtl={rtl}
        />
      )}
      {hasPlanningWork && !manualMode && builder.status === "matching" && (
        <NoticeAlert
          tone="info"
          title={tx(t, "matchingRoads", "Finding a road route…")}
          description={tx(
            t,
            "matchingKeepsPoints",
            "Both points stay editable while we check mapped roads.",
          )}
          palette={palette}
          rtl={rtl}
        />
      )}
      {hasPlanningWork &&
        !manualMode &&
        builder.status === "ready" &&
        builder.route && (
          <RouteReadyPanel
            route={builder.route}
            t={t}
            rtl={rtl}
            styles={styles}
            formatNumber={formatNumber}
            distanceDisplay={distanceDisplay}
            formatTime={formatTime}
            onUse={onUseMatchedRoute}
            onEdit={onEditPoints}
            onAddStop={onAddStop}
            onReverse={onReverse}
          />
        )}
      {hasPlanningWork && !manualMode && builder.status === "failed" && (
        <View style={[styles.formActions, rtl && styles.rowRtl]}>
          <Pressable
            accessibilityRole="button"
            onPress={onEditPoints}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {tx(t, "editPoints", "Edit points")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onRetryMatch}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{tx(t, "retry", "Retry")}</Text>
          </Pressable>
        </View>
      )}

      {importReview && (
        <ReviewCard
          title={tx(t, "importReview", "Review imported track")}
          subtitle={importReviewFileName || importReview.name}
          route={importReview}
          t={t}
          rtl={rtl}
          styles={styles}
          palette={palette}
          formatNumber={formatNumber}
          distanceDisplay={distanceDisplay}
          mapText={mapText}
          roadLabels={roadLabels}
          chip={tx(t, "importedRoute", "Imported")}
          onPrimary={onUseImport}
          primaryLabel={tx(t, "useThisTrack", "Use this track")}
          onSecondary={onCancelImport}
          secondaryLabel={tx(t, "cancel", "Cancel")}
        />
      )}
      {generatedReview && (
        <ReviewCard
          title={tx(t, "generatedReview", "Review generated option")}
          subtitle={generatedReview.name}
          route={generatedReview}
          t={t}
          rtl={rtl}
          styles={styles}
          palette={palette}
          formatNumber={formatNumber}
          distanceDisplay={distanceDisplay}
          mapText={mapText}
          roadLabels={roadLabels}
          chip={tx(t, "generatedRoute", "Generated")}
          onPrimary={onUseGenerated}
          primaryLabel={tx(t, "useThisRoute", "Use this route")}
          onSecondary={onCancelGenerated}
          secondaryLabel={tx(t, "cancel", "Cancel")}
        />
      )}

      {retainedManualRoute && (
        <ManualSketchReviewPanel
          route={retainedManualRoute}
          t={t}
          rtl={rtl}
          styles={styles}
          formatNumber={formatNumber}
          distanceDisplay={distanceDisplay}
          decision={manualDecision}
          onUse={() => decideManual("use")}
          onSave={() => decideManual("save")}
          onEdit={editManual}
          onDiscard={discardManual}
        />
      )}

      {hasPlanningWork &&
        (manualMode ? (
          <ManualPanel
            t={t}
            rtl={rtl}
            styles={styles}
            formatNumber={formatNumber}
            points={manualPoints}
            onUndo={onUndoManual}
            onRedo={onRedoManual}
            onClear={onClearManual}
            onDone={doneManual}
            onCancel={cancelManual}
            onRemove={onRemoveManualPoint}
            onMove={onMoveManualPoint}
          />
        ) : (
          <View style={styles.panelAlt}>
            <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
              {tx(t, "advanced", "Advanced")}
            </Text>
            <Text style={[styles.fieldHint, rtl && styles.textRight]}>
              {tx(
                t,
                "straightLineWarning",
                "Straight-line / off-grid lines do not follow roads and cannot be treated as navigation guidance.",
              )}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openManual}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {tx(t, "openManualMode", "Open straight-line mode")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onImport}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {tx(t, "importGpx", "Import GPX")}
              </Text>
            </Pressable>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {tx(t, "generateLoop", "Generate a loop")}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {tx(
                  t,
                  "generatorTargetHint",
                  "Set a target distance after choosing a Start.",
                )} · {distanceDisplay.distanceLabel}
              </Text>
              <TextInput
                value={targetDistanceInput}
                onChangeText={onGenerationDistance}
                keyboardType="numeric"
                accessibilityLabel={tx(t, "targetDistance", "Target distance")}
                style={[styles.input, rtl && styles.textRight]}
              />
              <Pressable
                accessibilityRole="button"
                onPress={onGenerate}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {tx(t, "generateLoop", "Generate a loop")}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

      {routeMessage &&
        (loopGenerationFailed ||
          (!generatedReview && Boolean(builder.start) && !importReview)) && (
          <View>
            <NoticeAlert
              tone="warning"
              title={tx(t, "generatedUnavailable", "Loop needs another try")}
              description={routeMessage}
              palette={palette}
              rtl={rtl}
            />
            <View style={[styles.formActions, rtl && styles.rowRtl]}>
              <Pressable
                accessibilityRole="button"
                onPress={onRetryLoop ?? onGenerate}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>
                  {tx(t, "retry", "Try again")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onEditPoints}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {tx(t, "editPoints", "Edit Start")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

      <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
        <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
          {tx(t, "savedRoutes", "Saved routes")}
        </Text>
        {showSamples && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowSamples(false)}
          >
            <Text style={styles.actionText}>{tx(t, "hideSamples", "Hide samples")}</Text>
          </Pressable>
        )}
      </View>
      <RouteCollection
        title={tx(t, "myRoutes", "My routes")}
        kind="my"
        routes={myRoutes}
        selectedRouteId={selectedRouteId}
        t={t}
        rtl={rtl}
        styles={styles}
        palette={palette}
        formatNumber={formatNumber}
        distanceDisplay={distanceDisplay}
        onSelect={onSelect}
      />
      <RouteCollection
        title={tx(t, "imports", "Imports")}
        kind="imports"
        routes={imports}
        selectedRouteId={selectedRouteId}
        t={t}
        rtl={rtl}
        styles={styles}
        palette={palette}
        formatNumber={formatNumber}
        distanceDisplay={distanceDisplay}
        onSelect={onSelect}
      />
      {showSamples && (
        <RouteCollection
          title={tx(t, "sampleRoutes", "Sample routes")}
          kind="samples"
          routes={samples}
          selectedRouteId={selectedRouteId}
          t={t}
          rtl={rtl}
          styles={styles}
          palette={palette}
          formatNumber={formatNumber}
          distanceDisplay={distanceDisplay}
          onSelect={onSelect}
        />
      )}
      {routeMessage &&
        !(loopGenerationFailed ||
          (!generatedReview && Boolean(builder.start) && !importReview)) && (
        <Text
          style={[styles.footer, rtl && styles.textRight]}
          accessibilityLiveRegion="polite"
        >
          {routeMessage}
        </Text>
        )}
      <Text style={[styles.footer, rtl && styles.textRight]}>
        {mapText.web}
      </Text>
    </View>
  );
}

function PlanActionChooser({
  t,
  rtl,
  styles,
  activeAction,
  onChoose,
}: {
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  activeAction: PlanActionId | null;
  onChoose: (action: PlanActionId) => void;
}) {
  const labels: Record<PlanActionId, string> = {
    "first-route": rtl ? "خطّط لمسارك الأول" : "Plan your first route",
    samples: rtl ? "تصفح المسارات النموذجية" : "Browse sample routes",
    endpoints: rtl
      ? "أنشئ من البداية والوجهة"
      : "Build from Start and Destination",
  };
  const hints: Record<PlanActionId, string> = {
    "first-route": rtl
      ? "دليل مبسط لاختيار نقطتين."
      : "A short guide for choosing two points.",
    samples: rtl
      ? "راجع مساراً نموذجياً قبل اختياره."
      : "Review an example before choosing it.",
    endpoints: rtl
      ? "اختر النقطتين مباشرة في منشئ المسار."
      : "Choose both points directly in the route builder.",
  };
  return (
    <View style={styles.panelAlt}>
      <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
        {tx(t, "planRoute", "Plan a route")}
      </Text>
      <View style={styles.list}>
        {PLAN_ACTIONS.map((action, index) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityState={{ selected: action.id === activeAction }}
            accessibilityHint={hints[action.id]}
            onPress={() => onChoose(action.id)}
            style={index === 0 ? styles.primary : styles.secondary}
          >
            <Text
              style={
                index === 0 ? styles.primaryText : styles.secondaryText
              }
            >
              {labels[action.id]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ManualSketchReviewPanel({
  route,
  t,
  rtl,
  styles,
  formatNumber,
  distanceDisplay,
  decision,
  onUse,
  onSave,
  onEdit,
  onDiscard,
}: {
  route: RoutePlan;
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  formatNumber?: ScreenBaseProps["formatNumber"];
  distanceDisplay: ScreenBaseProps["distanceDisplay"];
  decision: "pending" | "use" | "save" | "edit";
  onUse: () => void;
  onSave: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  const pointCount = formatNumber
    ? formatNumber(route.points.length, { maximumFractionDigits: 0 })
    : String(route.points.length);
  return (
    <View style={styles.panelAlt}>
      <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
        {rtl ? "رسم المسار جاهز" : "Route sketch ready"}
      </Text>
      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
        {tx(
          t,
          "straightLineWarning",
          "This plan follows straight lines between points. It is not navigation guidance.",
        )}
      </Text>
      <View style={[styles.metricRail, rtl && styles.rowRtl]}>
        <Metric
          label={tx(t, "points", "Points")}
          value={pointCount}
          styles={styles}
        />
        <Metric
          label={tx(t, "distance", "Distance")}
          value={distanceDisplay.formatDistance(route.distanceKm)}
          styles={styles}
        />
      </View>
      {decision !== "pending" && (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {rtl ? "تم الاحتفاظ بنتيجة الرسم." : "Your sketch result is retained."}
        </Text>
      )}
      <Pressable accessibilityRole="button" onPress={onUse} style={styles.primary}>
        <Text style={styles.primaryText}>
          {rtl ? "استخدم كخطة غير ملاحية" : "Use as a non-navigation plan"}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onSave} style={styles.secondary}>
        <Text style={styles.secondaryText}>
          {rtl ? "حفظ محلياً" : "Save locally"}
        </Text>
      </Pressable>
      <View style={[styles.manualActions, rtl && styles.rowRtl]}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>
            {rtl ? "تعديل" : "Edit"}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDiscard} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>
            {rtl ? "تجاهل" : "Discard"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function KnownRouteCard({
  family,
  t,
  rtl,
  styles,
  palette,
  formatNumber,
  distanceDisplay,
  mapText,
  roadLabels,
}: {
  family: KnownRouteFamilyProps;
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  palette: ScreenBaseProps["palette"];
  formatNumber?: ScreenBaseProps["formatNumber"];
  distanceDisplay: ScreenBaseProps["distanceDisplay"];
  mapText: RoutesMapText;
  roadLabels?: RoadLabels;
}) {
  const route =
    rtl && family.route.nameAr
      ? {
          ...family.route,
          name: family.route.nameAr,
          points: family.route.points.map((point) => ({
            ...point,
            name: point.nameAr || point.name,
          })),
        }
      : family.route;
  const variant = family.family.variants[0];
  const entryLabel = variant
    ? rtl && variant.entry.nameAr
      ? variant.entry.nameAr
      : variant.entry.name
    : undefined;
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : value.toFixed(1);
  const variantLabel = variant
    ? rtl && variant.labelAr
      ? variant.labelAr
      : variant.label
    : tx(t, "onlyVariant", "Only supplied variant");
  const canStartAtEntry = family.status === "ready";
  const knownMapStatus =
    family.status === "ready"
      ? ("matched" as const)
      : family.status === "matching"
        ? ("loading" as const)
        : ("pilot" as const);
  return (
    <View
      style={styles.panel}
      accessibilityLabel={
        rtl ? family.family.nameAr || family.family.name : family.family.name
      }
    >
      <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
        <View style={styles.routeRowCopy}>
          <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
            {route.name}
          </Text>
          <Text style={[styles.sectionCaption, rtl && styles.textRight]}>
            {variantLabel} ·{" "}
            {distanceDisplay.formatDistance(route.distanceKm)}
          </Text>
        </View>
        <StatusBadge
          label={
            family.status === "ready"
              ? tx(t, "roadMatched", "Road route ready")
              : tx(
                  t,
                  "routeCheckPending",
                  "Route preview · road check not complete",
                )
          }
          tone={family.status === "ready" ? "success" : "warning"}
          palette={palette}
        />
      </View>
      <MapPreview
        route={route}
        fullScreen
        minimal
        rtl={rtl}
        roadLabels={roadLabels}
        mapText={{
          ...mapText,
          status: knownMapStatus,
          statusPilot: tx(t, "routePreviewLabel", "Route preview"),
        }}
      />
      {family.layers && family.layers.length > 0 && (
        <RouteLayerLegend
          layers={family.layers}
          palette={palette}
          rtl={rtl}
          title={tx(t, "mapLayers", "Map layers")}
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={family.onReview}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>
          {tx(t, "reviewRoute", "Review route")}
        </Text>
      </Pressable>
      <View style={styles.atlasDetails}>
        <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
          {tx(t, "entryChoice", "Choose how to start")}
        </Text>
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {tx(
            t,
            "locationNotNeeded",
            "Location is not needed to browse or review this route.",
          )}
        </Text>
        {family.entryDistanceLabel && (
          <Text style={[styles.fieldHint, rtl && styles.textRight]}>
            {family.entryDistanceLabel}
          </Text>
        )}
        {entryLabel && (
          <Text style={[styles.fieldHint, rtl && styles.textRight]}>
            {tx(t, "startFinish", "Start / finish")}: {entryLabel}
          </Text>
        )}
        {canStartAtEntry && family.onStartAtEntry && (
          <Pressable
            accessibilityRole="button"
            onPress={family.onStartAtEntry}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {tx(t, "startAtEntry", "Start at NBH entry")}
            </Text>
          </Pressable>
        )}
        {canStartAtEntry && family.onConnectFromLocation && (
          <Pressable
            accessibilityRole="button"
            onPress={family.onConnectFromLocation}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {tx(t, "connectFromLocation", "Connect from my location")}
            </Text>
          </Pressable>
        )}
        {!canStartAtEntry && (
          <Text style={[styles.fieldHint, rtl && styles.textRight]}>
            {tx(
              t,
              "previewOnlyRideCopy",
              "You can review this route now. Starting a route-following ride will be available after the road check is complete.",
            )}
          </Text>
        )}
        {family.onRecordWithoutFollowing && (
          <Pressable
            accessibilityRole="button"
            onPress={family.onRecordWithoutFollowing}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {tx(
                t,
                "recordWithoutFollowingNbh",
                "Record without following NBH",
              )}
            </Text>
          </Pressable>
        )}
        {family.onChooseAnotherRoute && (
          <Pressable
            accessibilityRole="button"
            onPress={family.onChooseAnotherRoute}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {tx(t, "chooseAnotherRoute", "Choose another route")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function LocationField({
  t,
  label,
  value,
  placeholder,
  focused,
  autoFocus,
  rtl,
  styles,
  onChangeText,
  onFocus,
  onChooseOnMap,
  onUseCurrent,
  committedPoint,
  textIsCommitted,
  onClearPoint,
  inputRef,
}: {
  t: Copy;
  label: string;
  value: string;
  placeholder: string;
  focused: boolean;
  autoFocus?: boolean;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onChooseOnMap: () => void;
  onUseCurrent: () => void;
  committedPoint?: PlannerPoint | null;
  textIsCommitted?: boolean;
  onClearPoint?: () => void;
  inputRef?: RefObject<TextInput | null>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, rtl && styles.textRight]}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#78908D"
        accessibilityLabel={label}
        returnKeyType="next"
        style={[
          styles.input,
          focused && styles.inputFocused,
          rtl && styles.textRight,
        ]}
      />
      <View style={[styles.manualActions, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          onPress={onChooseOnMap}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {"⌖ "}
            {tx(t, "chooseOnMap", "Choose on map")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onUseCurrent}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {"◎ "}
            {tx(t, "currentLocation", "Current location")}
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
        {tx(
          t,
          "plannerFieldHint",
          "Name a point or choose it: on the map, from your current location, or from a saved point. Typing does not search places.",
        )}
      </Text>
      {committedPoint ? (
        <View style={styles.statusLine}>
          <View style={styles.statusDot} />
          <View style={styles.routeRowCopy}>
            <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
              {rtl ? "نقطة مختارة" : "Selected point"}: {committedPoint.name}
            </Text>
            <Text style={[styles.fieldHint, rtl && styles.textRight]}>
              {textIsCommitted
                ? rtl
                  ? "تم تثبيت هذه النقطة."
                  : "Committed for route matching."
                : rtl
                  ? "النقطة محفوظة أثناء تعديل النص؛ اختر النص لتحديثها."
                  : "The point stays selected while you edit text; choose the text to update it."}
            </Text>
          </View>
          {onClearPoint && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${tx(t, "clear", "Clear")} ${label}`}
              onPress={onClearPoint}
              style={styles.smallButton}
            >
              <Text style={styles.smallButtonText}>{tx(t, "clear", "Clear")}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {rtl ? "لم يتم تثبيت هذه النقطة بعد." : "This endpoint is not committed yet."}
        </Text>
      )}
    </View>
  );
}

function SavedPointChoices({
  t,
  rtl,
  styles,
  samples,
  field,
  onUse,
}: {
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  samples: RoutePlan[];
  field: "start" | "destination" | null;
  onUse: (field: "start" | "destination", point: PlannerPoint) => void;
}) {
  const points = samples.flatMap((route) =>
    route.points.slice(0, 2).map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      name: point.name,
      nameAr: point.nameAr,
    })),
  );
  if (!field || !points.length) return null;
  return (
    <View style={styles.manualActions}>
      {points.slice(0, 4).map((point) => (
        <Pressable
          key={`${field}-${point.name}-${point.latitude}`}
          accessibilityRole="button"
          onPress={() => onUse(field, point)}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>{point.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function EmptyBuilderMap({
  palette,
  t,
  rtl,
  onMapPress,
}: {
  palette: ScreenBaseProps["palette"];
  t: Copy;
  rtl: boolean;
  onMapPress: (coordinate: Coordinate) => void;
}) {
  const [size, setSize] = useState({ width: 320, height: 248 });
  const choosePoint = (event?: any) => {
    const native = event?.nativeEvent ?? {};
    const x = Number(native.locationX);
    const y = Number(native.locationY);
    const normalizedX = Number.isFinite(x)
      ? Math.max(0, Math.min(1, x / size.width))
      : 0.5;
    const normalizedY = Number.isFinite(y)
      ? Math.max(0, Math.min(1, y / size.height))
      : 0.5;
    // This surface is only a point picker until the real map has a route to
    // render. Taps are translated within the Bahrain viewport; no route line
    // or road claim is inferred from this coordinate.
    onMapPress({
      latitude: 26.3 - normalizedY * 0.24,
      longitude: 50.38 + normalizedX * 0.3,
    });
  };
  const onKeyDown = (event: any) => {
    if (
      event?.key === "Enter" ||
      event?.key === " " ||
      event?.key === "Spacebar"
    ) {
      event.preventDefault?.();
      choosePoint();
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tx(t, "chooseOnMap", "Choose a point on the map")}
      accessibilityHint={tx(
        t,
        "addPointHint",
        "Adds a point at the map center.",
      )}
      onPress={choosePoint}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) setSize({ width, height });
      }}
      style={{
        height: 248,
        borderRadius: 18,
        backgroundColor: palette.panelAlt,
        borderColor: palette.line,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 22,
      }}
      {...({
        onKeyDown,
        tabIndex: 0,
        "aria-keyshortcuts": "Enter Space",
      } as any)}
    >
      <Text
        style={{
          color: palette.muted,
          fontFamily: rtl ? "NotoSansArabic_400Regular" : "Manrope_400Regular",
          fontSize: 13,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        {tx(
          t,
          "chooseOnMapCopy",
          "Tap where you want to place this point. You can also choose it from the fields.",
        )}
      </Text>
    </Pressable>
  );
}

function RouteReadyPanel({
  route,
  t,
  rtl,
  styles,
  formatNumber,
  distanceDisplay,
  formatTime,
  onUse,
  onEdit,
  onAddStop,
  onReverse,
}: {
  route: CanonicalRouteView;
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  formatNumber?: ScreenBaseProps["formatNumber"];
  distanceDisplay: ScreenBaseProps["distanceDisplay"];
  formatTime?: ScreenBaseProps["formatTime"];
  onUse: () => void;
  onEdit: () => void;
  onAddStop: () => void;
  onReverse: () => void;
}) {
  const distance = distanceDisplay.formatDistance(route.distanceKm);
  const duration = formatNumber
    ? formatNumber(route.durationMinutes, { maximumFractionDigits: 0 })
    : String(route.durationMinutes);
  const returnTime =
    route.arrivalAt && formatTime
      ? formatTime(route.arrivalAt)
      : route.arrivalLabel || "—";
  return (
    <View style={styles.panel}>
      <View style={styles.statusLine}>
        <View style={styles.statusDot} />
        <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
          {tx(t, "routeReady", "Road route ready")}
        </Text>
      </View>
      <View style={[styles.metricRail, rtl && styles.rowRtl]}>
        <Metric
          label={tx(t, "distance", "Distance")}
          value={distance}
          styles={styles}
        />
        <Metric
          label={tx(t, "duration", "Moving time")}
          value={
            route.durationMinutes
              ? `${duration} ${tx(t, "minutes", "min")}`
              : "—"
          }
          styles={styles}
        />
        <Metric
          label={tx(t, "returnBy", "Finish by")}
          value={returnTime}
          styles={styles}
        />
      </View>
      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
        {tx(
          t,
          "reviewBeforeUse",
          "Review the road-following geometry before using this route.",
        )}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUse}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>
          {tx(t, "useThisRoute", "Use this route")}
        </Text>
      </Pressable>
      <View style={[styles.manualActions, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          onPress={onAddStop}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {tx(t, "addStop", "Add stop")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onReverse}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {tx(t, "reverse", "Reverse")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {tx(t, "editPoints", "Edit points")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReviewCard({
  title,
  subtitle,
  route,
  t,
  rtl,
  styles,
  palette,
  formatNumber,
  distanceDisplay,
  mapText,
  roadLabels,
  chip,
  onPrimary,
  primaryLabel,
  onSecondary,
  secondaryLabel,
}: {
  title: string;
  subtitle: string;
  route: CanonicalRouteView;
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  palette: ScreenBaseProps["palette"];
  formatNumber?: ScreenBaseProps["formatNumber"];
  distanceDisplay: ScreenBaseProps["distanceDisplay"];
  mapText: RoutesMapText;
  roadLabels?: RoadLabels;
  chip: string;
  onPrimary: () => void;
  primaryLabel: string;
  onSecondary: () => void;
  secondaryLabel: string;
}) {
  const kind = routeGeometryKind(route);
  const status = routeGeometryStatus(route);
  const reviewMapStatus =
    kind === "road_matched" && status === "ready"
      ? ("matched" as const)
      : status === "matching"
        ? ("loading" as const)
        : ("pilot" as const);
  const distance = distanceDisplay.formatDistance(route.distanceKm);
  const points = formatNumber
    ? formatNumber(route.points.length, { maximumFractionDigits: 0 })
    : String(route.points.length);
  return (
    <View style={styles.panel}>
      <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
        <View style={styles.routeRowCopy}>
          <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
            {title}
          </Text>
          <Text style={[styles.sectionCaption, rtl && styles.textRight]}>
            {subtitle}
          </Text>
        </View>
        <StatusBadge label={chip} tone="warning" palette={palette} />
      </View>
      <MapPreview
        route={route}
        fullScreen
        minimal
        rtl={rtl}
        roadLabels={roadLabels}
        mapText={{
          ...mapText,
          mapLabel: `${route.name} · ${tx(t, "route", "route")}`,
          status: reviewMapStatus,
          statusPilot: tx(t, "routePreviewLabel", "Route preview"),
        }}
      />
      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
        {kind === "recorded_trace"
          ? tx(
              t,
              "recordedTrackCopy",
              "This is an imported recorded track. It is not silently reinterpreted as a road route.",
            )
          : status === "ready"
            ? tx(
                t,
                "roadMatchedCopy",
                "Road-following geometry is available for review.",
              )
            : tx(t, "geometryUnavailable", "Geometry is not available yet.")}
      </Text>
      <View style={[styles.metricRail, rtl && styles.rowRtl]}>
        <Metric
          label={tx(t, "distance", "Distance")}
          value={distance}
          styles={styles}
        />
        <Metric
          label={tx(t, "points", "Points")}
          value={points}
          styles={styles}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPrimary}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onSecondary}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </Pressable>
    </View>
  );
}

function ManualPanel({
  t,
  rtl,
  styles,
  formatNumber,
  points,
  onUndo,
  onRedo,
  onClear,
  onDone,
  onCancel,
  onRemove,
  onMove,
}: {
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  formatNumber?: ScreenBaseProps["formatNumber"];
  points: Coordinate[];
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDone: () => void;
  onCancel: () => void;
  onRemove: (index: number) => void;
  onMove?: (index: number, direction: -1 | 1) => void;
}) {
  const coordinateText = (value: number) =>
    formatNumber
      ? formatNumber(value, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
          useGrouping: false,
        })
      : value.toFixed(4);
  const pointCount = formatNumber
    ? formatNumber(points.length, { maximumFractionDigits: 0 })
    : String(points.length);
  const pointLabelIndex = (index: number) =>
    formatNumber
      ? formatNumber(index + 1, { maximumFractionDigits: 0 })
      : String(index + 1);
  return (
    <View style={styles.manual}>
      <Text style={[styles.manualTitle, rtl && styles.textRight]}>
        {tx(t, "drawRouteSketch", "Draw a route sketch")}
      </Text>
      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
        {tx(
          t,
          "straightLineWarning",
          "This is a planning sketch. It will not follow roads or provide navigation guidance.",
        )}
      </Text>
      <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
        {pointCount} {tx(t, "pointsAdded", "points added")}
      </Text>
      <View style={[styles.manualActions, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          onPress={onUndo}
          disabled={points.length === 0}
          style={[
            styles.smallButton,
            points.length === 0 && styles.smallButtonDisabled,
          ]}
        >
          <Text style={styles.smallButtonText}>{tx(t, "undo", "Undo")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onRedo}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>{tx(t, "redo", "Redo")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>{tx(t, "clear", "Clear")}</Text>
        </Pressable>
      </View>
      <View>
        {points.map((point, index) => (
          <View
            key={`${point.latitude}-${point.longitude}-${index}`}
            style={[styles.pointRow, rtl && styles.rowRtl]}
          >
            <View style={styles.pointIndex}>
              <Text style={styles.pointIndexText}>
                {pointLabelIndex(index)}
              </Text>
            </View>
            <View style={styles.pointCopy}>
              <Text style={[styles.pointName, rtl && styles.textRight]}>
                {index === 0
                  ? tx(t, "start", "Start")
                  : index === points.length - 1
                    ? tx(t, "destination", "Destination")
                    : `${tx(t, "waypoint", "Waypoint")} ${pointLabelIndex(index - 1)}`}
              </Text>
              <Text style={styles.pointMeta}>
                {coordinateText(point.latitude)},{" "}
                {coordinateText(point.longitude)}
              </Text>
            </View>
            <View style={styles.pointActions}>
              {onMove && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tx(t, "moveUp", "Move up")} ${pointLabelIndex(index)}`}
                    accessibilityState={{ disabled: index === 0 }}
                    disabled={index === 0}
                    onPress={() => onMove(index, -1)}
                    style={[
                      styles.pointActionButton,
                      index === 0 && styles.smallButtonDisabled,
                    ]}
                  >
                    <Text style={styles.pointActionText}>↑</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tx(t, "moveDown", "Move down")} ${pointLabelIndex(index)}`}
                    accessibilityState={{
                      disabled: index === points.length - 1,
                    }}
                    disabled={index === points.length - 1}
                    onPress={() => onMove(index, 1)}
                    style={[
                      styles.pointActionButton,
                      index === points.length - 1 && styles.smallButtonDisabled,
                    ]}
                  >
                    <Text style={styles.pointActionText}>↓</Text>
                  </Pressable>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${tx(t, "remove", "Remove")} ${pointLabelIndex(index)}`}
                onPress={() => onRemove(index)}
                style={styles.pointActionButton}
              >
                <Text style={styles.smallButtonText}>×</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.manualActions, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{tx(t, "cancel", "Cancel")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          disabled={points.length < 2}
          accessibilityState={{ disabled: points.length < 2 }}
          style={[styles.primary, points.length < 2 && styles.disabled]}
        >
          <Text style={styles.primaryText}>{tx(t, "done", "Done")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RouteCollection({
  title,
  kind,
  routes,
  selectedRouteId,
  t,
  rtl,
  styles,
  palette,
  formatNumber,
  distanceDisplay,
  onSelect,
}: {
  title: string;
  kind: CollectionKind;
  routes: RoutePlan[];
  selectedRouteId?: string | null;
  t: Copy;
  rtl: boolean;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
  palette: ScreenBaseProps["palette"];
  formatNumber?: ScreenBaseProps["formatNumber"];
  distanceDisplay: ScreenBaseProps["distanceDisplay"];
  onSelect: (route: RoutePlan) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
        {title}
      </Text>
      {routes.length ? (
        <View style={styles.list}>
          {routes.map((route) => {
            const canonical = asCanonicalRoute(route)!;
            const chip = routeChipFor(canonical, t);
            const distance = distanceDisplay.formatDistance(route.distanceKm);
            const geometryLabel =
              routeOwnership(canonical) === "catalog"
                ? tx(t, "waypointTrace", "Point-to-point preview")
                : routeGeometryKind(canonical) === "road_matched"
                  ? tx(t, "roadMatched", "Road-matched")
                  : routeGeometryKind(canonical) === "recorded_trace"
                    ? tx(t, "recordedTrace", "Recorded track")
                    : tx(t, "waypointTrace", "Point-to-point preview");
            const sampleActionLabel =
              kind === "samples"
                ? tx(
                    t,
                    "selectThisRoute",
                    rtl ? "اختر هذا المسار" : "Select this route",
                  )
                : null;
            return (
              <Pressable
                key={route.id}
                accessibilityRole="button"
                accessibilityState={{ selected: route.id === selectedRouteId }}
                onPress={() => onSelect(route)}
                style={[
                  styles.listRow,
                  rtl && styles.rowRtl,
                  route.id === selectedRouteId && {
                    backgroundColor: palette.panelAlt,
                  },
                ]}
              >
                <View style={styles.routeRowCopy}>
                  <Text
                    style={[styles.listRowTitle, rtl && styles.textRight]}
                    numberOfLines={2}
                  >
                    {route.name}
                  </Text>
                  <Text style={[styles.listRowMeta, rtl && styles.textRight]}>
                    {distance} · {chip.label} ·{" "}
                    {geometryLabel}
                    {sampleActionLabel ? ` · ${sampleActionLabel}` : ""}
                  </Text>
                </View>
                <Text style={styles.actionText}>›</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.listEmpty, rtl && styles.textRight]}>
          {kind === "my"
            ? tx(t, "noMyRoutes", "No personal routes yet.")
            : kind === "imports"
              ? tx(
                  t,
                  "noImports",
                  "Imported tracks will appear here after review.",
                )
              : tx(t, "noSamples", "Sample routes are available to explore.")}
        </Text>
      )}
    </View>
  );
}

function Metric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof import("../screenStyles").createScreenStyles>;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
