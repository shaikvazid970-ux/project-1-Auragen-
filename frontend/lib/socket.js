import { io } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

let socket;

/**
 * Lazily creates a single shared socket connection for the whole app.
 * Used by useFrictionTracker to stream telemetry and receive generated
 * components back from the Code-Gen Agent.
 */
export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
}
