import type { Clip } from '../types/clip';

export function getClipsAtFrame(clips: Clip[], frame: number): Clip[] {
    return clips.filter(clip => {
        return frame >= clip.startFrame && frame < clip.startFrame + clip.duration;
    });
}

export function updateTimelineDuration(
    clips: Clip[],
    maxTimelineFrames: number
): number {
    if (clips.length === 0) return 1;

    let maxEndFrame = 0;
    for (const clip of clips) {
        const endFrame = clip.startFrame + clip.duration;
        if (endFrame > maxEndFrame) {
            maxEndFrame = endFrame;
        }
    }

    return Math.min(maxEndFrame, maxTimelineFrames);
}

export function isOverlapping(
    clip: Clip,
    clips: Clip[],
    ignoreId?: string
): boolean {
    return clips.some(other => {
        if (other.id === clip.id) return false;
        if (ignoreId && other.id === ignoreId) return false;
        if (other.layerId !== clip.layerId) return false;
        const aStart = clip.startFrame;
        const aEnd = clip.startFrame + clip.duration;
        const bStart = other.startFrame;
        const bEnd = other.startFrame + other.duration;
        return aStart < bEnd && bStart < aEnd;
    });
}

export function resolveOverlap(
    clip: Clip,
    clips: Clip[],
    timelineDuration: number,
    preventOverlap: boolean,
    ignoreId?: string
): void {
    if (!preventOverlap) return;
    let attempts = 0;
    while (isOverlapping(clip, clips, ignoreId) && attempts < 100) {
        attempts++;
        clip.startFrame++;
        if (clip.startFrame + clip.duration > timelineDuration) {
            clip.startFrame = timelineDuration - clip.duration;
            if (clip.startFrame < 0) {
                clip.startFrame = 0;
                clip.duration = timelineDuration;
            }
            break;
        }
    }
}

export function applyOverlapPrevention(
    clip: Clip,
    clips: Clip[],
    timelineDuration: number,
    preventOverlap: boolean,
    ignoreId?: string
): void {
    if (!preventOverlap) return;
    resolveOverlap(clip, clips, timelineDuration, preventOverlap, ignoreId);
}

export function findAvailableLayer(
    clips: Clip[],
    startFrame: number,
    duration: number,
    layerCount: number
): number | null {
    for (let layerId = 1; layerId <= layerCount; layerId++) {
        const hasOverlap = clips.some(clip => {
            if (clip.layerId !== layerId) return false;
            const aStart = startFrame;
            const aEnd = startFrame + duration;
            const bStart = clip.startFrame;
            const bEnd = clip.startFrame + clip.duration;
            return aStart < bEnd && bStart < aEnd;
        });
        if (!hasOverlap) return layerId;
    }
    return null;
}