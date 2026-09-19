import type { Clip } from '../types/clip';

export interface DebugApiOptions {
    currentFrame: number;
    clips: Clip[];
    getCurrentFrame: () => number;
    setCurrentFrame: (frame: number) => void;
    getTimelineDuration: () => number;
    drawPreview: () => void;
    drawTimeline: () => void;
    togglePlay: () => void;
    play: () => void;
    stop: () => void;
    setOverlapPrevention: (enabled: boolean) => void;
    setBackgroundColor: (color: string) => void;
    setLayerCount: (count: number) => void;
    config: object;
    applyTheme: (theme: string) => void;
    themes: object;
    getFps: () => number;
}

export function exposeDebugApi(options: DebugApiOptions): void {
    (window as any).__editor = {
        currentFrame: options.currentFrame,
        clips: options.clips,
        drawPreview: options.drawPreview,
        drawTimeline: options.drawTimeline,
        setFrame: (frame: number) => {
            const boundedFrame = Math.max(0, Math.min(options.getTimelineDuration(), frame));
            options.setCurrentFrame(boundedFrame);
            options.drawPreview();
            options.drawTimeline();
            console.log(`Frame set to ${boundedFrame} (${(boundedFrame / options.getFps()).toFixed(2)}s)`);
        },
        getFrame: options.getCurrentFrame,
        getClips: () => options.clips,
        togglePlay: options.togglePlay,
        play: options.play,
        stop: options.stop,
        reset: () => {
            options.stop();
            options.setCurrentFrame(0);
            options.drawTimeline();
            options.drawPreview();
        },
        setOverlapPrevention: options.setOverlapPrevention,
        setBackgroundColor: options.setBackgroundColor,
        setLayerCount: options.setLayerCount,
        config: options.config,
        applyTheme: options.applyTheme,
        themes: options.themes,
    };
}