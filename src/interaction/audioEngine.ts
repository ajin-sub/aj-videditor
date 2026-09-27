import type { Clip } from '../types/clip';

export interface AudioEngineOptions {
    getFps: () => number;
    getClips: () => Clip[];
    getMediaById: (mediaId: string) => Promise<Blob | undefined>;
}

export interface AudioEngine {
    prepare(clip: Clip): Promise<void>;
    remove(clipId: string): void;
    play(startFrame: number): void;
    stop(): void;
    seek(frame: number, isPlaying: boolean): void;
    getCurrentTime(): number;
    dispose(): void;
}

interface ActiveSource {
    source: AudioBufferSourceNode;
    gain: GainNode;
}

export function createAudioEngine(options: AudioEngineOptions): AudioEngine {
    const context = new AudioContext();
    const buffers = new Map<string, AudioBuffer>();
    const sources = new Map<string, ActiveSource>();
    let scheduleToken = 0;

    const stopSources = (): void => {
        for (const { source, gain } of sources.values()) {
            source.onended = null;
            try {
                source.stop();
            } catch {
                // A source may have already ended.
            }
            source.disconnect();
            gain.disconnect();
        }
        sources.clear();
    };

    const schedule = (startFrame: number, startTime: number): void => {
        const fps = Math.max(1, options.getFps());
        for (const clip of options.getClips()) {
            if (clip.type !== 'audio') continue;
            const buffer = buffers.get(clip.id);
            if (!buffer) continue;

            const frameOffset = Math.max(0, startFrame - clip.startFrame);
            const offset = frameOffset / fps;
            const duration = Math.min(buffer.duration - offset, clip.duration / fps - offset);
            if (duration <= 0) continue;

            const source = context.createBufferSource();
            const gain = context.createGain();
            source.buffer = buffer;
            gain.gain.value = Math.max(0, Math.min(1, clip.volume ?? 1));
            source.connect(gain);
            gain.connect(context.destination);
            sources.set(clip.id, { source, gain });
            source.onended = () => {
                if (sources.get(clip.id)?.source !== source) return;
                sources.delete(clip.id);
                source.disconnect();
                gain.disconnect();
            };

            const clipStartFrame = Math.max(startFrame, clip.startFrame);
            const when = startTime + Math.max(0, clip.startFrame - startFrame) / fps;
            const remainingDuration = Math.min(duration, (clip.startFrame + clip.duration - clipStartFrame) / fps);
            source.start(when, offset, remainingDuration);
        }
    };

    let contextReady = false;

    async function ensureContextReady(): Promise<void> {
        if (contextReady) return;
        if (context.state === 'suspended') {
            await context.resume();
        }
        contextReady = true;
    }

    const play = (startFrame: number): void => {
        const token = ++scheduleToken;
        stopSources();
        void ensureContextReady().then(() => {
            if (scheduleToken === token) {
                schedule(startFrame, context.currentTime);
            }
        });
    };

    return {
        async prepare(clip): Promise<void> {
            if (clip.type !== 'audio' || !clip.mediaId || buffers.has(clip.id)) return;
            const blob = await options.getMediaById(clip.mediaId);
            if (!blob) return;
            try {
                const buffer = await context.decodeAudioData(await blob.arrayBuffer());
                buffers.set(clip.id, buffer);
            } catch (err) {
                console.error('decodeAudioData failed:', err);
            }
        },
        remove(clipId): void {
            const active = sources.get(clipId);
            if (active) {
                active.source.onended = null;
                try {
                    active.source.stop();
                } catch {
                    // A source may have already ended.
                }
                active.source.disconnect();
                active.gain.disconnect();
                sources.delete(clipId);
            }
            buffers.delete(clipId);
        },
        play,
        stop(): void {
            scheduleToken++;
            stopSources();
        },
        seek(frame, isPlaying): void {
            const token = ++scheduleToken;
            stopSources();
            if (!isPlaying) return;
            void ensureContextReady().then(() => {
                if (scheduleToken === token) schedule(frame, context.currentTime);
            });
        },
        getCurrentTime: () => context.currentTime,
        dispose(): void {
            scheduleToken++;
            stopSources();
            buffers.clear();
            void context.close();
        },
    };
}
