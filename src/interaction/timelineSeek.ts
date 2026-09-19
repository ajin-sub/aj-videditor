export interface TimelineSeekOptions {
    container: HTMLDivElement;
    paddingLeft: number;
    fps: () => number;
    timelineDurationSeconds: () => number;
    pixelsPerSecond: (containerWidth: number) => number;
    getCurrentFrame: () => number;
    setCurrentFrame: (frame: number) => void;
    stopPlayback: () => void;
    onRender: () => void;
}

export interface TimelineSeekInteraction {
    start(event: MouseEvent): void;
    getFrameFromMouseEvent(event: MouseEvent): number;
}

export function createTimelineSeek(options: TimelineSeekOptions): TimelineSeekInteraction {
    let isSeeking = false;

    const getFrameFromMouseEvent = (event: MouseEvent): number => {
        const rect = options.container.getBoundingClientRect();
        const containerWidth = options.container.clientWidth - 4;
        const pixelsPerSecond = options.pixelsPerSecond(containerWidth);
        const x = event.clientX - rect.left - options.paddingLeft + options.container.scrollLeft;
        const seconds = Math.max(
            0,
            Math.min(options.timelineDurationSeconds(), x / pixelsPerSecond)
        );
        return Math.round(seconds * options.fps());
    };

    const onSeekMove = (event: MouseEvent): void => {
        if (!isSeeking) return;
        options.setCurrentFrame(getFrameFromMouseEvent(event));
        options.onRender();
    };

    const onSeekEnd = (): void => {
        if (!isSeeking) return;
        isSeeking = false;
        document.removeEventListener('mousemove', onSeekMove);
        document.removeEventListener('mouseup', onSeekEnd);
        document.removeEventListener('mouseleave', onSeekEnd);
    };

    const start = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        if (target.closest('.timeline-clip')) return;
        options.stopPlayback();
        isSeeking = true;
        options.setCurrentFrame(getFrameFromMouseEvent(event));
        options.onRender();
        document.addEventListener('mousemove', onSeekMove);
        document.addEventListener('mouseup', onSeekEnd);
        document.addEventListener('mouseleave', onSeekEnd);
    };

    return { start, getFrameFromMouseEvent };
}