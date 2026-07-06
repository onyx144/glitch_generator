// glitch-video.js
const { spawn } = require('child_process');
const path = require('path');

const inputVideo = path.resolve('input.mp4');
const maskImage = path.resolve('mask.png');
const outputVideo = path.resolve('output_glitch.mp4');

const ffmpegArgs = [
  '-y',
  '-i', inputVideo,
  '-loop', '1',
  '-i', maskImage,

  '-filter_complex',
  `
  [1:v]format=gray,gblur=sigma=8[mask];

  [0:v]split=3[base1][base2][base3];

  [base1]rgbashift=rh=6:rv=0:gh=-4:gv=0:bh=0:bv=0,noise=alls=8:allf=t+u[rgb];
  [base2]eq=saturation=1.25:contrast=1.08,noise=alls=4:allf=t+u[color];
  [base3]null[orig];

  [rgb][mask]alphamerge[glitch_fg];

  [orig][glitch_fg]overlay=0:0:format=auto
  `,
  '-shortest',
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'copy',
  outputVideo
].flatMap(x =>
  typeof x === 'string'
    ? x.split('\n').map(s => s.trim()).filter(Boolean)
    : [x]
);

const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Done:', outputVideo);
  } else {
    console.error('❌ FFmpeg exited with code', code);
  }
});