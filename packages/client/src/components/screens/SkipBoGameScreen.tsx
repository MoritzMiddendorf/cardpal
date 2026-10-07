import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { SkipBoCard } from '../ui/SkipBoCard.js';
import { SkipBoPile } from '../ui/SkipBoPile.js';
import {
  getNextNeededValue,
  getActionsForSource as getActionsForSourceHelper,
  isBuildingPileTarget as isBuildingPileTargetHelper,
  isDiscardPileTarget as isDiscardPileTargetHelper,
} from './skipBoHelpers.js';
import type { SourceSelection } from './skipBoHelpers.js';
import type { FilteredGameState, PlayerResult } from '@cardpal/shared';
import './SkipBoGameScreen.css';

function resultLabel(result: PlayerResult['result']): string {
  switch (result) {
    case 'win': return 'WIN';
    case 'lose': return 'LOSE';
    case 'push': return 'PUSH';
  }
}

export function SkipBoGameScreen() {
  const gameState = useAppStore((s) => s.gameState) as FilteredGameState;
  const currentRoom = useAppStore((s) => s.currentRoom);
  const playerId = useAppStore((s) => s.playerId);

  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);

  const {
    myPlayerId,
    validActions,
    players,
    status,
    results,
    isPaused,
    pausedForPlayer,
    skipBoState,
  } = gameState;

  const isFinished = status === 'finished';
  const isOwner = currentRoom?.ownerId === playerId;
  const isMyTurn = validActions.length > 0 && !isFinished && !isPaused;
  const myInfo = players.find((p) => p.id === myPlayerId);
  const myResult = results?.find((r: PlayerResult) => r.playerId === myPlayerId);
  const otherPlayers = players.filter((p) => p.id !== myPlayerId);

  // H1 fix: Clear stale selection when game state changes
  useEffect(() => {
    setSelectedSource(null);
  }, [validActions]);

  const getActionsForSource = useCallback(
    (source: SourceSelection) => getActionsForSourceHelper(validActions, source),
    [validActions],
  );

  const isBuildingPileTarget = useCallback(
    (buildingPileIndex: number) => isBuildingPileTargetHelper(validActions, selectedSource, buildingPileIndex),
    [validActions, selectedSource],
  );

  const isDiscardPileTarget = useCallback(
    (discardPileIndex: number) => isDiscardPileTargetHelper(validActions, selectedSource, discardPileIndex),
    [validActions, selectedSource],
  );

  const sourceHasActions = useCallback(
    (source: SourceSelection) => getActionsForSourceHelper(validActions, source).length > 0,
    [validActions],
  );

  function handleSourceClick(source: SourceSelection) {
    if (!isMyTurn) return;
    if (!sourceHasActions(source)) return;

    if (
      selectedSource &&
      selectedSource.type === source.type &&
      (source.type === 'stock' ||
        (source.type === 'hand' && selectedSource.type === 'hand' && selectedSource.handIndex === source.handIndex) ||
        (source.type === 'discard' && selectedSource.type === 'discard' && selectedSource.discardPileIndex === source.discardPileIndex))
    ) {
      setSelectedSource(null);
      return;
    }

    setSelectedSource(source);
  }

  function handleBuildingPileClick(buildingPileIndex: number) {
    if (!selectedSource || !isMyTurn) return;

    const actions = getActionsForSource(selectedSource);
    const action = actions.find(
      (a) =>
        (a.type === 'PLAY_FROM_HAND' || a.type === 'PLAY_FROM_STOCK' || a.type === 'PLAY_FROM_DISCARD') &&
        (a.payload as Record<string, number>)?.buildingPileIndex === buildingPileIndex
    );

    if (action) {
      socket.emit('gameAction', { type: action.type, playerId: myPlayerId, payload: action.payload });
      setSelectedSource(null);
    }
  }

  function handleDiscardPileClick(discardPileIndex: number) {
    if (!selectedSource || !isMyTurn) return;

    // If clicking a discard pile as a source (not a target)
    if (selectedSource.type !== 'hand') {
      // Can't discard from stock/discard; check if it's a new source selection
      if (sourceHasActions({ type: 'discard', discardPileIndex })) {
        setSelectedSource({ type: 'discard', discardPileIndex });
      }
      return;
    }

    const actions = getActionsForSource(selectedSource);
    const action = actions.find(
      (a) =>
        a.type === 'DISCARD' &&
        (a.payload as Record<string, number>)?.discardPileIndex === discardPileIndex
    );

    if (action) {
      socket.emit('gameAction', { type: action.type, playerId: myPlayerId, payload: action.payload });
      setSelectedSource(null);
    }
  }

  function handlePlayAgain() {
    socket.emit('playAgain');
  }

  function handleReturnToLobby() {
    socket.emit('returnToLobby');
  }

  function handleBackgroundClick() {
    setSelectedSource(null);
  }

  if (!skipBoState) return null;

  const {
    myHand,
    myStockPile,
    myDiscardPiles,
    buildingPiles,
    otherPlayers: otherSkipBoPlayers,
    drawPileCount,
  } = skipBoState;

  // Find which player's turn it is
  const activePlayer = players[gameState.currentPlayerIndex];
  const activePlayerName = activePlayer?.id === myPlayerId ? 'Your' : `${activePlayer?.username ?? 'Unknown'}'s`;

  return (
    <div className="skipbo-game" onClick={handleBackgroundClick}>
      {/* Results Overlay */}
      {isFinished && results && (
        <div className="skipbo-results" onClick={(e) => e.stopPropagation()}>
          <h2 className="skipbo-results-title">Game Over</h2>
          <div className="skipbo-results-list">
            {results.map((r: PlayerResult) => (
              <div key={r.playerId} className={`skipbo-result-item skipbo-result-${r.result}`}>
                <span className="skipbo-result-name">
                  {r.playerId === myPlayerId ? 'You' : r.username}
                </span>
                <span className="skipbo-result-badge">{resultLabel(r.result)}</span>
                <span className="skipbo-result-stock">Remaining Stock: {r.handValue}</span>
              </div>
            ))}
          </div>
          <div className="skipbo-results-actions">
            {isOwner && (
              <button className="skipbo-play-again-btn" onClick={handlePlayAgain}>
                Play Again
              </button>
            )}
            <button className="skipbo-return-lobby-btn" onClick={handleReturnToLobby}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Pause Banner */}
      {isPaused && pausedForPlayer && (
        <div className="skipbo-paused-banner">
          <span className="skipbo-paused-text">
            Game paused — waiting for {pausedForPlayer} to reconnect...
          </span>
        </div>
      )}

      {/* Turn Indicator */}
      {!isFinished && (
        <div className={`skipbo-turn-banner${isMyTurn ? ' skipbo-turn-mine' : ''}`}>
          {activePlayerName} turn
        </div>
      )}

      {/* Other Players */}
      <div className="skipbo-other-players">
        {otherPlayers.map((player) => {
          const skipBoPlayer = otherSkipBoPlayers.find((p) => p.playerId === player.id);
          if (!skipBoPlayer) return null;
          return (
            <div
              key={player.id}
              className={`skipbo-opponent${player.isActive ? ' skipbo-opponent-active' : ''}${!player.isConnected ? ' skipbo-opponent-disconnected' : ''}`}
            >
              <div className="skipbo-opponent-header">
                <span
                  className={`skipbo-status-dot${player.isConnected ? ' skipbo-status-dot-connected' : ''}`}
                  title={player.isConnected ? 'Connected' : 'Disconnected'}
                />
                <span className="skipbo-opponent-name">{player.username}</span>
              </div>
              <div className="skipbo-opponent-piles">
                <SkipBoPile pile={skipBoPlayer.stockPile} label="Stock" />
                <div className="skipbo-opponent-hand-backs">
                  {Array.from({ length: skipBoPlayer.handCount }, (_, i) => (
                    <SkipBoCard key={i} card={{ value: 0, isWild: false, faceUp: false }} />
                  ))}
                </div>
                {skipBoPlayer.discardPiles.map((dp, di) => (
                  <SkipBoPile key={di} pile={dp} label={`D${di + 1}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center Area: Building Piles */}
      <div className="skipbo-center" onClick={(e) => e.stopPropagation()}>
        <div className="skipbo-building-piles">
          {buildingPiles.map((pile, i) => {
            const needed = getNextNeededValue(pile);
            return (
              <SkipBoPile
                key={i}
                pile={pile}
                needsValue={needed <= 12 ? needed : null}
                highlighted={isBuildingPileTarget(i)}
                onClick={() => handleBuildingPileClick(i)}
              />
            );
          })}
        </div>
        <div className="skipbo-draw-info">Draw pile: {drawPileCount}</div>
      </div>

      {/* My Area */}
      <div className={`skipbo-my-area${myInfo?.isActive ? ' skipbo-my-area-active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="skipbo-my-label">
          You
          {myResult && (
            <span className={`skipbo-result-inline skipbo-result-${myResult.result}`}>
              {resultLabel(myResult.result)}
            </span>
          )}
        </div>

        <div className="skipbo-my-layout">
          {/* Stock Pile */}
          <div className="skipbo-my-stock" onClick={() => handleSourceClick({ type: 'stock' })}>
            <SkipBoPile
              pile={myStockPile}
              label="Stock"
              highlighted={isMyTurn && sourceHasActions({ type: 'stock' })}
            />
            {selectedSource?.type === 'stock' && (
              <div className="skipbo-selection-indicator" />
            )}
          </div>

          {/* Hand Cards */}
          <div className="skipbo-my-hand">
            {myHand.map((card, i) => (
              <SkipBoCard
                key={i}
                card={card}
                highlighted={isMyTurn && sourceHasActions({ type: 'hand', handIndex: i })}
                selected={selectedSource?.type === 'hand' && selectedSource.handIndex === i}
                onClick={() => handleSourceClick({ type: 'hand', handIndex: i })}
              />
            ))}
          </div>

          {/* Discard Piles */}
          <div className="skipbo-my-discards">
            {myDiscardPiles.map((pile, i) => (
              <div key={i} className="skipbo-my-discard-slot">
                <SkipBoPile
                  pile={pile}
                  label={`D${i + 1}`}
                  highlighted={
                    isDiscardPileTarget(i) ||
                    (isMyTurn && !selectedSource && sourceHasActions({ type: 'discard', discardPileIndex: i }))
                  }
                  onClick={() => {
                    if (isDiscardPileTarget(i)) {
                      handleDiscardPileClick(i);
                    } else {
                      handleSourceClick({ type: 'discard', discardPileIndex: i });
                    }
                  }}
                />
                {selectedSource?.type === 'discard' && selectedSource.discardPileIndex === i && (
                  <div className="skipbo-selection-indicator" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
