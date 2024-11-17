const uploadInput = document.getElementById('upload');
const thresholdInput = document.getElementById('threshold');
const originalCanvas = document.getElementById('original');
const grayscaleCanvas = document.getElementById('grayscale');
const thresholdedCanvas = document.getElementById('thresholded');
const sobelCanvas = document.getElementById('sobel');

// Контекст для работы с Canvas
const originalCtx = originalCanvas.getContext('2d');
const grayscaleCtx = grayscaleCanvas.getContext('2d');
const thresholdedCtx = thresholdedCanvas.getContext('2d');
const sobelCtx = sobelCanvas.getContext('2d');

// Функция загрузки изображения
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        [originalCanvas, grayscaleCanvas, thresholdedCanvas, sobelCanvas].forEach(canvas => {
            canvas.width = img.width;
            canvas.height = img.height;
        });

        // Отобразить оригинальное изображение
        originalCtx.drawImage(img, 0, 0);

        // Перевод в оттенки серого
        const grayscaleData = toGrayscale(originalCtx);
        grayscaleCtx.putImageData(grayscaleData, 0, 0);

        // Обработка порога
        updateThreshold(grayscaleData);
    };

    img.src = URL.createObjectURL(file);
});

// Перевод изображения в оттенки серого
function toGrayscale(ctx) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
    }

    return imageData;
}

// Обработка изображения с порогом
function updateThreshold(grayscaleData) {
    const threshold = parseInt(thresholdInput.value, 10);
    const data = grayscaleData.data;

    const thresholdedData = new ImageData(grayscaleData.width, grayscaleData.height);
    for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > threshold ? 255 : 0;
        thresholdedData.data[i] = thresholdedData.data[i + 1] = thresholdedData.data[i + 2] = value;
        thresholdedData.data[i + 3] = 255; // Прозрачность
    }

    thresholdedCtx.putImageData(thresholdedData, 0, 0);
}

// Обновление порогового изображения при изменении значения
thresholdInput.addEventListener('input', () => {
    const grayscaleData = grayscaleCtx.getImageData(0, 0, grayscaleCtx.canvas.width, grayscaleCtx.canvas.height);
    updateThreshold(grayscaleData);
});

// Реализация фильтра Собеля
function applySobel(ctx) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    const width = imageData.width;
    const height = imageData.height;

    const sobelData = new Uint8ClampedArray(data.length);
    const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelX = 0;
            let pixelY = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pos = ((y + ky) * width + (x + kx)) * 4;
                    const weightX = kernelX[(ky + 1) * 3 + (kx + 1)];
                    const weightY = kernelY[(ky + 1) * 3 + (kx + 1)];

                    pixelX += data[pos] * weightX;
                    pixelY += data[pos] * weightY;
                }
            }

            const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
            const pos = (y * width + x) * 4;

            sobelData[pos] = sobelData[pos + 1] = sobelData[pos + 2] = magnitude > 255 ? 255 : magnitude;
            sobelData[pos + 3] = 255;
        }
    }

    const sobelImageData = new ImageData(sobelData, width, height);
    sobelCtx.putImageData(sobelImageData, 0, 0);
}
