// Bulk photo upload: phone photos are often 4–12 MB; shrink them in the
// browser (longest side 1600px, JPEG) so uploads are fast, stay under the
// server's 5 MB limit, and every product photo has the same size. The file
// name (= the product's SKU or link) is kept.
export async function resizeForUpload(file, maxSide = 1600, quality = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof window.createImageBitmap !== 'function') return file;
  try {
    const bitmap = await window.createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNG -> white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new window.File([blob], file.name.replace(/\.[a-z0-9]+$/i, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
