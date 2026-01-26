const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const videoAnalysis = require('./videoAnalysis');

const app = express();

// Trust proxy for Railway deployment (fixes rate limit warnings)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Webpack override function to ensure React and Remotion packages are properly resolved
// This fixes animation rendering issues where spring/interpolate work in Studio but not in renders
// and ensures @remotion packages can be resolved from user code in temp directories
function getWebpackOverride(config) {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'react': require.resolve('react'),
        'react-dom': require.resolve('react-dom'),
      },
      modules: [
        // Add the server's node_modules directory so packages can be resolved
        // even when bundling code from a temp directory
        path.join(__dirname, 'node_modules'),
        ...(config.resolve?.modules || ['node_modules'])
      ]
    }
  };
}

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

// Validate environment variables for upload endpoint
if (!process.env.UPLOAD_ENDPOINT_URL) {
  console.warn('⚠️  Warning: UPLOAD_ENDPOINT_URL environment variable is not set.');
  console.warn('⚠️  The server will start, but video upload functionality will not work.');
  console.warn('⚠️  Please set UPLOAD_ENDPOINT_URL to your Supabase upload-video function URL.');
} else {
  console.log('✓ Upload endpoint configured:', process.env.UPLOAD_ENDPOINT_URL);
}

// Shared function to upload video via edge function
// Note: This uses base64 encoding which adds ~33% overhead to file size.
// The edge function approach prioritizes security (no credentials in Railway)
// over performance. For very large videos (>50MB), consider implementing
// chunked uploads or direct upload with signed URLs if performance is critical.
async function uploadVideoViaEdgeFunction(videoBuffer, planId, jobId = null) {
  const videoBase64 = videoBuffer.toString('base64');
  
  const logPrefix = jobId ? `[${jobId}]` : '';
  if (jobId) {
    console.log(`${logPrefix} Video encoded, size: ${videoBase64.length} chars`);
  }
  
  const uploadEndpoint = process.env.UPLOAD_ENDPOINT_URL;
  
  if (!uploadEndpoint) {
    throw new Error('UPLOAD_ENDPOINT_URL environment variable is not set');
  }
  
  if (jobId) {
    console.log(`${logPrefix} Uploading to:`, uploadEndpoint);
  }
  
  const uploadResponse = await fetch(uploadEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      planId: planId,
      videoBase64: videoBase64
    })
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
  }
  
  const uploadResult = await uploadResponse.json();
  
  if (jobId) {
    console.log(`${logPrefix} Upload complete:`, uploadResult.videoUrl);
  }
  
  return {
    videoUrl: uploadResult.videoUrl,
    fileName: uploadResult.fileName
  };
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
      webpackOverride: getWebpackOverride
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
    
    // Step 5: Upload via edge function (no service key needed!)
    const videoBuffer = fs.readFileSync(outputPath);
    const { videoUrl: publicUrl, fileName } = await uploadVideoViaEdgeFunction(videoBuffer, planId, jobId);
    
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
    uploadEndpointConfigured: !!process.env.UPLOAD_ENDPOINT_URL
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
      webpackOverride: getWebpackOverride
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
    
    // Step 5: Upload via edge function
    const videoBuffer = fs.readFileSync(outputPath);
    const { videoUrl: publicUrl, fileName } = await uploadVideoViaEdgeFunction(
      videoBuffer, 
      planId || `sync-${Date.now()}`
    );
    
    console.log('Upload complete:', publicUrl);
    
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
import React from 'react';
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
      webpackOverride: getWebpackOverride
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
    
    // Upload via edge function
    const videoBuffer = fs.readFileSync(outputPath);
    const { videoUrl: publicUrl, fileName } = await uploadVideoViaEdgeFunction(
      videoBuffer, 
      `simple-${Date.now()}`
    );
    
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

// Video Analysis Endpoint
// Analyzes uploaded videos using FFmpeg: extracts frames, detects scene changes, analyzes audio
app.post('/analyze-video', async (req, res) => {
  let tempVideoPath = null;
  let analysisDir = null;
  
  try {
    console.log('Video analysis request received');
    
    const { videoBase64, videoName = 'uploaded-video.mp4', options = {} } = req.body;
    
    if (!videoBase64) {
      return res.status(400).json({
        success: false,
        error: 'videoBase64 is required'
      });
    }
    
    // Create temp directory for video
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-upload-'));
    tempVideoPath = path.join(tempDir, videoName);
    
    // Decode and save video
    console.log('Decoding video from base64...');
    const videoBuffer = Buffer.from(videoBase64, 'base64');
    fs.writeFileSync(tempVideoPath, videoBuffer);
    console.log(`Video saved: ${tempVideoPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Analyze video with FFmpeg
    console.log('Starting FFmpeg analysis...');
    const analysis = await videoAnalysis.analyzeVideo(tempVideoPath, {
      frameCount: options.frameCount || 5,
      sceneThreshold: options.sceneThreshold || 0.4,
      extractAudio: options.extractAudio !== false,
    });
    
    analysisDir = analysis.analysisDir;
    
    // Generate pattern from analysis
    const pattern = {
      id: `analysis-${Date.now()}`,
      name: videoName.replace(/\.[^/.]+$/, ''),
      duration: analysis.metadata.duration,
      resolution: {
        width: analysis.metadata.width,
        height: analysis.metadata.height,
      },
      fps: analysis.metadata.fps,
      colors: analysis.colors,
      scenes: analysis.scenes.map((scene, i) => ({
        startTime: scene.startTime,
        endTime: scene.endTime,
        duration: scene.duration,
        description: `Scene ${i + 1}`,
        transition: i > 0 ? 'cut' : 'none',
        hasAudio: analysis.audio.hasAudio,
      })),
      audio: analysis.audio,
      sceneChanges: analysis.sceneChanges,
      metadata: {
        analyzedAt: new Date().toISOString(),
        source: videoName,
        analysisMethod: 'ffmpeg-deep-analysis',
        videoCodec: analysis.metadata.videoCodec,
        audioCodec: analysis.metadata.audioCodec,
        bitrate: analysis.metadata.bitrate,
        fileSize: analysis.metadata.size,
      },
    };
    
    console.log('Analysis complete:', {
      duration: pattern.duration,
      scenes: pattern.scenes.length,
      colors: pattern.colors.length,
      hasAudio: pattern.audio.hasAudio,
    });
    
    // Cleanup
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      fs.unlinkSync(tempVideoPath);
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (analysisDir) {
      videoAnalysis.cleanup(analysisDir);
    }
    
    res.json({
      success: true,
      message: 'Video analyzed successfully with FFmpeg',
      pattern,
      features: {
        frameExtraction: true,
        sceneDetection: true,
        audioAnalysis: analysis.audio.hasAudio,
        colorExtraction: true,
      },
      note: 'Analysis performed using FFmpeg with direct frame extraction, scene change detection, and audio analysis.',
    });
    
  } catch (error) {
    console.error('Video analysis error:', error);
    
    // Cleanup on error
    try {
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      if (analysisDir) {
        videoAnalysis.cleanup(analysisDir);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'FFmpeg video analysis failed. Ensure FFmpeg is installed and the video format is supported.',
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Remotion render server running on port ${PORT}`);
});
