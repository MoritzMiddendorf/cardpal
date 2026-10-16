import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/index.js';
import { socket } from '../../socket/client.js';
import { RemoveDisconnectedPlayers } from '../ui/RemoveDisconnectedPlayers.js';
import { SkipBoCard } from '../ui/SkipBoCard.js';
import { SkipBoPile } from '../ui/SkipBoPile.js';
import { TopBar } from '../ui/TopBar.js';
import { Deck } from '../ui/Deck.js';
import { FlyIn, FLY_IN_STAGGER_MS } from '../ui/FlyIn.js';
import { useCardDrag } from '../../hooks/useCardDrag.js';
import {
  getNextNeededValue,
  getActionsForSource as getActionsForSourceHelper,
  isBuildingPileTarget as isBuildingPileTargetHelper,
  isDiscardPileTarget as isDiscardPileTargetHelper,
  findDropAction,
  dropTargetId,
  parseDropTargetId,
  isSameSource,
  newlyDrawnIndices,
} from './skipBoHelpers.js';
import type { SourceSelection, DropTarget } from './skipBoHelpers.js';
import type { FilteredGameState, GameAction, PlayerResult, SkipBoCard as SkipBoCardType } from '@cardpal/shared';
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
  const previousGameState = useAppStore((s) => s.previousGameState);
  const currentRoom = useAppStore((s) => s.currentRoom);
  const playerId = useAppStore((s) => s.playerId);

  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);
  /** Source of a card that was just dropped; hidden until the server's next state arrives. */
  const [droppedSource, setDroppedSource] = useState<SourceSelection | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

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

  const getActionsForSource = useCallback(
    (source: SourceSelection) => getActionsForSourceHelper(validActions, source),
    [validActions],
  );

  function sendAction(action: GameAction) {
    socket.emit('gameAction', { type: action.type, playerId: myPlayerId, payload: action.payload });
  }

  const { drag, startDrag, cancel: cancelDrag, getActiveSource } = useCardDrag<SourceSelection, DropTarget>({
    canDrag: (source) => isMyTurn && getActionsForSourceHelper(validActions, source).length > 0,
    targetAt: (element) =>
      parseDropTargetId(element?.closest('[data-drop-target]')?.getAttribute('data-drop-target')),
    // Selecting the dragged card reuses the click-to-move target highlighting.
    onStart: (source) => setSelectedSource(source),
    onDrop: (source, target) => {
      const action = findDropAction(validActions, source, target);
      if (!action) return false;
      sendAction(action);
      setSelectedSource(null);
      setDroppedSource(source);
      return true;
    },
    onCancel: () => setSelectedSource(null),
  });

  // H1 fix: Clear stale selection when game state changes. A drag in progress survives an update
  // that still allows its move (e.g. someone's connection status changed) and is cancelled otherwise.
  useEffect(() => {
    setDroppedSource(null);
    const dragging = getActiveSource();
    if (dragging && isMyTurn && getActionsForSourceHelper(validActions, dragging).length > 0) {
      setSelectedSource(dragging);
      return;
    }
    if (dragging) cancelDrag();
    setSelectedSource(null);
    // Runs once per new game state, like before.
  }, [validActions]);

  // If the server rejects a drop, no new state arrives: show the card again after a moment.
  useEffect(() => {
    if (!droppedSource) return;
    const timer = setTimeout(() => setDroppedSource(null), 1500);
    return () => clearTimeout(timer);
  }, [droppedSource]);

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

    const action = findDropAction(validActions, selectedSource, { type: 'building', index: buildingPileIndex });
    if (action) {
      sendAction(action);
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

    const action = findDropAction(validActions, selectedSource, { type: 'discard', index: discardPileIndex });
    if (action) {
      sendAction(action);
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
    myDrawnCount,
  } = skipBoState;
  const prevSkipBoState = previousGameState?.skipBoState;

  // Cards drawn since the previous state fly in from the deck.
  const myNewCards = newlyDrawnIndices(myHand.length, prevSkipBoState?.myDrawnCount ?? null, myDrawnCount);
  function opponentNewCards(playerId: string, handCount: number, drawnCount: number): number[] {
    const prev = prevSkipBoState?.otherPlayers.find((p) => p.playerId === playerId);
    return newlyDrawnIndices(handCount, prev?.drawnCount ?? null, drawnCount);
  }
  function flyDelay(newIndices: number[], index: number): number {
    return Math.max(newIndices.indexOf(index), 0) * FLY_IN_STAGGER_MS;
  }

  const dragSource = drag && !drag.returning ? drag.source : null;
  /** Card state while it is moved: being dragged (dimmed) or dropped and awaiting the server (hidden). */
  function liftedClass(source: SourceSelection): string {
    if (isSameSource(droppedSource, source)) return 'skipbo-card-dropped';
    if (isSameSource(dragSource, source)) return 'skipbo-card-dragging';
    return '';
  }
  function isDragOver(target: DropTarget): boolean {
    return !!drag?.over && drag.over.type === target.type && drag.over.index === target.index &&
      !!dragSource && !!findDropAction(validActions, dragSource, target);
  }
  function canDragSource(source: SourceSelection): boolean {
    return isMyTurn && sourceHasActions(source);
  }

  let ghostCard: SkipBoCardType | null = null;
  if (drag) {
    const src = drag.source;
    ghostCard = src.type === 'hand'
      ? myHand[src.handIndex] ?? null
      : src.type === 'stock'
        ? myStockPile.topCard
        : myDiscardPiles[src.discardPileIndex]?.topCard ?? null;
  }

  // Find which player's turn it is
  const activePlayer = players[gameState.currentPlayerIndex];
  const activePlayerName = activePlayer?.id === myPlayerId ? 'Your' : `${activePlayer?.username ?? 'Unknown'}'s`;

  return (
    <div className="skipbo-game app-page" onClick={handleBackgroundClick}>
      <TopBar context={currentRoom ? `${currentRoom.name} · Skip-Bo` : 'Skip-Bo'} />
      <main className="app-main skipbo-table">
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
          <div className="skipbo-paused-banner" onClick={(e) => e.stopPropagation()}>
            <span className="skipbo-paused-text">
              Game paused — waiting for {pausedForPlayer} to reconnect...
            </span>
            {isOwner && <RemoveDisconnectedPlayers players={players} />}
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
                    {(() => {
                      const newCards = opponentNewCards(player.id, skipBoPlayer.handCount, skipBoPlayer.drawnCount);
                      return Array.from({ length: skipBoPlayer.handCount }, (_, i) => (
                        <FlyIn
                          key={i}
                          from={deckRef}
                          active={newCards.includes(i)}
                          delay={flyDelay(newCards, i)}
                          animationKey={skipBoPlayer.drawnCount}
                        >
                          <SkipBoCard card={{ value: 0, isWild: false, faceUp: false }} />
                        </FlyIn>
                      ));
                    })()}
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
                  dropTarget={dropTargetId({ type: 'building', index: i })}
                  dropHover={isDragOver({ type: 'building', index: i })}
                  onClick={() => handleBuildingPileClick(i)}
                />
              );
            })}
            <div className="skipbo-draw-deck">
              <Deck ref={deckRef} count={drawPileCount} cardClassName="skipbo-card skipbo-card-back" label="Draw pile" />
            </div>
          </div>
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
                highlighted={canDragSource({ type: 'stock' })}
                draggable={canDragSource({ type: 'stock' })}
                lifted={liftedClass({ type: 'stock' })}
                onPointerDown={startDrag({ type: 'stock' })}
              />
              {!dragSource && selectedSource?.type === 'stock' && (
                <div className="skipbo-selection-indicator" />
              )}
            </div>

            {/* Hand Cards */}
            <div className="skipbo-my-hand">
              {myHand.map((card, i) => {
                const source: SourceSelection = { type: 'hand', handIndex: i };
                const playable = canDragSource(source);
                return (
                  <FlyIn
                    key={i}
                    from={deckRef}
                    active={myNewCards.includes(i)}
                    delay={flyDelay(myNewCards, i)}
                    animationKey={myDrawnCount}
                  >
                    <SkipBoCard
                      card={card}
                      highlighted={playable}
                      selected={!dragSource && isSameSource(selectedSource, source)}
                      className={[
                        playable ? 'skipbo-card-draggable' : '',
                        liftedClass(source),
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleSourceClick(source)}
                      onPointerDown={startDrag(source)}
                    />
                  </FlyIn>
                );
              })}
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
                    dropTarget={dropTargetId({ type: 'discard', index: i })}
                    dropHover={isDragOver({ type: 'discard', index: i })}
                    draggable={canDragSource({ type: 'discard', discardPileIndex: i })}
                    lifted={liftedClass({ type: 'discard', discardPileIndex: i })}
                    onPointerDown={startDrag({ type: 'discard', discardPileIndex: i })}
                    onClick={() => {
                      if (isDiscardPileTarget(i)) {
                        handleDiscardPileClick(i);
                      } else {
                        handleSourceClick({ type: 'discard', discardPileIndex: i });
                      }
                    }}
                  />
                  {!dragSource && selectedSource?.type === 'discard' && selectedSource.discardPileIndex === i && (
                    <div className="skipbo-selection-indicator" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* The card being dragged follows the pointer above everything else. */}
      {drag && ghostCard && (
        <div
          className={`skipbo-drag-ghost${drag.returning ? ' skipbo-drag-ghost-returning' : ''}`}
          style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
        >
          <SkipBoCard card={ghostCard} />
        </div>
      )}
    </div>
  );
}
