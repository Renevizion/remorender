import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { PlannedElement, VideoPlan } from '../types/video';

interface PhoneMockupProps {
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle?: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
  children?: React.ReactNode;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  element,
  style,
  colors,
  sceneFrame,
  children,
}) => {
  const { fps } = useVideoConfig();

  // Entry animation
  const entrySpring = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 40, stiffness: 60, mass: 1.2 },
  });

  const rotateY = interpolate(entrySpring, [0, 1], [-20, 0]);
  const translateY = interpolate(entrySpring, [0, 1], [100, 0]);
  const scale = interpolate(entrySpring, [0, 1], [0.8, 1]);

  // Subtle floating animation
  const floatY = Math.sin(sceneFrame * 0.02) * 5;

  // Screen glow effect
  const glowIntensity = interpolate(
    sceneFrame,
    [0, fps * 1, fps * 3],
    [0, 1, 0.7],
    { extrapolateRight: 'clamp' }
  );

  const phoneWidth = element.size?.width || 280;
  const phoneHeight = element.size?.height || 560;

  // Phone type: 'iphone', 'android', 'generic'
  const phoneType = (element.style as any)?.phoneType || 'iphone';

  return (
    <div
      style={{
        ...style,
        perspective: '1500px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        style={{
          transform: `
            rotateY(${rotateY}deg) 
            translateY(${translateY + floatY}px) 
            scale(${scale})
          `,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Phone body */}
        <div
          style={{
            width: phoneWidth,
            height: phoneHeight,
            background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
            borderRadius: phoneType === 'iphone' ? 45 : 30,
            border: '3px solid #3a3a3a',
            boxShadow: `
              0 40px 80px rgba(0,0,0,0.5),
              0 20px 40px rgba(0,0,0,0.3),
              0 0 ${30 * glowIntensity}px rgba(59, 130, 246, ${0.3 * glowIntensity}),
              inset 0 1px 0 rgba(255,255,255,0.1)
            `,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Notch (iPhone style) */}
          {phoneType === 'iphone' && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 120,
                height: 25,
                background: '#0a0a0a',
                borderRadius: '0 0 20px 20px',
                zIndex: 10,
              }}
            >
              {/* Camera */}
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                }}
              />
            </div>
          )}

          {/* Screen */}
          <div
            style={{
              flex: 1,
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: phoneType === 'iphone' ? 37 : 22,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {children || (
              <div
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 14,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                Screen Content
              </div>
            )}
          </div>

          {/* Home indicator (iPhone style) */}
          {phoneType === 'iphone' && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 120,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.3)',
              }}
            />
          )}
        </div>

        {/* Shadow underneath */}
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: phoneWidth * 0.8,
            height: 80,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      </div>
    </div>
  );
};
