import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "./rideRecording";

export type LiveRideSessionState =
  | "no-route"
  | "loading"
  | "ready"
  | "permission-explanation"
  | "permission-denied"
  | "active"
  | "ending"
  | "ended";
export type LiveRidePermission = "granted" | "denied" | "undetermined";

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
  };
  segmentIndex: number;
  completionDraft: ActivityDraft | null;
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
  const [position, setPosition] = useState<LiveRideSession["position"]>({
    progress: 0,
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
  const routeStateKey = `${route?.id ?? "none"}:${routeRecord?.revision ?? 0}:${recordingOnly ? "recording-only" : "route"}`;
  const lastRouteStateKey = useRef(routeStateKey);

  useEffect(() => {
    if (activeSnapshot) return;
    if (lastRouteStateKey.current !== routeStateKey) {
      lastRouteStateKey.current = routeStateKey;
      setEndedSnapshot(null);
      setCompletionDraft(null);
      setState(route || recordingOnly ? "ready" : "no-route");
      setPosition({ progress: 0 });
      setSegmentIndex(-1);
      progressRef.current = 0;
      matcherRef.current = null;
      samplesRef.current = [];
      matchHistoryRef.current = [];
      return;
    }
    if (
      state === "ended" ||
      state === "permission-explanation" ||
      state === "permission-denied" ||
      state === "ending"
    )
      return;
    setState(route || recordingOnly ? "ready" : "no-route");
    setPosition({ progress: 0 });
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
          accuracyLabel: Number.isFinite(location.coords.accuracy)
            ? formatAccuracy(location.coords.accuracy ?? 0)
            : undefined,
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
    )
      .then((next) => {
        if (cancelled) next.remove();
        else subscription = next;
      })
      .catch(() => {
        if (!cancelled) {
          setPermission("denied");
          setState("permission-denied");
          setStatusMessage(
            "Location updates stopped. Your recording is still here; retry access or end the ride to save it.",
          );
        }
      });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [
    activePlan,
    activeSnapshot,
    formatDistance,
    formatTime,
    onPosition,
    liveActiveMessage,
    permissionDeniedRecoveryMessage,
    recordingActiveMessage,
    recordingOnly,
    state,
  ]);

  const prepareStart = () => {
    if (recordingOnly) {
      setState("permission-explanation");
      setPermissionMessage(permissionRecordMessage);
      return;
    }
    if (!route || !routeRecord) {
      setState("no-route");
      return;
    }
    const gate = liveRidePolicyGate(routeRecord, policy);
    if (!gate.allowed && gate.decision === "blocked") {
      setState("permission-denied");
      setPermissionMessage(routeNotReadyMessage);
      return;
    }
    setState("permission-explanation");
    setPermissionMessage(permissionStartMessage);
  };

  const requestPermissionAndStart = () => {
    if (activeSnapshot) {
      setState("active");
      return;
    }
    if (!recordingOnly && (!route || !routeRecord)) {
      setState("no-route");
      return;
    }
    const requestId = ++permissionRequestRef.current;
    setState("loading");
    void Location.requestForegroundPermissionsAsync()
      .then((result) => {
        if (requestId !== permissionRequestRef.current) return;
        const nextPermission =
          result.status === "granted"
            ? "granted"
            : result.status === "denied"
              ? "denied"
              : "undetermined";
        setPermission(nextPermission);
        if (nextPermission !== "granted") {
          setState("permission-denied");
          setPermissionMessage(permissionDeniedRecoveryMessage);
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
          setPosition({ progress: 0 });
          setState("active");
          setStatusMessage(recordingStartedMessage);
          return;
        }
        const started = startActiveRide(routeRecord!, new Date(), policy, {
          analysisKey,
        });
        if (!started.ok) {
          setState("permission-denied");
          setPermissionMessage(
            started.gate.decision === "decision_required"
              ? roadEvidenceReviewMessage
              : roadMatchedRequiredMessage,
          );
          return;
        }
        setActiveSnapshot(started.snapshot);
        setEndedSnapshot(null);
        setCompletionDraft(null);
        samplesRef.current = [];
        matchHistoryRef.current = [];
        matcherRef.current = createStatefulRouteMatcher(route!);
        progressRef.current = 0;
        setPosition({ progress: 0 });
        setState("active");
        setStatusMessage(liveStartedMessage);
      })
      .catch(() => {
        if (requestId !== permissionRequestRef.current) return;
        setPermission("denied");
        setState("permission-denied");
        setPermissionMessage(permissionDeniedRecoveryMessage);
      });
  };

  const cancelPermission = () => {
    permissionRequestRef.current += 1;
    setState(route || recordingOnly ? "ready" : "no-route");
  };
  const retryPermission = () => {
    if (activeSnapshot) {
      void Location.getForegroundPermissionsAsync()
        .then((result) => {
          const nextPermission =
            result.status === "granted"
              ? "granted"
              : result.status === "denied"
                ? "denied"
                : "undetermined";
          setPermission(nextPermission);
          if (nextPermission === "granted") {
            setState("active");
            setStatusMessage(
              recordingOnly ? recordingActiveMessage : liveActiveMessage,
            );
          } else {
            setState("permission-denied");
            setPermissionMessage(permissionDeniedRecoveryMessage);
          }
        })
        .catch(() => {
          setPermission("undetermined");
          setState("permission-denied");
        });
      return;
    }
    prepareStart();
  };
  const requestEnd = () => {
    if (state === "active" || (state === "permission-denied" && activeSnapshot)) {
      setState("ending");
      setEndConfirmationMessage(
        recordingOnly ? recordingOnlyEndConfirmationCopy : endConfirmationCopy,
      );
    }
  };
  const cancelEnd = () => {
    if (activeSnapshot)
      setState(permission === "denied" ? "permission-denied" : "active");
  };
  const confirmEnd = () => {
    if (!activeSnapshot) {
      setState("ended");
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
    setState("ended");
    setStatusMessage(recordingOnly ? recordingEndedMessage : liveEndedMessage);
  };
  const refreshPermission = async () => {
    try {
      const result = await Location.getForegroundPermissionsAsync();
      setPermission(
        result.status === "granted"
          ? "granted"
          : result.status === "denied"
            ? "denied"
            : "undetermined",
      );
    } catch {
      setPermission("undetermined");
    }
  };

  return {
    state,
    permission,
    activeSnapshot,
    endedSnapshot,
    completionDraft,
    position,
    segmentIndex,
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
  };
}
