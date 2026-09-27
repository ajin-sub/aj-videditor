import type { Clip } from '../types/clip';

export interface TimelineDragOptions {
    container: HTMLDivElement;
    timelineHeight: number;
    timelineHeaderHeight: number;
    fps: () => number;
    maxTimelineFrames: number;
    layerCount: () => number;
    getPixelsPerSecond: (containerWidth: number) => number;
    getClip: (id: string) => Clip | undefined;
    isResizing: () => boolean;
    preventOverlap: () => boolean;
    isOverlapping: (clip: Clip, ignoreId?: string) => boolean;
    findAvailableLayer: (startFrame: number, duration: number) => number | null;
    setSelected: (id: string) => void;
    setPropertyValues: (clip: Clip) => void;
    onRender: () => void;
    onDragEnd: () => void;
    stopPlayback: () => void;
}

export interface TimelineDragInteraction {
    start(event: MouseEvent, clipId: string): void;
    isDragging(): boolean;
    getDraggingClipId(): string | null;
}

export function createTimelineDrag(options: TimelineDragOptions): TimelineDragInteraction {
    let dragging = false;
    let draggingClipId: string | null = null;
    let startMouseX = 0;
    let startFrame = 0;

    const onDragMove = (event: MouseEvent): void => {
        if (!dragging || !draggingClipId) return;
        const clip = options.getClip(draggingClipId);
        if (!clip) return;

        const rect = options.container.getBoundingClientRect();
        const pixelsPerSecond = options.getPixelsPerSecond(options.container.clientWidth - 4);
        const deltaX = (event.clientX - startMouseX) / pixelsPerSecond;
        let newStartFrame = Math.round(startFrame + deltaX * options.fps());
        const maxStart = options.maxTimelineFrames - clip.duration;
        newStartFrame = Math.max(0, Math.min(maxStart, newStartFrame));

        const trackY = event.clientY - rect.top - options.timelineHeaderHeight;
        const layerIndex = Math.floor(trackY / options.timelineHeight);
        const newLayerId = Math.max(1, Math.min(options.layerCount(), layerIndex + 1));
        const oldStartFrame = clip.startFrame;
        const oldLayerId = clip.layerId;
        clip.startFrame = newStartFrame;

        if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
            const direction = newStartFrame > oldStartFrame ? 1 : -1;
            let testFrame = oldStartFrame + direction;
            let found = false;
            let attempts = 0;
            while (attempts < 100 && !found) {
                attempts++;
                clip.startFrame = testFrame;
                if (!options.isOverlapping(clip, clip.id)) {
                    found = true;
                    break;
                }
                testFrame += direction;
                if (testFrame < 0 || testFrame > options.maxTimelineFrames - clip.duration) break;
            }
            if (!found) clip.startFrame = oldStartFrame;
        }

        if (newLayerId !== oldLayerId) {
            const currentStartFrame = clip.startFrame;
            clip.layerId = newLayerId;
            if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
                const availableLayer = options.findAvailableLayer(currentStartFrame, clip.duration);
                clip.layerId = availableLayer === null ? oldLayerId : availableLayer;
            }
        }

        options.onRender();
        options.setPropertyValues(clip);
    };

    const onDragEnd = (): void => {
        if (!dragging) return;
        dragging = false;
        draggingClipId = null;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('mouseleave', onDragEnd);
        document.body.style.cursor = '';
        options.onDragEnd();
    };

    const start = (event: MouseEvent, clipId: string): void => {
        if (dragging || options.isResizing()) return;
        const clip = options.getClip(clipId);
        if (!clip) return;
        options.stopPlayback();
        dragging = true;
        draggingClipId = clipId;
        startFrame = clip.startFrame;
        startMouseX = event.clientX;
        options.setSelected(clipId);
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('mouseleave', onDragEnd);
        document.body.style.cursor = 'grabbing';
        options.onRender();
    };

    return {
        start,
        isDragging: () => dragging,
        getDraggingClipId: () => draggingClipId,
    };
}