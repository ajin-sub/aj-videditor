export interface TimelineZoomOptions {
    container: HTMLDivElement;
    minZoom: number;
    maxZoom: number;
    basePixelsPerSecond: number;
    paddingLeft: number;
    fps: () => number;
    getCurrentFrame: () => number;
    getZoom: () => number;
    setZoom: (zoom: number) => void;
    onDisplayUpdate: (percent: number) => void;
    onRender: () => void;
}

export interface TimelineZoomInteraction {
    zoom(factor: number): void;
    updateDisplay(): void;
}

export function createTimelineZoom(options: TimelineZoomOptions): TimelineZoomInteraction {
    const updateDisplay = (): void => {
        const percent = Math.round(options.getZoom() * 100);
        options.onDisplayUpdate(percent);
    };

    const zoom = (factor: number): void => {
        const oldZoom = options.getZoom();
        const newZoom = Math.max(
            options.minZoom,
            Math.min(options.maxZoom, oldZoom * factor)
        );
        if (newZoom === oldZoom) return;

        const oldPixelsPerSecond = options.basePixelsPerSecond * oldZoom;
        const headPixel = (options.getCurrentFrame() / options.fps()) * oldPixelsPerSecond + options.paddingLeft;

        options.setZoom(newZoom);

        const newPixelsPerSecond = options.basePixelsPerSecond * newZoom;
        const newHeadPixel = (options.getCurrentFrame() / options.fps()) * newPixelsPerSecond + options.paddingLeft;
        options.container.scrollLeft += newHeadPixel - headPixel;

        updateDisplay();
        options.onRender();
    };

    return { zoom, updateDisplay };
}