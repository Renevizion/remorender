// render-video edge function
// This function receives render requests from the client and forwards them to Railway

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RenderRequest {
  planId: string;
  code: string;
  composition: {
    id: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  inputProps?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const railwayRenderUrl = Deno.env.get('RAILWAY_RENDER_URL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Validate Railway URL is configured
    if (!railwayRenderUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RAILWAY_RENDER_URL environment variable is not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the render request
    const renderRequest: RenderRequest = await req.json()
    
    console.log('Render request received for plan:', renderRequest.planId)

    // Validate required fields
    if (!renderRequest.planId || !renderRequest.code || !renderRequest.composition) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: planId, code, or composition' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the plan to get resolution settings
    const { data: planData, error: planError } = await supabase
      .from('video_plans')
      .select('plan')
      .eq('id', renderRequest.planId)
      .single()

    if (planError || !planData) {
      console.error('Failed to fetch video plan:', planError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch video plan. Plan may not exist.' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract resolution from plan (with fallback to composition values)
    const planResolution = planData.plan?.resolution
    const width = planResolution?.width || renderRequest.composition.width
    const height = planResolution?.height || renderRequest.composition.height
    const aspectRatio = width / height

    console.log(`Using resolution: ${width}x${height} (aspect ratio: ${aspectRatio.toFixed(2)})`)

    // Update composition with plan resolution
    const compositionWithResolution = {
      ...renderRequest.composition,
      width,
      height,
    }

    // Update status to rendering
    await supabase
      .from('video_plans')
      .update({ status: 'rendering' })
      .eq('id', renderRequest.planId)

    // Construct the webhook callback URL
    // This URL will be called by Railway when rendering is complete
    const webhookUrl = `${supabaseUrl}/functions/v1/render-webhook`
    
    // Generate a unique job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Prepare payload for Railway
    const railwayPayload = {
      jobId,
      planId: renderRequest.planId,
      code: renderRequest.code,
      composition: compositionWithResolution, // Use updated composition with plan.resolution
      inputProps: renderRequest.inputProps || {},
      webhookUrl, // Railway will call this URL when done
      aspectRatio, // Include aspect ratio for validation/logging
    }

    console.log('Sending render job to Railway:', jobId)

    // Send the render request to Railway
    const railwayResponse = await fetch(`${railwayRenderUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(railwayPayload),
    })

    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text()
      console.error('Railway render request failed:', errorText)
      
      // Update status to failed
      await supabase
        .from('video_plans')
        .update({ 
          status: 'failed',
          error_message: `Railway request failed: ${railwayResponse.statusText}` 
        })
        .eq('id', renderRequest.planId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to initiate render on Railway',
          details: errorText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const railwayResult = await railwayResponse.json()
    console.log('Railway accepted render job:', railwayResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Render job submitted to Railway successfully',
        jobId,
        planId: renderRequest.planId,
        status: 'rendering'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Render video edge function error:', error)
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
