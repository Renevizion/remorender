const express = require('express');
const cors = require('cors');
const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'remotion-render' });
});

// Main render endpoint
app.post('/render', async (req, res) => {
  try {
    const { code, composition, inputProps } = req.body;
    
    console.log('Starting render...');
    
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
    
    // Step 5: Upload to Supabase
    const videoBuffer = fs.readFileSync(outputPath);
    const fileName = `${Date.now()}-${composition.id}.mp4`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rendered-videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(fileName);
    
    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('Upload complete:', publicUrl);
    
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
app.post('/render-simple', async (req, res) => {
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
    const videoBuffer = fs.readFileSync(outputPath);
    const fileName = `${Date.now()}-SimpleVideo.mp4`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rendered-videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(fileName);
    
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Remotion render server running on port ${PORT}`);
});
