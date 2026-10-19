import { useEffect } from 'react';
import { useAppStore } from './store/index.js';
import { socket } from './socket/client.js';
import { OtpScreen } from './components/screens/OtpScreen.js';
import { UsernameScreen } from './components/screens/UsernameScreen.js';
import { LobbyScreen } from './components/screens/LobbyScreen.js';
import { RoomScreen } from './components/screens/RoomScreen.js';
import { GameScreen } from './components/screens/GameScreen.js';
import { ConnectionOverlay } from './components/ui/ConnectionOverlay.js';
import type { Edition, RoomInfo, RoomState, FilteredGameState, ErrorPayload } from '@cardpal/shared';
import { fetchAccess, isEntryPage } from './utils/access.js';
import { startNewSession } from './socket/session.js';

/** First screen for a visitor without a session: OTP form, username, or nothing at all. */
async function showEntryScreen(): Promise<void> {
  const edition = await fetchAccess();
  // The entry page is for entering the OTP, even when the app is public
  if (isEntryPage() && edition !== 'original') useAppStore.getState().setScreen('otp');
  else if (edition) startNewSession();
  else useAppStore.getState().setScreen('blank');
}

export function App() {
  const screen = useAppStore((s) => s.screen);

  // Returning users reconnect with their session token; everyone else gets the entry screen
  useEffect(() => {
    const token = useAppStore.getState().sessionToken;
    if (token) {
      socket.auth = { token };
      socket.connect();
    } else {
      void showEntryScreen();
    }
  }, []);

  // Global socket event listeners
  useEffect(() => {
    function onAuthenticated({ token, playerId, username, edition, roomId }: { token: string; playerId: string; username: string; edition: Edition; roomId?: string }) {
      const store = useAppStore.getState();
      store.setSessionToken(token);
      store.setEdition(edition);
      store.setPlayerId(playerId);
      store.setUsername(username);
      store.setConnectionStatus('connected');
      store.setErrorMessage(null);
      socket.auth = { token };
      // If user was in a room, stay on current screen (room/game state events will follow)
      // Otherwise go to lobby
      if (roomId) {
        if (store.screen !== 'game') {
          store.setScreen('room');
        }
      } else {
        store.setScreen('lobby');
      }
    }

    /**
     * The session (or the access behind it) is gone. Players who still have access start a new
     * session; OTP players whose code was rotated see the OTP form again (they know about it
     * already). Anyone else gets nothing: the private app never shows itself to strangers.
     */
    async function handleAccessLost(message: string) {
      socket.disconnect(); // stop reconnection attempts with stale auth
      const store = useAppStore.getState();
      const wasOtpPlayer = store.edition === 'original';
      store.setSessionToken(null);
      store.setPlayerId(null);
      store.setEdition(null);
      store.setCurrentRoom(null);
      store.setGameState(null);
      store.setReconnectFailed(false);
      store.setScreen('blank');

      const edition = await fetchAccess();
      if ((wasOtpPlayer || isEntryPage()) && edition !== 'original') {
        store.setScreen('otp');
        store.setErrorMessage(message);
      } else if (edition) {
        startNewSession();
      }
    }

    function onConnectError(err: Error) {
      if (err.message === 'AUTH_ERROR') {
        void handleAccessLost('Session expired — please enter a new code');
      }
    }

    // The server revokes all sessions when the OTP is rotated or expires
    function onError(err: ErrorPayload) {
      const { sessionToken, screen } = useAppStore.getState();
      // Also while picking a username: the pending session expired or access was revoked
      if (err.code === 'AUTH_ERROR' && (sessionToken || screen === 'username')) {
        void handleAccessLost(err.message);
      }
    }

    function onKicked({ roomName }: { roomName: string }) {
      const store = useAppStore.getState();
      store.setCurrentRoom(null);
      store.setGameState(null);
      store.setScreen('lobby');
      store.setErrorMessage(`The host removed you from ${roomName}`);
    }

    function onReconnectFailed() {
      const store = useAppStore.getState();
      store.setConnectionStatus('disconnected');
      store.setReconnectFailed(true);
    }

    function onConnect() {
      const store = useAppStore.getState();
      store.setConnectionStatus('connected');
      store.setReconnectFailed(false);
    }

    function onDisconnect(reason: string) {
      useAppStore.getState().setConnectionStatus('disconnected');
      // socket.io does not auto-reconnect after a server-initiated disconnect (e.g. sessions
      // revoked). Reconnect once: a stale session is then rejected with AUTH_ERROR above.
      if (reason === 'io server disconnect' && useAppStore.getState().sessionToken) {
        socket.connect();
      }
    }

    function onLobbyState({ rooms }: { rooms: RoomInfo[] }) {
      useAppStore.getState().setLobbyRooms(rooms);
    }

    function onRoomState(room: RoomState) {
      const store = useAppStore.getState();
      store.setCurrentRoom(room);
      if (store.screen !== 'game') {
        store.setScreen('room');
      }
    }

    function onGameState(state: FilteredGameState | null) {
      const store = useAppStore.getState();
      if (state) {
        store.setGameState(state);
        store.setScreen('game');
      } else {
        store.setGameState(null);
        store.setScreen('room');
      }
    }

    socket.on('authenticated', onAuthenticated);
    socket.on('connect_error', onConnectError);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('lobbyState', onLobbyState);
    socket.on('roomState', onRoomState);
    socket.on('gameState', onGameState);
    socket.on('error', onError);
    socket.on('kicked', onKicked);
    socket.io.on('reconnect_failed', onReconnectFailed);

    return () => {
      socket.off('authenticated', onAuthenticated);
      socket.off('connect_error', onConnectError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobbyState', onLobbyState);
      socket.off('roomState', onRoomState);
      socket.off('gameState', onGameState);
      socket.off('error', onError);
      socket.off('kicked', onKicked);
      socket.io.off('reconnect_failed', onReconnectFailed);
    };
  }, []);

  return (
    <div>
      {screen === 'otp' && <OtpScreen />}
      {screen === 'username' && <UsernameScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'room' && <RoomScreen />}
      {screen === 'game' && <GameScreen />}
      <ConnectionOverlay />
    </div>
  );
}
