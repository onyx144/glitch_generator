const generateVideoBtn = document.getElementById('generateVideo');
const videoOutput = document.getElementById('output');
const GLITCH_AUDIO_URL = 'public/audio/glitch.mp3';
const AUDIO_SAMPLE_RATE = 48000;

function waitForVideoSeek(video) {
    return new Promise((resolve) => {
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
        };
        video.addEventListener('seeked', onSeeked);
    });
}

function createProgressBar(container) {
    const wrap = document.createElement('div');
    wrap.className = 'progress-wrap';
    wrap.innerHTML = `
        <div class="progress-label">Processing video...</div>
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="progress-text">0%</div>
    `;
    container.appendChild(wrap);
    return {
        setProgress(pct, label) {
            wrap.querySelector('.progress-fill').style.width = `${pct}%`;
            wrap.querySelector('.progress-text').textContent = `${Math.round(pct)}%`;
            if (label) wrap.querySelector('.progress-label').textContent = label;
        },
        remove() { wrap.remove(); }
    };
}

function cloneCanvas(source) {
    const c = document.createElement('canvas');
    c.width = source.width;
    c.height = source.height;
    c.getContext('2d').drawImage(source, 0, 0);
    return c;
}

async function extractFrameData(video, workCanvas, workCtx) {
    workCtx.drawImage(video, 0, 0, workCanvas.width, workCanvas.height);
    return workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
}

async function decodeAudioFile(file) {
    const context = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    try {
        const buffer = await file.arrayBuffer();
        return await context.decodeAudioData(buffer.slice(0));
    } catch {
        return null;
    } finally {
        await context.close();
    }
}

async function loadGlitchAudioBuffer() {
    const response = await fetch(GLITCH_AUDIO_URL);
    if (!response.ok) {
        throw new Error('Could not load glitch audio: ' + GLITCH_AUDIO_URL);
    }
    const context = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    try {
        return await context.decodeAudioData(await response.arrayBuffer());
    } finally {
        await context.close();
    }
}

async function buildMixedAudioBuffer(totalDurationSec, glitchStartSec, originalBuffer, glitchBuffer) {
    const totalSamples = Math.ceil(totalDurationSec * AUDIO_SAMPLE_RATE);
    const offline = new OfflineAudioContext(2, totalSamples, AUDIO_SAMPLE_RATE);

    if (originalBuffer && glitchStartSec > 0) {
        const originalSource = offline.createBufferSource();
        originalSource.buffer = originalBuffer;
        originalSource.connect(offline.destination);
        const preDuration = Math.min(glitchStartSec, originalBuffer.duration, totalDurationSec);
        if (preDuration > 0) {
            originalSource.start(0, 0, preDuration);
        }
    }

    const glitchDuration = totalDurationSec - glitchStartSec;
    if (glitchDuration > 0 && glitchBuffer) {
        const glitchSource = offline.createBufferSource();
        glitchSource.buffer = glitchBuffer;
        glitchSource.loop = glitchBuffer.duration < glitchDuration;
        glitchSource.connect(offline.destination);
        glitchSource.start(glitchStartSec, 0, glitchDuration);
    }

    return offline.startRendering();
}

async function encodeAudioBuffer(encoder, audioBuffer, onProgress) {
    const channels = audioBuffer.numberOfChannels;
    const frameSize = 960;
    let timestamp = 0;

    for (let offset = 0; offset < audioBuffer.length; offset += frameSize) {
        const frames = Math.min(frameSize, audioBuffer.length - offset);
        const interleaved = new Float32Array(frames * channels);

        for (let i = 0; i < frames; i++) {
            for (let ch = 0; ch < channels; ch++) {
                interleaved[i * channels + ch] = audioBuffer.getChannelData(ch)[offset + i] || 0;
            }
        }

        const audioData = new AudioData({
            format: 'f32',
            sampleRate: audioBuffer.sampleRate,
            numberOfFrames: frames,
            numberOfChannels: channels,
            timestamp,
            data: interleaved
        });

        encoder.encode(audioData);
        audioData.close();
        timestamp += Math.round((frames / audioBuffer.sampleRate) * 1_000_000);

        if (onProgress) {
            onProgress((offset + frames) / audioBuffer.length);
        }
    }

    await encoder.flush();
}

async function encodeToWebM(frames, fps, width, height, audioBuffer, onProgress) {
    if (typeof VideoEncoder === 'undefined') {
        throw new Error('WebCodecs VideoEncoder is not supported in this browser. Use Chrome or Edge.');
    }

    const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/webm-muxer@5.0.1/+esm');

    const muxerOptions = {
        target: new ArrayBufferTarget(),
        video: { codec: 'V_VP9', width, height, frameRate: fps }
    };

    const hasAudio = audioBuffer && typeof AudioEncoder !== 'undefined';
    if (hasAudio) {
        muxerOptions.audio = {
            codec: 'A_OPUS',
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels
        };
    }

    const muxer = new Muxer(muxerOptions);

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
            muxer.addVideoChunk(chunk, meta?.decoderConfig ? meta : undefined);
        },
        error: (e) => { throw e; }
    });

    videoEncoder.configure({
        codec: 'vp09.00.10.08',
        width,
        height,
        bitrate: Math.min(10_000_000, width * height * fps * 0.2),
        framerate: fps
    });

    let audioEncoder = null;
    if (hasAudio) {
        audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
                muxer.addAudioChunk(chunk, meta?.decoderConfig ? meta : undefined);
            },
            error: (e) => { throw e; }
        });

        audioEncoder.configure({
            codec: 'opus',
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
            bitrate: 128_000
        });
    }

    const frameDurationUs = Math.round(1_000_000 / fps);
    let timestamp = 0;
    const videoWeight = hasAudio ? 0.75 : 1;

    for (let i = 0; i < frames.length; i++) {
        const bitmap = await createImageBitmap(frames[i]);
        const videoFrame = new VideoFrame(bitmap, {
            timestamp,
            duration: frameDurationUs
        });
        bitmap.close();

        videoEncoder.encode(videoFrame, { keyFrame: i % (fps * 2) === 0 });
        videoFrame.close();

        timestamp += frameDurationUs;
        if (onProgress) {
            onProgress((i + 1) / frames.length * videoWeight, 'Encoding video...');
        }
    }

    await videoEncoder.flush();

    if (hasAudio) {
        await encodeAudioBuffer(audioEncoder, audioBuffer, (p) => {
            if (onProgress) {
                onProgress(videoWeight + p * (1 - videoWeight), 'Encoding audio...');
            }
        });
    }

    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/webm' });
}

generateVideoBtn.addEventListener('click', async () => {
    if (!videoElement || !videoLoaded) {
        return alert('Please upload a video first');
    }

    const glitchStartSec = parseFloat(document.getElementById('glitchStart').value) || 0;
    const postGlitchSec = parseFloat(document.getElementById('postGlitchDuration').value) || 0;
    const fps = parseInt(document.getElementById('videoFps').value, 10) || 30;

    const videoDuration = videoElement.duration;
    if (!isFinite(videoDuration) || videoDuration <= 0) {
        return alert('Could not read video duration');
    }

    if (glitchStartSec >= videoDuration) {
        return alert('Glitch start time must be less than video duration');
    }

    generateVideoBtn.disabled = true;
    videoOutput.innerHTML = '';
    const progress = createProgressBar(videoOutput);

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    const totalDuration = videoDuration + postGlitchSec;

    const workCanvas = document.createElement('canvas');
    workCanvas.width = width;
    workCanvas.height = height;
    const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = width;
    frameCanvas.height = height;
    const frameCtx = frameCanvas.getContext('2d');

    const processedFrames = [];
    const videoFrameCount = Math.ceil(videoDuration * fps);
    const postFrameCount = Math.ceil(postGlitchSec * fps);
    const totalFrames = videoFrameCount + postFrameCount;

    let lastRawFrameData = null;

    try {
        progress.setProgress(2, 'Preparing audio...');

        const [originalAudio, glitchAudio] = await Promise.all([
            videoFile ? decodeAudioFile(videoFile) : Promise.resolve(null),
            loadGlitchAudioBuffer()
        ]);

        const mixedAudio = await buildMixedAudioBuffer(
            totalDuration,
            glitchStartSec,
            originalAudio,
            glitchAudio
        );

        videoElement.pause();

        for (let i = 0; i < videoFrameCount; i++) {
            const timeSec = Math.min(i / fps, videoDuration - 0.001);
            videoElement.currentTime = timeSec;
            await waitForVideoSeek(videoElement);

            const imageData = await extractFrameData(videoElement, workCanvas, workCtx);
            lastRawFrameData = new Uint8ClampedArray(imageData.data);

            const intensity = getGlitchIntensity(timeSec, glitchStartSec, videoDuration);
            const outputData = intensity > 0
                ? applyVideoGlitchEffect(imageData.data, width, height, intensity)
                : new Uint8ClampedArray(imageData.data);

            frameCtx.putImageData(new ImageData(outputData, width, height), 0, 0);
            processedFrames.push(cloneCanvas(frameCanvas));

            progress.setProgress(5 + (i + 1) / totalFrames * 60, `Processing frames ${i + 1}/${videoFrameCount}`);
        }

        if (lastRawFrameData && postFrameCount > 0) {
            for (let i = 0; i < postFrameCount; i++) {
                const glitchedData = applyVideoGlitchEffect(lastRawFrameData, width, height, 1);

                frameCtx.putImageData(new ImageData(glitchedData, width, height), 0, 0);
                processedFrames.push(cloneCanvas(frameCanvas));

                const frameIdx = videoFrameCount + i + 1;
                progress.setProgress(5 + frameIdx / totalFrames * 60, `Post-glitch frames ${i + 1}/${postFrameCount}`);
            }
        }

        progress.setProgress(68, 'Encoding output...');

        const blob = await encodeToWebM(processedFrames, fps, width, height, mixedAudio, (p, label) => {
            progress.setProgress(68 + p * 32, label || 'Encoding output...');
        });

        progress.remove();

        const videoUrl = URL.createObjectURL(blob);
        const resultContainer = document.createElement('div');
        resultContainer.className = 'video-result';

        const title = document.createElement('h3');
        title.textContent = 'Generated Glitch Video';
        resultContainer.appendChild(title);

        const resultVideo = document.createElement('video');
        resultVideo.src = videoUrl;
        resultVideo.controls = true;
        resultVideo.style.maxWidth = '100%';
        resultContainer.appendChild(resultVideo);

        const downloadLink = document.createElement('a');
        downloadLink.href = videoUrl;
        downloadLink.download = 'glitched_video.webm';
        downloadLink.textContent = '📥 Download Glitch Video (.webm)';
        downloadLink.className = 'download-link';
        resultContainer.appendChild(downloadLink);

        const info = document.createElement('p');
        info.className = 'video-info';
        const audioNote = originalAudio ? 'original audio → glitch audio' : 'glitch audio only';
        info.textContent = `${width}×${height}, ${fps} fps, ${totalDuration.toFixed(1)}s (${audioNote}, glitch from ${glitchStartSec}s, +${postGlitchSec}s post-glitch)`;
        resultContainer.appendChild(info);

        videoOutput.appendChild(resultContainer);
        console.log('✅ Video generation complete');
    } catch (err) {
        console.error('❌ Video generation failed:', err);
        progress.remove();
        alert('Video generation failed: ' + err.message);
    } finally {
        generateVideoBtn.disabled = false;
    }
});
