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

        // Фильтр Собеля
        applySobel(sobelCtx, 0, 0.25); // A = 0, B = 1/4
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
function applySobel(ctx, A = 0, B = 1 / 4) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    const width = imageData.width;
    const height = imageData.height;

    const sobelData = new Uint8ClampedArray(data.length);
    const grayscale = new Uint8ClampedArray(width * height);

    // Преобразование в градации серого
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayscale[i / 4] = gray;
    }

    // Матрица Собеля
    const Mx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const My = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelX = 0;
            let pixelY = 0;

            // Применение матриц
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pos = (y + ky) * width + (x + kx);
                    const weightX = Mx[(ky + 1) * 3 + (kx + 1)];
                    const weightY = My[(ky + 1) * 3 + (kx + 1)];

                    pixelX += grayscale[pos] * weightX;
                    pixelY += grayscale[pos] * weightY;
                }
            }

            // Модуль градиента с учётом A и B
            const magnitude = A + B * Math.sqrt(pixelX ** 2 + pixelY ** 2);
            const clamped = Math.min(255, Math.max(0, magnitude));
            const pos = (y * width + x) * 4;

            sobelData[pos] = sobelData[pos + 1] = sobelData[pos + 2] = clamped;
            sobelData[pos + 3] = 255; // Прозрачность
        }
    }

    // Результат на холсте
    const sobelImageData = new ImageData(sobelData, width, height);
    ctx.putImageData(sobelImageData, 0, 0);
}