// edgeFunctionService.ts
// Service for rendering videos using Supabase Edge Functions (Webhook approach)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CompositionConfig {
  id: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export interface RenderJobResponse {
  success: boolean;
  jobId: string;
  planId: string;
  status: string;
  message?: string;
  error?: string;
}

/**
 * Render a Remotion video using the edge function webhook approach
 * This method submits the render job and returns immediately.
 * The video URL will be stored in Supabase when rendering is complete.
 * 
 * @param planId - ID of the video plan in Supabase
 * @param remotionCode - The Remotion component code as a string
 * @param composition - Composition configuration
 * @param inputProps - Optional input properties for the composition
 * @returns Promise with job information
 */
export async function renderVideoViaEdgeFunction(
  planId: string,
  remotionCode: string,
  composition: CompositionConfig,
  inputProps?: any
): Promise<RenderJobResponse> {
  
  // Call the render-video edge function
  const { data, error } = await supabase.functions.invoke('render-video', {
    body: {
      planId,
      code: remotionCode,
      composition,
      inputProps
    }
  });

  if (error) {
    throw new Error(`Failed to initiate render: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Render initiation failed');
  }

  return data as RenderJobResponse;
}

/**
 * Poll for video plan status until rendering is complete
 * 
 * @param planId - ID of the video plan
 * @param onProgress - Optional callback for status updates
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns Promise with the final video URL
 */
export async function waitForRenderCompletion(
  planId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<string> {
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('video_plans')
      .select('status, final_video_url, error_message')
      .eq('id', planId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch video plan: ${error.message}`);
    }

    if (onProgress) {
      onProgress(data.status);
    }

    if (data.status === 'completed' && data.final_video_url) {
      return data.final_video_url;
    }

    if (data.status === 'failed') {
      throw new Error(data.error_message || 'Render failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Render timeout: Maximum polling attempts reached');
}

/**
 * Render video and wait for completion
 * Combines renderVideoViaEdgeFunction and waitForRenderCompletion
 * 
 * @param planId - ID of the video plan in Supabase
 * @param remotionCode - The Remotion component code as a string
 * @param composition - Composition configuration
 * @param inputProps - Optional input properties for the composition
 * @param onProgress - Optional callback for status updates
 * @returns Promise with the final video URL
 */
export async function renderAndWaitForVideo(
  planId: string,
  remotionCode: string,
  composition: CompositionConfig,
  inputProps?: any,
  onProgress?: (status: string) => void
): Promise<string> {
  
  // Initiate render
  const jobResponse = await renderVideoViaEdgeFunction(
    planId,
    remotionCode,
    composition,
    inputProps
  );

  console.log('Render job submitted:', jobResponse);

  // Wait for completion
  const videoUrl = await waitForRenderCompletion(planId, onProgress);

  return videoUrl;
}

/**
 * Subscribe to real-time updates for a video plan
 * Uses Supabase real-time subscriptions for immediate status updates
 * 
 * @param planId - ID of the video plan
 * @param onStatusChange - Callback for status changes
 * @returns Unsubscribe function
 */
export function subscribeToRenderStatus(
  planId: string,
  onStatusChange: (status: string, videoUrl?: string, error?: string) => void
) {
  const subscription = supabase
    .channel(`video_plan_${planId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_plans',
        filter: `id=eq.${planId}`
      },
      (payload) => {
        const { status, final_video_url, error_message } = payload.new as any;
        onStatusChange(status, final_video_url, error_message);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}
