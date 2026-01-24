// videoManager.ts
// Example integration with Supabase for video plan management
import { createClient } from '@supabase/supabase-js';
import { renderVideoOnRailway, CompositionConfig } from './renderService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface VideoPlan {
  id: string;
  generated_code: string;
  plan: {
    duration: number;
    [key: string]: any;
  };
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  final_video_url?: string;
}

/**
 * Handle video rendering with Supabase integration
 * @param planId - ID of the video plan in Supabase
 * @returns Promise with video URL
 */
export async function handleRenderVideo(planId: string): Promise<string> {
  // Get plan from Supabase
  const { data, error } = await supabase
    .from('video_plans')
    .select('generated_code, plan')
    .eq('id', planId)
    .single();
  
  if (error || !data) {
    throw new Error('Failed to fetch video plan');
  }
  
  // Update status to rendering
  await supabase
    .from('video_plans')
    .update({ status: 'rendering' })
    .eq('id', planId);
  
  try {
    // Send to Railway for rendering
    const videoUrl = await renderVideoOnRailway(
      data.generated_code,
      {
        id: 'MyVideo',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: data.plan.duration * 30
      }
    );
    
    // Update with result
    await supabase
      .from('video_plans')
      .update({ 
        status: 'completed',
        final_video_url: videoUrl
      })
      .eq('id', planId);
    
    return videoUrl;
    
  } catch (error) {
    // Update status to failed
    await supabase
      .from('video_plans')
      .update({ status: 'failed' })
      .eq('id', planId);
    
    throw error;
  }
}

/**
 * Get video plan status
 * @param planId - ID of the video plan
 * @returns Promise with video plan
 */
export async function getVideoPlanStatus(planId: string): Promise<VideoPlan | null> {
  const { data, error } = await supabase
    .from('video_plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (error) {
    console.error('Failed to fetch video plan:', error);
    return null;
  }
  
  return data as VideoPlan;
}
