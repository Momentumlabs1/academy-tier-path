import {Config} from '@remotion/cli/config';

Config.setBrowserExecutable(
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setConcurrency(3);
Config.setCodec('h264');
Config.setCrf(17);
Config.setOverwriteOutput(true);
