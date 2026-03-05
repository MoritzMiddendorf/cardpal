import { create } from 'zustand';
import type { RoomInfo, RoomState, FilteredGameState } from '@cardpal/shared';

type Screen = 'otp' | 'username' | 'lobby' | 'room' | 'game';

interface AppState {
  // Auth
  sessionToken: string | null;
  pendingSessionId: string | null;
  username: string | null;

  // Connection
  connectionStatus: 'connecting' | 'connected' | 'disconnected';

  // UI State
  screen: Screen;

  // Server-pushed state
  lobbyRooms: RoomInfo[];
  currentRoom: RoomState | null;
  gameState: FilteredGameState | null;
  previousGameState: FilteredGameState | null;

  // Error
  error: string | null;
  errorMessage: string | null;
  reconnectFailed: boolean;

  // Actions
  setSessionToken: (token: string | null) => void;
  setPendingSessionId: (id: string | null) => void;
  setUsername: (username: string | null) => void;
  setConnectionStatus: (status: AppState['connectionStatus']) => void;
  setScreen: (screen: Screen) => void;
  setLobbyRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (room: RoomState | null) => void;
  setGameState: (state: FilteredGameState | null) => void;
  setError: (error: string | null) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  setReconnectFailed: (failed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessionToken: localStorage.getItem('cardpal_token'),
  pendingSessionId: null,
  username: null,
  connectionStatus: 'disconnected',
  screen: 'otp',
  lobbyRooms: [],
  currentRoom: null,
  gameState: null,
  previousGameState: null,
  error: null,
  errorMessage: null,
  reconnectFailed: false,

  setSessionToken: (token) => {
    if (token) {
      localStorage.setItem('cardpal_token', token);
    } else {
      localStorage.removeItem('cardpal_token');
    }
    set({ sessionToken: token });
  },
  setPendingSessionId: (pendingSessionId) => set({ pendingSessionId }),
  setUsername: (username) => set({ username }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setScreen: (screen) => set({ screen }),
  setLobbyRooms: (lobbyRooms) => set({ lobbyRooms }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setGameState: (gameState) => set((state) => ({ previousGameState: state.gameState, gameState })),
  setError: (error) => set({ error }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setReconnectFailed: (reconnectFailed) => set({ reconnectFailed }),
}));
