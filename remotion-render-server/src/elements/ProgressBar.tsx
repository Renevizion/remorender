import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing, interpolateColors } from 'remotion';
import type { PlannedElement, VideoPlan } from '../types/video';

interface ProgressBarProps {
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle?: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  element, 
  style, 
  colors, 
  sceneFrame 
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  
  const fileName = element.content || 'video.mp4';
  
  // Progress animation - eased progress from 0 to 100%
  const progressDuration = fps * 3; // 3 seconds to complete
  const progressDelay = fps * 0.5;
  
  const rawProgress = interpolate(
    sceneFrame,
    [progressDelay, progressDelay + progressDuration],
    [0, 100],
    { 
      extrapolateLeft: 'clamp', 
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }
  );
  
  const progress = Math.floor(rawProgress);
  
  // Entry animation
  const entrySpring = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 30, stiffness: 100, mass: 0.8 },
  });
  
  const slideUp = interpolate(entrySpring, [0, 1], [60, 0]);
  const entryOpacity = entrySpring;
  
  // 3D rotation for the file card
  const rotateY = interpolate(entrySpring, [0, 1], [25, 15]);
  const rotateX = interpolate(entrySpring, [0, 1], [-10, -5]);
  
  // Completion animation
  const isComplete = progress >= 100;
  const completePulse = isComplete ? 
    1 + Math.sin((sceneFrame - progressDelay - progressDuration) * 0.2) * 0.03 : 1;
  
  // File icon animation
  const iconBounce = spring({
    fps,
    frame: Math.max(0, sceneFrame - progressDelay - progressDuration),
    config: { damping: 15, stiffness: 200, mass: 0.5 },
  });
  
  const iconScale = isComplete ? interpolate(iconBounce, [0, 1], [1, 1.1]) : 1;
  
  // Dynamic zoom effect
  const zoomProgress = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 100, stiffness: 70, mass: 0.9 },
  });
  const scale = interpolate(zoomProgress, [0, 1], [0.9, 1]);
  
  // Progress bar glow
  const progressGlow = interpolate(
    progress,
    [0, 50, 100],
    [0, 0.5, 1]
  );
  
  // Dynamic color shift for progress bar
  const progressColor = interpolateColors(
    progress,
    [0, 50, 100],
    ['#3b82f6', '#6366f1', '#10b981']
  );

  return (
    <div
      style={{
        ...style,
        perspective: '1200px',
        opacity: entryOpacity,
        transform: `${style.transform} translateY(${slideUp}px) scale(${scale})`,
      }}
    >
      {/* Main container with 3D effect */}
      <div
        style={{
          width: 380,
          padding: '24px 28px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)',
          borderRadius: 20,
          boxShadow: `
            0 40px 80px rgba(0,0,0,0.15),
            0 20px 40px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,1)
          `,
          transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${completePulse})`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Header with file icon and name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}>
          {/* File icon */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isComplete 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isComplete 
                ? '0 8px 24px rgba(16, 185, 129, 0.35)'
                : '0 8px 24px rgba(59, 130, 246, 0.35)',
              transform: `scale(${iconScale})`,
              transition: 'background 0.3s ease',
            }}
          >
            {isComplete ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M5 13l4 4L19 7" 
                  stroke="white" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" 
                  fill="white" 
                  opacity="0.3"
                />
                <path 
                  d="M14 2v6h6M16 13H8M16 17H8M10 9H8" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          
          {/* File name and status */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'SF Pro Display', -apple-system, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}>
              {fileName}
            </div>
            <div style={{
              fontFamily: "'SF Pro Text', -apple-system, sans-serif",
              fontSize: 13,
              color: isComplete ? '#10b981' : '#64748b',
              marginTop: 2,
            }}>
              {isComplete ? 'Rendering complete' : 'Rendering...'}
            </div>
          </div>
          
          {/* Percentage */}
          <div style={{
            fontFamily: "'SF Mono', monospace",
            fontSize: 18,
            fontWeight: 700,
            color: '#0f172a',
          }}>
            {progress}%
          </div>
        </div>
        
        {/* Progress bar track */}
        <div
          style={{
            height: 10,
            background: 'linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 100%)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {/* Progress bar fill */}
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: isComplete 
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                : `linear-gradient(90deg, ${progressColor} 0%, ${interpolateColors(progress, [0, 100], ['#60a5fa', '#34d399'])} 100%)`,
              borderRadius: 10,
              boxShadow: isComplete
                ? '0 0 20px rgba(16, 185, 129, 0.5)'
                : `0 0 ${30 * progressGlow}px rgba(59, 130, 246, ${0.6 * progressGlow})`,
              transition: 'background 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
