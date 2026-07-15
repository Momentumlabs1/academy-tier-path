import {Config} from '@remotion/cli/config';

// Chromium is pre-installed in this environment — never download browsers.
Config.setBrowserExecutable('/opt/pw-browsers/chromium');

// JPEG frames render much faster than PNG and are fine for opaque 1080p output.
Config.setVideoImageFormat('jpeg');

Config.setOverwriteOutput(true);
