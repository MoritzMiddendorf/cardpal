import { socket } from '../../socket/client.js';
import type { PlayerPublicInfo } from '@cardpal/shared';
import './RemoveDisconnectedPlayers.css';

interface RemoveDisconnectedPlayersProps {
  players: PlayerPublicInfo[];
}

/**
 * Host-only escape hatch for a game stuck waiting on someone who isn't coming
 * back: removing a disconnected player ends the game and returns to the room.
 */
export function RemoveDisconnectedPlayers({ players }: RemoveDisconnectedPlayersProps) {
  const disconnected = players.filter((p) => !p.isConnected);
  if (disconnected.length === 0) return null;

  function handleRemove(player: PlayerPublicInfo) {
    if (window.confirm(`Remove ${player.username}? This ends the current game.`)) {
      socket.emit('kickPlayer', { playerId: player.id });
    }
  }

  return (
    <div className="remove-disconnected">
      {disconnected.map((p) => (
        <button key={p.id} className="remove-disconnected-btn" onClick={() => handleRemove(p)}>
          Remove {p.username}
        </button>
      ))}
    </div>
  );
}
