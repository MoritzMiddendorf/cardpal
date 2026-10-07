import { useEffect } from 'react';
import { useAppStore } from './store/index.js';
import { socket } from './socket/client.js';
import { OtpScreen } from './components/screens/OtpScreen.js';
import { UsernameScreen } from './components/screens/UsernameScreen.js';
import { LobbyScreen } from './components/screens/LobbyScreen.js';
import { RoomScreen } from './components/screens/RoomScreen.js';
import { GameScreen } from './components/screens/GameScreen.js';
import { ConnectionOverlay } from './components/ui/ConnectionOverlay.js';
import type { RoomInfo, RoomState, FilteredGameState, ErrorPayload } from '@cardpal/shared';

export function App() {
  const screen = useAppStore((s) => s.screen);
  const pendingSessionId = useAppStore((s) => s.pendingSessionId);

  // Auto-connect returning users with existing session token
  useEffect(() => {
    const token = useAppStore.getState().sessionToken;
    if (token) {
      socket.auth = { token };
      socket.connect();
    }
  }, []);

  // Connect new users after OTP validation
  useEffect(() => {
    if (pendingSessionId && !socket.connected) {
      socket.auth = { pendingSessionId };
      socket.connect();
    }
  }, [pendingSessionId]);

  // Global socket event listeners
  useEffect(() => {
    function onAuthenticated({ token, playerId, username, roomId }: { token: string; playerId: string; username: string; roomId?: string }) {
      const store = useAppStore.getState();
      store.setSessionToken(token);
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

    function resetToOtpScreen(message: string) {
      socket.disconnect(); // stop reconnection attempts with stale auth
      const store = useAppStore.getState();
      store.setSessionToken(null);
      store.setPlayerId(null);
      store.setPendingSessionId(null);
      store.setCurrentRoom(null);
      store.setGameState(null);
      store.setReconnectFailed(false);
      store.setScreen('otp');
      store.setErrorMessage(message);
    }

    function onConnectError(err: Error) {
      if (err.message === 'AUTH_ERROR') {
        resetToOtpScreen('Session expired — please enter a new OTP');
      }
    }

    // The server revokes all sessions when the OTP is rotated or expires
    function onError(err: ErrorPayload) {
      if (err.code === 'AUTH_ERROR' && useAppStore.getState().sessionToken) {
        resetToOtpScreen(err.message);
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
