/**
 * Multi-Aspect Ratio Support
 * 
 * TEST THIS: Switch between landscape, vertical, square in Remotion Studio
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export type AspectRatio =
  | 'landscape' // 16:9 - YouTube, standard
  | 'vertical' // 9:16 - TikTok, Reels, Shorts
  | 'square' // 1:1 - Instagram, Facebook
  | 'ultrawide' // 21:9 - Cinematic
  | 'portrait' // 4:5 - Instagram portrait
  | 'story'; // 9:16 - Instagram Stories

export interface AspectRatioConfig {
  width: number;
  height: number;
  name: string;
  description: string;
  platforms: string[];
}

export const ASPECT_RATIOS: Record<AspectRatio, AspectRatioConfig> = {
  landscape: {
    width: 1920,
    height: 1080,
    name: 'Landscape (16:9)',
    description: 'Standard YouTube, desktop viewing',
    platforms: ['YouTube', 'Vimeo', 'Desktop'],
  },
  vertical: {
    width: 1080,
    height: 1920,
    name: 'Vertical (9:16)',
    description: 'TikTok, Instagram Reels, YouTube Shorts',
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Snapchat'],
  },
  square: {
    width: 1080,
    height: 1080,
    name: 'Square (1:1)',
    description: 'Instagram feed, Facebook',
    platforms: ['Instagram Feed', 'Facebook', 'LinkedIn'],
  },
  ultrawide: {
    width: 2560,
    height: 1080,
    name: 'Ultra-wide (21:9)',
    description: 'Cinematic, ultra-wide monitors',
    platforms: ['Cinema', 'Ultra-wide displays'],
  },
  portrait: {
    width: 1080,
    height: 1350,
    name: 'Portrait (4:5)',
    description: 'Instagram portrait posts',
    platforms: ['Instagram Portrait'],
  },
  story: {
    width: 1080,
    height: 1920,
    name: 'Story (9:16)',
    description: 'Instagram/Facebook Stories',
    platforms: ['Instagram Stories', 'Facebook Stories'],
  },
};

interface ResponsiveContainerProps {
  children: React.ReactNode;
  aspectRatio?: AspectRatio;
  safeArea?: boolean; // Add safe areas for mobile
  backgroundColor?: string;
}

/**
 * Container that adapts content to different aspect ratios
 */
export function ResponsiveContainer({
  children,
  aspectRatio = 'landscape',
  safeArea = false,
  backgroundColor = '#000',
}: ResponsiveContainerProps) {
  const config = ASPECT_RATIOS[aspectRatio];

  // Safe areas for mobile devices (notch, buttons, etc.)
  const safeAreaPadding = safeArea
    ? {
        top: aspectRatio === 'vertical' || aspectRatio === 'story' ? 60 : 0,
        bottom: aspectRatio === 'vertical' || aspectRatio === 'story' ? 80 : 0,
        left: 40,
        right: 40,
      }
    : { top: 0, bottom: 0, left: 0, right: 0 };

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        padding: `${safeAreaPadding.top}px ${safeAreaPadding.right}px ${safeAreaPadding.bottom}px ${safeAreaPadding.left}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
