const generateBtn = document.getElementById('generate');
const output = document.getElementById('output');

// Убедитесь, что MASK_COLOR_R, MASK_COLOR_G, MASK_COLOR_B, MASK_COLOR_A
// и maskCanvas, maskCtx, image, canvas, ctx определены глобально или в доступном скоупе.
// Например:
// const MASK_COLOR_R = 0; // Пример, если ваш маркер - чисто зеленый (0, 255, 0, 255)
// const MASK_COLOR_G = 255;
// const MASK_COLOR_B = 0;
// const MASK_COLOR_A = 255;
// let maskCanvas = document.getElementById('maskCanvas'); // Ваш канвас для рисования маски
// let maskCtx = maskCanvas.getContext('2d');
// let image = new Image(); // Загруженное изображение
// let canvas = document.getElementById('mainCanvas'); // Основной канвас для отображения изображения
// let ctx = canvas.getContext('2d');


generateBtn.addEventListener('click', () => {
    console.log('🔄 Starting glitch generation...');

    if (!image) {
        console.error('❌ Image not loaded!');
        return alert('Please upload an image first');
    }
    // Убедитесь, что размеры канвасов согласованы
    if (canvas.width !== maskCanvas.width || canvas.height !== maskCanvas.height) {
        console.warn('⚠️ Main canvas and mask canvas have different dimensions. This might cause issues.');
        // Возможно, стоит установить maskCanvas.width/height = canvas.width/height
        // или наоборот, в зависимости от того, какой канвас является "мастерским" по размеру.
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

    // Array to store frames for GIF
    const gifFrames = [];

    // --- КРИТИЧНО: Получаем данные маски один раз из maskCanvas ---
    // Это imageData с тем, что нарисовал пользователь
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const maskData = maskImageData.data;
    console.log('📊 Mask pixel data received from mask canvas.');

    // --- Находим отмеченные области и создаем карту пикселей в радиусе ---
    const markedPixels = new Set();
    const radius = 10; // Радиус вокруг отмеченной области

    for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
            const index = (y * maskCanvas.width + x) * 4;
            const r = maskData[index];
            const g = maskData[index + 1];
            const b = maskData[index + 2];
            const a = maskData[index + 3];

            // Проверка на точное совпадение цвета маркера
            // Убедитесь, что MASK_COLOR_R, G, B, A соответствуют цвету вашей кисти для маски.
            if (r === MASK_COLOR_R && g === MASK_COLOR_G && b === MASK_COLOR_B && a === MASK_COLOR_A) {
                // Добавляем все пиксели в пределах радиуса к набору markedPixels
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        // Убедитесь, что nx и ny находятся в пределах ОБЩИХ размеров изображения/канваса
                        if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                            markedPixels.add(ny * canvas.width + nx); // Сохраняем 1D-индекс пикселя
                        }
                    }
                }
            }
        }
    }
    console.log(`🔍 Found ${markedPixels.size} pixels in marked areas (including radius).`);

    // --- Цикл генерации кадров глитча ---
    for (let i = 0; i < frameCount; i++) {
        console.log(`\n📸 Generating image ${i + 1}/${frameCount}`);

        // Создаем временный канвас для текущего кадра
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Копируем оригинальное изображение на временный канвас (это база для глитча)
        tempCtx.drawImage(image, 0, 0);

        // Получаем пиксельные данные оригинального изображения с временного канваса
        const originalImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const originalData = originalImageData.data; // Исходные пиксели

        // Создаем новый массив для хранения глитч-изображения.
        // Инициализируем его копией оригинального изображения.
        // Это гарантирует, что не отмеченные области останутся нетронутыми.
        const glitchedData = new Uint8ClampedArray(originalData);

        // Определяем случайные смещения линий для этого кадра
        const lineShifts = [];
        const maxShift = 50; // Максимальное смещение в пикселях
        const minLineHeight = 2; // Минимальная высота линии
        const maxLineHeight = 20; // Максимальная высота линии

        let currentLineY = 0;
        while (currentLineY < canvas.height) {
            const lineHeight = Math.floor(Math.random() * (maxLineHeight - minLineHeight + 1)) + minLineHeight;
            const shift = Math.floor(Math.random() * maxShift * 2) - maxShift; // Случайное смещение (-maxShift до +maxShift)
            lineShifts.push({ height: lineHeight, shift: shift });
            currentLineY += lineHeight;
        }

        // --- Применяем смещение линий ---
        let processedHeight = 0;
        for (const line of lineShifts) {
            // Создаем временный буфер для текущей "линии" пикселей из оригинальных данных.
            const lineBuffer = new Uint8ClampedArray(line.height * canvas.width * 4);
            let bufferOffset = 0;

            for (let yOffset = 0; yOffset < line.height; yOffset++) {
                const sourceY = processedHeight + yOffset;
                if (sourceY >= canvas.height) break;

                for (let x = 0; x < canvas.width; x++) {
                    const originalPixelDataIndex = (sourceY * canvas.width + x) * 4;
                    // Копируем оригинальный пиксель в буфер линии
                    lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex];
                    lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex + 1];
                    lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex + 2];
                    lineBuffer[bufferOffset++] = originalData[originalPixelDataIndex + 3];
                }
            }

            // Теперь применяем смещение, читая из lineBuffer и записывая в glitchedData
            bufferOffset = 0; // Сбрасываем для чтения из lineBuffer
            for (let yOffset = 0; yOffset < line.height; yOffset++) {
                const sourceY = processedHeight + yOffset;
                if (sourceY >= canvas.height) break;

                for (let x = 0; x < canvas.width; x++) {
                    const pixelIndex = sourceY * canvas.width + x; // 1D-индекс пикселя

                    // Если пиксель находится в отмеченной области (или ее радиусе)
                    if (markedPixels.has(pixelIndex)) {
                        const targetX = x + line.shift; // Вычисляем целевую X-координату

                        if (targetX >= 0 && targetX < canvas.width) {
                            const targetDataIndex = (sourceY * canvas.width + targetX) * 4; // Индекс в glitchedData

                            // Копируем данные из буфера линии в glitchedData по целевой координате
                            glitchedData[targetDataIndex] = lineBuffer[bufferOffset];
                            glitchedData[targetDataIndex + 1] = lineBuffer[bufferOffset + 1];
                            glitchedData[targetDataIndex + 2] = lineBuffer[bufferOffset + 2];
                            glitchedData[targetDataIndex + 3] = lineBuffer[bufferOffset + 3];
                        }
                    }
                    bufferOffset += 4; // Продвигаем смещение в буфере для следующего пикселя
                }
            }
            processedHeight += line.height;
        }

        // Помещаем окончательные глитч-данные на временный канвас
        const finalResult = new ImageData(glitchedData, canvas.width, canvas.height);
        tempCtx.putImageData(finalResult, 0, 0);
        console.log(`✅ Applied glitch effect for frame ${i + 1}.`);

        // Add frame to gifFrames array
        gifFrames.push(tempCanvas);

        // --- Создание элемента изображения и ссылки для скачивания ---
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

    // Check if GIF.js is loaded
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

        gifImg.onload = () => URL.revokeObjectURL(gifUrl);
    });

    // Handle GIF progress
    gif.on('progress', function (p) {
        console.log(`📊 GIF encoding progress: ${Math.round(p * 100)}%`);
    });

    // Start GIF rendering
    gif.render();
    console.log('🚀 GIF rendering initiated...');
});