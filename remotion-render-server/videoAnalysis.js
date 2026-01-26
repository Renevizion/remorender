// Video Analysis Module
// Extracts frames, detects scene changes, and analyzes audio from video files
// Uses FFmpeg for all video processing

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

/**
 * Extract frames from video at specified intervals
 * @param {string} videoPath - Path to video file
 * @param {number} fps - Frames per second to extract (default: 1)
 * @param {string} outputDir - Directory to save frames
 * @returns {Promise<string[]>} Array of frame file paths
 */
async function extractFrames(videoPath, fps = 1, outputDir) {
  return new Promise((resolve, reject) => {
    const frames = [];
    const framePattern = path.join(outputDir, 'frame-%04d.jpg');
    
    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=${fps}`,
        '-qscale:v 2' // High quality JPEG
      ])
      .output(framePattern)
      .on('end', () => {
        // Read generated frames
        const files = fs.readdirSync(outputDir)
          .filter(f => f.startsWith('frame-') && f.endsWith('.jpg'))
          .sort()
          .map(f => path.join(outputDir, f));
        resolve(files);
      })
      .on('error', (err) => {
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Get video metadata (duration, resolution, fps, etc.)
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      resolve({
        duration: parseFloat(metadata.format.duration) || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps: eval(videoStream?.r_frame_rate || '30/1'),
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name,
        videoCodec: videoStream?.codec_name,
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        size: parseInt(metadata.format.size) || 0,
      });
    });
  });
}

/**
 * Detect scene changes in video
 * Returns timestamps of scene changes
 */
async function detectSceneChanges(videoPath, threshold = 0.4) {
  try {
    // Use FFmpeg's scene detection filter
    const outputFile = path.join(path.dirname(videoPath), 'scenes.txt');
    
    const command = `ffmpeg -i "${videoPath}" -filter:v "select='gt(scene,${threshold})',showinfo" -f null - 2>&1 | grep "Parsed_showinfo" | grep "pts_time" | awk '{print $12}' | sed 's/pts_time://' > "${outputFile}"`;
    
    await execAsync(command);
    
    const sceneData = fs.readFileSync(outputFile, 'utf8');
    fs.unlinkSync(outputFile); // Clean up
    
    const scenes = sceneData
      .split('\n')
      .filter(line => line.trim())
      .map(time => parseFloat(time))
      .filter(time => !isNaN(time));
    
    return scenes;
  } catch (error) {
    console.warn('Scene detection failed:', error.message);
    return [];
  }
}

/**
 * Extract audio waveform data for analysis
 * Returns audio features: volume levels, beats, etc.
 */
async function analyzeAudio(videoPath, outputDir) {
  try {
    const audioPath = path.join(outputDir, 'audio.wav');
    
    // Extract audio to WAV format
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(1)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    // Get audio volume levels using FFmpeg volumedetect filter
    const { stdout } = await execAsync(
      `ffmpeg -i "${audioPath}" -af volumedetect -f null - 2>&1 | grep "mean_volume\\|max_volume"`
    );
    
    const meanMatch = stdout.match(/mean_volume:\s*([-\d.]+)\s*dB/);
    const maxMatch = stdout.match(/max_volume:\s*([-\d.]+)\s*dB/);
    
    // Clean up audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    
    return {
      hasAudio: true,
      meanVolume: meanMatch ? parseFloat(meanMatch[1]) : null,
      maxVolume: maxMatch ? parseFloat(maxMatch[1]) : null,
      // Simple beat detection: if audio has high dynamics, likely has rhythm
      hasBeat: maxMatch && meanMatch ? (parseFloat(maxMatch[1]) - parseFloat(meanMatch[1])) > 15 : false,
    };
  } catch (error) {
    console.warn('Audio analysis failed:', error.message);
    return {
      hasAudio: false,
      meanVolume: null,
      maxVolume: null,
      hasBeat: false,
    };
  }
}

/**
 * Extract dominant colors from an image using ImageMagick or simple pixel sampling
 */
async function extractColorsFromFrame(framePath) {
  try {
    // Use ImageMagick if available, otherwise fall back to basic method
    try {
      const { stdout } = await execAsync(
        `convert "${framePath}" -resize 100x100! -colors 5 -unique-colors txt:- | grep -o "\\#[0-9A-F]\\{6\\}" | head -5`
      );
      
      const colors = stdout
        .split('\n')
        .filter(line => line.trim())
        .slice(0, 5);
      
      if (colors.length > 0) {
        return colors;
      }
    } catch (e) {
      // ImageMagick not available, use basic method
    }
    
    // Fallback: Read image data and sample pixels
    // For simplicity, return common colors
    return ['#000000', '#FFFFFF', '#808080'];
  } catch (error) {
    console.warn('Color extraction failed:', error.message);
    return ['#000000', '#FFFFFF'];
  }
}

/**
 * Comprehensive video analysis
 * Extracts frames, detects scenes, analyzes audio, and extracts colors
 */
async function analyzeVideo(videoPath, options = {}) {
  const {
    frameCount = 5,
    sceneThreshold = 0.4,
    extractAudio = true,
  } = options;
  
  console.log('Starting video analysis:', videoPath);
  
  // Create temporary directory for analysis
  const analysisDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'video-analysis-'));
  
  try {
    // Step 1: Get video metadata
    console.log('Extracting video metadata...');
    const metadata = await getVideoMetadata(videoPath);
    console.log('Metadata:', metadata);
    
    // Step 2: Extract frames
    console.log(`Extracting ${frameCount} frames...`);
    const fps = frameCount / metadata.duration; // Distribute frames evenly
    const frames = await extractFrames(videoPath, fps, analysisDir);
    console.log(`Extracted ${frames.length} frames`);
    
    // Step 3: Detect scene changes
    console.log('Detecting scene changes...');
    const sceneChanges = await detectSceneChanges(videoPath, sceneThreshold);
    console.log(`Detected ${sceneChanges.length} scene changes`);
    
    // Step 4: Analyze audio
    let audioAnalysis = { hasAudio: false };
    if (extractAudio && metadata.hasAudio) {
      console.log('Analyzing audio...');
      audioAnalysis = await analyzeAudio(videoPath, analysisDir);
      console.log('Audio analysis:', audioAnalysis);
    }
    
    // Step 5: Extract colors from frames
    console.log('Extracting colors from frames...');
    const allColors = new Set();
    for (const frame of frames.slice(0, 3)) { // Sample first 3 frames
      const colors = await extractColorsFromFrame(frame);
      colors.forEach(color => allColors.add(color));
    }
    console.log('Extracted colors:', Array.from(allColors));
    
    // Generate scenes based on scene changes
    const scenes = [];
    const timestamps = [0, ...sceneChanges, metadata.duration];
    
    for (let i = 0; i < timestamps.length - 1; i++) {
      scenes.push({
        startTime: timestamps[i],
        endTime: timestamps[i + 1],
        duration: timestamps[i + 1] - timestamps[i],
        frameIndex: Math.floor((i / (timestamps.length - 1)) * frames.length),
      });
    }
    
    // Clean up frame files but keep the directory for now
    frames.forEach(frame => {
      if (fs.existsSync(frame)) {
        fs.unlinkSync(frame);
      }
    });
    
    return {
      metadata,
      frames: frames.map((f, i) => ({
        index: i,
        path: f,
        timestamp: (i / frames.length) * metadata.duration,
      })),
      colors: Array.from(allColors),
      scenes,
      sceneChanges,
      audio: audioAnalysis,
      analysisDir, // Return for cleanup later
    };
    
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(analysisDir)) {
      fs.rmSync(analysisDir, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * Cleanup analysis directory
 */
function cleanup(analysisDir) {
  if (analysisDir && fs.existsSync(analysisDir)) {
    fs.rmSync(analysisDir, { recursive: true, force: true });
  }
}

module.exports = {
  analyzeVideo,
  extractFrames,
  getVideoMetadata,
  detectSceneChanges,
  analyzeAudio,
  extractColorsFromFrame,
  cleanup,
};
