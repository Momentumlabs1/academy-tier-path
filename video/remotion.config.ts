import {Config} from '@remotion/cli/config';

// Chromium is pre-installed in this environment — never download browsers.
Config.setBrowserExecutable('/opt/pw-browsers/chromium');

// The pre-installed Chromium has no "old headless" mode anymore —
// run it as Chrome for Testing (new headless) instead of headless-shell.
Config.setChromeMode('chrome-for-testing');

// JPEG frames render much faster than PNG and are fine for opaque 1080p output.
Config.setVideoImageFormat('jpeg');

Config.setOverwriteOutput(true);
