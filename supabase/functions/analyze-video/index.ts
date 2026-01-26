// analyze-video edge function
// This function analyzes video files to extract patterns, colors, and timing information
// that can be used to generate similar videos with Remotion

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  videoUrl?: string;
  videoName?: string;
  description?: string;
}

interface VideoPattern {
  id: string;
  name: string;
  duration: number;
  colors: string[];
  typography?: {
    primaryFont?: string;
    secondaryFont?: string;
    style?: string;
  };
  scenes: Array<{
    startTime: number;
    endTime: number;
    description: string;
    transition?: string;
    animation?: string;
  }>;
  metadata: {
    analyzedAt: string;
    source: string;
    contentType?: string;
  };
}

/**
 * Extract visual patterns from video metadata
 * This is a simplified approach since direct video frame analysis requires
 * downloading the video and using computer vision libraries
 */
function generatePatternFromMetadata(
  videoName: string,
  description?: string
): Omit<VideoPattern, 'id'> {
  // Infer content type from name and description
  const lowerName = videoName.toLowerCase();
  const lowerDesc = (description || '').toLowerCase();
  
  let contentType = 'commercial';
  let colors = ['#000000', '#FFFFFF'];
  let sceneCount = 3;
  let duration = 15;
  
  // Detect content type and adjust defaults
  if (lowerName.includes('tech') || lowerDesc.includes('tech') || lowerName.includes('saas')) {
    contentType = 'tech-demo';
    colors = ['#0066CC', '#FFFFFF', '#F0F0F0', '#333333'];
    sceneCount = 4;
    duration = 20;
  } else if (lowerName.includes('product') || lowerDesc.includes('product')) {
    contentType = 'product-showcase';
    colors = ['#FF6B6B', '#4ECDC4', '#FFFFFF', '#2C3E50'];
    sceneCount = 3;
    duration = 15;
  } else if (lowerName.includes('explainer') || lowerDesc.includes('explainer')) {
    contentType = 'explainer';
    colors = ['#6C5CE7', '#FFFFFF', '#FDB462', '#2ECC71'];
    sceneCount = 5;
    duration = 30;
  } else if (lowerName.includes('social') || lowerDesc.includes('social')) {
    contentType = 'social-media';
    colors = ['#E91E63', '#00BCD4', '#FFEB3B', '#FFFFFF'];
    sceneCount = 2;
    duration = 10;
  }

  // Generate scenes based on content type
  const scenes: VideoPattern['scenes'] = [];
  const sceneDuration = duration / sceneCount;
  
  for (let i = 0; i < sceneCount; i++) {
    const startTime = i * sceneDuration;
    const endTime = (i + 1) * sceneDuration;
    
    let sceneDescription = '';
    let transition = '';
    let animation = '';
    
    if (i === 0) {
      sceneDescription = 'Opening scene with brand introduction';
      transition = 'fade';
      animation = 'slideUp';
    } else if (i === sceneCount - 1) {
      sceneDescription = 'Call-to-action and closing';
      transition = 'fade';
      animation = 'zoomIn';
    } else {
      sceneDescription = `Main content segment ${i}`;
      transition = i % 2 === 0 ? 'slide' : 'wipe';
      animation = ['slideLeft', 'slideRight', 'fadeIn', 'scaleIn'][i % 4];
    }
    
    scenes.push({
      startTime,
      endTime,
      description: sceneDescription,
      transition,
      animation,
    });
  }

  return {
    name: videoName.replace(/\.[^/.]+$/, ''), // Remove file extension
    duration,
    colors,
    typography: {
      primaryFont: 'Inter, sans-serif',
      secondaryFont: 'Roboto, sans-serif',
      style: 'modern',
    },
    scenes,
    metadata: {
      analyzedAt: new Date().toISOString(),
      source: videoName,
      contentType,
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase configuration missing' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the analyze request
    const analyzeRequest: AnalyzeRequest = await req.json()
    
    console.log('Video analysis request received:', {
      videoUrl: analyzeRequest.videoUrl,
      videoName: analyzeRequest.videoName,
    })

    // Validate request
    if (!analyzeRequest.videoUrl && !analyzeRequest.videoName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either videoUrl or videoName is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract video name from URL or use provided name
    const videoName = analyzeRequest.videoName || 
      analyzeRequest.videoUrl?.split('/').pop() || 
      'untitled-video';

    // Generate pattern from metadata
    // Note: For true video analysis, you would need to:
    // 1. Download the video file
    // 2. Extract frames using FFmpeg or similar
    // 3. Analyze frames for colors, objects, text using computer vision
    // 4. Detect scene changes and transitions
    // This simplified version generates reasonable patterns based on filename/description
    
    const patternData = generatePatternFromMetadata(
      videoName,
      analyzeRequest.description
    );

    // Generate a unique ID for the pattern
    const patternId = crypto.randomUUID();

    const pattern: VideoPattern = {
      id: patternId,
      ...patternData,
    };

    // Store pattern in database (assuming a video_patterns table exists)
    // If the table doesn't exist, we'll just return the pattern
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('video_patterns')
        .insert({
          id: patternId,
          name: pattern.name,
          pattern_data: pattern,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Could not store pattern in database:', insertError.message);
        console.log('Returning pattern without database storage');
      } else {
        console.log('Pattern stored successfully:', insertData);
      }
    } catch (dbError) {
      console.warn('Database operation failed:', dbError);
      console.log('Continuing without database storage');
    }

    console.log('Video analysis completed:', patternId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video analyzed successfully',
        pattern,
        note: 'This is a metadata-based analysis. For deep video analysis with frame extraction and computer vision, additional tools like FFmpeg and ML models would be required.',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Analyze video error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        details: 'Failed to analyze video. Ensure the request includes valid video information.',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
