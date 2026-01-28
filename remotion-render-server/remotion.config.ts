import { Config } from '@remotion/cli/config';

// Configuration for Remotion Studio
// Use PNG for better color fidelity (matches server.js)
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);

// Set the entry point for the Remotion Studio
Config.setEntryPoint('./src/index.tsx');

// Configure Chromium options for better performance and color accuracy
Config.setChromiumOpenGlRenderer('angle');
// Note: Web security is disabled for development/preview only
// The production render server uses secure Chromium settings
Config.setChromiumDisableWebSecurity(true);
Config.setChromiumHeadlessMode(true);

// Set quality and encoding options for consistent colors
Config.setPixelFormat('yuv420p');
Config.setCrf(18); // High quality
Config.setCodec('h264');

// Set port for studio (default 3000, will use higher if unavailable)
Config.setPort(3000);
