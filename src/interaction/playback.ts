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
    onPlayingStateChange: (isPlaying: boolean) => void;
    onFrameChange: () => void;
}

export function createPlaybackController(options: PlaybackOptions): PlaybackController {
    let isPlaying = false;
    let playbackRafId: number | null = null;

    const stop = (): void => {
        isPlaying = false;
        if (playbackRafId !== null) {
            cancelAnimationFrame(playbackRafId);
            playbackRafId = null;
        }
        options.onPlayingStateChange(false);
    };

    const start = (): void => {
        if (isPlaying) return;
        if (options.getCurrentFrame() >= options.getTimelineDuration()) {
            options.setCurrentFrame(0);
        }

        isPlaying = true;
        options.onPlayingStateChange(true);
        const loop = (): void => {
            if (!isPlaying) {
                playbackRafId = null;
                return;
            }
            options.onFrameChange();
            playbackRafId = requestAnimationFrame(loop);
        };
        playbackRafId = requestAnimationFrame(loop);
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