import { setupNumberInput } from './numberInput';

export interface SettingsPanelElements {
    settingsTabs: HTMLDivElement;
    tabProject: HTMLDivElement;
    tabEditor: HTMLDivElement;
    themeSelect: HTMLSelectElement;
    overlapToggle: HTMLInputElement;
    layerCountInput: HTMLInputElement;
    applyLayerCountBtn: HTMLButtonElement;
    bgColorPicker: HTMLInputElement;
    resolutionSelect: HTMLSelectElement;
    fpsSelect: HTMLSelectElement;
    canvas: HTMLCanvasElement;
}

export interface SettingsPanelCallbacks {
    applyTheme: (themeName: string) => void;
    setOverlapPrevention: (enabled: boolean) => void;
    setLayerCount: (count: number) => void;
    setBackgroundColor: (color: string) => void;
    setResolution: (width: number, height: number) => void;
    setFps: (fps: number) => void;
}

export function setupSettingsPanel(
    elements: SettingsPanelElements,
    callbacks: SettingsPanelCallbacks
): void {
    const tabs = elements.settingsTabs.querySelectorAll('button');
    const contents: Record<string, HTMLDivElement> = {
        project: elements.tabProject,
        editor: elements.tabEditor,
    };

    tabs.forEach(button => {
        button.addEventListener('click', () => {
            tabs.forEach(tab => tab.classList.remove('active'));
            button.classList.add('active');
            const tabName = button.dataset.tab!;
            Object.entries(contents).forEach(([key, content]) => {
                content.classList.toggle('active', key === tabName);
            });
        });
    });

    elements.themeSelect.addEventListener('change', () => {
        callbacks.applyTheme(elements.themeSelect.value);
    });

    elements.overlapToggle.addEventListener('change', () => {
        callbacks.setOverlapPrevention(elements.overlapToggle.checked);
    });

    setupNumberInput(elements.layerCountInput, elements.layerCountInput, {
        min: 1,
        max: 99,
        default: 10,
        stages: null,
        getIsDragging: () => false,
        updateSliderRangeFn: () => undefined,
        onCommit: callbacks.setLayerCount,
    });

    elements.applyLayerCountBtn.addEventListener('click', () => {
        elements.layerCountInput.dispatchEvent(new Event('change'));
    });

    elements.bgColorPicker.addEventListener('input', () => {
        callbacks.setBackgroundColor(elements.bgColorPicker.value);
    });

    elements.resolutionSelect.addEventListener('change', () => {
        const [width, height] = elements.resolutionSelect.value.split('x').map(Number);
        callbacks.setResolution(width, height);
    });

    elements.fpsSelect.addEventListener('change', () => {
        callbacks.setFps(Number(elements.fpsSelect.value));
    });
}