const generateBtn = document.getElementById('generate');
const output = document.getElementById('output');


generateBtn.addEventListener('click', () => {
    console.log('🔄 Starting glitch generation...');

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

    // Create container for images
    const imagesContainer = document.createElement('div');
    imagesContainer.style.display = 'flex';
    imagesContainer.style.flexWrap = 'wrap';
    imagesContainer.style.gap = '10px';
    imagesContainer.style.marginTop = '20px';
    output.appendChild(imagesContainer);

    // Array to store frames for GIF
    const gifFrames = [];

    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const maskData = maskImageData.data;
    console.log('📊 Mask pixel data received from mask canvas.');

    const markedPixels = new Set();
    const radius = 10; 

    for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
            const index = (y * maskCanvas.width + x) * 4;
            const r = maskData[index];
            const g = maskData[index + 1];
            const b = maskData[index + 2];
            const a = maskData[index + 3];


            if (r === MASK_COLOR_R && g === MASK_COLOR_G && b === MASK_COLOR_B && a === MASK_COLOR_A) {
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                            markedPixels.add(ny * canvas.width + nx); // Сохраняем 1D-индекс пикселя
                        }
                    }
                }
            }
        }
    }
    console.log(`🔍 Found ${markedPixels.size} pixels in marked areas (including radius).`);

for (let i = 0; i < frameCount; i++) {
  console.log(`\n📸 Generating image ${i + 1}/${frameCount}`);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.drawImage(image, 0, 0);

  const originalImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  const originalData = originalImageData.data; // Исходные пиксели


  const glitchedData = new Uint8ClampedArray(originalData);

  const lineShifts = [];
    const maxShift = 50; 
    const minLineHeight = 2; 
    const maxLineHeight = 20; 

  let currentLineY = 0;
  while (currentLineY < canvas.height) {
      const lineHeight = Math.floor(Math.random() * (maxLineHeight - minLineHeight + 1)) + minLineHeight;
      const shift = Math.floor(Math.random() * maxShift * 2) - maxShift; // Случайное смещение (-maxShift до +maxShift)
      lineShifts.push({ height: lineHeight, shift: shift });
      currentLineY += lineHeight;
  }

  let processedHeight = 0;
  for (const line of lineShifts) {
      const lineBuffer = new Uint8ClampedArray(line.height * canvas.width * 4);
      let bufferOffset = 0;

      for (let yOffset = 0; yOffset < line.height; yOffset++) {
          const sourceY = processedHeight + yOffset;
          if (sourceY >= canvas.height) break;

          for (let x = 0; x < canvas.width; x++) {
              const originalPixelDataIndex = (sourceY * canvas.width + x) * 4;
              lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex];
              lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex + 1];
              lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex + 2];
              lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex + 3];
          }
      }

      bufferOffset = 0; 
      for (let yOffset = 0; yOffset < line.height; yOffset++) {
          const sourceY = processedHeight + yOffset;
          if (sourceY >= canvas.height) break;

          for (let x = 0; x < canvas.width; x++) {
              const pixelIndex = sourceY * canvas.width + x; // 1D-индекс пикселя

              if (markedPixels.has(pixelIndex)) {
                  const targetX = x + line.shift; 

                  if (targetX >= 0 && targetX < canvas.width) {
                      const targetDataIndex = (sourceY * canvas.width + targetX) * 4; // Индекс в glitchedData

                      glitchedData[targetDataIndex] = lineBuffer[bufferOffset];
                      glitchedData[targetDataIndex + 1] = lineBuffer[bufferOffset + 1];
                      glitchedData[targetDataIndex + 2] = lineBuffer[bufferOffset + 2];
                      glitchedData[targetDataIndex + 3] = lineBuffer[bufferOffset + 3];

                      const tintAlpha = 0.4; 

                      
                      if (Math.random() < 0.3) {
                          const tintR = Math.floor(Math.random() * 156) + 100; // 100 to 255
                          const tintG = Math.floor(Math.random() * 101);     // 0 to 100
                          const tintB = Math.floor(Math.random() * 106) + 150; // 150 to 255

                          const currentR = glitchedData[targetDataIndex];
                          const currentG = glitchedData[targetDataIndex + 1];
                          const currentB = glitchedData[targetDataIndex + 2];

                
                          glitchedData[targetDataIndex] = currentR * (1 - tintAlpha) + tintR * tintAlpha;
                          glitchedData[targetDataIndex + 1] = currentG * (1 - tintAlpha) + tintG * tintAlpha;
                          glitchedData[targetDataIndex + 2] = currentB * (1 - tintAlpha) + tintB * tintAlpha;
                      }
                  }
              }
              bufferOffset += 4; 
          }
      }
      processedHeight += line.height;
  }

  const finalResult = new ImageData(glitchedData, canvas.width, canvas.height);
  tempCtx.putImageData(finalResult, 0, 0);
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

  console.log('✅ Image displayed and download link added');
}

    console.log('✨ All glitch generations completed!');

    if (typeof GIF === 'undefined') {
        console.error('❌ GIF.js library is not loaded!');
        return;
    }

    // Create GIF
    const gif = new GIF({
        workers: 2,
        quality: 10,
        delay: 100,
        repeat: 0,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/public/js/gif.worker.js'
    });

    // Add frames to GIF
    gifFrames.forEach(frameCanvas => {
        gif.addFrame(frameCanvas, { delay: 100 });
    });

    // Handle GIF completion
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
          setTimeout(() => {
              URL.revokeObjectURL(gifUrl);
              console.log('GIF Blob URL revoked after download click.');
          }, 1000); 
      });
    });

    gif.on('progress', function (p) {
        console.log(`📊 GIF encoding progress: ${Math.round(p * 100)}%`);
    });

    gif.render();
    console.log('🚀 GIF rendering initiated...');
});