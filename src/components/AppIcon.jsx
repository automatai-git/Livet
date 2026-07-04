import React from 'react';

// Unified line-icon sprite. All glyphs share the same geometry rules:
// 24×24 viewBox, 1.6 stroke, currentColor, round caps + joins, no fill.
// Add new icons by appending a <symbol id="…"> with the same conventions.
export const IconSprite = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs>
      <symbol id="icon-hub" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="2.4" />
        <path d="M12 4v3.6M12 16.4V20M4 12h3.6M16.4 12H20M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M17.7 6.3l-2.5 2.5M8.8 15.2l-2.5 2.5" />
      </symbol>
      <symbol id="icon-timeline" viewBox="0 0 24 24">
        <path d="M4 6c2 0 2 4 4 4s2-4 4-4 2 4 4 4 2-4 4-4" />
        <path d="M4 12c2 0 2 4 4 4s2-4 4-4 2 4 4 4 2-4 4-4" />
        <circle cx="6" cy="6" r="1.2" />
        <circle cx="14" cy="6" r="1.2" />
        <circle cx="10" cy="16" r="1.2" />
        <circle cx="18" cy="16" r="1.2" />
      </symbol>
      <symbol id="icon-mobility" viewBox="0 0 24 24">
        <circle cx="12" cy="4.5" r="1.6" />
        <path d="M6 9h12M9 9v3l-2 7M15 9v3l2 7M9 12h6" />
      </symbol>
      <symbol id="icon-workout" viewBox="0 0 24 24">
        <path d="M3 12h2M19 12h2M6.5 8v8M17.5 8v8M9.5 6.5v11M14.5 6.5v11M9.5 12h5" />
      </symbol>
      <symbol id="icon-menu" viewBox="0 0 24 24">
        <path d="M5 4v8a3 3 0 0 0 3 3v5M5 4h6M11 4v8a3 3 0 0 1-3 3M16 4c2 0 3 2 3 5s-1 4-3 4v6" />
      </symbol>
      <symbol id="icon-palette" viewBox="0 0 24 24">
        <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-.8-.5-1.2-.5-2 0-.8.6-1.5 1.5-1.5h2A4 4 0 0 0 21 11.5C21 7 17 3 12 3z" />
        <circle cx="7.5" cy="11" r="1.1" />
        <circle cx="11" cy="7.5" r="1.1" />
        <circle cx="15.5" cy="8.5" r="1.1" />
      </symbol>
      <symbol id="icon-bucket" viewBox="0 0 24 24">
        <path d="M5 8h14l-1.5 11.5a1.5 1.5 0 0 1-1.5 1.3H8a1.5 1.5 0 0 1-1.5-1.3L5 8z" />
        <path d="M8 8c0-2.5 1.8-4.5 4-4.5S16 5.5 16 8" />
        <path d="M9 12l1 5M15 12l-1 5" />
      </symbol>
      <symbol id="icon-travel" viewBox="0 0 24 24">
        <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.5" />
      </symbol>
      <symbol id="icon-decision" viewBox="0 0 24 24">
        <path d="M4 5h7M4 12h7M4 19h7" />
        <path d="M16 7l2 2 3-3M16 14l2 2 3-3" />
        <circle cx="18" cy="19" r="2" />
      </symbol>
      <symbol id="icon-book" viewBox="0 0 24 24">
        <path d="M12 6.5v13" />
        <path d="M12 6.5C10 5 7.2 4.6 4.5 5.1v12.5c2.7-.5 5.5-.1 7.5 1.4" />
        <path d="M12 6.5c2-1.5 4.8-1.9 7.5-1.4v12.5c-2.7-.5-5.5-.1-7.5 1.4" />
        <path d="M16 10.5c1.6 0 1.6 4 0 4" />
      </symbol>
    </defs>
  </svg>
);

const AppIcon = ({ name, size = 24, color = 'currentColor', style, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
    {...rest}
  >
    <use href={`#icon-${name}`} />
  </svg>
);

export default AppIcon;
