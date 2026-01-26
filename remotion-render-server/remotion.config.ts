import { Config } from '@remotion/cli/config';

// Configuration for Remotion Studio
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Set the entry point for the Remotion Studio
Config.setEntryPoint('./src/index.tsx');

// Configure Chromium options for better performance
Config.setChromiumOpenGlRenderer('angle');
// Note: Web security is disabled for development/preview only
// The production render server uses secure Chromium settings
Config.setChromiumDisableWebSecurity(true);
Config.setChromiumHeadlessMode(true);

// Set port for studio (default 3000, will use higher if unavailable)
Config.setPort(3000);
