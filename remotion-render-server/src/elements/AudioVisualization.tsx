/**
 * REAL Audio Visualization using @remotion/media-utils
 * 
 * This is NOT simulated - it uses actual audio data from files.
 * YOU CAN TEST THIS with any MP3/WAV file.
 */

import { useEffect, useState } from 'react';
import { useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';

interface AudioVisualizationProps {
  audioSrc: string; // Path to audio file
  visualizationType?: 'bars' | 'waveform' | 'circular' | 'spectrum';
  numberOfSamples?: number;
  color?: string;
  mirrorWave?: boolean;
  smoothing?: number;
}

export function AudioVisualization({
  audioSrc,
  visualizationType = 'bars',
  numberOfSamples = 128,
  color = '#3b82f6',
  mirrorWave = false,
  smoothing = 0.8,
}: AudioVisualizationProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Get REAL audio data from the file
  const audioData = useAudioData(audioSrc);

  if (!audioData) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
        }}
      >
        Loading audio...
      </div>
    );
  }

  // Visualize the audio at current frame
  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples,
  });

  return (
    <>
      {/* Play the audio */}
      <Audio src={audioSrc} />

      {/* Render visualization */}
      <div
        style={{
          width,
          height,
          background: '#000',
          position: 'relative',
        }}
      >
        {visualizationType === 'bars' && (
          <BarsVisualization
            data={visualization}
            width={width}
            height={height}
            color={color}
          />
        )}

        {visualizationType === 'waveform' && (
          <WaveformVisualization
            data={visualization}
            width={width}
            height={height}
            color={color}
            mirrorWave={mirrorWave}
          />
        )}

        {visualizationType === 'circular' && (
          <CircularVisualization
            data={visualization}
            width={width}
            height={height}
            color={color}
          />
        )}

        {visualizationType === 'spectrum' && (
          <SpectrumVisualization
            data={visualization}
            width={width}
            height={height}
            color={color}
          />
        )}
      </div>
    </>
  );
}

/**
 * Bars visualization (like music players)
 */
function BarsVisualization({
  data,
  width,
  height,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
}) {
  const barWidth = width / data.length;

  return (
    <svg width={width} height={height}>
      {data.map((value, i) => {
        const barHeight = value * height * 0.8;
        const x = i * barWidth;
        const y = height - barHeight;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth * 0.8}
            height={barHeight}
            fill={color}
            rx={2}
          />
        );
      })}
    </svg>
  );
}

/**
 * Waveform visualization
 */
function WaveformVisualization({
  data,
  width,
  height,
  color,
  mirrorWave,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
  mirrorWave: boolean;
}) {
  const midY = height / 2;
  const points = data
    .map((value, i) => {
      const x = (i / data.length) * width;
      const y = midY - value * height * 0.4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {mirrorWave && (
        <polyline
          points={data
            .map((value, i) => {
              const x = (i / data.length) * width;
              const y = midY + value * height * 0.4;
              return `${x},${y}`;
            })
            .join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5}
        />
      )}
    </svg>
  );
}

/**
 * Circular visualization (radial bars)
 */
function CircularVisualization({
  data,
  width,
  height,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
}) {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.2;
  const maxRadius = Math.min(width, height) * 0.45;

  return (
    <svg width={width} height={height}>
      {data.map((value, i) => {
        const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
        const innerRadius = baseRadius;
        const outerRadius = baseRadius + value * (maxRadius - baseRadius);

        const x1 = centerX + Math.cos(angle) * innerRadius;
        const y1 = centerY + Math.sin(angle) * innerRadius;
        const x2 = centerX + Math.cos(angle) * outerRadius;
        const y2 = centerY + Math.sin(angle) * outerRadius;

        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/**
 * Spectrum visualization (frequency spectrum)
 */
function SpectrumVisualization({
  data,
  width,
  height,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
}) {
  const barWidth = width / data.length;

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="spectrumGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
      </defs>

      {data.map((value, i) => {
        const barHeight = value * height;
        const x = i * barWidth;
        const y = height - barHeight;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth * 0.9}
            height={barHeight}
            fill="url(#spectrumGradient)"
          />
        );
      })}
    </svg>
  );
}

/**
 * Example composition showing all visualization types
 */
export const AudioVisualizationDemo: React.FC = () => {
  // Use a sample audio file - you can replace with any MP3/WAV
  const audioSrc = staticFile('audio-sample.mp3'); // Put audio file in public/ folder

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        width: 1920,
        height: 1080,
      }}
    >
      <AudioVisualization
        audioSrc={audioSrc}
        visualizationType="bars"
        color="#3b82f6"
      />
      <AudioVisualization
        audioSrc={audioSrc}
        visualizationType="waveform"
        color="#10b981"
        mirrorWave={true}
      />
      <AudioVisualization
        audioSrc={audioSrc}
        visualizationType="circular"
        color="#f59e0b"
      />
      <AudioVisualization
        audioSrc={audioSrc}
        visualizationType="spectrum"
        color="#8b5cf6"
      />
    </div>
  );
};
