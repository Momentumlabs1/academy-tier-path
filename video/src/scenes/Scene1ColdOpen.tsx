import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colors, font} from '../lib/tokens';

/** STUB — wird durch die finale Szene ersetzt (POV Cold Open, Kamera geht an). */
export const Scene1ColdOpen: React.FC = () => (
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
      Szene 1 — Cold Open
    </div>
  </AbsoluteFill>
);
