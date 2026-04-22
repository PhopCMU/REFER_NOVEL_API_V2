import Elysia from "elysia";
import type { ServerWebSocket } from "bun";

// ── Connected client registry ──────────────────────────────────────────────
const clients = new Set<ServerWebSocket<unknown>>();

// ── Broadcast helpers ──────────────────────────────────────────────────────

export type StatusUpdatePayload = {
  caseId: string;
  referenceNo?: string;
  oldStatus?: string;
  newStatus?: string;
  note?: string;
};

/**
 * Broadcast an `update-status` event to all connected WebSocket clients.
 * Call this after a successful status transition in referralCasesUpdateStatus.
 */
export const broadcastStatusUpdate = (
  event: string,
  payload: StatusUpdatePayload,
): void => {
  if (clients.size === 0) return;

  const message = JSON.stringify({ event, data: payload });
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      // Client may have disconnected between the size check and send — ignore
      clients.delete(client);
    }
  }
};

// ── Elysia WebSocket plugin ────────────────────────────────────────────────

export const websocketPlugin = new Elysia({ name: "websocket" }).ws("/ws", {
  open(ws: any) {
    clients.add(ws.raw);
  },
  close(ws: any) {
    clients.delete(ws.raw);
  },
  message(ws: any, message: any) {
    // Simple ping/pong keepalive
    if (message === "ping") ws.send("pong");
  },
});
