import React, { useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Video, Img } from 'remotion';

interface SupabaseVideoProps {
  videoUrl: string;
  text: string;
}

/**
 * Composition for working with videos from Supabase
 * 
 * Usage:
 * 1. Set REMOTION_VIDEO_URL environment variable to your Supabase video URL
 * 2. Run: REMOTION_VIDEO_URL="https://your-supabase-url.com/video.mp4" npm run dev
 * 3. Edit the composition in Remotion Studio
 */
export const SupabaseVideo: React.FC<SupabaseVideoProps> = ({
  videoUrl,
  text,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [videoError, setVideoError] = useState(false);

  // Fade in text animation
  const textOpacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill>
      {/* Background Video from Supabase */}
      {videoUrl && !videoError && (
        <Video
          src={videoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={() => {
            console.error('Failed to load video:', videoUrl);
            setVideoError(true);
          }}
        />
      )}

      {/* If no video URL or video failed to load, show a placeholder */}
      {(!videoUrl || videoError) && (
        <AbsoluteFill
          style={{
            backgroundColor: '#1a1a1a',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 40,
              textAlign: 'center',
              padding: 40,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {videoError ? (
              <>
                <p style={{ marginBottom: 20, color: '#ff6b6b' }}>
                  ⚠️ Failed to load video
                </p>
                <p style={{ fontSize: 24, opacity: 0.7 }}>
                  Check that the URL is valid and accessible
                </p>
                <p style={{ fontSize: 18, opacity: 0.5, marginTop: 20 }}>
                  URL: {videoUrl}
                </p>
              </>
            ) : (
              <>
                <p style={{ marginBottom: 20 }}>No video URL provided</p>
                <p style={{ fontSize: 24, opacity: 0.7 }}>
                  Set REMOTION_VIDEO_URL environment variable
                </p>
                <p style={{ fontSize: 18, opacity: 0.5, marginTop: 20 }}>
                  Example: REMOTION_VIDEO_URL="https://your-supabase-url.com/video.mp4" npm run dev
                </p>
              </>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* Overlay Text */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 40,
            borderRadius: 20,
          }}
        >
          <h1
            style={{
              color: 'white',
              fontSize: 80,
              fontWeight: 'bold',
              textAlign: 'center',
              margin: 0,
              fontFamily: 'Arial, sans-serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {text}
          </h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
