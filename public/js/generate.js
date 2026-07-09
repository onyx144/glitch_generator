const generateBtn = document.getElementById('generate');
const output = document.getElementById('output');

generateBtn.addEventListener('click', () => {
    console.log('🔄 Starting glitch generation...');

    //ddd 
    if (!image) {
        console.error('❌ Image not loaded!');
        return alert('Please upload an image first');
    }
    if (canvas.width !== maskCanvas.width || canvas.height !== maskCanvas.height) {
        console.warn('⚠️ Main canvas and mask canvas have different dimensions. This might cause issues.');
    }

    console.log('✅ Image loaded, dimensions:', canvas.width, 'x', canvas.height);

    const frameCount = 10;
    console.log(`🎞 Starting generation of ${frameCount} glitched images...`);

    output.innerHTML = '';

    const imagesContainer = document.createElement('div');
    imagesContainer.style.display = 'flex';
    imagesContainer.style.flexWrap = 'wrap';
    imagesContainer.style.gap = '10px';
    imagesContainer.style.marginTop = '20px';
    output.appendChild(imagesContainer);

    const gifFrames = [];

    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const markedPixels = buildMarkedPixelsFromMask(
        maskImageData.data,
        maskCanvas.width,
        maskCanvas.height,
        canvas.width,
        canvas.height,
        { r: MASK_COLOR_R, g: MASK_COLOR_G, b: MASK_COLOR_B, a: MASK_COLOR_A },
        10
    );
    console.log(`🔍 Found ${markedPixels.size} pixels in marked areas (including radius).`);

    for (let i = 0; i < frameCount; i++) {
        console.log(`\n📸 Generating image ${i + 1}/${frameCount}`);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.drawImage(image, 0, 0);
        const originalImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);

        const glitchedData = applyGlitchEffect(
            originalImageData.data,
            canvas.width,
            canvas.height,
            { markedPixels, intensity: 1 }
        );

        tempCtx.putImageData(new ImageData(glitchedData, canvas.width, canvas.height), 0, 0);
        console.log(`✅ Applied glitch effect for frame ${i + 1}.`);

        gifFrames.push(tempCanvas);

        const imgContainer = document.createElement('div');
        imgContainer.style.textAlign = 'center';

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
    }

    console.log('✨ All glitch generations completed!');

    if (typeof GIF === 'undefined') {
        console.error('❌ GIF.js library is not loaded!');
        return;
    }

    const gif = new GIF({
        workers: 2,
        quality: 10,
        delay: 100,
        repeat: 0,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/public/js/gif.worker.js'
    });

    gifFrames.forEach(frameCanvas => {
        gif.addFrame(frameCanvas, { delay: 100 });
    });

    gif.on('finished', function (blob) {
        console.log('🎉 GIF generation finished!');
        const gifUrl = URL.createObjectURL(blob);

        const gifContainer = document.createElement('div');
        gifContainer.style.textAlign = 'center';
        gifContainer.style.marginTop = '30px';
        gifContainer.style.borderTop = '1px solid #333';
        gifContainer.style.paddingTop = '20px';
        output.appendChild(gifContainer);

        const gifTitle = document.createElement('h3');
        gifTitle.innerText = 'Generated GIF Animation';
        gifTitle.style.color = '#fff';
        gifContainer.appendChild(gifTitle);

        const gifImg = document.createElement('img');
        gifImg.src = gifUrl;
        gifImg.style.maxWidth = '500px';
        gifImg.style.height = 'auto';
        gifImg.alt = 'Glitched GIF Animation';
        gifContainer.appendChild(gifImg);

        const downloadGifLink = document.createElement('a');
        downloadGifLink.href = gifUrl;
        downloadGifLink.download = 'glitched_animation.gif';
        downloadGifLink.innerText = '📥 Download Glitched GIF';
        downloadGifLink.style.display = 'block';
        downloadGifLink.style.marginTop = '10px';
        downloadGifLink.style.color = '#0f0';
        gifContainer.appendChild(downloadGifLink);

        downloadGifLink.addEventListener('click', () => {
            setTimeout(() => URL.revokeObjectURL(gifUrl), 1000);
        });
    });

    gif.on('progress', function (p) {
        console.log(`📊 GIF encoding progress: ${Math.round(p * 100)}%`);
    });

    gif.render();
    console.log('🚀 GIF rendering initiated...');
});
