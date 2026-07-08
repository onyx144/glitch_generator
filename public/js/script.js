const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const clearBtn = document.getElementById('clear');
const modeSelect = document.getElementById('mode');
const imageControls = document.getElementById('imageControls');
const videoControls = document.getElementById('videoControls');
const videoPreview = document.getElementById('videoPreview');

const maskCanvas = document.getElementById('maskCanvas');
const maskCtx = maskCanvas.getContext('2d');

let image = null;
let isDrawing = false;
let currentMode = 'image';

const videoElement = videoPreview;
let videoLoaded = false;
let videoObjectUrl = null;
let videoFile = null;

const MASK_COLOR_R = 255;
const MASK_COLOR_G = 0;
const MASK_COLOR_B = 255;
const MASK_COLOR_A = 255;

function setMode(mode) {
    currentMode = mode;
    const isImage = mode === 'image';

    imageControls.style.display = isImage ? 'flex' : 'none';
    videoControls.style.display = isImage ? 'none' : 'flex';
    canvas.style.display = isImage ? 'block' : 'none';
    videoPreview.style.display = isImage ? 'none' : 'block';
    upload.accept = isImage ? 'image/*' : 'video/*';

    document.getElementById('output').innerHTML = '';
}

modeSelect.addEventListener('change', () => {
    setMode(modeSelect.value);
    resetMedia();
});

function resetMedia() {
    image = null;
    videoLoaded = false;
    videoFile = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
        videoObjectUrl = null;
    }
    videoPreview.removeAttribute('src');
    videoPreview.load();
    upload.value = '';
}

canvas.addEventListener('mousedown', (e) => {
    if (currentMode !== 'image') return;
    isDrawing = true;
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

    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    maskCtx.fillStyle = `rgba(${MASK_COLOR_R}, ${MASK_COLOR_G}, ${MASK_COLOR_B}, ${MASK_COLOR_A})`;
    maskCtx.beginPath();
    maskCtx.arc(x, y, 10, 0, Math.PI * 2);
    maskCtx.fill();
}

upload.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    if (currentMode === 'image') {
        const reader = new FileReader();
        reader.onload = function (event) {
            image = new Image();
            image.onload = function () {
                canvas.width = image.width;
                canvas.height = image.height;
                maskCanvas.width = image.width;
                maskCanvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
        videoFile = file;
        videoObjectUrl = URL.createObjectURL(file);
        videoLoaded = false;
        videoPreview.src = videoObjectUrl;
        videoPreview.onloadedmetadata = () => {
            videoLoaded = true;
            console.log('✅ Video loaded:', videoPreview.videoWidth, 'x', videoPreview.videoHeight, videoPreview.duration + 's');
        };
    }
});

clearBtn.addEventListener('click', () => {
    if (image) {
        ctx.drawImage(image, 0, 0);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
});

setMode('image');
