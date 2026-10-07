import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { GameType } from '@cardpal/shared';
import type { RoomInfo, ErrorPayload } from '@cardpal/shared';
import './LobbyScreen.css';

const GAME_TYPE_LABELS: Record<GameType, string> = {
  [GameType.BLACKJACK]: 'Blackjack',
  [GameType.SKIPBO]: 'Skip-Bo',
};

const GAME_TYPES = [GameType.BLACKJACK, GameType.SKIPBO] as const;

export function LobbyScreen() {
  const lobbyRooms = useAppStore((s) => s.lobbyRooms);
  const username = useAppStore((s) => s.username);
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
    <div className="lobby-screen">
      <header className="lobby-header">
        <h1 className="lobby-title">cardpal</h1>
        <span className="lobby-username">{username}</span>
      </header>

      <div className="lobby-content">
        {notice && <p className="lobby-notice">{notice}</p>}
        <div className="lobby-rooms-header">
          <h2 className="lobby-rooms-title">Game Rooms</h2>
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
          <div className="lobby-game-picker">
            <p className="lobby-picker-label">Choose a game:</p>
            <div className="lobby-picker-options">
              {GAME_TYPES.map((gt) => (
                <button
                  key={gt}
                  className="lobby-picker-btn"
                  onClick={() => handlePickGameType(gt)}
                  disabled={isSubmitting}
                >
                  {GAME_TYPE_LABELS[gt]}
                </button>
              ))}
            </div>
            {errorMessage && <p className="lobby-picker-error">{errorMessage}</p>}
          </div>
        )}

        {lobbyRooms.length === 0 ? (
          <p className="lobby-empty">No rooms yet. Create one!</p>
        ) : (
          <ul className="lobby-room-list">
            {lobbyRooms.map((room: RoomInfo) => {
              const isPlaying = room.status === 'playing';
              const isFull = room.playerCount >= room.maxPlayers;
              const canJoin = !isPlaying && !isFull && !isJoining;
              return (
                <li
                  key={room.id}
                  className={`lobby-room-item${canJoin ? ' lobby-room-joinable' : ''}${isPlaying ? ' lobby-room-disabled' : ''}`}
                  onClick={canJoin ? () => handleJoinRoom(room.id) : undefined}
                >
                  <div className="lobby-room-info">
                    <span className="lobby-room-name">{room.name}</span>
                    <span className="lobby-room-type">
                      {GAME_TYPE_LABELS[room.gameType]}
                      {isPlaying && <span className="lobby-room-status"> — In Progress</span>}
                      {isFull && !isPlaying && <span className="lobby-room-status"> — Full</span>}
                    </span>
                  </div>
                  <span className="lobby-room-players">
                    {room.playerCount}/{room.maxPlayers} players
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {!isCreating && errorMessage && (
          <p className="lobby-join-error">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
