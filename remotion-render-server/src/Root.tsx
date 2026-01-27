import React from 'react';
import { Composition } from 'remotion';
import { HelloWorld } from './HelloWorld';
import { SupabaseVideo } from './SupabaseVideo';
import { DynamicVideo } from './DynamicVideo';
import type { VideoPlan } from './types/video';

// This is the entry point for Remotion Studio
// Register all your compositions here

// Empty default plan for Studio preview
// When rendering via API, the actual video plan should be passed via inputProps
const defaultStudioPlan: VideoPlan = {
  id: 'default-studio',
  duration: 5,
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  scenes: [],
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
        defaultProps={{
          plan: defaultStudioPlan,
        }}
        calculateMetadata={({ props }) => {
          const plan = props.plan as VideoPlan;
          
          // Use plan values if available, otherwise fall back to defaults
          const fps = plan?.fps || 30;
          const duration = plan?.duration || 5;
          const width = plan?.resolution?.width || 1920;
          const height = plan?.resolution?.height || 1080;
          
          return {
            fps,
            durationInFrames: Math.round(duration * fps),
            width,
            height,
          };
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
