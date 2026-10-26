/**
 * Downscales an uploaded image client-side before sending it to the server,
 * so a full-resolution phone photo doesn't blow past the 4.5MB Vercel
 * Function request-body limit (or just make the round trip slow).
 */
export function resizeImageToDataUrl(
  file: File,
  { maxDimension = 900, quality = 0.82 } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("無法處理圖片"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("無法讀取圖片"));
    };

    img.src = objectUrl;
  });
}
