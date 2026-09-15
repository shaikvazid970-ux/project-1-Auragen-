import { useEffect, useRef, useCallback, useState } from "react";
import { getSocket } from "../lib/socket";

/**
 * Week 1 - Telemetry Tracker
 * --------------------------
 * Custom React hook implementing the "Friction Engine": tracks cursor
 * velocity, hesitation time, and click-error ("rage click") rate on a
 * given container ref, rolls them into a 0-100 Cognitive Load Score,
 * and streams updates to the backend over WebSockets.
 *
 * Usage:
 *   const containerRef = useRef(null);
 *   const { cognitiveLoadScore, lastEvent } = useFrictionTracker({
 *     containerRef,
 *     formState,
 *     formSchema,
 *     stuckFieldResolver: () => currentFocusedFieldName,
 *   });
 */

const SAMPLE_INTERVAL_MS = 150; // how often we compute + emit a score
const RAGE_CLICK_WINDOW_MS = 800; // clicks within this window near the same spot = rage click
const RAGE_CLICK_RADIUS_PX = 24;
const HESITATION_THRESHOLD_MS = 2500; // idle-over-field time considered "hesitation"

export function useFrictionTracker({
  containerRef,
  formState = {},
  formSchema = {},
  stuckFieldResolver,
  enabled = true,
}) {
  const [cognitiveLoadScore, setCognitiveLoadScore] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  // Rolling telemetry buffers (mutable refs so we don't re-render on every mouse move)
  const positions = useRef([]); // { x, y, t }
  const clicks = useRef([]); // { x, y, t }
  const hesitationStart = useRef(null);
  const lastActivityAt = useRef(Date.now());

  const recordMove = useCallback((e) => {
    const now = performance.now();
    positions.current.push({ x: e.clientX, y: e.clientY, t: now });
    // keep last ~2s of movement only
    const cutoff = now - 2000;
    positions.current = positions.current.filter((p) => p.t >= cutoff);
    lastActivityAt.current = Date.now();
    hesitationStart.current = null;
  }, []);

  const recordClick = useCallback((e) => {
    const now = performance.now();
    clicks.current.push({ x: e.clientX, y: e.clientY, t: now });
    const cutoff = now - RAGE_CLICK_WINDOW_MS * 4;
    clicks.current = clicks.current.filter((c) => c.t >= cutoff);
    lastActivityAt.current = Date.now();
  }, []);

  const recordFocus = useCallback(() => {
    hesitationStart.current = Date.now();
  }, []);

  const recordBlur = useCallback(() => {
    hesitationStart.current = null;
  }, []);

  // --- velocity: avg px/ms over the recent window ---
  function computeVelocityScore() {
    const pts = positions.current;
    if (pts.length < 2) return 0;
    let totalDist = 0;
    let totalTime = 0;
    let directionChanges = 0;
    let lastDx = null,
      lastDy = null;

    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const dt = pts[i].t - pts[i - 1].t || 1;
      totalDist += Math.hypot(dx, dy);
      totalTime += dt;
      if (lastDx !== null) {
        const dot = dx * lastDx + dy * lastDy;
        if (dot < 0) directionChanges++; // erratic back-and-forth movement
      }
      lastDx = dx;
      lastDy = dy;
    }

    const avgVelocity = totalTime > 0 ? totalDist / totalTime : 0; // px/ms
    // Erratic movement = high velocity AND lots of direction reversals
    const erraticness = Math.min(directionChanges / Math.max(pts.length, 1), 1);
    const velocityScore = Math.min(avgVelocity * 8, 60); // cap contribution
    return velocityScore * 0.5 + erraticness * 40;
  }

  // --- rage clicks: N+ clicks within RAGE_CLICK_WINDOW_MS in a tight radius ---
  function computeClickErrorScore() {
    const c = clicks.current;
    if (c.length < 2) return 0;
    let rageGroups = 0;
    for (let i = 0; i < c.length; i++) {
      let clusterSize = 1;
      for (let j = i + 1; j < c.length; j++) {
        const dt = c[j].t - c[i].t;
        const dist = Math.hypot(c[j].x - c[i].x, c[j].y - c[i].y);
        if (dt <= RAGE_CLICK_WINDOW_MS && dist <= RAGE_CLICK_RADIUS_PX) {
          clusterSize++;
        }
      }
      if (clusterSize >= 3) rageGroups++;
    }
    return Math.min(rageGroups * 35, 100);
  }

  // --- hesitation: how long the user has been focused on a field without typing ---
  function computeHesitationScore() {
    if (!hesitationStart.current) return 0;
    const idleMs = Date.now() - hesitationStart.current;
    if (idleMs < HESITATION_THRESHOLD_MS) return 0;
    return Math.min(((idleMs - HESITATION_THRESHOLD_MS) / 4000) * 100, 100);
  }

  function classifyReason(velocity, clickError, hesitation) {
    const max = Math.max(velocity, clickError, hesitation);
    if (max === clickError && clickError > 0) return "rage_click";
    if (max === hesitation && hesitation > 0) return "hesitation";
    if (max === velocity && velocity > 0) return "erratic_cursor";
    return "idle";
  }

  useEffect(() => {
    if (!enabled) return;
    const node = containerRef?.current;
    if (!node) return;

    node.addEventListener("mousemove", recordMove);
    node.addEventListener("click", recordClick);
    node.addEventListener("focusin", recordFocus);
    node.addEventListener("focusout", recordBlur);

    const socket = getSocket();

    const interval = setInterval(() => {
      const velocity = computeVelocityScore();
      const clickError = computeClickErrorScore();
      const hesitation = computeHesitationScore();

      // Weighted blend into a single 0-100 Cognitive Load Score
      const score = Math.round(
        Math.min(velocity * 0.35 + clickError * 0.4 + hesitation * 0.25, 100)
      );

      const reason = classifyReason(velocity, clickError, hesitation);
      const stuckField = stuckFieldResolver ? stuckFieldResolver() : null;

      setCognitiveLoadScore(score);
      const eventPayload = { score, reason, stuckField, timestamp: Date.now() };
      setLastEvent(eventPayload);

      socket.emit("telemetry:update", {
        cognitiveLoadScore: score,
        reason,
        stuckField,
        formState,
        formSchema,
      });
    }, SAMPLE_INTERVAL_MS);

    return () => {
      node.removeEventListener("mousemove", recordMove);
      node.removeEventListener("click", recordClick);
      node.removeEventListener("focusin", recordFocus);
      node.removeEventListener("focusout", recordBlur);
      clearInterval(interval);
    };
  }, [enabled, containerRef, formState, formSchema, stuckFieldResolver, recordMove, recordClick, recordFocus, recordBlur]);

  return { cognitiveLoadScore, lastEvent };
}
