import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colors, font} from '../lib/tokens';

/** STUB — wird durch die finale Szene ersetzt (Transparenz-Block, wichtigste Szene). */
export const Scene6Transparency: React.FC = () => (
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
      Szene 6 — Transparenz
    </div>
  </AbsoluteFill>
);
