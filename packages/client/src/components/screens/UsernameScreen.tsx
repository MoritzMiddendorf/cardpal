import { useState, useCallback, useEffect } from 'react';
import { socket } from '../../socket/client.js';
import type { ErrorPayload } from '@cardpal/shared';
import './UsernameScreen.css';

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_LENGTH = 15;

export function UsernameScreen() {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = useCallback((value: string): string => {
    if (value.length === 0) return '';
    if (value.length > MAX_LENGTH) return 'Username must be 15 characters or less';
    if (!USERNAME_REGEX.test(value)) return 'Letters and numbers only';
    return '';
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    setErrorMessage('');
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const error = validate(username);
    if (error) {
      setErrorMessage(error);
      return;
    }

    if (username.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    socket.emit('setUsername', { username });
  }, [username, isSubmitting, validate]);

  // Listen for server-side validation errors
  useEffect(() => {
    function onError(err: ErrorPayload) {
      if (err.code === 'VALIDATION_ERROR' || err.code === 'AUTH_ERROR') {
        setErrorMessage(err.message);
        setIsSubmitting(false);
      }
    }

    socket.on('error', onError);
    return () => { socket.off('error', onError); };
  }, []);

  return (
    <div className="username-screen">
      <h1 className="username-title">cardpal</h1>
      <form className="username-form" onSubmit={handleSubmit}>
        <input
          className="username-input"
          type="text"
          value={username}
          onChange={handleChange}
          placeholder="Username"
          maxLength={MAX_LENGTH}
          disabled={isSubmitting}
          autoFocus
        />
        <p className="username-hint">Choose a name for your friends to see</p>
        {errorMessage && <p className="username-error">{errorMessage}</p>}
        <button
          className="username-submit"
          type="submit"
          disabled={username.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}
