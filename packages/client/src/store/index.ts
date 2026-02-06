import { create } from 'zustand';
import type { RoomInfo, RoomState, FilteredGameState } from '@cardpal/shared';

type Screen = 'otp' | 'username' | 'lobby' | 'room' | 'game';

interface AppState {
  // Auth
  sessionToken: string | null;
  username: string | null;

  // Connection
  connectionStatus: 'connecting' | 'connected' | 'disconnected';

  // UI State
  screen: Screen;

  // Server-pushed state
  lobbyRooms: RoomInfo[];
  currentRoom: RoomState | null;
  gameState: FilteredGameState | null;

  // Error
  error: string | null;

  // Actions
  setSessionToken: (token: string | null) => void;
  setUsername: (username: string | null) => void;
  setConnectionStatus: (status: AppState['connectionStatus']) => void;
  setScreen: (screen: Screen) => void;
  setLobbyRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (room: RoomState | null) => void;
  setGameState: (state: FilteredGameState | null) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessionToken: localStorage.getItem('cardpal_token'),
  username: null,
  connectionStatus: 'disconnected',
  screen: 'otp',
  lobbyRooms: [],
  currentRoom: null,
  gameState: null,
  error: null,

  setSessionToken: (token) => {
    if (token) {
      localStorage.setItem('cardpal_token', token);
    } else {
      localStorage.removeItem('cardpal_token');
    }
    set({ sessionToken: token });
  },
  setUsername: (username) => set({ username }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setScreen: (screen) => set({ screen }),
  setLobbyRooms: (lobbyRooms) => set({ lobbyRooms }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setGameState: (gameState) => set({ gameState }),
  setError: (error) => set({ error }),
}));
