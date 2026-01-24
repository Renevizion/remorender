// renderService.ts
import { RENDER_SERVER_URL } from './config';

export interface CompositionConfig {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export interface RenderResponse {
  success: boolean;
  videoUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Render a Remotion video on Railway server
 * @param remotionCode - The Remotion component code as a string
 * @param composition - Composition configuration
 * @param inputProps - Optional input properties for the composition
 * @returns Promise with video URL
 */
export async function renderVideoOnRailway(
  remotionCode: string,
  composition: CompositionConfig,
  inputProps?: any
): Promise<string> {
  
  const response = await fetch(`${RENDER_SERVER_URL}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: remotionCode,
      composition,
      inputProps
    })
  });
  
  if (!response.ok) {
    throw new Error(`Render failed: ${response.statusText}`);
  }
  
  const data: RenderResponse = await response.json();
  
  if (!data.success || !data.videoUrl) {
    throw new Error(data.error || 'Render failed');
  }
  
  return data.videoUrl;
}

/**
 * Simple render for testing
 * @param text - Text to display
 * @param duration - Duration in frames (default: 90)
 * @returns Promise with video URL
 */
export async function renderSimpleVideo(
  text: string,
  duration?: number
): Promise<string> {
  const response = await fetch(`${RENDER_SERVER_URL}/render-simple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, duration })
  });
  
  if (!response.ok) {
    throw new Error(`Render failed: ${response.statusText}`);
  }
  
  const data: RenderResponse = await response.json();
  
  if (!data.success || !data.videoUrl) {
    throw new Error(data.error || 'Render failed');
  }
  
  return data.videoUrl;
}

/**
 * Check server health
 * @returns Promise with health status
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RENDER_SERVER_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
