const GLITCH_PALETTES = [
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 255, b: 120 },
    { r: 255, g: 60, b: 60 },
    { r: 80, g: 120, b: 255 },
    { r: 255, g: 140, b: 0 },
    { r: 180, g: 0, b: 255 },
];

function pickGlitchPalette() {
    return GLITCH_PALETTES[Math.floor(Math.random() * GLITCH_PALETTES.length)];
}

/**
 * Applies line-shift glitch effect to image pixel data.
 */
function applyGlitchEffect(originalData, width, height, options = {}) {
    const {
        markedPixels = null,
        fullFrame = false,
        intensity = 1,
        maxShift = 50,
        minLineHeight = 2,
        maxLineHeight = 20,
        tintChance = null,
    } = options;

    if (intensity <= 0) {
        return new Uint8ClampedArray(originalData);
    }

    const glitchedData = new Uint8ClampedArray(originalData);
    const effectiveMaxShift = Math.max(2, Math.round(maxShift * (0.35 + intensity * 0.65)));
    const effectiveTintChance = tintChance ?? 0.3 * intensity;

    const lineShifts = [];
    let currentLineY = 0;
    while (currentLineY < height) {
        const lineHeight = Math.floor(Math.random() * (maxLineHeight - minLineHeight + 1)) + minLineHeight;
        const shift = Math.floor(Math.random() * effectiveMaxShift * 2) - effectiveMaxShift;
        const vShift = Math.random() < 0.25 * intensity
            ? Math.floor(Math.random() * 12 * intensity) - Math.floor(6 * intensity)
            : 0;
        lineShifts.push({ height: lineHeight, shift, vShift });
        currentLineY += lineHeight;
    }

    let processedHeight = 0;
    for (const line of lineShifts) {
        const lineBuffer = new Uint8ClampedArray(line.height * width * 4);
        let bufferOffset = 0;

        for (let yOffset = 0; yOffset < line.height; yOffset++) {
            const sourceY = processedHeight + yOffset;
            if (sourceY >= height) break;

            for (let x = 0; x < width; x++) {
                const idx = (sourceY * width + x) * 4;
                lineBuffer[bufferOffset++] = originalData[idx];
                lineBuffer[bufferOffset++] = originalData[idx + 1];
                lineBuffer[bufferOffset++] = originalData[idx + 2];
                lineBuffer[bufferOffset++] = originalData[idx + 3];
            }
        }

        bufferOffset = 0;
        for (let yOffset = 0; yOffset < line.height; yOffset++) {
            const sourceY = processedHeight + yOffset;
            if (sourceY >= height) break;

            for (let x = 0; x < width; x++) {
                const pixelIndex = sourceY * width + x;
                const inZone = fullFrame || (markedPixels && markedPixels.has(pixelIndex));

                if (inZone && (intensity >= 1 || Math.random() < intensity)) {
                    const targetX = x + line.shift;
                    const targetY = Math.min(height - 1, Math.max(0, sourceY + line.vShift));

                    if (targetX >= 0 && targetX < width) {
                        const targetIdx = (targetY * width + targetX) * 4;

                        glitchedData[targetIdx] = lineBuffer[bufferOffset];
                        glitchedData[targetIdx + 1] = lineBuffer[bufferOffset + 1];
                        glitchedData[targetIdx + 2] = lineBuffer[bufferOffset + 2];
                        glitchedData[targetIdx + 3] = lineBuffer[bufferOffset + 3];

                        if (Math.random() < effectiveTintChance) {
                            const palette = pickGlitchPalette();
                            const tintAlpha = 0.35 + Math.random() * 0.45 * intensity;

                            glitchedData[targetIdx] = glitchedData[targetIdx] * (1 - tintAlpha) + palette.r * tintAlpha;
                            glitchedData[targetIdx + 1] = glitchedData[targetIdx + 1] * (1 - tintAlpha) + palette.g * tintAlpha;
                            glitchedData[targetIdx + 2] = glitchedData[targetIdx + 2] * (1 - tintAlpha) + palette.b * tintAlpha;
                        }
                    }
                }
                bufferOffset += 4;
            }
        }
        processedHeight += line.height;
    }

    return glitchedData;
}

function applyChromaticAberration(data, width, height, intensity) {
    const out = new Uint8ClampedArray(data);
    const shift = Math.max(2, Math.round(14 * intensity));
    const lineStride = width * 4;

    for (let y = 0; y < height; y++) {
        if (Math.random() > 0.25 + intensity * 0.55) continue;

        const row = y * lineStride;
        for (let x = shift; x < width - shift; x++) {
            const idx = row + x * 4;
            const rIdx = row + Math.max(0, x - shift) * 4;
            const bIdx = row + Math.min(width - 1, x + shift) * 4;

            out[idx] = data[rIdx];
            out[idx + 2] = data[bIdx + 2];
        }
    }

    return out;
}

function applyColorBlocks(data, width, height, intensity) {
    const out = new Uint8ClampedArray(data);
    const blockCount = Math.floor((4 + intensity * 18) * (width * height) / 500000);

    for (let b = 0; b < blockCount; b++) {
        const bw = Math.floor(Math.random() * 80 * intensity) + 8;
        const bh = Math.floor(Math.random() * 30 * intensity) + 4;
        const bx = Math.floor(Math.random() * Math.max(1, width - bw));
        const by = Math.floor(Math.random() * Math.max(1, height - bh));
        const palette = pickGlitchPalette();
        const mode = Math.random();

        for (let y = by; y < by + bh && y < height; y++) {
            for (let x = bx; x < bx + bw && x < width; x++) {
                const idx = (y * width + x) * 4;
                if (mode < 0.33) {
                    out[idx] = palette.r;
                    out[idx + 1] = palette.g;
                    out[idx + 2] = palette.b;
                } else if (mode < 0.66) {
                    out[idx] = 255 - data[idx];
                    out[idx + 1] = palette.g;
                    out[idx + 2] = data[idx + 2];
                } else {
                    const mix = 0.5 + Math.random() * 0.4;
                    out[idx] = data[idx] * (1 - mix) + palette.r * mix;
                    out[idx + 1] = data[idx + 1] * (1 - mix) + palette.g * mix;
                    out[idx + 2] = data[idx + 2] * (1 - mix) + palette.b * mix;
                }
            }
        }
    }

    return out;
}

function applyScanlineGlitch(data, width, height, intensity) {
    const out = new Uint8ClampedArray(data);
    const step = Math.max(2, Math.floor(6 - intensity * 3));

    for (let y = 0; y < height; y += step) {
        if (Math.random() > 0.35 + intensity * 0.5) continue;

        const palette = pickGlitchPalette();
        const invert = Math.random() < 0.4;
        const row = y * width * 4;

        for (let x = 0; x < width; x++) {
            const idx = row + x * 4;
            if (invert) {
                out[idx] = 255 - data[idx];
                out[idx + 1] = palette.g;
                out[idx + 2] = 255 - data[idx + 2];
            } else {
                const mix = 0.25 + intensity * 0.45;
                out[idx] = data[idx] * (1 - mix) + palette.r * mix;
                out[idx + 1] = data[idx + 1] * (1 - mix) + palette.g * mix;
                out[idx + 2] = data[idx + 2] * (1 - mix) + palette.b * mix;
            }
        }
    }

    return out;
}

function applyDigitalNoise(data, width, height, intensity) {
    const out = new Uint8ClampedArray(data);
    const noiseCount = Math.floor(width * height * intensity * 0.04);

    for (let i = 0; i < noiseCount; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const idx = (y * width + x) * 4;
        const palette = pickGlitchPalette();

        if (Math.random() < 0.5) {
            out[idx] = palette.r;
            out[idx + 1] = palette.g;
            out[idx + 2] = palette.b;
        } else {
            out[idx] = Math.floor(Math.random() * 256);
            out[idx + 1] = Math.floor(Math.random() * 256);
            out[idx + 2] = Math.floor(Math.random() * 256);
        }
        out[idx + 3] = 255;
    }

    return out;
}

/**
 * Stronger multi-color glitch for video frames.
 */
function applyVideoGlitchEffect(originalData, width, height, intensity) {
    if (intensity <= 0) {
        return new Uint8ClampedArray(originalData);
    }

    let data = applyGlitchEffect(originalData, width, height, {
        fullFrame: true,
        intensity,
        maxShift: 100,
        minLineHeight: 1,
        maxLineHeight: 28,
        tintChance: 0.45 + intensity * 0.4,
    });

    data = applyChromaticAberration(data, width, height, intensity);
    data = applyColorBlocks(data, width, height, intensity);
    data = applyScanlineGlitch(data, width, height, intensity);
    data = applyDigitalNoise(data, width, height, intensity);

    return data;
}

function buildMarkedPixelsFromMask(maskData, maskWidth, maskHeight, canvasWidth, canvasHeight, maskColors, radius) {
    const markedPixels = new Set();
    const { r: MASK_R, g: MASK_G, b: MASK_B, a: MASK_A } = maskColors;

    for (let y = 0; y < maskHeight; y++) {
        for (let x = 0; x < maskWidth; x++) {
            const index = (y * maskWidth + x) * 4;
            const r = maskData[index];
            const g = maskData[index + 1];
            const b = maskData[index + 2];
            const a = maskData[index + 3];

            if (r === MASK_R && g === MASK_G && b === MASK_B && a === MASK_A) {
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
                            markedPixels.add(ny * canvasWidth + nx);
                        }
                    }
                }
            }
        }
    }

    return markedPixels;
}

function getGlitchIntensity(timeSec, glitchStartSec, videoDurationSec) {
    if (timeSec < glitchStartSec) return 0;
    if (videoDurationSec <= glitchStartSec) return 1;
    const progress = (timeSec - glitchStartSec) / (videoDurationSec - glitchStartSec);
    return Math.min(1, Math.max(0, progress));
}
