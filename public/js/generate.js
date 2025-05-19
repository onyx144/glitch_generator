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

    // Copy original image
    tempCtx.drawImage(image, 0, 0);
    console.log('✅ Image copied to temporary canvas');

    // Get pixels from entire canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = imageData.data;
    console.log('📊 Pixel data received, array size:', maskData.length);

    // Apply line shift glitch only to marked area
    let glitchImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    let d = glitchImageData.data;

    // Create array of line shifts
    const lineShifts = [];
    const maxShift = 50; // Maximum pixels to shift
    const minLineHeight = 2; // Minimum height of a line
    const maxLineHeight = 20; // Maximum height of a line
    const radius = 10; // Radius around marked area

    // Generate random line shifts
    let lineY = 0;
    while (lineY < canvas.height) {
      const lineHeight = Math.floor(Math.random() * (maxLineHeight - minLineHeight + 1)) + minLineHeight;
      const shift = Math.floor(Math.random() * maxShift * 2) - maxShift; // Random shift between -maxShift and maxShift
      lineShifts.push({ height: lineHeight, shift: shift });
      lineY += lineHeight;
    }

    // Find marked areas and create a map of pixels within radius
    const markedPixels = new Set();
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const r = maskData[index];
        const g = maskData[index + 1];
        const b = maskData[index + 2];
        const a = maskData[index + 3];

        if (a > 100 && g > 100) {
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
          d[index + 3] = 0; // Alpha
        }
      }
    }

    /* Commented out glitch effect code
    // Apply line shifts only to marked areas and their radius
    let glitchedPixels = 0;
    let currentY = 0;
    
    // First, create a copy of the original image data
    const originalImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const originalData = originalImageData.data;
    
    // Create a new array to store the final result
    const finalImageData = new Uint8ClampedArray(originalData);
    
    for (const line of lineShifts) {
      for (let y = 0; y < line.height; y++) {
        const sourceY = currentY + y;
        if (sourceY >= canvas.height) break;

        for (let x = 0; x < canvas.width; x++) {
          const pixelIndex = sourceY * canvas.width + x;
          
          // Check if this pixel is within radius of marked area
          if (markedPixels.has(pixelIndex)) {
            const sourceIndex = pixelIndex * 4;
            const targetX = x + line.shift;
            
            if (targetX >= 0 && targetX < canvas.width) {
              const targetIndex = (sourceY * canvas.width + targetX) * 4;
              // Only apply glitch if target pixel is also in marked area
              if (markedPixels.has(sourceY * canvas.width + targetX)) {
                finalImageData[targetIndex] = d[sourceIndex];         // Red
                finalImageData[targetIndex + 1] = d[sourceIndex + 1]; // Green
                finalImageData[targetIndex + 2] = d[sourceIndex + 2]; // Blue
                finalImageData[targetIndex + 3] = d[sourceIndex + 3]; // Alpha
                glitchedPixels++;
              }
            }
          }
        }
      }
      currentY += line.height;
    }

    // Create new ImageData with our final result
    const finalResult = new ImageData(finalImageData, canvas.width, canvas.height);
    tempCtx.putImageData(finalResult, 0, 0);
    */

    tempCtx.putImageData(glitchImageData, 0, 0);
    console.log('✅ Updated temporary canvas with test effect');

    // Create image element and add download link
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

  console.log('✨ Generation completed!');
});
