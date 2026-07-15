import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colors, font} from '../lib/tokens';

/** STUB — wird durch die finale Szene ersetzt (Dashboard-Überblick, 3 Punch-Ins). */
export const Scene2Dashboard: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        fontFamily: font.family,
        color: colors.text,
        fontSize: 56,
        fontWeight: font.weight.bold,
      }}
    >
      Szene 2 — Dashboard
    </div>
  </AbsoluteFill>
);
