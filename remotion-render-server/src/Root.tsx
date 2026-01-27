import React from 'react';
import { Composition } from 'remotion';
import { HelloWorld } from './HelloWorld';
import { SupabaseVideo } from './SupabaseVideo';
import { DynamicVideo } from './DynamicVideo';
import type { VideoPlan } from './types/video';

// This is the entry point for Remotion Studio
// Register all your compositions here

// Sample video plan for DynamicVideo
const samplePlan: VideoPlan = {
  id: 'sample-1',
  duration: 5,
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  scenes: [
    {
      id: 'scene-1',
      startTime: 0,
      duration: 5,
      description: 'Welcome scene with animated text',
      elements: [
        {
          id: 'text-1',
          type: 'text',
          content: 'Welcome to Remotion',
          position: { x: 50, y: 50, z: 1 },
          size: { width: 80, height: 20 },
          style: { fontSize: 72, fontWeight: 800 },
          animation: {
            name: 'fadeIn',
            type: 'fade',
            duration: 1,
            delay: 0,
            easing: 'ease-out',
            properties: {},
          },
        },
      ],
      animations: [],
      transition: null,
    },
  ],
  requiredAssets: [],
  style: {
    colorPalette: ['#ffffff', '#06b6d4', '#1e293b', '#0f172a'],
    typography: {
      primary: 'Inter',
      secondary: 'Roboto',
      sizes: {},
    },
    spacing: 8,
    borderRadius: 8,
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* DynamicVideo composition - Main composition for frontend */}
      <Composition
        id="DynamicVideo"
        component={DynamicVideo as any}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          plan: samplePlan,
        }}
      />

      {/* Sample composition for testing */}
      <Composition
        id="HelloWorld"
        component={HelloWorld as any}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: 'Welcome to Remotion Studio',
          titleColor: '#000000',
          logoColor1: '#91EAE4',
          logoColor2: '#86A8E7',
        }}
      />

      {/* Composition for working with Supabase videos */}
      <Composition
        id="SupabaseVideo"
        component={SupabaseVideo as any}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoUrl: process.env.REMOTION_VIDEO_URL || '',
          text: 'Edit Me in Studio',
        }}
      />
    </>
  );
};
