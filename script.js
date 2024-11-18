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
        processSobelFilter(sobelCtx);

        // applyHoughTransform(originalCtx);
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

// Применение Фильтра Собеля
function processSobelFilter(targetCtx) {
    // Копируем данные из originalCanvas на sobelCanvas
    targetCtx.drawImage(originalCanvas, 0, 0);

    // Применяем фильтр Собеля
    applySobel(targetCtx, 0, 0.25); // A = 0, B = 1/4
}

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

// function applyHoughTransform(ctx) {
//     const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
//     const data = imageData.data;
//
//     const width = imageData.width;
//     const height = imageData.height;
//
//     // Преобразование в черно-белое (используем порог 128 для выделения контуров)
//     const edges = [];
//     for (let y = 0; y < height; y++) {
//         for (let x = 0; x < width; x++) {
//             const index = (y * width + x) * 4;
//             const gray = data[index]; // Предполагаем, что изображение уже черно-белое
//             edges.push(gray > 128 ? 1 : 0);
//         }
//     }
//
//     // Параметры преобразования Хафа
//     const rhoMax = Math.ceil(Math.sqrt(width * width + height * height));
//     const thetaSteps = 180;
//     const accumulator = Array.from({ length: rhoMax * 2 }, () => Array(thetaSteps).fill(0));
//
//     // Преобразование Хафа
//     for (let y = 0; y < height; y++) {
//         for (let x = 0; x < width; x++) {
//             if (edges[y * width + x] === 1) { // Если точка является краем
//                 for (let theta = 0; theta < thetaSteps; theta++) {
//                     const thetaRad = (Math.PI / thetaSteps) * theta;
//                     const rho = Math.round(x * Math.cos(thetaRad) + y * Math.sin(thetaRad));
//                     accumulator[rho + rhoMax][theta]++;
//                 }
//             }
//         }
//     }
//
//     // Поиск локальных максимумов
//     const threshold = 50; // Порог для детектирования линий
//     const lines = [];
//     for (let rho = 0; rho < 2 * rhoMax; rho++) {
//         for (let theta = 0; theta < thetaSteps; theta++) {
//             if (accumulator[rho][theta] > threshold) {
//                 lines.push({ rho: rho - rhoMax, theta });
//             }
//         }
//     }
//
//     // Рисуем линии на новом холсте
//     const houghCtx = document.getElementById('houghCanvas').getContext('2d');
//     houghCtx.clearRect(0, 0, houghCtx.canvas.width, houghCtx.canvas.height);
//     houghCtx.putImageData(imageData, 0, 0); // Копируем оригинальное изображение
//
//     houghCtx.strokeStyle = 'red';
//     houghCtx.lineWidth = 1;
//
//     lines.forEach(({ rho, theta }) => {
//         const thetaRad = (Math.PI / thetaSteps) * theta;
//
//         const x0 = Math.cos(thetaRad) * rho;
//         const y0 = Math.sin(thetaRad) * rho;
//
//         const x1 = x0 + 1000 * (-Math.sin(thetaRad));
//         const y1 = y0 + 1000 * Math.cos(thetaRad);
//
//         const x2 = x0 - 1000 * (-Math.sin(thetaRad));
//         const y2 = y0 - 1000 * Math.cos(thetaRad);
//
//         houghCtx.beginPath();
//         houghCtx.moveTo(x1, y1);
//         houghCtx.lineTo(x2, y2);
//         houghCtx.stroke();
//     });
// }
