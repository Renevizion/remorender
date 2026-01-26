const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();

// Trust proxy for Railway deployment (fixes rate limit warnings)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate limiting to prevent abuse
const renderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 render requests per windowMs
  message: {
    success: false,
    error: 'Too many render requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate environment variables and initialize Supabase if available
const hasSupabaseConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
let supabase = null;

if (hasSupabaseConfig) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('✓ Supabase storage configured');
} else {
  console.warn('⚠️  Warning: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are not set.');
  console.warn('⚠️  The server will start, but video upload functionality will be disabled.');
  console.warn('⚠️  Videos will be rendered but not uploaded to cloud storage.');
}

// Async render processing with webhook callback
async function processRenderWithWebhook(code, composition, inputProps, webhookUrl, jobId, planId) {
  let tempDir = null;
  
  try {
    console.log(`[${jobId}] Processing render asynchronously...`);
    
    // Step 1: Write the Remotion component code to a temp file
    tempDir = path.join(os.tmpdir(), `remotion-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    const entryPoint = path.join(tempDir, 'index.tsx');
    fs.writeFileSync(entryPoint, code);
    
    // Step 2: Bundle the Remotion project
    console.log(`[${jobId}] Bundling...`);
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => config
    });
    
    // Step 3: Select composition
    console.log(`[${jobId}] Selecting composition...`);
    const comp = await selectComposition({
      serveUrl: bundleLocation,
      id: composition.id,
      inputProps: inputProps || {}
    });
    
    // Step 4: Render video
    console.log(`[${jobId}] Rendering video...`);
    const outputPath = path.join(tempDir, 'output.mp4');
    
    await renderMedia({
      composition: comp,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: inputProps || {},
      chromiumOptions: {
        headless: true
      },
      onProgress: ({ progress }) => {
        console.log(`[${jobId}] Render progress: ${Math.round(progress * 100)}%`);
      }
    });
    
    console.log(`[${jobId}] Render complete, uploading...`);
    
    // Step 5: Upload to Supabase (if configured)
    let publicUrl = null;
    let fileName = null;
    
    if (supabase) {
      const videoBuffer = fs.readFileSync(outputPath);
      fileName = `${Date.now()}-${composition.id}.mp4`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rendered-videos')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl: url } } = supabase.storage
        .from('rendered-videos')
        .getPublicUrl(fileName);
      
      publicUrl = url;
      console.log(`[${jobId}] Upload complete:`, publicUrl);
    } else {
      console.warn(`[${jobId}] Supabase not configured - video rendered but not uploaded`);
      publicUrl = 'local-render';
      fileName = `rendered-${composition.id}.mp4`;
    }
    
    // Cleanup temp files
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Call webhook with success
    console.log(`[${jobId}] Calling webhook:`, webhookUrl);
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobId,
        planId,
        status: 'completed',
        videoUrl: publicUrl,
        fileName
      })
    });
    
    if (!webhookResponse.ok) {
      console.error(`[${jobId}] Webhook call failed:`, webhookResponse.statusText);
    } else {
      console.log(`[${jobId}] Webhook called successfully`);
    }
    
  } catch (error) {
    console.error(`[${jobId}] Render error:`, error);
    
    // Cleanup temp files on error
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`[${jobId}] Cleanup error:`, cleanupError);
      }
    }
    
    // Call webhook with failure
    if (webhookUrl) {
      try {
        console.log(`[${jobId}] Calling webhook with error...`);
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId,
            planId,
            status: 'failed',
            error: error.message
          })
        });
      } catch (webhookError) {
        console.error(`[${jobId}] Failed to call webhook:`, webhookError);
      }
    }
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'remotion-render',
    supabaseConfigured: hasSupabaseConfig
  });
});

// Main render endpoint
app.post('/render', renderLimiter, async (req, res) => {
  try {
    const { code, composition, inputProps, webhookUrl, jobId, planId } = req.body;
    
    console.log('Starting render...');
    console.log('Webhook URL:', webhookUrl);
    console.log('Job ID:', jobId);
    console.log('Plan ID:', planId);
    
    // If webhook is provided, respond immediately and process async
    const useWebhook = !!webhookUrl;
    
    if (useWebhook) {
      // Respond immediately to acknowledge receipt
      res.json({
        success: true,
        message: 'Render job accepted',
        jobId,
        planId
      });
      
      // Process render asynchronously (fire-and-forget)
      // Errors are handled within the function and sent to webhook
      processRenderWithWebhook(code, composition, inputProps, webhookUrl, jobId, planId)
        .catch(error => {
          console.error(`[${jobId}] Unhandled error in processRenderWithWebhook:`, error);
        });
      return;
    }
    
    // Otherwise, process synchronously (legacy mode)
    // Step 1: Write the Remotion component code to a temp file
    const tempDir = path.join(os.tmpdir(), `remotion-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    const entryPoint = path.join(tempDir, 'index.tsx');
    fs.writeFileSync(entryPoint, code);
    
    // Step 2: Bundle the Remotion project
    console.log('Bundling...');
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => config
    });
    
    // Step 3: Select composition
    console.log('Selecting composition...');
    const comp = await selectComposition({
      serveUrl: bundleLocation,
      id: composition.id,
      inputProps: inputProps || {}
    });
    
    // Step 4: Render video
    console.log('Rendering video...');
    const outputPath = path.join(tempDir, 'output.mp4');
    
    await renderMedia({
      composition: comp,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: inputProps || {},
      chromiumOptions: {
        headless: true
      },
      onProgress: ({ progress }) => {
        console.log(`Render progress: ${Math.round(progress * 100)}%`);
      }
    });
    
    console.log('Render complete, uploading...');
    
    // Step 5: Upload to Supabase (if configured)
    let publicUrl = null;
    let fileName = null;
    
    if (supabase) {
      const videoBuffer = fs.readFileSync(outputPath);
      fileName = `${Date.now()}-${composition.id}.mp4`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rendered-videos')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl: url } } = supabase.storage
        .from('rendered-videos')
        .getPublicUrl(fileName);
      
      publicUrl = url;
      console.log('Upload complete:', publicUrl);
    } else {
      console.warn('Supabase not configured - video rendered but not uploaded');
      // Return a message instead of file path for security
      publicUrl = 'local-render';
      fileName = `rendered-${composition.id}.mp4`;
    }
    
    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    res.json({
      success: true,
      videoUrl: publicUrl,
      fileName
    });
    
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick render endpoint (for testing)
app.post('/render-simple', renderLimiter, async (req, res) => {
  try {
    const { text, duration } = req.body;
    
    // Use a built-in simple composition
    const simpleCode = `
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const SimpleVideo = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#0a0e27',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ 
        color: '#53a8ff', 
        fontSize: 72,
        opacity 
      }}>
        ${text || 'Hello World'}
      </h1>
    </AbsoluteFill>
  );
};
    `;
    
    // Reuse the main render logic
    const tempDir = path.join(os.tmpdir(), `remotion-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    const entryPoint = path.join(tempDir, 'index.tsx');
    fs.writeFileSync(entryPoint, simpleCode);
    
    console.log('Bundling simple video...');
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => config
    });
    
    console.log('Selecting composition...');
    const comp = await selectComposition({
      serveUrl: bundleLocation,
      id: 'SimpleVideo',
      inputProps: {}
    });
    
    console.log('Rendering simple video...');
    const outputPath = path.join(tempDir, 'output.mp4');
    
    await renderMedia({
      composition: comp,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {},
      chromiumOptions: {
        headless: true
      },
      onProgress: ({ progress }) => {
        console.log(`Render progress: ${Math.round(progress * 100)}%`);
      }
    });
    
    console.log('Upload simple video...');
    let publicUrl = null;
    let fileName = null;
    
    if (supabase) {
      const videoBuffer = fs.readFileSync(outputPath);
      fileName = `${Date.now()}-SimpleVideo.mp4`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rendered-videos')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl: url } } = supabase.storage
        .from('rendered-videos')
        .getPublicUrl(fileName);
      
      publicUrl = url;
    } else {
      console.warn('Supabase not configured - video rendered but not uploaded');
      // Return a message instead of file path for security
      publicUrl = 'local-render';
      fileName = 'rendered-SimpleVideo.mp4';
    }
    
    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    res.json({
      success: true,
      videoUrl: publicUrl,
      fileName
    });
    
  } catch (error) {
    console.error('Simple render error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Remotion render server running on port ${PORT}`);
});
