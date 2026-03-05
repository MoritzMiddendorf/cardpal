import { useState } from 'react';
import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { GameType } from '@cardpal/shared';
import type { PlayerInfo } from '@cardpal/shared';
import './RoomScreen.css';

const GAME_TYPE_LABELS: Record<GameType, string> = {
  [GameType.BLACKJACK]: 'Blackjack',
  [GameType.SKIPBO]: 'Skip-Bo',
};

const GAME_MIN_PLAYERS: Record<GameType, number> = {
  [GameType.BLACKJACK]: 2,
  [GameType.SKIPBO]: 2,
};

const GAME_MAX_PLAYERS: Record<GameType, number> = {
  [GameType.BLACKJACK]: 4,
  [GameType.SKIPBO]: 6,
};

export function RoomScreen() {
  const currentRoom = useAppStore((s) => s.currentRoom);
  const sessionToken = useAppStore((s) => s.sessionToken);
  const [isLeaving, setIsLeaving] = useState(false);

  if (!currentRoom) return null;

  const isOwner = currentRoom.ownerId === sessionToken;
  const ownerPlayer = currentRoom.players.find((p: PlayerInfo) => p.isOwner);
  const minPlayers = GAME_MIN_PLAYERS[currentRoom.gameType];
  const maxPlayers = GAME_MAX_PLAYERS[currentRoom.gameType];
  const playerCount = currentRoom.players.length;
  const isValidCount = playerCount >= minPlayers && playerCount <= maxPlayers;

  function handleLeaveRoom() {
    setIsLeaving(true);
    socket.emit('leaveRoom');
    const store = useAppStore.getState();
    store.setCurrentRoom(null);
    store.setScreen('lobby');
  }

  function handleChangeGameType(gameType: GameType) {
    socket.emit('changeGameType', { gameType });
  }

  function handleStartGame() {
    socket.emit('startGame');
  }

  return (
    <div className="room-screen">
      <header className="room-header">
        <div className="room-header-info">
          <h1 className="room-name">{currentRoom.name}</h1>
          {isOwner && currentRoom.status === 'lobby' ? (
            <select
              className="room-game-selector"
              value={currentRoom.gameType}
              onChange={(e) => handleChangeGameType(e.target.value as GameType)}
            >
              {Object.values(GameType).map((gt) => (
                <option key={gt} value={gt}>{GAME_TYPE_LABELS[gt]}</option>
              ))}
            </select>
          ) : (
            <span className="room-game-type">{GAME_TYPE_LABELS[currentRoom.gameType]}</span>
          )}
        </div>
        <span className={`room-player-count ${isValidCount ? 'room-player-count-valid' : 'room-player-count-invalid'}`}>
          {playerCount}/{minPlayers}-{maxPlayers} players
        </span>
      </header>

      <div className="room-content">
        <ul className="room-player-list">
          {currentRoom.players.map((player: PlayerInfo) => (
            <li key={player.id} className="room-player-item">
              <div className="room-player-info">
                <span
                  className={`room-player-dot${player.isConnected ? ' room-player-dot-connected' : ''}`}
                  title={player.isConnected ? 'Connected' : 'Disconnected'}
                />
                <span className="room-player-name">{player.username}</span>
                {player.isOwner && <span className="room-player-owner">Host</span>}
              </div>
            </li>
          ))}
        </ul>

        <div className="room-actions">
          {isOwner ? (
            <button
              className="room-start-btn"
              disabled={!isValidCount}
              title={isValidCount ? 'Start the game' : `Need ${minPlayers}-${maxPlayers} players`}
              onClick={handleStartGame}
            >
              Start Game
            </button>
          ) : (
            <p className="room-waiting">
              Waiting for {ownerPlayer?.username ?? 'host'} to start...
            </p>
          )}
          <button className="room-leave-btn" onClick={handleLeaveRoom} disabled={isLeaving}>
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}
