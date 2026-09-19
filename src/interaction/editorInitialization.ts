import type { SavedSettings } from '../persistence/settingsStorage';

export interface InitializationConfig {
    theme: string;
    preventOverlap: boolean;
    bgColor: string;
    layerCount: number;
    resolution: { width: number; height: number };
    fps: number;
}

export interface EditorInitializationOptions {
    config: InitializationConfig;
    loadSettings: () => SavedSettings | null;
    totalTimeDisplay: HTMLSpanElement;
    layerCountInput: HTMLInputElement;
    overlapToggle: HTMLInputElement;
    bgColorPicker: HTMLInputElement;
    resolutionSelect: HTMLSelectElement;
    fpsSelect: HTMLSelectElement;
    bottomSection: HTMLDivElement;
    minTimelineHeight: number;
    timelineDuration: number;
    defaultZoom: number;
    setSelectedNone: () => void;
    setCurrentLayerCount: (count: number) => void;
    setTimelineZoom: (zoom: number) => void;
    applyTheme: (theme: string) => void;
    formatTime: (frame: number) => string;
    updateZoomDisplay: () => void;
    syncUI: () => void;
}

export function initializeEditor(options: EditorInitializationOptions): void {
    const savedSettings = options.loadSettings();
    if (savedSettings) {
        if (savedSettings.theme) options.config.theme = savedSettings.theme;
        if (savedSettings.preventOverlap !== undefined) {
            options.config.preventOverlap = savedSettings.preventOverlap;
        }
    }

    options.setSelectedNone();
    options.totalTimeDisplay.textContent = options.formatTime(options.timelineDuration);
    options.setCurrentLayerCount(options.config.layerCount);
    options.layerCountInput.value = String(options.config.layerCount);
    options.applyTheme(options.config.theme);
    options.overlapToggle.checked = options.config.preventOverlap;
    options.bgColorPicker.value = options.config.bgColor;
    options.resolutionSelect.value = `${options.config.resolution.width}x${options.config.resolution.height}`;
    options.fpsSelect.value = String(options.config.fps);
    options.setTimelineZoom(options.defaultZoom);
    options.updateZoomDisplay();
    options.syncUI();
    options.bottomSection.style.height = '270px';
    options.bottomSection.style.minHeight = `${options.minTimelineHeight}px`;
}