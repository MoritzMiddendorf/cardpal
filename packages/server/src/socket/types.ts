import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@cardpal/shared';
import type { UserSession } from '../state/sessions.js';

export interface SocketData {
  authType?: 'token' | 'pending';
  session?: UserSession;
  pendingSessionId?: string;
}

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
