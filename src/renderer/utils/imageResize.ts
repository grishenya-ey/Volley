/**
 * Изменяет размер изображения до указанного размера по длинной стороне
 */
export function resizeImage(base64Image: string, maxSize: number = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      const longSide = Math.max(width, height);

      if (longSide <= maxSize) {
        resolve(base64Image);
        return;
      }

      const ratio = maxSize / longSide;
      const newWidth = Math.round(width * ratio);
      const newHeight = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Не удалось получить контекст canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const resizedBase64 = canvas.toDataURL('image/png', 0.9);
      resolve(resizedBase64);
    };

    img.onerror = (error) => {
      reject(new Error('Ошибка при загрузке изображения: ' + String(error)));
    };

    img.src = base64Image;
  });
}
