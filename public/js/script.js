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
