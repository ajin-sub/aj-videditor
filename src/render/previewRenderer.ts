import type { Clip } from '../types/clip';
import { getClipsAtFrame } from '../domain/timeline';
import { drawShape } from './shapeRenderer';

export interface PreviewRenderOptions {
    ctx: CanvasRenderingContext2D;
    clips: Clip[];
    currentFrame: number;
    selectedId: string | null;
    width: number;
    height: number;
    backgroundColor: string;
    defaultFont: string;
}

export function renderPreview(options: PreviewRenderOptions): void {
    const {
        ctx,
        clips,
        currentFrame,
        selectedId,
        width,
        height,
        backgroundColor,
        defaultFont,
    } = options;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,50,50,0.5)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    const visibleClips = getClipsAtFrame(clips, currentFrame)
        .filter(clip => clip.type === 'text' || clip.type === 'shape')
        .sort((a, b) => a.layerId - b.layerId);

    for (const clip of visibleClips) {
        const drawX = width / 2 + clip.x;
        const drawY = height / 2 + clip.y;

        if (clip.type === 'text') {
            drawText(ctx, clip, drawX, drawY, defaultFont);
            if (clip.id === selectedId) {
                drawTextSelection(ctx, clip, drawX, drawY, defaultFont);
            }
        } else if (clip.type === 'shape') {
            ctx.save();
            ctx.translate(drawX, drawY);
            drawShape(ctx, clip);
            ctx.restore();

            if (clip.id === selectedId) {
                drawShapeSelection(ctx, clip, drawX, drawY);
            }
        }
    }
}

function drawText(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    drawX: number,
    drawY: number,
    defaultFont: string
): void {
    const lines = clip.text?.split('\n') || [''];
    const lineHeight = (clip.fontSize || 48) * 1.2;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(clip.rotation * Math.PI / 180);
    ctx.font = `${clip.fontSize || 48}px ${clip.fontFamily || defaultFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
        const yOffset = (i - (lines.length - 1) / 2) * lineHeight;
        ctx.fillStyle = clip.color || '#ffffff';
        ctx.fillText(lines[i], 0, yOffset);
    }
    ctx.restore();
}

function drawTextSelection(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    drawX: number,
    drawY: number,
    defaultFont: string
): void {
    const lines = clip.text?.split('\n') || [''];
    const lineHeight = (clip.fontSize || 48) * 1.2;
    const totalHeight = lines.length * lineHeight;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(clip.rotation * Math.PI / 180);
    ctx.font = `${clip.fontSize || 48}px ${clip.fontFamily || defaultFont}`;
    let maxWidth = 0;
    for (const line of lines) {
        maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
    }
    const width = maxWidth || 50;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(-width / 2 - 10, -totalHeight / 2 - 10, width + 20, totalHeight + 20);
    ctx.setLineDash([]);
    ctx.restore();
}

function drawShapeSelection(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    drawX: number,
    drawY: number
): void {
    const width = clip.width || 100;
    const height = clip.height || 100;
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(clip.rotation * Math.PI / 180);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 20);
    ctx.setLineDash([]);
    ctx.restore();
}
