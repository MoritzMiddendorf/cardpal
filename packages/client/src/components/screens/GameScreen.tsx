import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { RemoveDisconnectedPlayers } from '../ui/RemoveDisconnectedPlayers.js';
import { AnimatedCard } from '../ui/AnimatedCard.js';
import { detectNewCards } from '../../utils/cardDiff.js';
import { SkipBoGameScreen } from './SkipBoGameScreen.js';
import { GameType } from '@cardpal/shared';
import type { Card as CardType, PlayerPublicInfo, OtherPlayerHand, PlayerResult } from '@cardpal/shared';
import './GameScreen.css';

const STAGGER_DELAY_MS = 150;

export function GameScreen() {
  const gameState = useAppStore((s) => s.gameState);
  const previousGameState = useAppStore((s) => s.previousGameState);
  const currentRoom = useAppStore((s) => s.currentRoom);
  const playerId = useAppStore((s) => s.playerId);

  if (!gameState) return null;

  // Route to game-specific screen based on game type
  if (gameState.gameType === GameType.SKIPBO) {
    return <SkipBoGameScreen />;
  }

  const {
    myPlayerId,
    hand,
    handValue,
    validActions,
    dealerCards,
    dealerHandValue,
    otherPlayerHands,
    players,
    status,
    results,
  } = gameState;

  const { isPaused, pausedForPlayer } = gameState;
  const isFinished = status === 'finished';
  const canAct = validActions.length > 0 && !isFinished && !isPaused;
  const canHit = validActions.some((a) => a.type === 'hit');
  const canStand = validActions.some((a) => a.type === 'stand');
  const isOwner = currentRoom?.ownerId === playerId;

  // Detect new cards for animation
  const newCards = detectNewCards(previousGameState, gameState);

  function handleHit() {
    socket.emit('gameAction', { type: 'hit', playerId: myPlayerId });
  }

  function handleStand() {
    socket.emit('gameAction', { type: 'stand', playerId: myPlayerId });
  }

  function handlePlayAgain() {
    socket.emit('playAgain');
  }

  function handleReturnToLobby() {
    socket.emit('returnToLobby');
  }

  // Find my player info and other players
  const myInfo = players.find((p) => p.id === myPlayerId);
  const myResult = results?.find((r: PlayerResult) => r.playerId === myPlayerId);
  const otherPlayers = players.filter((p) => p.id !== myPlayerId);

  function getOtherPlayerHand(playerId: string): OtherPlayerHand | undefined {
    return otherPlayerHands.find((h: OtherPlayerHand) => h.playerId === playerId);
  }

  function getPlayerResult(playerId: string): PlayerResult | undefined {
    return results?.find((r: PlayerResult) => r.playerId === playerId);
  }

  function resultLabel(result: PlayerResult['result']): string {
    switch (result) {
      case 'win': return 'WIN';
      case 'lose': return 'LOSE';
      case 'push': return 'PUSH';
    }
  }

  function staggerDelay(newIndices: number[], cardIndex: number): number {
    const pos = newIndices.indexOf(cardIndex);
    if (pos === -1) return 0;
    return pos * STAGGER_DELAY_MS;
  }

  return (
    <div className="game-screen">
      {/* Game Results Overlay */}
      {isFinished && results && (
        <div className="game-results">
          <h2 className="game-results-title">Game Over</h2>
          {dealerHandValue !== null && (
            <div className="game-results-dealer">Dealer: {dealerHandValue}</div>
          )}
          <div className="game-results-list">
            {results.map((r: PlayerResult) => (
              <div key={r.playerId} className={`game-result-item game-result-${r.result}`}>
                <span className="game-result-name">{r.playerId === myPlayerId ? 'You' : r.username}</span>
                <span className="game-result-badge">{resultLabel(r.result)}</span>
                <span className="game-result-value">{r.handValue}</span>
              </div>
            ))}
          </div>
          <div className="game-results-actions">
            {isOwner && (
              <button className="game-play-again-btn" onClick={handlePlayAgain}>
                Play Again
              </button>
            )}
            <button className="game-return-lobby-btn" onClick={handleReturnToLobby}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Pause Banner */}
      {isPaused && pausedForPlayer && (
        <div className="game-paused-banner" onClick={(e) => e.stopPropagation()}>
          <span className="game-paused-text">
            Game paused — waiting for {pausedForPlayer} to reconnect...
          </span>
          {isOwner && <RemoveDisconnectedPlayers players={players} />}
        </div>
      )}

      {/* Dealer Area */}
      <div className="game-dealer-area">
        <div className="game-area-label">
          Dealer
          {dealerHandValue !== null && (
            <span className="game-hand-value">{dealerHandValue}</span>
          )}
        </div>
        <div className="card-pile">
          {dealerCards.map((c: CardType, i: number) => (
            <AnimatedCard
              key={i}
              card={c}
              isNew={newCards.dealerCards.includes(i)}
              animationDelay={staggerDelay(newCards.dealerCards, i)}
              isRevealed={newCards.dealerRevealed && !newCards.dealerCards.includes(i) && c.faceUp}
            />
          ))}
        </div>
      </div>

      {/* Other Players */}
      {otherPlayers.map((player: PlayerPublicInfo) => {
        const playerResult = getPlayerResult(player.id);
        const playerNewCards = newCards.otherPlayerHands.get(player.id) ?? [];
        return (
          <div
            key={player.id}
            className={`game-player-area${player.isActive ? ' game-player-active' : ''}${player.isBust ? ' game-player-bust' : ''}${player.hasStood ? ' game-player-stood' : ''}${!player.isConnected ? ' game-player-disconnected' : ''}`}
          >
            <div className="game-area-label">
              <span
                className={`game-player-status-dot${player.isConnected ? ' game-player-status-dot-connected' : ''}`}
                title={player.isConnected ? 'Connected' : 'Disconnected'}
              />
              {player.username}
              {player.isBust && <span className="game-bust-badge">BUST</span>}
              {player.hasStood && !player.isBust && <span className="game-stood-badge">STOOD</span>}
              {playerResult && <span className={`game-result-inline game-result-${playerResult.result}`}>{resultLabel(playerResult.result)}</span>}
              <span className="game-hand-value">{getOtherPlayerHand(player.id)?.handValue ?? 0}</span>
            </div>
            <div className="card-pile">
              {(getOtherPlayerHand(player.id)?.cards ?? []).map((c: CardType, i: number) => (
                <AnimatedCard
                  key={i}
                  card={c}
                  isNew={playerNewCards.includes(i)}
                  animationDelay={staggerDelay(playerNewCards, i)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* My Hand */}
      <div className={`game-my-area${myInfo?.isActive ? ' game-player-active' : ''}${myInfo?.isBust ? ' game-player-bust' : ''}`}>
        <div className="game-area-label">
          You
          {myInfo?.isBust && <span className="game-bust-badge">BUST</span>}
          {myInfo?.hasStood && !myInfo?.isBust && <span className="game-stood-badge">STOOD</span>}
          {myResult && <span className={`game-result-inline game-result-${myResult.result}`}>{resultLabel(myResult.result)}</span>}
          <span className="game-hand-value">{handValue}</span>
        </div>
        <div className="card-pile">
          {hand.map((c: CardType, i: number) => (
            <AnimatedCard
              key={i}
              card={c}
              isNew={newCards.myHand.includes(i)}
              animationDelay={staggerDelay(newCards.myHand, i)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        {!isFinished && (
          <div className="game-actions">
            <button
              className="game-hit-btn"
              onClick={handleHit}
              disabled={!canAct || !canHit}
            >
              Hit
            </button>
            <button
              className="game-stand-btn"
              onClick={handleStand}
              disabled={!canAct || !canStand}
            >
              Stand
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
