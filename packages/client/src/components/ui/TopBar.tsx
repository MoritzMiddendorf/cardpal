import type { ReactNode } from 'react';
import { useAppStore } from '../../store/index.js';
import './TopBar.css';

interface TopBarProps {
  /** Shown next to the brand, e.g. the room name and game. */
  context?: ReactNode;
}

export function TopBar({ context }: TopBarProps) {
  const username = useAppStore((s) => s.username);

  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <div className="top-bar-left">
          <span className="top-bar-brand">cardpal</span>
          {context && <span className="top-bar-context">{context}</span>}
        </div>
        {username && (
          <span className="top-bar-user">
            <span className="top-bar-avatar" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
            <span className="top-bar-username">{username}</span>
          </span>
        )}
      </div>
    </header>
  );
}
