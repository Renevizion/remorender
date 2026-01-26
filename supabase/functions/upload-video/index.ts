// upload-video edge function
// This function receives rendered video data from Railway and uploads it to Supabase Storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadRequest {
  planId: string;
  videoBase64: string;
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

    // Parse the upload request from Railway
    const uploadRequest: UploadRequest = await req.json()
    
    console.log('Upload request received for plan:', uploadRequest.planId)

    // Validate required fields
    if (!uploadRequest.planId || !uploadRequest.videoBase64) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: planId or videoBase64' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Decode base64 video data
    console.log('Decoding video data...')
    const videoData = Uint8Array.from(atob(uploadRequest.videoBase64), c => c.charCodeAt(0))

    // Generate unique filename
    const fileName = `${Date.now()}-${uploadRequest.planId}.mp4`
    console.log('Uploading to Supabase Storage:', fileName)

    // Upload video to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rendered-videos')
      .upload(fileName, videoData, {
        contentType: 'video/mp4',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to upload video to storage',
          details: uploadError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get public URL for the uploaded video
    const { data: { publicUrl } } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(fileName)

    console.log('Video uploaded successfully:', publicUrl)

    // Update the video plan in the database with the final video URL
    const { data: updateData, error: updateError } = await supabase
      .from('video_plans')
      .update({ 
        final_video_url: publicUrl,
        status: 'completed'
      })
      .eq('id', uploadRequest.planId)
      .select()

    if (updateError) {
      console.error('Database update error:', updateError)
      // Video is uploaded but DB update failed - log warning but return success with URL
      console.warn('Video uploaded successfully but failed to update database')
    } else {
      console.log('Database updated successfully:', updateData)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video uploaded successfully',
        videoUrl: publicUrl,
        fileName,
        planId: uploadRequest.planId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Upload video error:', error)
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
