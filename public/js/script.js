const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const clearBtn = document.getElementById('clear');

// New: Mask Canvas
const maskCanvas = document.getElementById('maskCanvas');
const maskCtx = maskCanvas.getContext('2d');

let image = null;
let isDrawing = false;

// Set a unique, solid color for the mask drawing
const MASK_COLOR_R = 255;
const MASK_COLOR_G = 0;
const MASK_COLOR_B = 255;
const MASK_COLOR_A = 255; // Fully opaque

// Drawing on main canvas (transparent) and mask canvas (solid)
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    // Start drawing on both canvases
    draw(e);
});
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
canvas.addEventListener('mousemove', draw);

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Draw transparent circle on main canvas for visual feedback
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Draw solid unique color on mask canvas
    maskCtx.fillStyle = `rgba(${MASK_COLOR_R}, ${MASK_COLOR_G}, ${MASK_COLOR_B}, ${MASK_COLOR_A})`;
    maskCtx.beginPath();
    maskCtx.arc(x, y, 10, 0, Math.PI * 2);
    maskCtx.fill();
}

// Загрузка изображения (Остается таким же, но также настраивает maskCanvas)
upload.addEventListener('change', function () { // Corrected 'изменение' to 'change' and 'функция' to 'function'
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) { // Corrected 'функция (событие)' to 'function (event)'
        image = new Image();
        image.onload = function () {
            canvas.width = image.width;
            canvas.height = image.height;
            maskCanvas.width = image.width; // Set mask canvas dimensions
            maskCanvas.height = image.height; // Set mask canvas dimensions
            ctx.drawImage(image, 0, 0);
            // Clear mask canvas when new image is loaded
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        };
        image.src = event.target.result; // Corrected 'событие.target.result' to 'event.target.result'
    };
    reader.readAsDataURL(file); // Corrected 'файл' to 'file'
});

// Очистка
clearBtn.addEventListener('click', () => { // Corrected 'щелчок' to 'click'
    if (image) {
        ctx.drawImage(image, 0, 0); // Redraw original image
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear if no image
    }
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height); // Always clear mask canvas
});

// Glitch generation logic
const generateBtn = document.getElementById('generate');
const output = document.getElementById('output');

generateBtn.addEventListener('click', () => {
    console.log('🔄 Starting glitch generation...');

    if (!image) {
        console.error('❌ Image not loaded!');
        return alert('Please upload an image first');
    }
    console.log('✅ Image loaded, dimensions:', canvas.width, 'x', canvas.height);

    const frameCount = 10;
    console.log(`🎞 Starting generation of ${frameCount} glitched images...`);

    // Clear previous output
    output.innerHTML = '';

    // Create container for images
    const imagesContainer = document.createElement('div');
    imagesContainer.style.display = 'flex';
    imagesContainer.style.flexWrap = 'wrap';
    imagesContainer.style.gap = '10px';
    imagesContainer.style.marginTop = '20px';
    output.appendChild(imagesContainer);

    for (let i = 0; i < frameCount; i++) {
        console.log(`\n📸 Generating image ${i + 1}/${frameCount}`);

        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Copy original image to temp canvas
        tempCtx.drawImage(image, 0, 0);
        console.log('✅ Original image copied to temporary canvas');

        // Get pixels from the MASK canvas
        const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const maskData = maskImageData.data;
        console.log('📊 Mask pixel data received, array size:', maskData.length);

        // Apply line shift glitch only to marked area
        let glitchImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        let d = glitchImageData.data;

        // Create array of line shifts (your existing logic for lineShifts)
        const lineShifts = [];
        const maxShift = 50; // Maximum pixels to shift
        const minLineHeight = 2; // Minimum height of a line
        const maxLineHeight = 20; // Maximum height of a line
        const radius = 10; // Radius around marked area

        // Generate random line shifts
        let lineY = 0;
        while (lineY < canvas.height) {
            const lineHeight = Math.floor(Math.random() * (maxLineHeight - minLineHeight + 1)) + minLineHeight;
            const shift = Math.floor(Math.random() * maxShift * 2) - maxShift;
            lineShifts.push({ height: lineHeight, shift: shift });
            lineY += lineHeight;
        }

        // Find marked areas using the MASK_COLOR and expand with radius
        const markedPixels = new Set();
        for (let y = 0; y < maskCanvas.height; y++) {
            for (let x = 0; x < maskCanvas.width; x++) {
                const index = (y * maskCanvas.width + x) * 4;
                const r = maskData[index];
                const g = maskData[index + 1];
                const b = maskData[index + 2];
                const a = maskData[index + 3];

                // Check for the exact mask color
                if (r === MASK_COLOR_R && g === MASK_COLOR_G && b === MASK_COLOR_B && a === MASK_COLOR_A) {
                    // Add all pixels within radius to the set
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                                markedPixels.add(ny * canvas.width + nx);
                            }
                        }
                    }
                }
            }
        }

        // TEST: Simply delete marked area
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const pixelIndex = y * canvas.width + x;
                if (markedPixels.has(pixelIndex)) {
                    const index = pixelIndex * 4;
                    d[index] = 0;     // Red
                    d[index + 1] = 0; // Green
                    d[index + 2] = 0; // Blue
                    d[index + 3] = 0; // Alpha (makes it transparent)
                }
            }
        }

        tempCtx.putImageData(glitchImageData, 0, 0);
        console.log('✅ Updated temporary canvas with test effect');

        // Create image element and add download link
        const imgContainer = document.createElement('div');
        console.log('✨ Generation completed for this frame!'); // Corrected 'Генерация завершена!'

        const img = document.createElement('img');
        img.src = tempCanvas.toDataURL('image/png');
        img.style.maxWidth = '300px';
        img.style.height = 'auto';

        const downloadLink = document.createElement('a');
        downloadLink.href = tempCanvas.toDataURL('image/png');
        downloadLink.download = `glitched_${i + 1}.png`;
        downloadLink.innerText = `📥 Download Image ${i + 1}`;
        downloadLink.style.display = 'block';
        downloadLink.style.marginTop = '5px';
        downloadLink.style.color = '#0ff';

        imgContainer.appendChild(img);
        imgContainer.appendChild(downloadLink);
        imagesContainer.appendChild(imgContainer);

        console.log('✅ Image displayed and download link added');
    }

    console.log('✨ All glitch generations completed!');
});