// render-webhook edge function
// This function receives the rendered video URL from Railway and stores it in Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  jobId: string;
  planId: string;
  status: 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the webhook payload from Railway
    const payload: WebhookPayload = await req.json()
    
    console.log('Webhook received:', payload)

    // Validate required fields
    if (!payload.jobId || !payload.planId || !payload.status) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: jobId, planId, or status' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update the video plan in Supabase
    const updateData: any = {
      status: payload.status,
    }

    if (payload.status === 'completed' && payload.videoUrl) {
      updateData.final_video_url = payload.videoUrl
    } else if (payload.status === 'failed' && payload.error) {
      updateData.error_message = payload.error
    }

    const { data, error } = await supabase
      .from('video_plans')
      .update(updateData)
      .eq('id', payload.planId)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update video plan in database',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Video plan updated successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video plan updated successfully',
        planId: payload.planId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
