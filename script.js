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
        [originalCanvas, grayscaleCanvas, thresholdedCanvas].forEach(canvas => {
            canvas.width = imgOriginal.width;
            canvas.height = imgOriginal.height;
        });
    
        [sobelCanvas].forEach(canvas => {
            canvas.width = imgOriginal.width + 1;
            canvas.height = imgOriginal.height + 1;
        });
    
        // Отобразить оригинальное изображение
        originalCtx.drawImage(imgOriginal, 0, 0);
    
        // Перевод в оттенки серого
        const grayscaleData = toGrayscale(originalCtx);
        grayscaleCtx.putImageData(grayscaleData, 0, 0);
    
        // Обработка порога
        updateThreshold(grayscaleData);
    
        // Расширение изображения на 1 пиксель
        const extendedImageData = extendEdges(grayscaleData, imgOriginal.width, imgOriginal.height);
        sobelCtx.putImageData(extendedImageData, 0, 0);
    
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
    applySobel(targetCtx);
}

/**
 * Расширяет изображение, добавляя копии краёв
 * @param {ImageData} imageData - данные изображения
 * @param {number} width - ширина изображения
 * @param {number} height - высота изображения
 * @returns {ImageData} - новые данные изображения с расширенными краями
 */
function extendEdges(imageData, width, height) {
    const newWidth = width + 1;
    const newHeight = height + 1;
    const extendedData = new Uint8ClampedArray(newWidth * newHeight * 4);

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const originalX = Math.min(x, width - 1); // Последний пиксель по горизонтали
            const originalY = Math.min(y, height - 1); // Последний пиксель по вертикали
            const originalIndex = (originalY * width + originalX) * 4;
            const newIndex = (y * newWidth + x) * 4;

            // Копирование RGBA из оригинального изображения
            extendedData[newIndex] = imageData.data[originalIndex];
            extendedData[newIndex + 1] = imageData.data[originalIndex + 1];
            extendedData[newIndex + 2] = imageData.data[originalIndex + 2];
            extendedData[newIndex + 3] = imageData.data[originalIndex + 3];
        }
    }

    return new ImageData(extendedData, newWidth, newHeight);
}

// Реализация фильтра Собеля
function applySobel(ctx) {
    const A = 0; // Константа A
    const B = 0.25; // Константа B
    const N = 1; // Размер окрестности
    const M = [
        -1, 0, 1,
        -2, 0, 2,
        -1, 0, 1
    ]; // Матрица весов

    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    const width = imageData.width;
    const height = imageData.height;

    const outputData = new Uint8ClampedArray(data.length);

    for (let y = N; y < height; y++) {
        for (let x = N; x < width; x++) {
            let sum = 0;

            for (let j = -N; j <= N; j++) {
                for (let i = -N; i <= N; i++) {
                    // Индекс текущего пикселя в массиве data (умножение на 4, так как каждый пиксель представлен 4 значениями: R, G, B, A) (Особенность JS)
                    const pos = ((y + j) * width + (x + i)) * 4;

                    // Вычисляем значения пикселя до умножения на коэффициент
                    sum += ((data[pos] + data[pos + 1] + data[pos + 2]) / 3) * M[(j + N) * (2 * N + 1) + (i + N)];
                }
            }

            const result = A + B * sum;

            // Ограничиваем значение result в диапазоне от 0 до 255, чтобы оно было корректным для цвета
            const clamped = Math.min(255, Math.max(0, result));

            const pos = (y * width + x) * 4;
            outputData[pos] = outputData[pos + 1] = outputData[pos + 2] = clamped;
            outputData[pos + 3] = 255; // Прозрачность
        }
    }

    const outputImageData = new ImageData(outputData, width, height);
    ctx.putImageData(outputImageData, 0, 0);
}
