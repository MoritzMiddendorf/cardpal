import { useAppStore } from './store/index.js';

export function App() {
  const screen = useAppStore((s) => s.screen);

  return (
    <div>
      <h1>cardpal</h1>
      <p>Current screen: {screen}</p>
      {screen === 'otp' && <p>OTP Screen (Story 1.3)</p>}
      {screen === 'username' && <p>Username Screen (Story 1.4)</p>}
      {screen === 'lobby' && <p>Lobby Screen (Story 2.1)</p>}
      {screen === 'room' && <p>Room Screen (Story 2.4)</p>}
      {screen === 'game' && <p>Game Screen (Story 3.5)</p>}
    </div>
  );
}
