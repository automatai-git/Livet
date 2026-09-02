import { useState, useEffect, useRef } from 'react';

// A short-lived line under the state pills saying what the mark did — the
// NAS reads user_state back every Monday, and that should feel like
// something happened, not like toggling a checkbox.
export const useWhisper = () => {
  const [whisper, setWhisper] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const say = (text) => {
    clearTimeout(timer.current);
    setWhisper(text);
    timer.current = setTimeout(() => setWhisper(null), 2200);
  };
  return [whisper, say];
};

export const whisperFor = (state) => {
  switch (state) {
    case 'interested': return 'Noted — Monday looks for more like this.';
    case 'going': return 'Going. Monday hunts the same crowd.';
    case 'attended': return 'Attended — the strongest signal there is.';
    case 'hidden': return 'Hidden. Monday steers away from this kind.';
    case 'joined': return 'Joined — Monday looks one tier up.';
    default: return 'Cleared — no signal either way.';
  }
};
