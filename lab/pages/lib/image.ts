import sharp from 'sharp';

export async function toWebp(input: Buffer | string, options: { width?: number; height?: number; quality?: number; lossless?: boolean; fit?: 'inside' | 'cover' | 'contain' | 'fill'; withoutEnlargement?: boolean } = {}): Promise<Buffer> {
  let pipeline = sharp(input, { failOn: 'error' }).rotate();
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? 'inside',
      withoutEnlargement: options.withoutEnlargement ?? true,
      kernel: sharp.kernel.lanczos3
    });
  }
  return pipeline.webp(options.lossless ? { lossless: true, effort: 6 } : { quality: options.quality ?? 82, effort: 6 }).toBuffer();
}

export async function metadata(input: Buffer | string): Promise<sharp.Metadata> { return sharp(input, { failOn: 'error' }).metadata(); }

export async function visibleBoundingBox(input: Buffer | string): Promise<{ left: number; top: number; width: number; height: number; imageWidth: number; imageHeight: number } | null> {
  const { data, info } = await sharp(input, { failOn: 'error' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      if (alpha <= 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, imageWidth: info.width, imageHeight: info.height };
}
