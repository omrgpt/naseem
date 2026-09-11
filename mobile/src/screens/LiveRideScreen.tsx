import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { MapPreview } from "../MapPreview";
import { RouteLayerLegend } from "../RouteLayerLegend";
import { ProgressReadout, StatusBadge } from "../UiPatterns";
import type { ActivityDraft, PositionMatchState } from "../domain";
import { localizedConfidenceLabel, localizedVariantLabel } from "../i18n";
import {
  completionStateForDraft,
  exportActivityDraft,
  locationUnavailableCopy,
  locationUnavailableTitle,
  recordingControlLabels,
  recordingOnlyLabels,
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
  useEffect(() => {
    setBrowserExportedDraft(null);
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
  const needsLocationRecovery =
    matchState === "stale" || matchState === "off-corridor";
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
    if (Platform.OS === "web" && completionDraft) {
      const exported = exportActivityDraft(completionDraft);
      if (exported) {
        setBrowserExportedDraft(exported);
        return;
      }
    }
    onExportCompletion?.();
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
            {onRequestEndRide && (
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
        <View style={[styles.atlas, rtl && styles.screenRtl]}>
          <View style={styles.atlasMap}>
            <View
              style={styles.emptyState}
              accessibilityRole="image"
              accessibilityLabel={screenText(
                t,
                "recordWithoutFollowingNbh",
                "Recording without route guidance",
              )}
            >
              <Text style={[styles.emptyTitle, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "recordWithoutFollowingNbh",
                  "Recording without route guidance",
                )}
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
          <View style={styles.atlasSheet} accessibilityLiveRegion="polite">
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
            <Text style={[styles.fieldHint, rtl && styles.textRight]}>
              {screenText(
                t,
                "noAutoReroute",
                "No route progress, auto-rerouting, or turn-by-turn instructions are shown in this mode.",
              )}
            </Text>
            <View style={styles.actionRow}>
              {position?.isPaused ? (
                position.resume && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={position.resume}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>
                      {controlLabels.continue}
                    </Text>
                  </Pressable>
                )
              ) : (
                position?.pause && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={position.pause}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>
                      {controlLabels.pause}
                    </Text>
                  </Pressable>
                )
              )}
              <Pressable
                accessibilityRole="button"
                onPress={onRequestEndRide}
                style={[styles.primary, styles.danger]}
              >
                <Text style={styles.dangerText}>{recordingLabels.end}</Text>
              </Pressable>
            </View>
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
      <View style={[styles.atlas, rtl && styles.screenRtl]}>
        <View style={styles.atlasMap}>
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
        <View style={styles.atlasSheet} accessibilityLiveRegion="polite">
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
              {matchCopy(matchState, t)}
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
              {screenText(
                t,
                "progressPaused",
                "Progress is paused until the route match is confident.",
              )}{" "}
              {matchState === "off-corridor" || matchState === "stale"
                ? screenText(
                    t,
                    "checkMapAndSurroundings",
                    "Check the map and surroundings.",
                  )
                : ""}
            </Text>
          )}
          {(matchState === "stale" || matchState === "off-corridor") && (
            <View style={styles.alert}>
              <Text style={[styles.alertTitle, rtl && styles.textRight]}>
                {matchState === "stale"
                  ? screenText(t, "staleLocation", "Stale location")
                  : screenText(t, "offCorridor", "Off route corridor")}
              </Text>
              <Text style={[styles.alertText, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "liveRecoveryCopy",
                  "Check the map and surroundings. Progress stays paused until the next confident fix. You can retry, pause, continue, or end and keep this recording.",
                )}
              </Text>
              <Text style={[styles.fieldHint, rtl && styles.textRight]}>
                {screenText(t, "lastFix", "Last fix")}:{" "}
                {position?.lastFixLabel ||
                  screenText(t, "noLocationFix", "No location fix yet")}
              </Text>
              <View style={styles.actionRow}>
                {position?.retryLocation && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={position.retryLocation}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>
                      {screenText(t, "retryLocation", "Retry location")}
                    </Text>
                  </Pressable>
                )}
                {position?.isPaused
                  ? position.resume && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={position.resume}
                        style={styles.secondary}
                      >
                        <Text style={styles.secondaryText}>
                          {controlLabels.continue}
                        </Text>
                      </Pressable>
                    )
                  : position?.pause && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={position.pause}
                        style={styles.secondary}
                      >
                        <Text style={styles.secondaryText}>
                          {controlLabels.pause}
                        </Text>
                      </Pressable>
                    )}
              </View>
            </View>
          )}
          {position?.isPaused &&
            matchState !== "stale" &&
            matchState !== "off-corridor" && (
              <Text style={[styles.alertText, rtl && styles.textRight]}>
                {screenText(
                  t,
                  "recordingPaused",
                  "Recording paused. Resume when you are ready to continue.",
                )}
              </Text>
            )}
          <View style={styles.actionRow}>
            {matchState !== "stale" && matchState !== "off-corridor" && (
              position?.isPaused
                ? position.resume && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={position.resume}
                      style={styles.secondary}
                    >
                      <Text style={styles.secondaryText}>
                        {controlLabels.resume}
                      </Text>
                    </Pressable>
                  )
                : position?.pause && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={position.pause}
                      style={styles.secondary}
                    >
                      <Text style={styles.secondaryText}>
                        {controlLabels.pause}
                      </Text>
                    </Pressable>
                  )
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onRequestEndRide}
              style={[styles.primary, styles.danger]}
            >
              <Text style={styles.dangerText}>
                {screenText(
                  t,
                  needsLocationRecovery
                    ? "endRideKeepRecording"
                    : "endRide",
                  needsLocationRecovery
                    ? "End ride and keep this recording"
                    : "End live ride",
                )}
              </Text>
            </Pressable>
          </View>
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
  onExport?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const numberText = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber ? formatNumber(value, options) : String(value);
  useEffect(() => {
    setSaving(false);
  }, [draft.completionState]);
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
      {!discarded && (
        <View style={styles.actionRow}>
          {!saved &&
            (failed
              ? onRetrySave && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    accessibilityState={{ disabled: saving }}
                    onPress={() => {
                      if (saving) return;
                      setSaving(true);
                      onRetrySave();
                    }}
                    style={[styles.primary, saving && styles.disabled]}
                  >
                    <Text style={styles.primaryText}>
                      {screenText(t, "retrySave", "Retry save")}
                    </Text>
                  </Pressable>
                )
              : onSave && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    accessibilityState={{ disabled: saving }}
                    onPress={() => {
                      if (saving) return;
                      setSaving(true);
                      onSave();
                    }}
                    style={[styles.primary, saving && styles.disabled]}
                  >
                    <Text style={styles.primaryText}>
                      {screenText(t, "saveRide", "Save ride")}
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
              onPress={onExport}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {screenText(t, "exportRide", "Export ride")}
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
  t: LiveRideScreenProps["t"],
) {
  if (state === "approaching")
    return screenText(t, "approachingEntry", "Approaching entry");
  if (state === "matched")
    return screenText(t, "positionMatched", "Position matched");
  if (state === "off-corridor")
    return `${screenText(t, "offCorridor", "Off route corridor")} · ${screenText(t, "checkMapAndSurroundings", "Check the map and surroundings.")}`;
  if (state === "stale")
    return `${screenText(t, "staleLocation", "Stale location")} · ${screenText(t, "checkMapAndSurroundings", "Check the map and surroundings.")}`;
  return screenText(t, "locationUncertain", "Location uncertain");
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
