export interface PlaybackController {
    readonly isPlaying: boolean;
    start(): void;
    stop(): void;
    toggle(): void;
}

export interface PlaybackOptions {
    getCurrentFrame: () => number;
    setCurrentFrame: (frame: number) => void;
    getTimelineDuration: () => number;
    getFps: () => number;
    onPlayingStateChange: (isPlaying: boolean) => void;
    onFrameChange: () => void;
}

export function createPlaybackController(options: PlaybackOptions): PlaybackController {
    let isPlaying = false;
    let playInterval: number | null = null;

    const stop = (): void => {
        isPlaying = false;
        options.onPlayingStateChange(false);
        if (playInterval !== null) {
            clearInterval(playInterval);
            playInterval = null;
        }
    };

    const start = (): void => {
        if (isPlaying) return;
        if (options.getCurrentFrame() >= options.getTimelineDuration()) {
            options.setCurrentFrame(0);
        }

        isPlaying = true;
        options.onPlayingStateChange(true);
        playInterval = window.setInterval(() => {
            const nextFrame = options.getCurrentFrame() + 1;
            if (nextFrame >= options.getTimelineDuration()) {
                options.setCurrentFrame(options.getTimelineDuration());
                stop();
                options.onFrameChange();
                return;
            }

            options.setCurrentFrame(nextFrame);
            options.onFrameChange();
        }, 1000 / options.getFps());
    };

    return {
        get isPlaying() {
            return isPlaying;
        },
        start,
        stop,
        toggle: () => {
            if (isPlaying) stop();
            else start();
        },
    };
}