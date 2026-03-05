import { useEffect } from 'react';
import { useAppStore } from './store/index.js';
import { socket } from './socket/client.js';
import { OtpScreen } from './components/screens/OtpScreen.js';
import { UsernameScreen } from './components/screens/UsernameScreen.js';
import { LobbyScreen } from './components/screens/LobbyScreen.js';
import { RoomScreen } from './components/screens/RoomScreen.js';
import { GameScreen } from './components/screens/GameScreen.js';
import { ConnectionOverlay } from './components/ui/ConnectionOverlay.js';
import type { RoomInfo, RoomState, FilteredGameState } from '@cardpal/shared';

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
    function onAuthenticated({ token, username, roomId }: { token: string; username: string; roomId?: string }) {
      const store = useAppStore.getState();
      store.setSessionToken(token);
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

    function onConnectError(err: Error) {
      if (err.message === 'AUTH_ERROR') {
        socket.disconnect(); // stop reconnection attempts with stale auth
        const store = useAppStore.getState();
        store.setSessionToken(null);
        store.setScreen('otp');
        store.setPendingSessionId(null);
        store.setReconnectFailed(false);
        store.setErrorMessage('Session expired — please enter a new OTP');
      }
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

    function onDisconnect() {
      useAppStore.getState().setConnectionStatus('disconnected');
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
    socket.io.on('reconnect_failed', onReconnectFailed);

    return () => {
      socket.off('authenticated', onAuthenticated);
      socket.off('connect_error', onConnectError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('lobbyState', onLobbyState);
      socket.off('roomState', onRoomState);
      socket.off('gameState', onGameState);
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
