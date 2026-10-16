import { useState } from 'react';
import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { GameType } from '@cardpal/shared';
import type { PlayerInfo } from '@cardpal/shared';
import { TopBar } from '../ui/TopBar.js';
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
  const playerId = useAppStore((s) => s.playerId);
  const [isLeaving, setIsLeaving] = useState(false);

  if (!currentRoom) return null;

  const isOwner = currentRoom.ownerId === playerId;
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

  function handleKick(player: PlayerInfo) {
    socket.emit('kickPlayer', { playerId: player.id });
  }

  function handleStartGame() {
    socket.emit('startGame');
  }

  const openSeats = Math.max(0, maxPlayers - playerCount);
  const countHint = playerCount < minPlayers
    ? `Waiting for ${minPlayers - playerCount} more player${minPlayers - playerCount === 1 ? '' : 's'}`
    : playerCount > maxPlayers
      ? `Too many players for ${GAME_TYPE_LABELS[currentRoom.gameType]} (max ${maxPlayers})`
      : 'Ready to start';

  return (
    <div className="room-screen app-page">
      <TopBar context={`${currentRoom.name} · ${GAME_TYPE_LABELS[currentRoom.gameType]}`} />

      <main className="app-main room-layout">
        <section className="room-players app-panel">
          <div className="room-section-header">
            <h1 className="room-name">{currentRoom.name}</h1>
            <span className={`room-player-count ${isValidCount ? 'room-player-count-valid' : 'room-player-count-invalid'}`}>
              {playerCount}/{maxPlayers} players
            </span>
          </div>
          <ul className="room-player-list">
            {currentRoom.players.map((player: PlayerInfo) => (
              <li key={player.id} className="room-player-item">
                <div className="room-player-info">
                  <span
                    className={`room-player-dot${player.isConnected ? ' room-player-dot-connected' : ''}`}
                    title={player.isConnected ? 'Connected' : 'Disconnected'}
                  />
                  <span className="room-player-name">{player.username}</span>
                  {player.id === playerId && <span className="room-player-you">You</span>}
                  {player.isOwner && <span className="room-player-owner">Host</span>}
                </div>
                {isOwner && player.id !== playerId && (
                  <button
                    className="room-kick-btn"
                    onClick={() => handleKick(player)}
                    title={`Remove ${player.username} from the room`}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
            {Array.from({ length: openSeats }, (_, i) => (
              <li key={`seat-${i}`} className="room-player-item room-seat-open">
                Open seat
              </li>
            ))}
          </ul>
        </section>

        <aside className="room-sidebar app-panel">
          <p className="app-panel-title">Game</p>
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
          <p className="room-game-range">{minPlayers}–{maxPlayers} players</p>
          <p className={`room-count-hint ${isValidCount ? 'room-player-count-valid' : 'room-player-count-invalid'}`}>
            {countHint}
          </p>

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
        </aside>
      </main>
    </div>
  );
}
