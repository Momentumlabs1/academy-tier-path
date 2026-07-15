import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colors, font} from '../lib/tokens';

/** STUB — wird durch die finale Szene ersetzt (CTA + Abschluss, Logo-Abbinder). */
export const Scene7CTA: React.FC = () => (
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
      Szene 7 — CTA &amp; Abschluss
    </div>
  </AbsoluteFill>
);
