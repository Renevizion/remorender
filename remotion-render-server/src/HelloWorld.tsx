import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface HelloWorldProps {
  titleText: string;
  titleColor: string;
  logoColor1: string;
  logoColor2: string;
}

export const HelloWorld: React.FC<HelloWorldProps> = ({
  titleText,
  titleColor,
  logoColor1,
  logoColor2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame,
    config: {
      damping: 100,
    },
  });

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <h1
          style={{
            fontSize: 100,
            fontWeight: 'bold',
            color: titleColor,
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {titleText}
        </h1>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 40,
            gap: 20,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${logoColor1}, ${logoColor2})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
