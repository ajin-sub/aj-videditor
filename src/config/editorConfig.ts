import type { ClipType } from '../types/clip';

export const DEFAULT_FONT = '"Hiragino Sans", "Microsoft YaHei", sans-serif';
export const TIMELINE_HEIGHT = 32;
export const TIMELINE_PADDING_LEFT = 80;
export const TIMELINE_PADDING_RIGHT = 20;
export const TIMELINE_HEADER_HEIGHT = 28;
export const MAX_LAYERS = 99;
export const DEFAULT_LAYER_COUNT = 10;
export const BASE_PIXELS_PERSEC = 40;
export const STORAGE_KEY = 'aj-videditor-settings';

export const CONFIG = {
    preventOverlap: true,
    theme: 'white',
    bgColor: '#000000',
    layerCount: DEFAULT_LAYER_COUNT,
    resolution: { width: 1920, height: 1080 },
    fps: 60,
    text_wheel_step: 3,
};

export const CLIP_COLORS: Record<ClipType, string> = {
    text: '#0065d8',
    shape: '#ff0055',
    cameraPosition: '#29f078',
    cameraOrbit: '#00b8a9',
    rotationControl: '#e2a900',
    fovControl: '#d15ce8',
};

export function getClipColor(type: ClipType): string {
    return CLIP_COLORS[type] || '#888888';
}

export const SLIDER_STAGES = {
    coord: [500, 1000, 2000, 4000, 8000],
    rotation: [180, 360, 720, 1440],
    size: [100, 200, 400, 800, 1600, 3200],
    stroke: [100, 200, 400, 800, 1600, 3200],
    fontSize: [100, 200, 400, 800, 1600, 3200],
};

export const DEFAULT_CLIP_DURATION = 3 * CONFIG.fps;
export const MAX_TIMELINE_FRAMES = 60 * 60 * CONFIG.fps;