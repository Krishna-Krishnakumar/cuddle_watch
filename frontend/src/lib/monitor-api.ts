/**
 * Backend integration layer for Python FastAPI/Flask backend.
 *
 * Expected REST endpoints:
 *   GET  /api/status   -> { motion_thresh: number, audio_status: "ok"|"not ok", flag: 0|1 }
 *   GET  /api/settings -> { motion_buffer: number, audio_threshold: number, notifications: bool }
 *   POST /api/settings -> same shape
 *   POST /api/analyze  -> trigger 5s sounddevice recording, returns { audio_status, flag }
 *
 * Expected WebSocket:
 *   ws://localhost:8000/stream -> MJPEG frames (data:image/jpeg;base64,...) + JSON metrics
 *     { type: "frame", data: "<base64 jpeg>" }
 *     { type: "metrics", motion_thresh: number, audio_status: "ok"|"not ok", flag: 0|1, ts: number }
 */

export const API_BASE =
  (typeof window !== "undefined" && (window as any).__MONITOR_API__) ||
  "http://localhost:8000";
export const WS_URL =
  (typeof window !== "undefined" && (window as any).__MONITOR_WS__) ||
  "ws://localhost:8000/ws/telemetry";

export type AudioStatus = "ok" | "not ok";

export interface StatusPayload {
  motion_thresh: number;
  audio_status: AudioStatus;
  flag: 0 | 1;
  ts?: number;
}

export interface SettingsPayload {
  motion_buffer: number;
  audio_threshold: number;
  notifications: boolean;
}

export async function fetchStatus(): Promise<StatusPayload> {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error("status failed");
  return res.json();
}

export async function postSettings(s: SettingsPayload): Promise<void> {
  await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
}

export async function triggerAnalyze(): Promise<StatusPayload> {
  const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST" });
  if (!res.ok) throw new Error("analyze failed");
  return res.json();
}