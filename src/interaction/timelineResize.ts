import type { Clip } from '../types/clip';

export type ResizeEdge = 'left' | 'right';

export interface TimelineResizeOptions {
    container: HTMLDivElement;
    paddingLeft: number;
    fps: () => number;
    maxTimelineFrames: number;
    getPixelsPerSecond: (containerWidth: number) => number;
    getClip: (id: string) => Clip | undefined;
    isDraggingClip: () => boolean;
    preventOverlap: () => boolean;
    isOverlapping: (clip: Clip, ignoreId?: string) => boolean;
    resolveOverlap: (clip: Clip, ignoreId?: string) => void;
    setSelected: (id: string) => void;
    setPropertyValues: (clip: Clip) => void;
    onRender: () => void;
    onResizeEnd: () => void;
    stopPlayback: () => void;
}

export interface TimelineResizeInteraction {
    start(event: MouseEvent, clipId: string, edge: ResizeEdge): void;
    isResizing(): boolean;
}

export function createTimelineResize(options: TimelineResizeOptions): TimelineResizeInteraction {
    let resizing = false;
    let resizeClipId: string | null = null;
    let resizeEdge: ResizeEdge | null = null;

    const onResizeMove = (event: MouseEvent): void => {
        if (!resizing || !resizeClipId || !resizeEdge) return;
        const clip = options.getClip(resizeClipId);
        if (!clip) return;

        const rect = options.container.getBoundingClientRect();
        const pixelsPerSecond = options.getPixelsPerSecond(options.container.clientWidth - 4);
        const mouseX = event.clientX - rect.left - options.paddingLeft + options.container.scrollLeft;
        const mouseFrame = Math.round((mouseX / pixelsPerSecond) * options.fps());
        const oldStart = clip.startFrame;
        const oldDuration = clip.duration;
        const endFrame = oldStart + oldDuration;

        if (resizeEdge === 'left') {
            const newStart = Math.max(0, Math.min(mouseFrame, endFrame - 1));
            clip.startFrame = newStart;
            clip.duration = endFrame - newStart;

            if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
                const direction = newStart > oldStart ? 1 : -1;
                let testStart = newStart;
                let found = false;
                for (let attempt = 0; attempt < 100; attempt++) {
                    testStart += direction * -1;
                    if (testStart < 0 || testStart > endFrame - 1) break;
                    clip.startFrame = testStart;
                    clip.duration = endFrame - testStart;
                    if (!options.isOverlapping(clip, clip.id)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    clip.startFrame = oldStart;
                    clip.duration = oldDuration;
                }
            }
        } else {
            const maxDuration = options.maxTimelineFrames - clip.startFrame;
            const newEnd = Math.max(clip.startFrame + 1, Math.min(options.maxTimelineFrames, mouseFrame));
            const newDuration = newEnd - clip.startFrame;
            clip.duration = newDuration;

            if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
                const direction = newDuration > oldDuration ? 1 : -1;
                let testDuration = newDuration;
                let found = false;
                for (let attempt = 0; attempt < 100; attempt++) {
                    testDuration += direction * -1;
                    if (testDuration < 1 || testDuration > maxDuration) break;
                    clip.duration = testDuration;
                    if (!options.isOverlapping(clip, clip.id)) {
                        found = true;
                        break;
                    }
                }
                if (!found) clip.duration = oldDuration;
            }
        }

        options.setPropertyValues(clip);
        options.onRender();
    };

    const onResizeEnd = (): void => {
        if (!resizing) return;
        resizing = false;
        resizeClipId = null;
        resizeEdge = null;
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeEnd);
        document.removeEventListener('mouseleave', onResizeEnd);
        document.body.style.cursor = '';
        options.onResizeEnd();
    };

    const start = (event: MouseEvent, clipId: string, edge: ResizeEdge): void => {
        if (options.isDraggingClip() || resizing) return;
        const clip = options.getClip(clipId);
        if (!clip) return;
        options.stopPlayback();
        resizing = true;
        resizeClipId = clipId;
        resizeEdge = edge;
        options.setSelected(clipId);
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeEnd);
        document.addEventListener('mouseleave', onResizeEnd);
        document.body.style.cursor = 'ew-resize';
        options.onRender();
    };

    return { start, isResizing: () => resizing };
}