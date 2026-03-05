import { useAppStore } from '../../store/index.js';
import './ConnectionOverlay.css';

export function ConnectionOverlay() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const sessionToken = useAppStore((s) => s.sessionToken);
  const reconnectFailed = useAppStore((s) => s.reconnectFailed);

  if (connectionStatus !== 'disconnected' || !sessionToken) return null;

  return (
    <div className="connection-overlay">
      <span className="connection-overlay-text">
        {reconnectFailed
          ? 'Connection lost — please refresh the page to reconnect'
          : 'Reconnecting...'}
      </span>
    </div>
  );
}
