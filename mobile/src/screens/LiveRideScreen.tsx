import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { ReactNode } from "react";
import { MapPreview } from "../MapPreview";
import { RouteLayerLegend } from "../RouteLayerLegend";
import { ProgressReadout, StatusBadge } from "../UiPatterns";
import type { ActivityDraft, PositionMatchState } from "../domain";
import { localizedConfidenceLabel, localizedVariantLabel } from "../i18n";
import {
  completionActionStates,
  completionTrackState,
  completionStateForDraft,
  exportActivityDraft,
  liveRideLocationState,
  liveRideRecoveryActions,
  liveRideRecoveryLabels,
  locationUnavailableCopy,
  locationUnavailableTitle,
  recordingOnlyTelemetryLabels,
  recordingControlLabels,
  recordingOnlyLabels,
  type LiveRideLocationState,
} from "../rideRecording";
import { NBH_PREVIEW_VARIANT } from "../seed";
import {
  asCanonicalRoute,
  routeIsNavigable,
  screenText,
  type LiveRideScreenProps,
} from "../screenTypes";
import type { LiveRideSessionState } from "../useLiveRideSession";

type LiveRidePositionForTask4 = NonNullable<LiveRideScreenProps["position"]> & {
  lastFixAt?: string;
  lastFixLabel?: string;
  locationState?: LiveRideLocationState;
  recordedDistanceLabel?: string;
  recordedDurationLabel?: string;
  fixCount?: number;
  activeRoute?: import("../domain").RoutePlan;
  isPaused?: boolean;
  canPause?: boolean;
  pause?: () => void;
  resume?: () => void;
  retryLocation?: () => void;
};

type Task4LiveRideScreenProps = Omit<
  LiveRideScreenProps,
  "state" | "position"
> & {
  state: LiveRideSessionState;
  position?: LiveRidePositionForTask4;
};

export function LiveRideScreen({
  t,
  rtl,
  palette,
  styles,
  formatNumber,
  distanceDisplay,
  route,
  recordingOnly = false,
  state,
  position,
  snapshot,
  completionDraft,
  routeStatus,
  statusMessage,
  permissionMessage,
  privacyMessage,
  endConfirmationMessage,
  aheadLabel,
  nextSegmentName,
  nextSegmentWindLabel,
  mapText,
  roadLabels,
  layers,
  entryLabel,
  onChooseRoute,
  onReviewRoute,
  onShowPermissionExplanation,
  onRequestPermission,
  onCancelPermission,
  onOpenSettings,
  onRetryPermission,
  onStartRide,
  onConnectFromLocation,
  onRequestEndRide,
  onCancelEndRide,
  onConfirmEndRide,
  onChooseAnotherRoute,
  onSaveCompletion,
  onRetrySaveCompletion,
  onDiscardCompletion,
  onExportCompletion,
}: Task4LiveRideScreenProps) {
  const [browserExportedDraft, setBrowserExportedDraft] =
    useState<ActivityDraft | null>(null);
  const [browserExportError, setBrowserExportError] = useState(false);
  useEffect(() => {
    setBrowserExportedDraft(null);
    setBrowserExportError(false);
  }, [
    completionDraft?.id,
    completionDraft?.exportState,
    completionDraft?.completionState,
  ]);
  const viewCompletionDraft = browserExportedDraft ?? completionDraft;
  const displayRoute = position?.activeRoute ?? route;
  const canonical = asCanonicalRoute(displayRoute);
  const navigable = Boolean(
    canonical && routeIsNavigable(canonical) && routeStatus === "ready",
  );
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : String(value);
  const matchState = position?.match?.state;
  const recoveryLabels = liveRideRecoveryLabels(rtl);
  const telemetryLabels = recordingOnlyTelemetryLabels(rtl);
  const locationState =
    position?.locationState ??
    liveRideLocationState(matchState, Boolean(position?.lastFixAt));
  const recoveryActions = liveRideRecoveryActions({
    active: state === "active",
    locationState,
    isPaused: Boolean(position?.isPaused),
  });
  const needsLocationRecovery =
    locationState === "stale" || locationState === "away";
  const recordingLabels = recordingOnlyLabels(rtl);
  const controlLabels = recordingControlLabels(rtl);
  const completionState = viewCompletionDraft
    ? completionStateForDraft(viewCompletionDraft)
    : null;
  const showCompletion = Boolean(
    viewCompletionDraft &&
      state !== "active" &&
      state !== "ending" &&
      state !== "denied" &&
      state !== "unavailable" &&
      state !== "permission-denied",
  );
  const visualState = showCompletion ? completionState! : state;
  const handleExport = () => {
    setBrowserExportError(false);
    if (onExportCompletion) {
      onExportCompletion();
      return true;
    }
    if (Platform.OS === "web" && completionDraft) {
      const exported = exportActivityDraft(completionDraft);
      if (exported) {
        setBrowserExportedDraft(exported);
        return true;
      }
    }
    setBrowserExportError(true);
    return false;
  };

  if (showCompletion && viewCompletionDraft)
    return (
      <ScreenFrame
        t={t}
        rtl={rtl}
        styles={styles}
        title={
          visualState === "completed-draft"
            ? screenText(t, "completedDraft", "Ride draft ready to recover")
            : visualState === "save-failed"
              ? screenText(t, "saveFailed", "Ride save needs attention")
              : visualState === "discarded"
                ? screenText(t, "rideNotSaved", "Ride discarded")
                : visualState === "exported"
                  ? screenText(t, "exportedRide", "Ride export ready")
                  : screenText(t, "savedRide", "Ride saved")
        }
      >
        <CompletionPanel
          draft={viewCompletionDraft}
          t={t}
          rtl={rtl}
          styles={styles}
          palette={palette}
          formatNumber={formatNumber}
          distanceDisplay={distanceDisplay}
          onSave={onSaveCompletion}
          onRetrySave={onRetrySaveCompletion}
          onDiscard={onDiscardCompletion}
          onExport={handleExport}
          exportError={browserExportError}
        />
      </ScreenFrame>
    );

  if (!canonical && visualState !== "ended" && !recordingOnly)
    return (
      <View style={[styles.screen, rtl && styles.screenRtl]}>
        <View style={styles.pageIntro}>
          <Text style={[styles.eyebrow, rtl && styles.textRight]}>
            {screenText(t, "rideEyebrow", "RIDE")}
          </Text>
          <Text style={[styles.title, rtl && styles.textRight]}>
            {screenText(t, "rideTitle", "Ride")}
          </Text>
        </View>
        <View style={styles.emptyState} accessibilityLiveRegion="polite">
          <StatusBadge
            label={screenText(t, "liveStateIdle", "Ready to start")}
            palette={palette}
          />
          <Text style={[styles.emptyTitle, rtl && styles.textRight]}>
            {screenText(
              t,
              "chooseRouteBeforeRide",
              "Choose a route before you ride",
            )}
          </Text>
          <Text style={[styles.emptyCopy, rtl && styles.textRight]}>
            {screenText(
              t,
              "chooseRouteBeforeRideCopy",
              "Live Ride only uses a route you explicitly reviewed and confirmed.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onChooseRoute}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {screenText(t, "chooseRoute", "Choose route")}
            </Text>
          </Pressable>
        </View>
      </View>
    );

  if (state === "explanation" || state === "permission-explanation")
    return (
      <ScreenFrame
        t={t}
        rtl={rtl}
        styles={styles}
        title={screenText(
          t,
          "liveStatePermission",
          "Location permission needed",
        )}
      >
        <View style={styles.panel} accessibilityLiveRegion="polite">
          <Text style={[styles.panelTitle, rtl && styles.textRight]}>
            {screenText(
              t,
              "locationExplanation",
              "Your location is used only during this ride.",
            )}
          </Text>
          <Text style={[styles.panelCopy, rtl && styles.textRight]}>
            {permissionMessage ||
              screenText(
                t,
                "permissionExplanation",
                "Allow foreground location to start this ride.",
              )}
          </Text>
          <Text style={[styles.fieldHint, rtl && styles.textRight]}>
            {privacyMessage ||
              screenText(
                t,
                "foregroundOnly",
                "Naseem uses foreground location only during an active ride.",
              )}
          </Text>
          <View style={styles.actionRow}>
            {onCancelPermission && (
              <Pressable
                accessibilityRole="button"
                onPress={onCancelPermission}
                style={styles.surfaceButton}
              >
                <Text style={styles.surfaceButtonText}>
                  {screenText(t, "cancel", "Cancel")}
                </Text>
              </Pressable>
            )}
            {onRequestPermission && (
              <Pressable
                accessibilityRole="button"
                onPress={onRequestPermission}
                style={[styles.surfaceButton, styles.accentButton]}
              >
                <Text style={styles.accentButtonText}>
                  {screenText(t, "allowLocation", "Allow location")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScreenFrame>
    );

  if (state === "requesting" || state === "loading")
    return (
      <ScreenFrame
        t={t}
        rtl={rtl}
        styles={styles}
        title={screenText(t, "liveStateLoading", "Preparing live ride…")}
      >
        <View style={styles.panel} accessibilityLiveRegion="polite">
          <Text style={[styles.panelTitle, rtl && styles.textRight]}>
            {screenText(t, "loadingLocation", "Preparing location access")}
          </Text>
          <Text style={[styles.panelCopy, rtl && styles.textRight]}>
            {screenText(
              t,
              "permissionExplanation",
              "Allow foreground location to start this ride.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onCancelPermission}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {screenText(t, "cancel", "Cancel")}
            </Text>
          </Pressable>
        </View>
      </ScreenFrame>
    );

  if (
    state === "denied" ||
    state === "unavailable" ||
    state === "permission-denied"
  )
    return (
      <ScreenFrame
        t={t}
        rtl={rtl}
        styles={styles}
        title={
          state === "unavailable"
            ? locationUnavailableTitle(Platform.OS, rtl)
            : rtl
              ? "الموقع غير مسموح"
              : "Location not allowed"
        }
      >
        <View
          style={styles.alert}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.alertTitle, rtl && styles.textRight]}>
            {screenText(
              t,
              state === "unavailable"
                ? "locationUnavailableTitle"
                : "locationNotAllowedTitle",
              state === "unavailable"
                ? locationUnavailableCopy(Platform.OS, rtl)
                : rtl
                  ? "لم يُسمح بالوصول إلى الموقع. يمكنك المحاولة مرة أخرى أو المتابعة بدون موقع."
                  : "Location is not allowed. Try again or continue without location.",
            )}
          </Text>
          <Text style={[styles.alertText, rtl && styles.textRight]}>
            {permissionMessage ||
              screenText(
                t,
                "permissionDeniedRecovery",
                "Review the route or open settings to try again.",
              )}
          </Text>
          <View style={styles.actionRow}>
            {onReviewRoute && (
              <Pressable
                accessibilityRole="button"
                onPress={onReviewRoute}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {screenText(t, "reviewRoute", "Review route")}
                </Text>
              </Pressable>
            )}
            {onOpenSettings && (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenSettings}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>
                  {screenText(t, "openSettings", "Open settings")}
                </Text>
              </Pressable>
            )}
            {onRetryPermission && (
              <Pressable
                accessibilityRole="button"
                onPress={onRetryPermission}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {screenText(t, "retry", "Try again")}
                </Text>
              </Pressable>
            )}
            {onRequestEndRide && position?.retryLocation && (
              <Pressable
                accessibilityRole="button"
                onPress={onRequestEndRide}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>
                  {recordingOnly
                    ? recordingLabels.end
                    : screenText(
                        t,
                        "endRideKeepRecording",
                        "End ride and keep this recording",
                      )}
                </Text>
              </Pressable>
            )}
            {onCancelPermission && !position?.retryLocation && (
              <Pressable
                accessibilityRole="button"
                onPress={onCancelPermission}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {rtl ? "المتابعة بدون موقع" : "Continue without location"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScreenFrame>
    );

  if (
    state === "ended" ||
    state === "completed-draft" ||
    state === "save-failed" ||
    state === "saved" ||
    state === "discarded" ||
    state === "exported"
  )
    return (
      <ScreenFrame
        t={t}
        rtl={rtl}
        styles={styles}
        title={screenText(t, "liveStateEnded", "Live ride ended")}
      >
        {viewCompletionDraft ? (
          <CompletionPanel
            draft={viewCompletionDraft}
            t={t}
            rtl={rtl}
            styles={styles}
            palette={palette}
            formatNumber={formatNumber}
            distanceDisplay={distanceDisplay}
            onSave={onSaveCompletion}
            onRetrySave={onRetrySaveCompletion}
            onDiscard={onDiscardCompletion}
            onExport={handleExport}
            exportError={browserExportError}
          />
        ) : (
          <View style={styles.panel} accessibilityLiveRegion="polite">
            <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
              {screenText(t, "rideEnded", "Ride ended")}
            </Text>
            <Text style={[styles.bodyText, rtl && styles.textRight]}>
              {snapshot?.routeName ??
                canonical?.name ??
                screenText(t, "noRouteSelected", "No route selected")}
            </Text>
            {snapshot?.routeRevision !== undefined && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(t, "snapshotRevision", "Reviewed route revision")}{" "}
                {numberText(snapshot.routeRevision, {
                  maximumFractionDigits: 0,
                })}
              </Text>
            )}
            {snapshot?.startedLabel && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(t, "startedAt", "Started")} {snapshot.startedLabel}
              </Text>
            )}
            {snapshot?.endedLabel && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(t, "endedAt", "Ended")} {snapshot.endedLabel}
              </Text>
            )}
            <Text style={[styles.fieldHint, rtl && styles.textRight]}>
              {screenText(t, "locationStopped", "Location is off.")}
            </Text>
            <View style={styles.actionRow}>
              {onReviewRoute && (
                <Pressable
                  accessibilityRole="button"
                  onPress={onReviewRoute}
                  style={styles.secondary}
                >
                  <Text style={styles.secondaryText}>
                    {screenText(t, "reviewRoute", "Review route")}
                  </Text>
                </Pressable>
              )}
              {onChooseAnotherRoute && (
                <Pressable
                  accessibilityRole="button"
                  onPress={onChooseAnotherRoute}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>
                    {screenText(
                      t,
                      "chooseAnotherRoute",
                      "Choose another route",
                    )}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScreenFrame>
    );

  if (recordingOnly) {
    if (state === "ending")
      return (
        <EndRideConfirmation
          t={t}
          rtl={rtl}
          styles={styles}
          recordingOnly
          endConfirmationMessage={endConfirmationMessage}
          onCancelEndRide={onCancelEndRide}
          onConfirmEndRide={onConfirmEndRide}
        />
      );
    if (state === "active")
      return (
        <View
          style={[
            styles.atlas,
            { flex: 1, minHeight: 0 },
            rtl && styles.screenRtl,
          ]}
        >
          <View style={[styles.atlasMap, { flex: 1, minHeight: 0 }]}>
            <View
              style={[
                styles.emptyState,
                {
                  flex: 1,
                  minHeight: 0,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
              accessibilityRole="image"
              accessibilityLabel={
                position?.coordinate
                  ? recoveryLabels.near
                  : recoveryLabels.waiting
              }
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 4,
                  borderColor: position?.coordinate
                    ? palette.accent
                    : palette.muted,
                  backgroundColor: position?.coordinate
                    ? palette.accent
                    : "transparent",
                  marginBottom: 12,
                }}
              />
              <Text style={[styles.emptyTitle, rtl && styles.textRight]}>
                {position?.coordinate
                  ? recoveryLabels.near
                  : recoveryLabels.waiting}
              </Text>
              <Text style={[styles.emptyCopy, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "recordWithoutFollowingNbhCopy",
                  "Record a ride without route guidance. No route progress will be shown.",
                )}
              </Text>
            </View>
            <View style={[styles.atlasTopbar, rtl && styles.atlasTopbarRtl]}>
              <StatusBadge
                label={recordingLabels.active}
                tone="success"
                palette={palette}
              />
            </View>
          </View>
          <View
            style={[
              styles.atlasSheet,
              { flex: 1, minHeight: 0, maxHeight: "62%" },
            ]}
            accessibilityLiveRegion="polite"
          >
            <ScrollView
              style={{ flex: 1, minHeight: 0 }}
              contentContainerStyle={{ gap: 13, paddingBottom: 12 }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.atlasTitle, rtl && styles.textRight]}>
                {recordingLabels.active}
              </Text>
              <Text style={[styles.atlasCondition, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "foregroundOnly",
                  "Naseem uses foreground location only during an active ride.",
                )}
              </Text>
              <View style={[styles.metricRail, rtl && styles.rtlRow]}>
                <Metric
                  label={telemetryLabels.distance}
                  value={
                    position?.recordedDistanceLabel ??
                    distanceDisplay.formatDistance(0)
                  }
                  styles={styles}
                />
                <Metric
                  label={telemetryLabels.time}
                  value={
                    position?.recordedDurationLabel ??
                    `0 ${rtl ? "دقيقة" : "min"}`
                  }
                  styles={styles}
                />
                <Metric
                  label={telemetryLabels.fixes}
                  value={numberText(position?.fixCount ?? 0, {
                    maximumFractionDigits: 0,
                  })}
                  styles={styles}
                />
              </View>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {telemetryLabels.lastFix}: {position?.lastFixLabel ?? telemetryLabels.waiting}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "noAutoReroute",
                  "No route progress, auto-rerouting, or turn-by-turn instructions are shown in this mode.",
                )}
              </Text>
              {position?.isPaused && (
                <Text style={[styles.alertText, rtl && styles.textRight]}>
                  {screenText(
                    t,
                    "recordingPaused",
                    "Recording paused. Resume when you are ready to continue.",
                  )}
                </Text>
              )}
            </ScrollView>
            <ActiveRideActionBar
              actions={recoveryActions}
              rtl={rtl}
              styles={styles}
              labels={recoveryLabels}
              controlLabels={controlLabels}
              endLabel={recordingLabels.end}
              pause={position?.pause}
              resume={position?.resume}
              retryLocation={position?.retryLocation}
              onRequestEndRide={onRequestEndRide}
            />
          </View>
        </View>
      );
    return (
      <ScreenFrame
        t={t}
        rtl={rtl}
        styles={styles}
        title={screenText(
          t,
          "recordWithoutFollowingNbh",
          "Record without route guidance",
        )}
      >
        <View style={styles.routeSummary}>
          <View style={[styles.routeSummaryHeader, rtl && styles.rtlRow]}>
            <View style={styles.routeSummaryCopy}>
              <Text style={[styles.label, rtl && styles.textRight]}>
                {screenText(t, "selectedRoute", "Selected route")}
              </Text>
              <Text style={[styles.panelTitle, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "recordWithoutFollowingNbh",
                  "Recording without route guidance",
                )}
              </Text>
            </View>
            <StatusBadge
              label={screenText(t, "liveStateIdle", "Ready to start")}
              tone="info"
              palette={palette}
            />
          </View>
          <Text style={[styles.panelCopy, rtl && styles.textRight]}>
            {screenText(
              t,
              "recordWithoutFollowingNbhCopy",
              "Record a ride without route guidance. No route progress will be shown.",
            )}
          </Text>
        </View>
        <Text style={[styles.privacy, rtl && styles.textRight]}>
          {privacyMessage ||
            screenText(
              t,
              "foregroundOnly",
              "Naseem uses foreground location only during an active ride.",
            )}
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onStartRide ?? onShowPermissionExplanation}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>
              {recordingLabels.start}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onChooseRoute}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {screenText(t, "chooseAnotherRoute", "Choose another route")}
            </Text>
          </Pressable>
        </View>
      </ScreenFrame>
    );
  }
  if (!canonical) return null;

  if (state === "active")
    return (
      <View
        style={[
          styles.atlas,
          { flex: 1, minHeight: 0 },
          rtl && styles.screenRtl,
        ]}
      >
        <View style={[styles.atlasMap, { flex: 1, minHeight: 0 }]}>
          <MapPreview
            route={canonical}
            fullScreen
            minimal
            showUserLocation
            userCoordinate={position?.coordinate}
            rtl={rtl}
            roadLabels={roadLabels}
            mapText={mapText}
          />
          <View style={[styles.atlasTopbar, rtl && styles.atlasTopbarRtl]}>
            <StatusBadge
              label={screenText(t, "liveStateActive", "Live ride active")}
              tone="success"
              palette={palette}
            />
          </View>
        </View>
        <View
          style={[
            styles.atlasSheet,
            { flex: 1, minHeight: 0, maxHeight: "62%" },
          ]}
          accessibilityLiveRegion="polite"
        >
          <ScrollView
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ gap: 13, paddingBottom: 12 }}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
          <Text style={[styles.atlasTitle, rtl && styles.textRight]}>
            {position?.remainingLabel ??
              distanceDisplay.formatDistance(
                Math.max(
                  0,
                  canonical.distanceKm * (1 - (position?.progress ?? 0)),
                ),
              )}
          </Text>
          <Text style={[styles.atlasMeta, rtl && styles.textRight]}>
            {screenText(t, "remaining", "Remaining route")} ·{" "}
            {screenText(t, "etaRemaining", "Estimated time left")}:{" "}
            {position?.etaLabel ?? "—"}
          </Text>
          <View style={styles.atlasFact}>
            <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
              {screenText(t, "liveMatch", "Live route match")}
            </Text>
            <Text style={[styles.bodyText, rtl && styles.textRight]}>
              {matchCopy(matchState, locationState, t, recoveryLabels)}
            </Text>
            <Text style={[styles.fieldHint, rtl && styles.textRight]}>
              {recoveryLabels.lastFix}: {position?.lastFixLabel ?? recoveryLabels.noFix}
            </Text>
            {position?.match?.confidence && (
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(t, "gpsConfidence", "GPS confidence")} ·{" "}
                {localizedConfidenceLabel(t, position.match.confidence)}
              </Text>
            )}
          </View>
          {matchState === "matched" ? (
            <View style={styles.atlasFact}>
              <Text style={[styles.fieldLabel, rtl && styles.textRight]}>
                {nextSegmentName ||
                  screenText(t, "nextSegment", "Next segment")}
              </Text>
              <Text style={[styles.bodyText, rtl && styles.textRight]}>
                {nextSegmentWindLabel ||
                  statusMessage ||
                  screenText(
                    t,
                    "liveCopy",
                    "Location updates are limited to this active ride.",
                  )}
              </Text>
            </View>
          ) : (
            <Text style={[styles.alertText, rtl && styles.textRight]}>
              {recoveryLabels.progressPaused}{" "}
              {needsLocationRecovery
                ? screenText(
                    t,
                    "checkMapAndSurroundings",
                    rtl
                      ? "راجع الخريطة وما حولك."
                      : "Check the map and surroundings.",
                  )
                : ""}
            </Text>
          )}
          {needsLocationRecovery && (
            <View style={styles.alert}>
              <Text style={[styles.alertTitle, rtl && styles.textRight]}>
                {locationState === "stale"
                  ? recoveryLabels.stale
                  : recoveryLabels.away}
              </Text>
              <Text style={[styles.alertText, rtl && styles.textRight]}>
                {screenText(t, "liveRecoveryCopy", recoveryLabels.recovery)}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(t, "lastFix", "Last fix")}:{" "}
                {position?.lastFixLabel ?? recoveryLabels.noFix}
              </Text>
            </View>
          )}
          {position?.isPaused && !needsLocationRecovery && (
              <Text style={[styles.alertText, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "recordingPaused",
                  "Recording paused. Resume when you are ready to continue.",
                )}
              </Text>
            )}
          </ScrollView>
          <ActiveRideActionBar
            actions={recoveryActions}
            rtl={rtl}
            styles={styles}
            labels={recoveryLabels}
            controlLabels={controlLabels}
            endLabel={screenText(
              t,
              needsLocationRecovery ? "endRideKeepRecording" : "endRide",
              needsLocationRecovery
                ? "End ride and keep this recording"
                : "End live ride",
            )}
            pause={position?.pause}
            resume={position?.resume}
            retryLocation={position?.retryLocation}
            onRequestEndRide={onRequestEndRide}
          />
        </View>
      </View>
    );

  if (state === "ending")
    return (
      <EndRideConfirmation
        t={t}
        rtl={rtl}
        styles={styles}
        recordingOnly={recordingOnly}
        endConfirmationMessage={endConfirmationMessage}
        onCancelEndRide={onCancelEndRide}
        onConfirmEndRide={onConfirmEndRide}
      />
    );

  return (
    <ScreenFrame
      t={t}
      rtl={rtl}
      styles={styles}
      title={screenText(t, "rideTitle", "Ride")}
    >
      <View style={styles.routeSummary}>
        <View style={[styles.routeSummaryHeader, rtl && styles.rtlRow]}>
          <View style={styles.routeSummaryCopy}>
            <Text style={[styles.label, rtl && styles.textRight]}>
              {screenText(t, "selectedRoute", "Selected route")}
            </Text>
            <Text style={[styles.panelTitle, rtl && styles.textRight]}>
              {canonical.name}
            </Text>
          </View>
          <StatusBadge
            label={
              navigable
                ? screenText(t, "routeReady", "Route ready")
                : screenText(
                    t,
                    "previewRouteStatus",
                    "Preview route · road verification pending",
                  )
            }
            tone={navigable ? "success" : "warning"}
            palette={palette}
          />
        </View>
        <Text style={[styles.panelCopy, rtl && styles.textRight]}>
          {navigable
            ? `${distanceDisplay.formatDistance(canonical.distanceKm)} · ${numberText(canonical.durationMinutes, { maximumFractionDigits: 0 })} ${screenText(t, "minutes", "min")}`
            : screenText(
                t,
                "previewRouteNote",
                "This supplied preview can be reviewed, but Live Ride stays unavailable until road evidence is verified.",
              )}
        </Text>
        {entryLabel && (
          <Text style={[styles.fieldHint, rtl && styles.textRight]}>
            {screenText(t, "startFinish", "Start / finish")}: {entryLabel}
          </Text>
        )}
      </View>
      <MapPreview
        route={canonical}
        fullScreen
        rtl={rtl}
        roadLabels={roadLabels}
        mapText={mapText}
      />
      {layers && layers.length > 0 && (
        <RouteLayerLegend
          layers={layers}
          palette={palette}
          rtl={rtl}
          title={screenText(t, "mapLayers", "Map layers")}
        />
      )}
      {!navigable && (
        <View style={styles.alert}>
          <Text style={[styles.alertTitle, rtl && styles.textRight]}>
            {screenText(
              t,
              "roadVerificationPending",
              "Road verification pending",
            )}
          </Text>
          <Text style={[styles.alertText, rtl && styles.textRight]}>
            {screenText(
              t,
              "previewRouteNote",
              "This supplied preview can be reviewed, but Live Ride stays unavailable until road evidence is verified.",
            )}
          </Text>
        </View>
      )}
      <Text style={[styles.privacy, rtl && styles.textRight]}>
        {privacyMessage ||
          screenText(
            t,
            "foregroundOnly",
            "Naseem uses foreground location only during an active ride.",
          )}
      </Text>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!navigable}
          onPress={onStartRide ?? onShowPermissionExplanation}
          style={[styles.primary, !navigable && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {screenText(t, "startAtEntry", "Start at route entry")}
          </Text>
        </Pressable>
        {onConnectFromLocation && (
          <Pressable
            accessibilityRole="button"
            disabled={!navigable}
            onPress={onConnectFromLocation}
            style={[styles.secondary, !navigable && styles.disabled]}
          >
            <Text style={styles.secondaryText}>
              {screenText(t, "connectFromLocation", "Connect from my location")}
            </Text>
          </Pressable>
        )}
      </View>
      {onReviewRoute && (
        <Pressable
          accessibilityRole="button"
          onPress={onReviewRoute}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>
            {screenText(
              t,
              "previewWithoutLocation",
              "Preview without location",
            )}
          </Text>
        </Pressable>
      )}
    </ScreenFrame>
  );
}

function EndRideConfirmation({
  t,
  rtl,
  styles,
  recordingOnly,
  endConfirmationMessage,
  onCancelEndRide,
  onConfirmEndRide,
}: {
  t: LiveRideScreenProps["t"];
  rtl: boolean;
  styles: LiveRideScreenProps["styles"];
  recordingOnly?: boolean;
  endConfirmationMessage?: string;
  onCancelEndRide?: LiveRideScreenProps["onCancelEndRide"];
  onConfirmEndRide?: LiveRideScreenProps["onConfirmEndRide"];
}) {
  return (
    <ScreenFrame
      t={t}
      rtl={rtl}
      styles={styles}
      title={screenText(t, "endRideConfirmTitle", "End this ride?")}
    >
      <View
        style={styles.alert}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.alertText, rtl && styles.textRight]}>
          {endConfirmationMessage ||
            screenText(t, "endRideConfirmCopy", "Location tracking will stop.")}
        </Text>
        <View style={styles.actionRow}>
          {onCancelEndRide && (
            <Pressable
              accessibilityRole="button"
              onPress={onCancelEndRide}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {screenText(t, "cancel", "Cancel")}
              </Text>
            </Pressable>
          )}
          {onConfirmEndRide && (
            <Pressable
              accessibilityRole="button"
              onPress={onConfirmEndRide}
              style={[styles.primary, styles.danger]}
            >
              <Text style={styles.dangerText}>
                {recordingOnly
                  ? recordingOnlyLabels(rtl).end
                  : screenText(t, "endRide", "End live ride")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenFrame>
  );
}

function ActiveRideActionBar({
  actions,
  rtl,
  styles,
  labels,
  controlLabels,
  pause,
  resume,
  retryLocation,
  onRequestEndRide,
  endLabel,
}: {
  actions: ReturnType<typeof liveRideRecoveryActions>;
  rtl: boolean;
  styles: LiveRideScreenProps["styles"];
  labels: ReturnType<typeof liveRideRecoveryLabels>;
  controlLabels: ReturnType<typeof recordingControlLabels>;
  pause?: () => void;
  resume?: () => void;
  retryLocation?: () => void;
  onRequestEndRide?: LiveRideScreenProps["onRequestEndRide"];
  endLabel?: string;
}) {
  return (
    <View
      style={[
        styles.actionRow,
        {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "stretch",
          flexShrink: 0,
          paddingTop: 8,
          paddingBottom: 24,
        },
        rtl && styles.rtlRow,
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel={labels.recovery}
    >
      {actions.includes("retryLocation") && retryLocation && (
        <Pressable
          accessibilityRole="button"
          onPress={retryLocation}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{labels.retry}</Text>
        </Pressable>
      )}
      {actions.includes("resume") && resume && (
        <Pressable
          accessibilityRole="button"
          onPress={resume}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{controlLabels.resume}</Text>
        </Pressable>
      )}
      {actions.includes("pause") && pause && (
        <Pressable
          accessibilityRole="button"
          onPress={pause}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{controlLabels.pause}</Text>
        </Pressable>
      )}
      {actions.includes("end") && onRequestEndRide && (
        <Pressable
          accessibilityRole="button"
          onPress={onRequestEndRide}
          style={[styles.primary, styles.danger]}
        >
          <Text style={styles.dangerText}>{endLabel ?? labels.retry}</Text>
        </Pressable>
      )}
    </View>
  );
}

function CompletionPanel({
  draft,
  t,
  rtl,
  styles,
  palette,
  formatNumber,
  distanceDisplay,
  onSave,
  onRetrySave,
  onDiscard,
  onExport,
  exportError,
}: {
  draft: ActivityDraft;
  t: LiveRideScreenProps["t"];
  rtl: boolean;
  styles: LiveRideScreenProps["styles"];
  palette: LiveRideScreenProps["palette"];
  formatNumber?: LiveRideScreenProps["formatNumber"];
  distanceDisplay: LiveRideScreenProps["distanceDisplay"];
  onSave?: () => void;
  onRetrySave?: () => void;
  onDiscard?: () => void;
  onExport?: () => boolean | void;
  exportError?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : String(value);
  useEffect(() => {
    setSaving(false);
    setExporting(false);
  }, [draft.id, draft.completionState, draft.exportState, exportError]);
  const recoveryLabels = liveRideRecoveryLabels(rtl);
  const trackState = completionTrackState(draft);
  const actionStates = completionActionStates(draft, {
    saving,
    exporting,
    exportError,
  });
  const routeName = draft.routeSnapshot
    ? rtl && draft.routeSnapshot.nameAr
      ? draft.routeSnapshot.nameAr
      : draft.routeSnapshot.name
    : screenText(
        t,
        "recordWithoutFollowingNbh",
        "Recording without route guidance",
      );
  const quality =
    localizedConfidenceLabel(
      t,
      draft.matchQuality === "unknown" ? undefined : draft.matchQuality,
    );
  const variantLabel = localizedVariantLabel(
    rtl ? "ar" : "en",
    draft.routeSnapshot?.variantId,
    [NBH_PREVIEW_VARIANT],
  );
  const saved = draft.completionState === "saved";
  const failed = draft.completionState === "save_failed";
  const discarded = draft.completionState === "discarded";
  const exported = !failed && draft.exportState === "exported";
  const displayState = completionStateForDraft(draft);
  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      <StatusBadge
        label={
          displayState === "completed-draft"
            ? screenText(t, "completedDraft", "Completed draft")
            : displayState === "save-failed"
              ? screenText(t, "saveFailed", "Save failed")
              : displayState === "saved"
                ? screenText(t, "savedRide", "Saved")
                : displayState === "discarded"
                  ? screenText(t, "rideNotSaved", "Discarded")
                  : screenText(t, "exportedRide", "Exported")
        }
        tone={
          displayState === "save-failed"
            ? "danger"
            : displayState === "discarded"
              ? "warning"
              : "success"
        }
        palette={palette}
      />
      <Text style={[styles.sectionTitle, rtl && styles.textRight]}>
        {screenText(t, "rideDraft", "Ride draft")}
      </Text>
      <Text style={[styles.bodyText, rtl && styles.textRight]}>
        {routeName}
      </Text>
      {draft.routeSnapshot && draft.plannedRouteRevision !== null ? (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {screenText(t, "ridePlanSnapshot", "Planned route snapshot")} ·{" "}
          {screenText(t, "snapshotRevision", "Reviewed route revision")}{" "}
          {numberText(draft.plannedRouteRevision, { maximumFractionDigits: 0 })}
        </Text>
      ) : (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {screenText(
            t,
            "recordWithoutFollowingNbhCopy",
            "No route guidance or route progress was selected.",
          )}
        </Text>
      )}
      {variantLabel && (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {screenText(t, "routeVariant", "Route option")}:{" "}
          {variantLabel}
        </Text>
      )}
      <View style={[styles.metricRail, rtl && styles.rtlRow]}>
        <Metric
          label={screenText(t, "recordedDistance", "Recorded distance")}
          value={distanceDisplay.formatDistance(draft.distanceMeters / 1000)}
          styles={styles}
        />
        <Metric
          label={screenText(t, "duration", "Moving time")}
          value={`${numberText(Math.round(draft.elapsedSeconds / 60), { maximumFractionDigits: 0 })} ${screenText(t, "minutes", "min")}`}
          styles={styles}
        />
        <Metric
          label={screenText(t, "matchQuality", "Match quality")}
          value={quality}
          styles={styles}
        />
      </View>
      {trackState === "no-fix" && (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={[styles.alertText, rtl && styles.textRight]}>
            {recoveryLabels.noTrack}
          </Text>
        </View>
      )}
      <Text style={[styles.fieldHint, rtl && styles.textRight]}>
        {screenText(t, "gaps", "Location gaps")}:{" "}
        {numberText(draft.gaps, { maximumFractionDigits: 0 })}
      </Text>
      {draft.forecastSnapshot && (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {screenText(t, "forecastSnapshot", "Forecast snapshot")} ·{" "}
          {localizedConfidenceLabel(
            t,
            draft.forecastSnapshot.confidence ?? "low",
          )}
        </Text>
      )}
      {!saved && !discarded && (
        <Text style={[styles.fieldHint, rtl && styles.textRight]}>
          {screenText(
            t,
            "temporaryDraftCopy",
            rtl
              ? "تظل هذه المسودة محلياً مع عيناتها حتى تحفظها أو تحذفها."
              : "This temporary local draft keeps its samples until you save or discard it.",
          )}
        </Text>
      )}
      {saved && (
        <Text style={[styles.panelCopy, rtl && styles.textRight]}>
          {screenText(t, "savedRide", "Ride saved on this device.")}
        </Text>
      )}
      {discarded && (
        <Text style={[styles.panelCopy, rtl && styles.textRight]}>
          {screenText(t, "rideNotSaved", "Ride not saved.")}
        </Text>
      )}
      {failed && (
        <Text style={[styles.alertText, rtl && styles.textRight]}>
          {screenText(
            t,
            "saveFailed",
            "The ride could not be saved. You can retry or export it.",
          )}
        </Text>
      )}
      {exported && (
        <Text style={[styles.panelCopy, rtl && styles.textRight]}>
          {screenText(t, "exportedRide", "Ride export ready.")}
        </Text>
      )}
      {exportError && (
        <Text style={[styles.alertText, rtl && styles.textRight]}>
          {recoveryLabels.exportFailed}
        </Text>
      )}
      {!discarded && (
        <View style={styles.actionRow}>
          {!saved &&
            (failed
              ? onRetrySave && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={actionStates.save === "busy"}
                    accessibilityState={{ disabled: actionStates.save === "busy" }}
                    onPress={() => {
                      if (actionStates.save === "busy") return;
                      setSaving(true);
                      onRetrySave();
                    }}
                    style={[styles.primary, actionStates.save === "busy" && styles.disabled]}
                  >
                    <Text style={styles.primaryText}>
                      {actionStates.save === "busy"
                        ? recoveryLabels.saving
                        : screenText(t, "retrySave", "Retry save")}
                    </Text>
                  </Pressable>
                )
              : onSave && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={actionStates.save === "busy"}
                    accessibilityState={{ disabled: actionStates.save === "busy" }}
                    onPress={() => {
                      if (actionStates.save === "busy") return;
                      setSaving(true);
                      onSave();
                    }}
                    style={[styles.primary, actionStates.save === "busy" && styles.disabled]}
                  >
                    <Text style={styles.primaryText}>
                      {actionStates.save === "busy"
                        ? recoveryLabels.saving
                        : screenText(t, "saveRide", "Save ride")}
                    </Text>
                  </Pressable>
                ))}
          {!saved && onDiscard && (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={screenText(
                t,
                "discardRideConfirm",
                "Confirmation is required before the draft is removed.",
              )}
              onPress={onDiscard}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {screenText(t, "discardRide", "Discard ride")}
              </Text>
            </Pressable>
          )}
          {onExport && (
            <Pressable
              accessibilityRole="button"
              disabled={actionStates.export === "busy"}
              accessibilityState={{ disabled: actionStates.export === "busy" }}
              onPress={() => {
                if (actionStates.export === "busy") return;
                setExporting(true);
                const result = onExport();
                if (result === false) setExporting(false);
              }}
              style={[styles.secondary, actionStates.export === "busy" && styles.disabled]}
            >
              <Text style={styles.secondaryText}>
                {actionStates.export === "busy"
                  ? recoveryLabels.exporting
                  : screenText(t, "exportRide", "Export ride")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function matchCopy(
  state: PositionMatchState | undefined,
  locationState: LiveRideLocationState,
  t: LiveRideScreenProps["t"],
  labels: ReturnType<typeof liveRideRecoveryLabels>,
) {
  if (locationState === "waiting") return labels.waiting;
  if (locationState === "away") return labels.away;
  if (locationState === "stale") return labels.stale;
  if (locationState === "uncertain") return labels.uncertain;
  if (state === "approaching")
    return screenText(t, "approachingEntry", "Approaching entry");
  if (state === "matched")
    return screenText(t, "positionMatched", "Position matched");
  return labels.uncertain;
}

function ScreenFrame({
  t,
  rtl,
  styles,
  title,
  children,
}: {
  t: LiveRideScreenProps["t"];
  rtl: boolean;
  styles: LiveRideScreenProps["styles"];
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.screen, rtl && styles.screenRtl]}>
      <View style={styles.pageIntro}>
        <Text style={[styles.eyebrow, rtl && styles.textRight]}>
          {screenText(t, "rideEyebrow", "RIDE")}
        </Text>
        <Text style={[styles.title, rtl && styles.textRight]}>{title}</Text>
      </View>
      {children}
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
  styles: LiveRideScreenProps["styles"];
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
