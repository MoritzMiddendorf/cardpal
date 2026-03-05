import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/index.js';
import './OtpScreen.css';

const OTP_REGEX = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;

export function OtpScreen() {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const storeErrorMessage = useAppStore((s) => s.errorMessage);

  const isValidFormat = OTP_REGEX.test(inputValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    // Remove any non-alphanumeric characters except hyphen
    value = value.replace(/[^A-Z0-9-]/g, '');
    // Auto-insert hyphen after 3 characters
    if (value.length === 4 && value[3] !== '-') {
      value = value.slice(0, 3) + '-' + value.slice(3);
    }
    // Remove extra hyphens beyond position 3
    if (value.length > 4) {
      value = value.slice(0, 3) + '-' + value.slice(3).replace(/-/g, '');
    }
    // Enforce max length of 7 (XXX-XXX)
    if (value.length > 7) {
      value = value.slice(0, 7);
    }
    setInputValue(value);
    setErrorMessage('');
    // Clear session expiry banner when user starts typing
    if (useAppStore.getState().errorMessage) {
      useAppStore.getState().setErrorMessage(null);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidFormat || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/validate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputValue }),
      });

      const data = await response.json();

      if (response.ok) {
        useAppStore.getState().setPendingSessionId(data.pendingSessionId);
        useAppStore.getState().setScreen('username');
      } else {
        setErrorMessage(data.message || 'Validation failed');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, isValidFormat, isSubmitting]);

  return (
    <div className="otp-screen">
      <h1 className="otp-title">cardpal</h1>
      {storeErrorMessage && <p className="otp-session-error">{storeErrorMessage}</p>}
      <form className="otp-form" onSubmit={handleSubmit}>
        <input
          className="otp-input"
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="XXX-XXX"
          disabled={isSubmitting}
          autoFocus
        />
        <p className="otp-hint">Enter the code shared by the host</p>
        {inputValue.length > 0 && !isValidFormat && (
          <p className="otp-format-hint">Format: XXX-XXX</p>
        )}
        {errorMessage && <p className="otp-error">{errorMessage}</p>}
        <button
          className="otp-submit"
          type="submit"
          disabled={!isValidFormat || isSubmitting}
        >
          {isSubmitting ? 'Validating...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
