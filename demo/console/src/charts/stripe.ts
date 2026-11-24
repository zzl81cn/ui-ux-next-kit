let cached: HTMLCanvasElement | null = null;

/** 成功柱：绿底加白斜纹。 */
export function successStripe(): HTMLCanvasElement {
  if (cached) return cached;
  const size = 10;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -size * 2; i < size * 3; i += 5) {
      ctx.moveTo(i, size + 1);
      ctx.lineTo(i + size + 1, -1);
    }
    ctx.stroke();
  }
  cached = canvas;
  return canvas;
}
