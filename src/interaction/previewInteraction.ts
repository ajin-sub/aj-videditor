import type { Clip } from '../types/clip';
import { getClipsAtFrame } from '../domain/timeline';

export interface PreviewInteractionOptions {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    clips: Clip[];
    getCurrentFrame: () => number;
    width: number;
    height: number;
    defaultFont: string;
    pickClip?: (clientX: number, clientY: number) => Clip | null;
    getClipPosition?: (clientX: number, clientY: number, clip: Clip) => { x: number; y: number } | null;
    onSelect: (clip: Clip) => void;
    onMove: (clip: Clip, x: number, y: number, deltaX: number, deltaY: number) => void;
    onDragEnd: (clip: Clip | null) => void;
    onRender: () => void;
}

export function getCanvasCoords(
    canvas: HTMLCanvasElement,
    event: MouseEvent
): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;
    const rectAspect = rect.width / rect.height;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > rectAspect) {
        drawWidth = rect.width;
        drawHeight = rect.width / canvasAspect;
        offsetY = (rect.height - drawHeight) / 2;
    } else {
        drawHeight = rect.height;
        drawWidth = rect.height * canvasAspect;
        offsetX = (rect.width - drawWidth) / 2;
    }

    const scale = canvas.width / drawWidth;
    return {
        x: (event.clientX - rect.left - offsetX) * scale,
        y: (event.clientY - rect.top - offsetY) * scale,
    };
}

export function getClipAtPosition(
    ctx: CanvasRenderingContext2D,
    clips: Clip[],
    frame: number,
    x: number,
    y: number,
    width: number,
    height: number,
    defaultFont: string
): Clip | null {
    const visibleClips = getClipsAtFrame(clips, frame);
    for (let index = visibleClips.length - 1; index >= 0; index--) {
        const clip = visibleClips[index];
        const drawX = width / 2 + clip.x;
        const drawY = height / 2 + clip.y;
        const bounds = getClipBounds(ctx, clip, defaultFont);
        const halfWidth = bounds.width / 2;
        const halfHeight = bounds.height / 2;

        if (x >= drawX - halfWidth && x <= drawX + halfWidth &&
            y >= drawY - halfHeight && y <= drawY + halfHeight) {
            return clip;
        }
    }
    return null;
}

function getClipBounds(
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    defaultFont: string
): { width: number; height: number } {
    if (clip.type === 'shape') {
        return { width: clip.width || 100, height: clip.height || 100 };
    }
    if (clip.type !== 'text') {
        return { width: 100, height: 60 };
    }

    const lines = clip.text?.split('\n') || [''];
    const fontSize = clip.fontSize || 48;
    const lineHeight = fontSize * 1.2;
    ctx.font = `${fontSize}px ${clip.fontFamily || defaultFont}`;
    const textWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
    return {
        width: (textWidth || 100) + 20,
        height: lines.length * lineHeight + 20,
    };
}

export function setupPreviewDrag(options: PreviewInteractionOptions): void {
    let isPointerDown = false;
    let pointerDownClip: Clip | null = null;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let clipStartX = 0;
    let clipStartY = 0;

    const onPointerDown = (event: MouseEvent) => {
        if (event.button !== 0) return;
        const position = getCanvasCoords(options.canvas, event);
        const clip = options.pickClip
            ? options.pickClip(event.clientX, event.clientY)
            : getClipAtPosition(
                options.ctx,
                options.clips,
                options.getCurrentFrame(),
                position.x,
                position.y,
                options.width,
                options.height,
                options.defaultFont
            );
        if (!clip) return;

        options.onSelect(clip);
        isPointerDown = true;
        pointerDownClip = clip;
        const clipPosition = options.getClipPosition?.(event.clientX, event.clientY, clip);
        pointerStartX = clip.type === 'cameraOrbit' ? event.clientX : clipPosition?.x ?? position.x;
        pointerStartY = clip.type === 'cameraOrbit' ? event.clientY : clipPosition?.y ?? position.y;
        clipStartX = clip.x;
        clipStartY = clip.y;
        options.canvas.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onPointerMove);
        document.addEventListener('mouseup', onPointerUp);
    };

    const onPointerMove = (event: MouseEvent) => {
        if (!isPointerDown || !pointerDownClip) return;
        const clipPosition = pointerDownClip.type === 'cameraOrbit'
            ? { x: event.clientX, y: event.clientY }
            : options.getClipPosition?.(event.clientX, event.clientY, pointerDownClip);
        if (options.getClipPosition && !clipPosition) return;
        const position = clipPosition ?? getCanvasCoords(options.canvas, event);
        if (Math.abs(position.x - pointerStartX) < 0.5 && Math.abs(position.y - pointerStartY) < 0.5) return;

        const deltaX = position.x - pointerStartX;
        const deltaY = position.y - pointerStartY;
        const newX = Math.round(clipStartX + deltaX);
        const newY = Math.round(clipStartY + deltaY);
        options.onMove(pointerDownClip, newX, newY, deltaX, deltaY);
        options.onRender();
    };

    const onPointerUp = () => {
        options.onDragEnd(pointerDownClip);
        isPointerDown = false;
        pointerDownClip = null;
        options.canvas.style.cursor = 'default';
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseup', onPointerUp);
    };

    options.canvas.addEventListener('mousedown', onPointerDown);
}