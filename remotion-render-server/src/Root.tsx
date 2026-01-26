import React from 'react';
import { Composition } from 'remotion';
import { HelloWorld } from './HelloWorld';
import { SupabaseVideo } from './SupabaseVideo';

// This is the entry point for Remotion Studio
// Register all your compositions here

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Sample composition for testing */}
      <Composition
        id="HelloWorld"
        component={HelloWorld}
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
        component={SupabaseVideo}
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
