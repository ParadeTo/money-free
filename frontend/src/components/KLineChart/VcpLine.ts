/**
 * VcpLine Drawing Functions
 * T017: Canvas Path2D, setLineDash, batch rendering
 */

import type { VcpLineData } from '../../types/vcp';
import { getLineStyle } from '../../utils/vcpOverlayHelpers';

export interface VcpLineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Draw a single VCP line on canvas
 */
export function drawVcpLine(
  ctx: CanvasRenderingContext2D,
  line: VcpLineData,
  coords: VcpLineCoordinates
): void {
  const style = getLineStyle(line);

  ctx.save();

  // Apply line style
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.lineWidth;
  ctx.globalAlpha = style.opacity;
  ctx.setLineDash(style.dashArray);

  // Draw line
  ctx.beginPath();
  ctx.moveTo(coords.x1, coords.y1);
  ctx.lineTo(coords.x2, coords.y2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw multiple VCP lines in batch (optimized)
 */
export function drawVcpLines(
  ctx: CanvasRenderingContext2D,
  lines: VcpLineData[],
  coordsMap: Map<string, VcpLineCoordinates>
): void {
  if (lines.length === 0) {
    return;
  }

  ctx.save();

  // Group lines by style for batch rendering
  const linesByStyle = new Map<string, Array<{ line: VcpLineData; coords: VcpLineCoordinates }>>();

  lines.forEach((line) => {
    const coords = coordsMap.get(line.id);
    if (!coords) return;

    const styleKey = getStyleKey(line);
    if (!linesByStyle.has(styleKey)) {
      linesByStyle.set(styleKey, []);
    }
    linesByStyle.get(styleKey)!.push({ line, coords });
  });

  // Render each style group
  linesByStyle.forEach((group) => {
    if (group.length === 0) return;

    const { line } = group[0];
    const style = getLineStyle(line);

    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    ctx.globalAlpha = style.opacity;
    ctx.setLineDash(style.dashArray);

    ctx.beginPath();
    group.forEach(({ coords }) => {
      ctx.moveTo(coords.x1, coords.y1);
      ctx.lineTo(coords.x2, coords.y2);
    });
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Get unique style key for grouping
 */
function getStyleKey(line: VcpLineData): string {
  if (line.type === 'contraction') {
    return 'contraction';
  } else {
    return line.status === 'active' ? 'pullback-active' : 'pullback-completed';
  }
}

/**
 * Draw VCP marker (circular dot)
 */
export function drawVcpMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number
): void {
  ctx.save();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw VCP label (text with semi-transparent background)
 */
export function drawVcpLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  fontSize: number,
  backgroundColor: string
): void {
  ctx.save();

  // Set font
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize;

  // Draw background
  const padding = 4;
  const bgX = x - textWidth / 2 - padding;
  const bgY = y - textHeight / 2 - padding;
  const bgWidth = textWidth + padding * 2;
  const bgHeight = textHeight + padding * 2;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

  // Draw text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}
