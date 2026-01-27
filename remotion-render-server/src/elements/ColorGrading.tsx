/**
 * Professional Color Grading & Video Effects
 * 
 * TEST THIS: Apply different looks to your videos instantly
 * - Film looks (vintage, cinematic, etc.)
 * - Color grading presets
 * - Professional effects (bloom, vignette, grain)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { noise2D } from '@remotion/noise';

export type ColorGradingPreset =
  | 'cinematic' // Teal & orange, desaturated
  | 'vintage' // Faded, warm, film grain
  | 'vibrant' // High saturation, punchy
  | 'moody' // Dark, contrasty, blue tint
  | 'pastel' // Soft, desaturated, light
  | 'noir' // Black & white, high contrast
  | 'sunset' // Warm, golden hour
  | 'cool' // Blue/teal tint, modern
  | 'natural'; // Minimal grading

interface ColorGradingConfig {
  name: string;
  filters: string;
  description: string;
}

export const COLOR_PRESETS: Record<ColorGradingPreset, ColorGradingConfig> = {
  cinematic: {
    name: 'Cinematic',
    filters:
      'saturate(0.8) contrast(1.1) brightness(0.95) hue-rotate(-5deg) sepia(0.1)',
    description: 'Teal & orange Hollywood look',
  },
  vintage: {
    name: 'Vintage Film',
    filters:
      'saturate(0.7) contrast(0.9) brightness(1.1) sepia(0.3) hue-rotate(10deg)',
    description: 'Faded 70s film aesthetic',
  },
  vibrant: {
    name: 'Vibrant',
    filters: 'saturate(1.4) contrast(1.15) brightness(1.05)',
    description: 'Punchy, high saturation',
  },
  moody: {
    name: 'Moody',
    filters:
      'saturate(0.6) contrast(1.3) brightness(0.8) hue-rotate(200deg) sepia(0.15)',
    description: 'Dark, atmospheric, blue tint',
  },
  pastel: {
    name: 'Pastel',
    filters: 'saturate(0.5) contrast(0.85) brightness(1.2) hue-rotate(5deg)',
    description: 'Soft, light, dreamy',
  },
  noir: {
    name: 'Film Noir',
    filters: 'grayscale(1) contrast(1.4) brightness(0.9)',
    description: 'Black & white, dramatic',
  },
  sunset: {
    name: 'Golden Hour',
    filters:
      'saturate(1.2) contrast(1.05) brightness(1.05) hue-rotate(20deg) sepia(0.2)',
    description: 'Warm, golden tones',
  },
  cool: {
    name: 'Cool Modern',
    filters:
      'saturate(0.9) contrast(1.1) brightness(1) hue-rotate(180deg) sepia(0.05)',
    description: 'Blue/teal, clean look',
  },
  natural: {
    name: 'Natural',
    filters: 'saturate(1) contrast(1) brightness(1)',
    description: 'Minimal color correction',
  },
};

interface ColorGradingProps {
  children: React.ReactNode;
  preset: ColorGradingPreset;
  intensity?: number; // 0-1, default 1
}

/**
 * Apply color grading to content
 */
export function ColorGrading({
  children,
  preset,
  intensity = 1,
}: ColorGradingProps) {
  const config = COLOR_PRESETS[preset];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        filter: config.filters,
        opacity: intensity,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Film grain effect (analog film look)
 */
export function FilmGrain({ intensity = 0.3 }: { intensity?: number }) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: intensity,
      }}
    >
      <svg width="100%" height="100%">
        <filter id="filmGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${0.8 + (frame % 10) * 0.02}`}
            numOctaves="4"
            seed={frame}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#filmGrain)" />
      </svg>
    </div>
  );
}

/**
 * Vignette effect (darkened edges)
 */
export function Vignette({
  intensity = 0.5,
  color = 'black',
}: {
  intensity?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(circle at center, transparent 30%, ${color} 150%)`,
        opacity: intensity,
      }}
    />
  );
}

/**
 * Bloom/Glow effect
 */
export function Bloom({ intensity = 0.5 }: { intensity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        filter: `blur(${intensity * 20}px)`,
        mixBlendMode: 'screen',
        opacity: intensity * 0.5,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'white',
        }}
      />
    </div>
  );
}
