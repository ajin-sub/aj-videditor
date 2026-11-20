export function formatTime(frame: number, fps: number): string {
    const seconds = frame / fps;
    const minutes = Math.floor(seconds / 60);
    const wholeSeconds = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`;
}

export function getVisibleDuration(durationSeconds: number, zoom: number): number {
    return durationSeconds / zoom;
}

export function getPixelsPerSecond(zoom: number, basePixelsPerSecond: number): number {
    return basePixelsPerSecond * zoom;
}

export function getTotalTimelineWidth(
    durationSeconds: number,
    zoom: number,
    containerWidth: number,
    basePixelsPerSecond: number,
    paddingLeft: number,
    paddingRight: number
): number {
    const timelineContentWidth = durationSeconds * getPixelsPerSecond(zoom, basePixelsPerSecond) +
        paddingLeft + paddingRight;
    return Math.max(containerWidth, timelineContentWidth);
}