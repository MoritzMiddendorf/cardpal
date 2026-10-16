import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { GameType } from '@cardpal/shared';
import type { RoomInfo, ErrorPayload } from '@cardpal/shared';
import { TopBar } from '../ui/TopBar.js';
import './LobbyScreen.css';

const GAME_TYPE_LABELS: Record<GameType, string> = {
  [GameType.BLACKJACK]: 'Blackjack',
  [GameType.SKIPBO]: 'Skip-Bo',
};

const GAME_TYPE_DESCRIPTIONS: Record<GameType, string> = {
  [GameType.BLACKJACK]: '2–4 players · beat the dealer to 21',
  [GameType.SKIPBO]: '2–6 players · empty your stock pile first',
};

const GAME_TYPES = [GameType.BLACKJACK, GameType.SKIPBO] as const;

export function LobbyScreen() {
  const lobbyRooms = useAppStore((s) => s.lobbyRooms);
  const notice = useAppStore((s) => s.errorMessage);

  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    function onError(err: ErrorPayload) {
      if (['VALIDATION_ERROR', 'AUTH_ERROR', 'ROOM_FULL', 'ROOM_NOT_FOUND', 'GAME_IN_PROGRESS'].includes(err.code)) {
        setErrorMessage(err.message);
        setIsSubmitting(false);
        setIsJoining(false);
      }
    }

    socket.on('error', onError);
    return () => { socket.off('error', onError); };
  }, []);

  function dismissNotice() {
    if (useAppStore.getState().errorMessage) useAppStore.getState().setErrorMessage(null);
  }

  function handleCreateClick() {
    dismissNotice();
    setIsCreating(true);
    setErrorMessage(null);
  }

  function handleCancel() {
    setIsCreating(false);
    setErrorMessage(null);
  }

  function handlePickGameType(gameType: GameType) {
    setIsSubmitting(true);
    setErrorMessage(null);
    socket.emit('createRoom', { gameType });
    // roomState listener in App.tsx handles the screen transition on success
  }

  function handleJoinRoom(roomId: string) {
    dismissNotice();
    setIsJoining(true);
    setErrorMessage(null);
    socket.emit('joinRoom', { roomId });
    // roomState listener in App.tsx handles the screen transition on success
  }

  return (
    <div className="lobby-screen app-page">
      <TopBar context="Lobby" />

      <main className="app-main lobby-content">
        {notice && <p className="lobby-notice">{notice}</p>}
        <div className="lobby-rooms-header">
          <div>
            <h1 className="lobby-rooms-title">Game Rooms</h1>
            <p className="lobby-rooms-subtitle">Join an open table or start your own.</p>
          </div>
          {!isCreating ? (
            <button className="lobby-create-btn" onClick={handleCreateClick}>
              Create Room
            </button>
          ) : (
            <button className="lobby-cancel-btn" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </button>
          )}
        </div>

        {isCreating && (
          <div className="lobby-game-picker app-panel">
            <p className="app-panel-title">Choose a game</p>
            <div className="lobby-picker-options">
              {GAME_TYPES.map((gt) => (
                <button
                  key={gt}
                  className="lobby-picker-btn"
                  onClick={() => handlePickGameType(gt)}
                  disabled={isSubmitting}
                >
                  <span className="lobby-picker-name">{GAME_TYPE_LABELS[gt]}</span>
                  <span className="lobby-picker-desc">{GAME_TYPE_DESCRIPTIONS[gt]}</span>
                </button>
              ))}
            </div>
            {errorMessage && <p className="lobby-picker-error">{errorMessage}</p>}
          </div>
        )}

        {lobbyRooms.length === 0 ? (
          <div className="lobby-empty">
            <p className="lobby-empty-title">No rooms yet</p>
            <p className="lobby-empty-text">Create one and your friends will see it here.</p>
          </div>
        ) : (
          <ul className="lobby-room-list">
            {lobbyRooms.map((room: RoomInfo) => {
              const isPlaying = room.status === 'playing';
              const isFull = room.playerCount >= room.maxPlayers;
              const canJoin = !isPlaying && !isFull && !isJoining;
              const statusLabel = isPlaying ? 'In progress' : isFull ? 'Full' : 'Open';
              return (
                <li
                  key={room.id}
                  className={`lobby-room-item${canJoin ? ' lobby-room-joinable' : ''}${isPlaying || isFull ? ' lobby-room-disabled' : ''}`}
                  onClick={canJoin ? () => handleJoinRoom(room.id) : undefined}
                >
                  <div className="lobby-room-top">
                    <span className="lobby-room-type">{GAME_TYPE_LABELS[room.gameType]}</span>
                    <span className={`lobby-room-status lobby-room-status-${isPlaying ? 'playing' : isFull ? 'full' : 'open'}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <span className="lobby-room-name">{room.name}</span>
                  <div className="lobby-room-bottom">
                    <span className="lobby-room-players">
                      {room.playerCount}/{room.maxPlayers} players
                    </span>
                    {canJoin && <span className="lobby-room-join">Join →</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!isCreating && errorMessage && (
          <p className="lobby-join-error">{errorMessage}</p>
        )}
      </main>
    </div>
  );
}
