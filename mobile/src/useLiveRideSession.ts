import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import type {
  ActivityDraft,
  ActiveRideSnapshot,
  Coordinate,
  PositionMatch,
  RecordingOnlySnapshot,
  RoutePlan,
  RouteRecord,
} from "./domain";
import {
  endActiveRide,
  liveRidePolicyGate,
  startActiveRide,
  DEFAULT_WAYPOINT_TRACE_LIVE_RIDE_POLICY,
  type WaypointTraceLiveRidePolicy,
} from "./routeLifecycle";
import { routePlanFromRecord } from "./routeRepository";
import { segmentIndexForProgress } from "./routeProgress";
import { formatBahrainTime, BAHRAIN_LOCALES } from "./routeTime";
import { createStatefulRouteMatcher, matchStateLabel } from "./routeMatcher";
import {
  createCompletionDraft,
  createRecordingOnlyCompletionDraft,
  createRecordingOnlySnapshot,
  countLocationGaps,
  classifyLocationFailure,
  completionStateForDraft,
  isBrowserLocationAvailable,
  transitionLiveRideState,
  type LiveRideCompletionState,
  type LiveRideStateName,
} from "./rideRecording";

export {
  classifyLocationFailure,
  isBrowserLocationAvailable,
  transitionLiveRideState,
} from "./rideRecording";

export type LiveRideSessionState =
  | LiveRideStateName
  // Keep the names consumed by older App callers source-compatible while the
  // hook emits the explicit state names above.
  | "loading"
  | "permission-explanation"
  | "permission-denied"
  | "ended";
export type LiveRidePermission =
  | "granted"
  | "denied"
  | "unavailable"
  | "undetermined";

export type LiveRideSessionOptions = {
  route: RoutePlan | null;
  routeRecord: RouteRecord | null;
  recordingOnly?: boolean;
  messages?: Partial<LiveRideSessionMessages>;
  analysisKey?: string;
  policy?: WaypointTraceLiveRidePolicy;
  formatDistance?: (distanceKm: number) => string;
  formatDuration?: (minutes: number) => string;
  formatTime?: (instant: string) => string;
  formatAccuracy?: (meters: number) => string;
  onPosition?: (coordinate: Coordinate) => void;
  onWindShift?: () => void;
};

export type LiveRideSessionMessages = {
  waiting: string;
  permissionStart: string;
  permissionRecord: string;
  endConfirmation: string;
  recordingOnlyEndConfirmation: string;
  liveActive: string;
  recordingActive: string;
  liveStarted: string;
  recordingStarted: string;
  permissionDeniedRecovery: string;
  routeNotReady: string;
  roadEvidenceReview: string;
  roadMatchedRequired: string;
  liveEnded: string;
  recordingEnded: string;
  locationUpdatesStopped: string;
  locationDenied?: string;
  locationUnavailable?: string;
  recordingPaused?: string;
  recordingResumed?: string;
};

export type LiveRideSession = {
  state: LiveRideSessionState;
  permission: LiveRidePermission;
  activeSnapshot: ActiveRideSnapshot | RecordingOnlySnapshot | null;
  endedSnapshot: ActiveRideSnapshot | RecordingOnlySnapshot | null;
  position: {
    coordinate?: Coordinate;
    progress: number;
    remainingLabel?: string;
    etaLabel?: string;
    accuracyLabel?: string;
    offRouteLabel?: string;
    match?: PositionMatch;
    lastFixAt?: string;
    lastFixLabel?: string;
    activeRoute?: RoutePlan;
    isPaused: boolean;
    canPause: boolean;
    pause?: () => void;
    resume?: () => void;
    retryLocation?: () => void;
  };
  segmentIndex: number;
  completionDraft: ActivityDraft | null;
  completionState: LiveRideCompletionState | null;
  isPaused: boolean;
  canPause: boolean;
  statusMessage: string;
  permissionMessage: string;
  endConfirmationMessage: string;
  prepareStart: () => void;
  requestPermissionAndStart: () => void;
  cancelPermission: () => void;
  retryPermission: () => void;
  requestEnd: () => void;
  cancelEnd: () => void;
  confirmEnd: () => void;
  refreshPermission: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  retryLocation: () => void;
};

/**
 * The session owns the native watcher and the immutable route revision used by
 * the watcher. The selected route in App may change without changing this
 * snapshot.
 */
export function useLiveRideSession({
  route,
  routeRecord,
  recordingOnly = false,
  messages,
  analysisKey,
  policy = DEFAULT_WAYPOINT_TRACE_LIVE_RIDE_POLICY,
  formatDistance = (value) => `${value.toFixed(1)} km`,
  formatDuration = (value) => `${value} min`,
  formatTime = (value) => formatBahrainTime(value, BAHRAIN_LOCALES.en),
  formatAccuracy = (value) => `${Math.round(value)} m`,
  onPosition,
}: LiveRideSessionOptions): LiveRideSession {
  const waitingMessage = messages?.waiting ?? "Waiting for you to start.";
  const permissionStartMessage =
    messages?.permissionStart ??
    "Allow foreground location to start this ride.";
  const permissionRecordMessage =
    messages?.permissionRecord ??
    "Allow foreground location to record this ride.";
  const endConfirmationCopy =
    messages?.endConfirmation ??
    "Location tracking will stop. Your route plan remains saved; no ride is saved unless you choose to save it.";
  const recordingOnlyEndConfirmationCopy =
    messages?.recordingOnlyEndConfirmation ??
    "Location tracking will stop. No route progress or ride is saved unless you choose to save it.";
  const liveActiveMessage =
    messages?.liveActive ??
    "Live ride active. Location updates are limited to this ride.";
  const recordingActiveMessage =
    messages?.recordingActive ??
    "Recording-only ride active. Location updates are limited to this ride.";
  const liveStartedMessage =
    messages?.liveStarted ??
    "Live ride started. Location permission is active for this session.";
  const recordingStartedMessage =
    messages?.recordingStarted ??
    "Recording-only ride started. Location permission is active for this session.";
  const permissionDeniedRecoveryMessage =
    messages?.permissionDeniedRecovery ??
    "Location access was denied. Review the route or open settings to try again.";
  const routeNotReadyMessage =
    messages?.routeNotReady ??
    "This route is not ready for Live Ride. Review the road-matched route first.";
  const roadEvidenceReviewMessage =
    messages?.roadEvidenceReview ??
    "This route cannot start Live Ride until its road evidence is reviewed.";
  const roadMatchedRequiredMessage =
    messages?.roadMatchedRequired ??
    "This route cannot start Live Ride until it is road-matched.";
  const liveEndedMessage =
    messages?.liveEnded ?? "Live ride ended. Location is off.";
  const recordingEndedMessage =
    messages?.recordingEnded ?? "Recording-only ride ended. Location is off.";
  const locationUpdatesStoppedMessage =
    messages?.locationUpdatesStopped ??
    "Location updates stopped. Your recording is still here; retry access or end the ride to save it.";
  const locationDeniedMessage =
    messages?.locationDenied ??
    "Location not allowed. Try again, open settings, or continue without location.";
  const locationUnavailableMessage =
    messages?.locationUnavailable ??
    "Location unavailable in this browser. Try again, open settings where supported, or continue without location.";
  const recordingPausedMessage =
    messages?.recordingPaused ??
    "Recording paused. Your samples remain on this device until you continue or end the ride.";
  const recordingResumedMessage =
    messages?.recordingResumed ?? "Recording active. Location updates are limited to this ride.";
  const [state, setState] = useState<LiveRideSessionState>(
    route || recordingOnly ? "ready" : "no-route",
  );
  const [permission, setPermission] =
    useState<LiveRidePermission>("undetermined");
  const [activeSnapshot, setActiveSnapshot] = useState<
    ActiveRideSnapshot | RecordingOnlySnapshot | null
  >(null);
  const [endedSnapshot, setEndedSnapshot] = useState<
    ActiveRideSnapshot | RecordingOnlySnapshot | null
  >(null);
  const [completionDraft, setCompletionDraft] = useState<ActivityDraft | null>(
    null,
  );
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState<LiveRideSession["position"]>({
    progress: 0,
    isPaused: false,
    canPause: false,
  });
  const [segmentIndex, setSegmentIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState(waitingMessage);
  const [permissionMessage, setPermissionMessage] = useState(
    permissionStartMessage,
  );
  const [endConfirmationMessage, setEndConfirmationMessage] =
    useState(endConfirmationCopy);
  const progressRef = useRef(0);
  const permissionRequestRef = useRef(0);
  const matcherRef = useRef<ReturnType<
    typeof createStatefulRouteMatcher
  > | null>(null);
  const samplesRef = useRef<
    Array<{
      coordinate: Coordinate;
      timestamp: string;
      accuracyMeters?: number;
    }>
  >([]);
  const matchHistoryRef = useRef<PositionMatch[]>([]);
  const pausedRef = useRef(false);
  const [watchAttempt, setWatchAttempt] = useState(0);
  const routeStateKey = `${route?.id ?? "none"}:${routeRecord?.revision ?? 0}:${recordingOnly ? "recording-only" : "route"}`;
  const lastRouteStateKey = useRef(routeStateKey);

  useEffect(() => {
    if (activeSnapshot) return;
    if (lastRouteStateKey.current !== routeStateKey) {
      lastRouteStateKey.current = routeStateKey;
      permissionRequestRef.current += 1;
      setEndedSnapshot(null);
      setCompletionDraft(null);
      setState(route || recordingOnly ? "ready" : "no-route");
      pausedRef.current = false;
      setIsPaused(false);
      setPosition({ progress: 0, isPaused: false, canPause: false });
      setSegmentIndex(-1);
      progressRef.current = 0;
      matcherRef.current = null;
      samplesRef.current = [];
      matchHistoryRef.current = [];
      return;
    }
    if (
      state === "ended" ||
      state === "completed-draft" ||
      state === "save-failed" ||
      state === "saved" ||
      state === "discarded" ||
      state === "exported" ||
      state === "explanation" ||
      state === "requesting" ||
      state === "denied" ||
      state === "unavailable" ||
      state === "permission-explanation" ||
      state === "permission-denied" ||
      state === "ending"
    )
      return;
    setState(route || recordingOnly ? "ready" : "no-route");
    pausedRef.current = false;
    setIsPaused(false);
    setPosition({ progress: 0, isPaused: false, canPause: false });
    setSegmentIndex(-1);
    progressRef.current = 0;
    matcherRef.current = null;
    samplesRef.current = [];
    matchHistoryRef.current = [];
  }, [routeStateKey, route, recordingOnly, state, activeSnapshot]);

  const activePlan = useMemo(
    () =>
      activeSnapshot && "route" in activeSnapshot
        ? routePlanFromRecord(activeSnapshot.route)
        : null,
    [activeSnapshot],
  );

  useEffect(() => {
    let cancelled = false;
    void Location.getForegroundPermissionsAsync()
      .then((result) => {
        if (cancelled) return;
        setPermission(
          result.status === "granted"
            ? "granted"
            : result.status === "denied"
              ? "denied"
              : "undetermined",
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "active" || !activeSnapshot) return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    const reportFailure = (error: unknown) => {
      if (cancelled) return;
      const failure = classifyLocationFailure(error, Platform.OS);
      setPermission(failure);
      setState(
        transitionLiveRideState(
          "active",
          failure === "denied" ? "permission-denied" : "location-unavailable",
        ),
      );
      setPermissionMessage(
        failure === "denied"
          ? locationDeniedMessage
          : locationUnavailableMessage,
      );
      setStatusMessage(
        failure === "denied"
          ? permissionDeniedRecoveryMessage
          : locationUpdatesStoppedMessage,
      );
    };
    if (Platform.OS === "web" && !isBrowserLocationAvailable()) {
      reportFailure(undefined);
      return () => {
        cancelled = true;
      };
    }
    matcherRef.current = activePlan
      ? createStatefulRouteMatcher(activePlan)
      : null;
    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15_000,
        distanceInterval: 25,
      },
      (location) => {
        if (cancelled) return;
        const coordinate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        const timestamp = new Date(
          location.timestamp ?? Date.now(),
        ).toISOString();
        const accuracyLabel = Number.isFinite(location.coords.accuracy)
          ? formatAccuracy(location.coords.accuracy ?? 0)
          : undefined;
        if (pausedRef.current) {
          setPosition((current) => ({
            ...current,
            coordinate,
            lastFixAt: timestamp,
            lastFixLabel: formatTime(timestamp),
            ...(accuracyLabel ? { accuracyLabel } : {}),
            isPaused: true,
            canPause: true,
          }));
          return;
        }
        const match =
          matcherRef.current?.update(coordinate, {
            accuracyMeters: location.coords.accuracy ?? undefined,
            headingDegrees: location.coords.heading ?? undefined,
            timestamp,
            referenceAt: new Date().toISOString(),
          }) ?? undefined;
        const nextProgress = match?.progress ?? progressRef.current;
        progressRef.current = nextProgress;
        if (match) matchHistoryRef.current.push(match);
        samplesRef.current.push({
          coordinate,
          timestamp,
          ...(Number.isFinite(location.coords.accuracy)
            ? { accuracyMeters: location.coords.accuracy ?? undefined }
            : {}),
        });
        const remainingKm = activePlan
          ? Math.max(0, activePlan.distanceKm * (1 - nextProgress))
          : 0;
        const etaMinutes = activePlan
          ? Math.round((activePlan.durationMinutes || 1) * (1 - nextProgress))
          : 0;
        const nextPosition = {
          coordinate,
          progress: nextProgress,
          ...(activePlan
            ? { remainingLabel: formatDistance(remainingKm) }
            : {}),
          ...(activePlan
            ? {
                etaLabel: formatTime(
                  new Date(Date.now() + etaMinutes * 60_000).toISOString(),
                ),
              }
            : {}),
          accuracyLabel,
          lastFixAt: timestamp,
          lastFixLabel: formatTime(timestamp),
          isPaused: false,
          canPause: true,
          offRouteLabel:
            match && match.offCorridorKm > 0.25
              ? formatDistance(match.offCorridorKm)
              : undefined,
          ...(match ? { match } : {}),
        };
        setPosition(nextPosition);
        setSegmentIndex(
          activePlan && match?.state === "matched"
            ? segmentIndexForProgress(activePlan, nextProgress)
            : -1,
        );
        onPosition?.(coordinate);
        setStatusMessage(
          match
            ? `${matchStateLabel(match.state)}. Location updates are limited to this ride.`
            : recordingOnly
              ? recordingActiveMessage
              : liveActiveMessage,
        );
      },
      reportFailure,
    )
      .then((next) => {
        if (cancelled) next.remove();
        else subscription = next;
      })
      .catch(reportFailure);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [
    activePlan,
    activeSnapshot,
    formatDistance,
    formatTime,
    formatAccuracy,
    onPosition,
    liveActiveMessage,
    permissionDeniedRecoveryMessage,
    recordingActiveMessage,
    recordingOnly,
    locationUpdatesStoppedMessage,
    locationDeniedMessage,
    locationUnavailableMessage,
    watchAttempt,
    state,
  ]);

  const prepareStart = () => {
    if (recordingOnly) {
      setState(transitionLiveRideState("ready", "explain"));
      setPermissionMessage(permissionRecordMessage);
      return;
    }
    if (!route || !routeRecord) {
      setState("no-route");
      return;
    }
    const gate = liveRidePolicyGate(routeRecord, policy);
    if (!gate.allowed) {
      setState("ready");
      setPermissionMessage(routeNotReadyMessage);
      setStatusMessage(
        gate.reason === "geometry_not_road_matched"
          ? roadMatchedRequiredMessage
          : routeNotReadyMessage,
      );
      return;
    }
    setState(transitionLiveRideState("ready", "explain"));
    setPermissionMessage(permissionStartMessage);
  };

  const requestPermissionAndStart = () => {
    if (activeSnapshot) {
      if (permission === "granted") setState("active");
      else retryPermission();
      return;
    }
    if (!recordingOnly && (!route || !routeRecord)) {
      setState("no-route");
      return;
    }
    if (!recordingOnly) {
      const gate = liveRidePolicyGate(routeRecord!, policy);
      if (!gate.allowed) {
        setState("ready");
        setPermissionMessage(
          gate.reason === "geometry_not_road_matched"
            ? roadMatchedRequiredMessage
            : routeNotReadyMessage,
        );
        return;
      }
    }
    const requestId = ++permissionRequestRef.current;
    setState(transitionLiveRideState("explanation", "request"));
    void (async () => {
      try {
        if (Platform.OS === "web" && !isBrowserLocationAvailable()) {
          setPermission("unavailable");
          setState(transitionLiveRideState("requesting", "location-unavailable"));
          setPermissionMessage(locationUnavailableMessage);
          return;
        }
        const result = await Location.requestForegroundPermissionsAsync();
        if (requestId !== permissionRequestRef.current) return;
        if (result.status !== "granted") {
          setPermission("denied");
          setState(transitionLiveRideState("requesting", "permission-denied"));
          setPermissionMessage(locationDeniedMessage);
          return;
        }
        setPermission("granted");
        if (!(await locationServicesAvailable())) {
          if (requestId !== permissionRequestRef.current) return;
          setPermission("unavailable");
          setState(transitionLiveRideState("requesting", "location-unavailable"));
          setPermissionMessage(locationUnavailableMessage);
          return;
        }
        if (recordingOnly) {
          const recordingSnapshot = createRecordingOnlySnapshot(new Date());
          setActiveSnapshot(recordingSnapshot);
          setEndedSnapshot(null);
          setCompletionDraft(null);
          samplesRef.current = [];
          matchHistoryRef.current = [];
          progressRef.current = 0;
          pausedRef.current = false;
          setIsPaused(false);
          setPosition({ progress: 0, isPaused: false, canPause: true });
          setState(transitionLiveRideState("requesting", "permission-granted"));
          setStatusMessage(recordingStartedMessage);
          return;
        }
        const started = startActiveRide(routeRecord!, new Date(), policy, {
          analysisKey,
        });
        if (!started.ok) {
          setState("ready");
          setPermissionMessage(
            started.gate.reason === "route_not_ready"
              ? routeNotReadyMessage
              : started.gate.reason === "geometry_not_road_matched"
                ? roadMatchedRequiredMessage
                : roadEvidenceReviewMessage,
          );
          return;
        }
        setActiveSnapshot(started.snapshot);
        setEndedSnapshot(null);
        setCompletionDraft(null);
        samplesRef.current = [];
        matchHistoryRef.current = [];
        matcherRef.current = createStatefulRouteMatcher(
          routePlanFromRecord(started.snapshot.route),
        );
        progressRef.current = 0;
        pausedRef.current = false;
        setIsPaused(false);
        setPosition({ progress: 0, isPaused: false, canPause: true });
        setState(transitionLiveRideState("requesting", "permission-granted"));
        setStatusMessage(liveStartedMessage);
      } catch (error) {
        if (requestId !== permissionRequestRef.current) return;
        const failure = classifyLocationFailure(error, Platform.OS);
        setPermission(failure);
        setState(
          transitionLiveRideState(
            "requesting",
            failure === "denied" ? "permission-denied" : "location-unavailable",
          ),
        );
        setPermissionMessage(
          failure === "denied"
            ? locationDeniedMessage
            : locationUnavailableMessage,
        );
      }
    })();
  };

  const cancelPermission = () => {
    permissionRequestRef.current += 1;
    if (activeSnapshot) {
      setState(permission === "denied" ? "denied" : "unavailable");
      return;
    }
    setState(route || recordingOnly ? "ready" : "no-route");
  };
  const retryPermission = () => {
    if (activeSnapshot) {
      const requestId = ++permissionRequestRef.current;
      void (async () => {
        try {
          if (Platform.OS === "web" && !isBrowserLocationAvailable()) {
            setPermission("unavailable");
            setState("unavailable");
            setPermissionMessage(locationUnavailableMessage);
            return;
          }
          const result = await Location.getForegroundPermissionsAsync();
          if (requestId !== permissionRequestRef.current) return;
          if (result.status !== "granted") {
            setPermission("denied");
            setState("denied");
            setPermissionMessage(locationDeniedMessage);
            return;
          }
          if (!(await locationServicesAvailable())) {
            if (requestId !== permissionRequestRef.current) return;
            setPermission("unavailable");
            setState("unavailable");
            setPermissionMessage(locationUnavailableMessage);
            return;
          }
          setPermission("granted");
          setState("active");
          setWatchAttempt((attempt) => attempt + 1);
          setStatusMessage(
            recordingOnly ? recordingActiveMessage : liveActiveMessage,
          );
        } catch (error) {
          if (requestId !== permissionRequestRef.current) return;
          const failure = classifyLocationFailure(error, Platform.OS);
          setPermission(failure);
          setState(failure === "denied" ? "denied" : "unavailable");
          setPermissionMessage(
            failure === "denied"
              ? locationDeniedMessage
              : locationUnavailableMessage,
          );
        }
      })();
      return;
    }
    requestPermissionAndStart();
  };
  const requestEnd = () => {
    if (
      activeSnapshot &&
      (state === "active" ||
        state === "denied" ||
        state === "unavailable" ||
        state === "permission-denied")
    ) {
      setState(transitionLiveRideState(state, "end-requested"));
      setEndConfirmationMessage(
        recordingOnly ? recordingOnlyEndConfirmationCopy : endConfirmationCopy,
      );
    }
  };
  const cancelEnd = () => {
    if (activeSnapshot)
      setState(
        permission === "denied"
          ? "denied"
          : permission === "unavailable"
            ? "unavailable"
            : "active",
      );
  };
  const confirmEnd = () => {
    if (!activeSnapshot) {
      setState(
        completionDraft ? completionStateForDraft(completionDraft) : "ended",
      );
      return;
    }
    const endedAt = new Date().toISOString();
    const endedSnapshot =
      "route" in activeSnapshot
        ? endActiveRide(activeSnapshot, endedAt).snapshot
        : activeSnapshot;
    const draft =
      "route" in activeSnapshot
        ? createCompletionDraft(activeSnapshot, {
            endedAt,
            samples: samplesRef.current,
            matchHistory: matchHistoryRef.current,
            analysisSnapshot: activeSnapshot.route.analysis,
            gaps: countLocationGaps(samplesRef.current),
          })
        : createRecordingOnlyCompletionDraft(activeSnapshot, {
            endedAt,
            samples: samplesRef.current,
            matchHistory: matchHistoryRef.current,
            gaps: countLocationGaps(samplesRef.current),
          });
    setEndedSnapshot(endedSnapshot);
    setCompletionDraft(draft);
    setActiveSnapshot(null);
    pausedRef.current = false;
    setIsPaused(false);
    setPosition((current) => ({
      ...current,
      isPaused: false,
      canPause: false,
      pause: undefined,
      resume: undefined,
    }));
    setState(transitionLiveRideState(state, "completed"));
    setStatusMessage(recordingOnly ? recordingEndedMessage : liveEndedMessage);
  };
  const refreshPermission = async () => {
    try {
      if (Platform.OS === "web" && !isBrowserLocationAvailable()) {
        setPermission("unavailable");
        return;
      }
      const result = await Location.getForegroundPermissionsAsync();
      setPermission(
        result.status === "granted"
          ? "granted"
          : result.status === "denied"
            ? "denied"
            : "undetermined",
      );
    } catch (error) {
      setPermission(classifyLocationFailure(error, Platform.OS));
    }
  };

  const pauseRecording = () => {
    if (!activeSnapshot || state !== "active" || pausedRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    setPosition((current) => ({ ...current, isPaused: true, canPause: true }));
    setStatusMessage(recordingPausedMessage);
  };

  const resumeRecording = () => {
    if (!activeSnapshot || !pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    setPosition((current) => ({ ...current, isPaused: false, canPause: true }));
    setStatusMessage(recordingResumedMessage);
  };

  const retryLocation = () => {
    retryPermission();
  };

  const canPause = Boolean(activeSnapshot && state === "active");
  const sessionPosition = {
    ...position,
    isPaused,
    canPause,
    ...(activePlan ? { activeRoute: activePlan } : {}),
    ...(activeSnapshot ? { retryLocation } : {}),
    ...(canPause ? { pause: pauseRecording } : {}),
    ...(activeSnapshot ? { resume: resumeRecording } : {}),
  };

  return {
    state,
    permission,
    activeSnapshot,
    endedSnapshot,
    completionDraft,
    completionState: completionDraft
      ? completionStateForDraft(completionDraft)
      : null,
    position: sessionPosition,
    segmentIndex,
    isPaused,
    canPause,
    statusMessage,
    permissionMessage,
    endConfirmationMessage,
    prepareStart,
    requestPermissionAndStart,
    cancelPermission,
    retryPermission,
    requestEnd,
    cancelEnd,
    confirmEnd,
    refreshPermission,
    pauseRecording,
    resumeRecording,
    retryLocation,
  };
}

async function locationServicesAvailable() {
  if (Platform.OS === "web") return isBrowserLocationAvailable();
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    // A platform that does not expose a provider-status API can still use the
    // permission result and let the watcher report a later provider failure.
    return true;
  }
}
