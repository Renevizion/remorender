import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { noise2D } from '@remotion/noise';
import type { PlannedElement, VideoPlan } from '../types/video';

interface AnimatedTextProps {
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle?: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({ 
  element, 
  style, 
  colors, 
  sceneFrame 
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  
  const text = element.content || 'Remotion Animations';
  const chars = text.split('');
  
  // Stagger the character animations
  const charsPerFrame = 0.5;
  const delayPerChar = 3;
  
  return (
    <div
      style={{
        ...style,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {chars.map((char, i) => {
        // Each character has its own animation
        const charDelay = i * delayPerChar;
        const charFrame = Math.max(0, sceneFrame - charDelay);
        
        // Spring animation for each character
        const charSpring = spring({
          fps,
          frame: charFrame,
          config: { damping: 20, stiffness: 100, mass: 0.5 },
        });
        
        // Character reveals with scale and opacity
        const scale = interpolate(charSpring, [0, 1], [0.3, 1]);
        const opacity = interpolate(charSpring, [0, 1], [0, 1]);
        
        // Add slight rotation for visual interest
        const rotate = interpolate(charSpring, [0, 1], [45, 0]);
        
        // Add organic movement with noise
        const noiseY = noise2D(`char-${i}`, charFrame * 0.05, 0) * 5;
        
        // Color shift based on position
        const hue = (i / chars.length) * 60 + 200; // Blue to purple range
        
        // Glow effect that pulses
        const glowIntensity = interpolate(
          sceneFrame,
          [charDelay, charDelay + fps * 1, charDelay + fps * 2],
          [0, 1, 0.6],
          { extrapolateRight: 'clamp' }
        );
        
        const elStyle = element.style as Record<string, unknown> | undefined;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize: (elStyle?.fontSize as number) || 72,
              fontWeight: (elStyle?.fontWeight as number) || 800,
              fontFamily: (elStyle?.fontFamily as string) || "'Inter', system-ui, sans-serif",
              color: (elStyle?.color as string) || `hsl(${hue}, 80%, 60%)`,
              opacity,
              transform: `
                scale(${scale}) 
                rotate(${rotate}deg) 
                translateY(${noiseY}px)
              `,
              textShadow: `
                0 0 ${20 * glowIntensity}px hsla(${hue}, 80%, 60%, ${0.8 * glowIntensity}),
                0 0 ${40 * glowIntensity}px hsla(${hue}, 80%, 60%, ${0.4 * glowIntensity}),
                0 2px 4px rgba(0, 0, 0, 0.3)
              `,
              marginRight: char === ' ' ? '0.3em' : '0.02em',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  );
};

export default AnimatedText;
