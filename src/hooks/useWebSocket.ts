import { useEffect, useRef, useCallback, useState } from "react";
import { bootstrapSession } from "../api";
import type { WSEvent, WSEventType } from "../types";

type Listener = (payload: unknown) => void;

// Exponential backoff: 2s → 4s → 8s → 16s → 30s (max)
const BACKOFF_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000];

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<WSEventType, Set<Listener>>>(new Map());
  const [connected, setConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws`;
    let alive = true;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let forceSessionBootstrap = false;
    let attemptCount = 0;

    // ── Event micro-batching ──────────────────────────────────────────────────
    // Queue all incoming WS events and flush them together in a single
    // setTimeout(0) callback so React can batch the resulting setState calls.
    const eventQueue: WSEvent[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    function flushEventQueue() {
      flushTimer = null;
      const evts = eventQueue.splice(0);
      for (const evt of evts) {
        const listeners = listenersRef.current.get(evt.type);
        if (listeners) {
          for (const fn of listeners) fn(evt.payload);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    function nextDelay(): number {
      const delay = BACKOFF_DELAYS_MS[Math.min(attemptCount, BACKOFF_DELAYS_MS.length - 1)];
      attemptCount = Math.min(attemptCount + 1, BACKOFF_DELAYS_MS.length - 1);
      return delay;
    }

    async function connect() {
      if (!alive) return;
      const forceBootstrap = forceSessionBootstrap;
      try {
        const bootstrapped = await bootstrapSession({
          promptOnUnauthorized: false,
          force: forceBootstrap,
        });
        if (!bootstrapped) {
          reconnectTimer = setTimeout(() => void connect(), nextDelay());
          return;
        }
        forceSessionBootstrap = false;
      } catch {
        // Avoid force bootstrap busy-loop when unauthorized recovery itself fails.
        if (forceBootstrap) forceSessionBootstrap = false;
        reconnectTimer = setTimeout(() => void connect(), nextDelay());
        return;
      }

      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!alive) return;
        setConnected(true);
        setReconnectAttempt(0);
        attemptCount = 0; // reset backoff on successful connection
      };
      ws.onclose = (event) => {
        if (!alive) return;
        setConnected(false);
        if (event.code === 1008) forceSessionBootstrap = true;
        const delay = nextDelay();
        setReconnectAttempt(attemptCount);
        reconnectTimer = setTimeout(() => void connect(), delay);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        if (!alive) return;
        try {
          const evt: WSEvent = JSON.parse(e.data as string);
          eventQueue.push(evt);
          // Flush on next macrotask — React 19 batches all setState inside it
          if (!flushTimer) {
            flushTimer = setTimeout(flushEventQueue, 0);
          }
        } catch {
          // ignore malformed frames
        }
      };
    }

    void connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      if (flushTimer) clearTimeout(flushTimer);
      ws?.close();
    };
  }, []);

  const on = useCallback((type: WSEventType, fn: Listener) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(fn);
    return () => {
      listenersRef.current.get(type)?.delete(fn);
    };
  }, []);

  return { connected, reconnectAttempt, on };
}
