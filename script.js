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

    const imgOriginal = new Image();
    imgOriginal.onload = () => {
        // Масштабирование canvas под размеры изображения
        [originalCanvas, grayscaleCanvas, thresholdedCanvas, sobelCanvas].forEach(canvas => {
            canvas.width = imgOriginal.width;
            canvas.height = imgOriginal.height;
        });

        // Отобразить оригинальное изображение
        originalCtx.drawImage(imgOriginal, 0, 0);

        // Перевод в оттенки серого
        const grayscaleData = toGrayscale(originalCtx);
        grayscaleCtx.putImageData(grayscaleData, 0, 0);

        // Обработка порога
        updateThreshold(grayscaleData);

        // Фильтр Собеля
        processSobelFilter(sobelCtx);
    };

    imgOriginal.src = URL.createObjectURL(file);
});

// Перевод изображения в оттенки серого
function toGrayscale(ctx) {
    const originalImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const grayscaleImageData = ctx.createImageData(originalImageData); // Создаем пустой ImageData с теми же размерами
    const originalData = originalImageData.data;
    const grayscaleData = grayscaleImageData.data;

    for (let i = 0; i < originalData.length; i += 4) {
        // Вычисляем градацию серого с использованием формулы:
        const gray = 0.3 * originalData[i] + 0.59 * originalData[i + 1] + 0.11 * originalData[i + 2];
        grayscaleData[i] = gray;        // R
        grayscaleData[i + 1] = gray;    // G
        grayscaleData[i + 2] = gray;    // B
        grayscaleData[i + 3] = originalData[i + 3]; // Alpha остается неизменной
    }

    return grayscaleImageData; // Возвращаем обработанные данные
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

// Применение Фильтра Собеля
function processSobelFilter(targetCtx) {
    // Копируем данные из originalCanvas на sobelCanvas
    targetCtx.drawImage(grayscaleCanvas, 0, 0);

    // Применяем фильтр Собеля
    applySobel(targetCtx, 0, 0.25); // A = 0, B = 1/4
}

// Реализация фильтра Собеля
function applySobel(ctx) {
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

    // Матрица Собеля для X-направления
    const Mx = [[-1, 0, 1], 
                [-2, 0, 2], 
                [-1, 0, 1]];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            
            let pixelX = 0;

            // Применение матрицы
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pos = (y + ky) * width + (x + kx);
                    pixelX += grayscale[pos] * Mx[(ky + 1)][(kx + 1)];;
                }
            }

            // Вычисление значения по формуле A + B * |M|
            const magnitude = 0 + 0.25 * Math.abs(pixelX);
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