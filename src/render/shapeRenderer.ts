import type { Clip } from '../types/clip';

export function drawShape(ctx: CanvasRenderingContext2D, clip: Clip): void {
    const { shapeType, fillColor, strokeColor, strokeWidth, width, height, rotation } = clip;
    if (!shapeType || !width || !height) return;

    const w = width;
    const h = height;

    ctx.save();
    ctx.rotate(rotation * Math.PI / 180);
    drawShapePath(ctx, shapeType, w, h);
    ctx.clip();

    if (fillColor && fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    if (strokeColor && strokeColor !== 'transparent' && strokeWidth && strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        drawShapePath(ctx, shapeType, w, h);
        ctx.stroke();
    }

    ctx.restore();
}

function drawShapePath(
    ctx: CanvasRenderingContext2D,
    shapeType: NonNullable<Clip['shapeType']>,
    width: number,
    height: number
): void {
    ctx.beginPath();

    switch (shapeType) {
        case 'rectangle':
            ctx.rect(-width / 2, -height / 2, width, height);
            break;
        case 'triangle':
            ctx.moveTo(0, -height / 2);
            ctx.lineTo(-width / 2, height / 2);
            ctx.lineTo(width / 2, height / 2);
            ctx.closePath();
            break;
        case 'circle':
            ctx.arc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 2);
            break;
        case 'pie': {
            const radius = Math.min(width, height) / 2;
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
            ctx.closePath();
            break;
        }
        case 'arrow': {
            const headSize = Math.min(width, height) * 0.35;
            const shaftWidth = height * 0.2;
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2 - headSize, -headSize / 2);
            ctx.lineTo(width / 2 - headSize, -shaftWidth / 2);
            ctx.lineTo(-width / 2, -shaftWidth / 2);
            ctx.lineTo(-width / 2, shaftWidth / 2);
            ctx.lineTo(width / 2 - headSize, shaftWidth / 2);
            ctx.lineTo(width / 2 - headSize, headSize / 2);
            ctx.closePath();
            break;
        }
    }
}