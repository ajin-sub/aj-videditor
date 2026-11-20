import type { Clip } from '../types/clip';
import { AUDIO_VOLUME, AUDIO_VOLUME_PERCENT_SCALE } from '../config/editorConfig';

export interface AudioEngineOptions {
    getFps: () => number;
    getClips: () => Clip[];
    getMediaById: (mediaId: string) => Promise<Blob | undefined>;
    isLayerMuted: (layerId: number) => boolean;
}

export interface AudioEngine {
    prepare(clip: Clip): Promise<void>;
    getDurationSeconds(clipId: string): number | undefined;
    connectMediaElement(clip: Clip, element: HTMLMediaElement): void;
    setMediaElementVolume(clipId: string, volume: number): void;
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

interface ActiveMediaElement {
    source: MediaElementAudioSourceNode;
    gain: GainNode;
    element: HTMLMediaElement;
    clip: Clip;
}

export function createAudioEngine(options: AudioEngineOptions): AudioEngine {
    const context = new AudioContext();
    const buffers = new Map<string, AudioBuffer>();
    const sources = new Map<string, ActiveSource>();
    const mediaElements = new Map<string, ActiveMediaElement>();
    let scheduleToken = 0;

    const getClipGain = (clip: Clip): number => {
        if (options.isLayerMuted(clip.layerId)) return 0;
        return Math.max(
            AUDIO_VOLUME.minPercent / AUDIO_VOLUME_PERCENT_SCALE,
            Math.min(AUDIO_VOLUME.maxPercent / AUDIO_VOLUME_PERCENT_SCALE, clip.volume ?? 1)
        );
    };

    const updateMediaElementGains = (): void => {
        for (const active of mediaElements.values()) {
            active.gain.gain.value = getClipGain(active.clip);
        }
    };

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
            gain.gain.value = getClipGain(clip);
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
        updateMediaElementGains();
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
        getDurationSeconds: (clipId) => buffers.get(clipId)?.duration,
        connectMediaElement(clip, element): void {
            const existing = mediaElements.get(clip.id);
            if (existing?.element === element) {
                existing.clip = clip;
                existing.gain.gain.value = getClipGain(clip);
                return;
            }
            if (existing) {
                existing.source.disconnect();
                existing.gain.disconnect();
                mediaElements.delete(clip.id);
            }

            element.volume = 1;
            const source = context.createMediaElementSource(element);
            const gain = context.createGain();
            source.connect(gain);
            gain.connect(context.destination);
            const active = { source, gain, element, clip };
            mediaElements.set(clip.id, active);
            gain.gain.value = getClipGain(clip);
        },
        setMediaElementVolume(clipId, volume): void {
            const active = mediaElements.get(clipId);
            if (!active) return;
            active.clip.volume = volume;
            active.gain.gain.value = getClipGain(active.clip);
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
            const mediaElement = mediaElements.get(clipId);
            if (mediaElement) {
                mediaElement.element.pause();
                mediaElement.source.disconnect();
                mediaElement.gain.disconnect();
                mediaElements.delete(clipId);
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
            updateMediaElementGains();
            if (!isPlaying) return;
            void ensureContextReady().then(() => {
                if (scheduleToken === token) schedule(frame, context.currentTime);
            });
        },
        getCurrentTime: () => context.currentTime,
        dispose(): void {
            scheduleToken++;
            stopSources();
            for (const active of mediaElements.values()) {
                active.element.pause();
                active.source.disconnect();
                active.gain.disconnect();
            }
            mediaElements.clear();
            buffers.clear();
            void context.close();
        },
    };
}
