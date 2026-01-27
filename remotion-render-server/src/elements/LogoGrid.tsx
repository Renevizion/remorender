import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { PlannedElement, VideoPlan } from '../types/video';

interface LogoGridProps {
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle?: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
}

interface Logo {
  url: string;
  name: string;
}

export const LogoGrid: React.FC<LogoGridProps> = ({
  element,
  style,
  colors,
  sceneFrame,
}) => {
  const { fps } = useVideoConfig();

  // Get logos from element content (comma-separated URLs or logo objects)
  const logosData = (element.style as any)?.logos || [];
  const logos: Logo[] = typeof logosData === 'string' 
    ? logosData.split(',').map((url: string, i: number) => ({ url: url.trim(), name: `Logo ${i + 1}` }))
    : logosData;

  // Layout configuration
  const columns = (element.style as any)?.columns || 4;
  const rows = Math.ceil(logos.length / columns);
  const logoSize = (element.style as any)?.logoSize || 100;
  const gap = (element.style as any)?.gap || 40;

  // Animation type: 'fade', 'scroll-horizontal', 'scroll-vertical', 'zoom'
  const animationType = (element.style as any)?.animation || 'fade';

  // Calculate grid dimensions
  const gridWidth = columns * logoSize + (columns - 1) * gap;
  const gridHeight = rows * logoSize + (rows - 1) * gap;

  return (
    <div style={{ ...style, overflow: 'hidden' }}>
      {animationType === 'scroll-horizontal' && (
        <ScrollingLogos
          logos={logos}
          logoSize={logoSize}
          gap={gap}
          direction="horizontal"
          sceneFrame={sceneFrame}
          fps={fps}
        />
      )}
      {animationType === 'scroll-vertical' && (
        <ScrollingLogos
          logos={logos}
          logoSize={logoSize}
          gap={gap}
          direction="vertical"
          sceneFrame={sceneFrame}
          fps={fps}
        />
      )}
      {(animationType === 'fade' || animationType === 'zoom') && (
        <StaticGrid
          logos={logos}
          columns={columns}
          logoSize={logoSize}
          gap={gap}
          animationType={animationType}
          sceneFrame={sceneFrame}
          fps={fps}
        />
      )}
    </div>
  );
};

const ScrollingLogos: React.FC<{
  logos: Logo[];
  logoSize: number;
  gap: number;
  direction: 'horizontal' | 'vertical';
  sceneFrame: number;
  fps: number;
}> = ({ logos, logoSize, gap, direction, sceneFrame, fps }) => {
  // Scroll speed (pixels per frame)
  const scrollSpeed = 2;
  const totalScroll = sceneFrame * scrollSpeed;

  // Duplicate logos for seamless loop
  const displayLogos = [...logos, ...logos, ...logos];

  const isHorizontal = direction === 'horizontal';
  const itemSize = logoSize + gap;
  const offset = -(totalScroll % (logos.length * itemSize));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        gap,
        transform: isHorizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`,
      }}
    >
      {displayLogos.map((logo, i) => (
        <div
          key={i}
          style={{
            width: logoSize,
            height: logoSize,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {logo.url.startsWith('http') ? (
            <img
              src={logo.url}
              alt={logo.name}
              style={{
                maxWidth: logoSize * 0.7,
                maxHeight: logoSize * 0.7,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                fontFamily: 'Inter, system-ui, sans-serif',
                textAlign: 'center',
                padding: 8,
              }}
            >
              {logo.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const StaticGrid: React.FC<{
  logos: Logo[];
  columns: number;
  logoSize: number;
  gap: number;
  animationType: string;
  sceneFrame: number;
  fps: number;
}> = ({ logos, columns, logoSize, gap, animationType, sceneFrame, fps }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, ${logoSize}px)`,
        gap,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {logos.map((logo, i) => {
        const delay = i * 3;
        const progress = spring({
          fps,
          frame: Math.max(0, sceneFrame - delay),
          config: { damping: 20, stiffness: 80 },
        });

        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const scale =
          animationType === 'zoom'
            ? interpolate(progress, [0, 1], [0.5, 1])
            : 1;

        return (
          <div
            key={i}
            style={{
              width: logoSize,
              height: logoSize,
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity,
              transform: `scale(${scale})`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            {logo.url.startsWith('http') ? (
              <img
                src={logo.url}
                alt={logo.name}
                style={{
                  maxWidth: logoSize * 0.7,
                  maxHeight: logoSize * 0.7,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  textAlign: 'center',
                  padding: 8,
                }}
              >
                {logo.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
