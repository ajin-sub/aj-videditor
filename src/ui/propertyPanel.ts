import type { Clip, ShapeType } from '../types/clip';
import {
    setupNumberInput,
    setupSliderDrag,
    updateSliderRange,
    updateSliderRangePositive,
} from './numberInput';

export interface PropertyPanelInputs {
    textInput: HTMLTextAreaElement;
    fontSelect: HTMLSelectElement;
    fontSizeSlider: HTMLInputElement;
    colorPicker: HTMLInputElement;
    fontSizeNumber: HTMLInputElement;
    shapeTypeSelect: HTMLSelectElement;
    fillColorPicker: HTMLInputElement;
    strokeColorPicker: HTMLInputElement;
    strokeWidthSlider: HTMLInputElement;
    shapeWidthSlider: HTMLInputElement;
    shapeHeightSlider: HTMLInputElement;
    strokeWidthNumber: HTMLInputElement;
    shapeWidthNumber: HTMLInputElement;
    shapeHeightNumber: HTMLInputElement;
    cameraRangeInput: HTMLInputElement;
    xSlider: HTMLInputElement;
    ySlider: HTMLInputElement;
    zSlider: HTMLInputElement;
    rotationSlider: HTMLInputElement;
    xNumber: HTMLInputElement;
    yNumber: HTMLInputElement;
    zNumber: HTMLInputElement;
    rotationNumber: HTMLInputElement;
}

export function setPropertyInputsEnabled(
    enabled: boolean,
    inputs: PropertyPanelInputs,
    startInput: HTMLInputElement,
    durationInput: HTMLInputElement
): void {
    const inputElements = [
        inputs.textInput, inputs.fontSelect, inputs.fontSizeSlider, inputs.colorPicker,
        inputs.shapeTypeSelect, inputs.fillColorPicker, inputs.strokeColorPicker,
        inputs.strokeWidthSlider, inputs.shapeWidthSlider, inputs.shapeHeightSlider,
        inputs.xSlider, inputs.xNumber, inputs.ySlider, inputs.yNumber,
        inputs.zSlider, inputs.zNumber, inputs.rotationSlider, inputs.rotationNumber,
        startInput, durationInput, inputs.cameraRangeInput,
    ];
    for (const input of inputElements) input.disabled = !enabled;

    for (const label of document.querySelectorAll('.control-group label')) {
        label.classList.toggle('disabled', !enabled);
    }
    for (const value of document.querySelectorAll('.value')) {
        value.classList.toggle('disabled', !enabled);
    }
    for (const input of document.querySelectorAll('.coord-input')) {
        input.classList.toggle('disabled', !enabled);
    }
}

export interface PropertyPanelSyncOptions {
    selected: Clip | null;
    hasClips: boolean;
    defaultFont: string;
    inputs: PropertyPanelInputs;
    typeDisplay: HTMLSpanElement;
    textProperties: HTMLDivElement;
    shapeProperties: HTMLDivElement;
    cameraProperties: HTMLDivElement;
    startInput: HTMLInputElement;
    durationInput: HTMLInputElement;
    isDraggingX: boolean;
    isDraggingY: boolean;
    isDraggingZ: boolean;
    isDraggingRotation: boolean;
    isDraggingStroke: boolean;
    isDraggingWidth: boolean;
    isDraggingHeight: boolean;
    isDraggingFontSize: boolean;
    updateSliderRange: (slider: HTMLInputElement, value: number, stages: number[], isDragging: boolean) => void;
    updateSliderRangePositive: (slider: HTMLInputElement, value: number, stages: number[], isDragging: boolean) => void;
    coordStages: number[];
    rotationStages: number[];
    sizeStages: number[];
    strokeStages: number[];
    fontSizeStages: number[];
    setEnabled: (enabled: boolean) => void;
}

export function syncPropertyPanel(options: PropertyPanelSyncOptions): void {
    const { selected, inputs } = options;

    if (selected && options.hasClips) {
        options.typeDisplay.textContent = selected.type === 'text'
            ? 'テキスト'
            : selected.type === 'shape'
                ? '図形'
                : selected.type === 'camera' ? 'カメラ' : '-';

        if (selected.type === 'text') {
            options.textProperties.style.display = '';
            options.shapeProperties.style.display = 'none';
            inputs.textInput.value = selected.text || '';
            inputs.fontSelect.value = selected.fontFamily || options.defaultFont;
            inputs.fontSizeSlider.value = String(selected.fontSize || 50);
            inputs.fontSizeNumber.value = String(selected.fontSize || 50);
            inputs.colorPicker.value = selected.color || '#ffffff';
        } else if (selected.type === 'shape') {
            options.textProperties.style.display = 'none';
            options.shapeProperties.style.display = '';
            inputs.shapeTypeSelect.value = selected.shapeType || 'rectangle';
            inputs.fillColorPicker.value = selected.fillColor || '#ffffff';
            inputs.strokeColorPicker.value = selected.strokeColor || '#ffffff';
            inputs.strokeWidthSlider.value = String(selected.strokeWidth || 0);
            inputs.strokeWidthNumber.value = String(selected.strokeWidth || 0);
            inputs.shapeWidthSlider.value = String(selected.width || 100);
            inputs.shapeWidthNumber.value = String(selected.width || 100);
            inputs.shapeHeightSlider.value = String(selected.height || 100);
            inputs.shapeHeightNumber.value = String(selected.height || 100);
        } else if (selected.type === 'camera') {
            options.textProperties.style.display = 'none';
            options.shapeProperties.style.display = 'none';
            options.cameraProperties.style.display = '';
            inputs.cameraRangeInput.value = String(selected.cameraRange || 10);
        }

        inputs.xSlider.value = String(selected.x);
        inputs.ySlider.value = String(selected.y);
        inputs.zSlider.value = String(selected.z);
        inputs.xNumber.value = String(selected.x);
        inputs.yNumber.value = String(selected.y);
        inputs.zNumber.value = String(selected.z);
        inputs.rotationSlider.value = String(selected.rotation);
        inputs.rotationNumber.value = String(selected.rotation);
        options.startInput.value = String(selected.startFrame);
        options.durationInput.value = String(selected.duration);

        options.updateSliderRange(inputs.xSlider, selected.x, options.coordStages, options.isDraggingX);
        options.updateSliderRange(inputs.ySlider, selected.y, options.coordStages, options.isDraggingY);
        options.updateSliderRange(inputs.ySlider, selected.z, options.coordStages, options.isDraggingZ);
        options.updateSliderRange(inputs.rotationSlider, selected.rotation, options.rotationStages, options.isDraggingRotation);
        options.updateSliderRangePositive(inputs.strokeWidthSlider, selected.strokeWidth || 0, options.strokeStages, options.isDraggingStroke);
        options.updateSliderRangePositive(inputs.shapeWidthSlider, selected.width || 100, options.sizeStages, options.isDraggingWidth);
        options.updateSliderRangePositive(inputs.shapeHeightSlider, selected.height || 100, options.sizeStages, options.isDraggingHeight);
        options.updateSliderRangePositive(inputs.fontSizeSlider, selected.fontSize || 50, options.fontSizeStages, options.isDraggingFontSize);
        options.setEnabled(true);
        inputs.textInput.style.height = 'auto';
        inputs.textInput.style.height = `${Math.min(inputs.textInput.scrollHeight, 120)}px`;
    } else {
        options.typeDisplay.textContent = '-';
        options.textProperties.style.display = 'none';
        options.shapeProperties.style.display = 'none';
        inputs.textInput.value = '';
        inputs.fontSelect.value = options.defaultFont;
        inputs.xNumber.value = '';
        inputs.yNumber.value = '';
        inputs.rotationNumber.value = '';
        options.startInput.value = '';
        options.durationInput.value = '';
        options.setEnabled(false);
    }
}

export function updateSelectedClip(
    selected: Clip | null,
    inputs: PropertyPanelInputs,
    onRender: () => void
): void {
    if (!selected) return;

    if (selected.type === 'text') {
        selected.text = inputs.textInput.value || ' ';
        selected.fontFamily = inputs.fontSelect.value;
        selected.fontSize = parseFloat(inputs.fontSizeSlider.value) || 50;
        selected.color = inputs.colorPicker.value;
        inputs.fontSizeNumber.value = String(selected.fontSize);
    } else if (selected.type === 'shape') {
        selected.shapeType = inputs.shapeTypeSelect.value as ShapeType;
        selected.fillColor = inputs.fillColorPicker.value;
        selected.strokeColor = inputs.strokeColorPicker.value;
        selected.strokeWidth = parseFloat(inputs.strokeWidthSlider.value) || 0;
        selected.width = parseFloat(inputs.shapeWidthSlider.value) || 100;
        selected.height = parseFloat(inputs.shapeHeightSlider.value) || 100;
        inputs.strokeWidthNumber.value = String(selected.strokeWidth);
        inputs.shapeWidthNumber.value = String(selected.width);
        inputs.shapeHeightNumber.value = String(selected.height);
    } else if (selected.type === 'camera') {
        selected.cameraRange = parseInt(inputs.cameraRangeInput.value, 10) || 10;
    }

    selected.x = parseFloat(inputs.xSlider.value) || 0;
    selected.y = parseFloat(inputs.ySlider.value) || 0;
    selected.z = parseFloat(inputs.zSlider.value) || 0;
    selected.rotation = parseFloat(inputs.rotationSlider.value) || 0;

    inputs.xNumber.value = String(selected.x);
    inputs.yNumber.value = String(selected.y);
    inputs.zNumber.value = String(selected.z);
    inputs.rotationNumber.value = String(selected.rotation);

    inputs.textInput.style.height = 'auto';
    inputs.textInput.style.height = `${Math.min(inputs.textInput.scrollHeight, 120)}px`;
    onRender();
}

export type SliderDragKey = 'x' | 'y' | 'z' | 'rotation' | 'stroke' | 'width' | 'height' | 'fontSize';

export interface PropertySliderOptions {
    xSlider: HTMLInputElement;
    ySlider: HTMLInputElement;
    zSlider: HTMLInputElement;
    rotationSlider: HTMLInputElement;
    strokeWidthSlider: HTMLInputElement;
    shapeWidthSlider: HTMLInputElement;
    shapeHeightSlider: HTMLInputElement;
    fontSizeSlider: HTMLInputElement;
    fontSizeNumber: HTMLInputElement;
    getSelected: () => Clip | null;
    setDragging: (key: SliderDragKey, isDragging: boolean) => void;
    coordStages: number[];
    rotationStages: number[];
    strokeStages: number[];
    sizeStages: number[];
    fontSizeStages: number[];
    onRender: () => void;
}

export function setupPropertySliderDrags(options: PropertySliderOptions): void {
    setupSliderDrag(options.xSlider, () => options.setDragging('x', true), () => {
        options.setDragging('x', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRange(options.xSlider, selected.x, options.coordStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.ySlider, () => options.setDragging('y', true), () => {
        options.setDragging('y', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRange(options.ySlider, selected.y, options.coordStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.zSlider, () => options.setDragging('z', true), () => {
        options.setDragging('z', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRange(options.zSlider, selected.z, options.coordStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.rotationSlider, () => options.setDragging('rotation', true), () => {
        options.setDragging('rotation', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRange(options.rotationSlider, selected.rotation, options.rotationStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.strokeWidthSlider, () => options.setDragging('stroke', true), () => {
        options.setDragging('stroke', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRangePositive(options.strokeWidthSlider, selected.strokeWidth || 0, options.strokeStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.shapeWidthSlider, () => options.setDragging('width', true), () => {
        options.setDragging('width', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRangePositive(options.shapeWidthSlider, selected.width || 100, options.sizeStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.shapeHeightSlider, () => options.setDragging('height', true), () => {
        options.setDragging('height', false);
        const selected = options.getSelected();
        if (selected) {
            updateSliderRangePositive(options.shapeHeightSlider, selected.height || 100, options.sizeStages, false);
            options.onRender();
        }
    });

    setupSliderDrag(options.fontSizeSlider, () => options.setDragging('fontSize', true), () => {
        options.setDragging('fontSize', false);
        const selected = options.getSelected();
        if (selected) {
            options.fontSizeNumber.value = String(selected.fontSize || 50);
            updateSliderRangePositive(options.fontSizeSlider, selected.fontSize || 50, options.fontSizeStages, false);
            options.onRender();
        }
    });
}

export interface PropertyNumberInputOptions {
    inputs: PropertyPanelInputs;
    startInput: HTMLInputElement;
    durationInput: HTMLInputElement;
    getSelected: () => Clip | null;
    getTimelineDuration: () => number;
    maxTimelineFrames: number;
    preventOverlap: () => boolean;
    isOverlapping: (clip: Clip, ignoreId?: string) => boolean;
    resolveOverlap: (clip: Clip, ignoreId?: string) => void;
    onPreviewRender: () => void;
    onTimelineRender: () => void;
    coordStages: number[];
    rotationStages: number[];
    sizeStages: number[];
    strokeStages: number[];
    fontSizeStages: number[];
}

export function setupPropertyNumberInputs(options: PropertyNumberInputOptions): void {
    const { inputs } = options;
    const numberConfigs = [
        {
            input: inputs.xNumber,
            slider: inputs.xSlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            stages: options.coordStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRange(inputs.xSlider, value, options.coordStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                selected.x = value;
                inputs.xSlider.value = String(value);
                inputs.xNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.yNumber,
            slider: inputs.ySlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            stages: options.coordStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRange(inputs.ySlider, value, options.coordStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                selected.y = value;
                inputs.ySlider.value = String(value);
                inputs.yNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.zNumber,
            slider: inputs.zSlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            stages: options.coordStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRange(inputs.zSlider, value, options.coordStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                selected.z = value;
                inputs.zSlider.value = String(value);
                inputs.zNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.rotationNumber,
            slider: inputs.rotationSlider,
            min: -1440,
            max: 1440,
            defaultValue: 0,
            stages: options.rotationStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRange(inputs.rotationSlider, value, options.rotationStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                selected.rotation = value;
                inputs.rotationSlider.value = String(value);
                inputs.rotationNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: options.startInput,
            slider: options.startInput,
            min: 0,
            max: 600,
            defaultValue: 0,
            stages: null,
            getIsDragging: () => false,
            updateRange: () => undefined,
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                const oldStart = selected.startFrame;
                selected.startFrame = value;
                if (options.preventOverlap() && options.isOverlapping(selected, selected.id)) {
                    selected.startFrame = oldStart;
                    options.resolveOverlap(selected, selected.id);
                }
                options.startInput.value = String(selected.startFrame);
                options.onTimelineRender();
                options.onPreviewRender();
            },
        },
        {
            input: options.durationInput,
            slider: options.durationInput,
            min: 1,
            max: options.maxTimelineFrames,
            defaultValue: 90,
            stages: null,
            getIsDragging: () => false,
            updateRange: () => undefined,
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                const maxStart = options.getTimelineDuration() - value;
                if (selected.startFrame > maxStart) selected.startFrame = Math.max(0, maxStart);
                const oldDuration = selected.duration;
                selected.duration = value;
                if (options.preventOverlap() && options.isOverlapping(selected, selected.id)) {
                    selected.duration = oldDuration;
                    options.resolveOverlap(selected, selected.id);
                }
                options.durationInput.value = String(selected.duration);
                options.onTimelineRender();
                options.onPreviewRender();
            },
        },
        {
            input: inputs.fontSizeNumber,
            slider: inputs.fontSizeSlider,
            min: 0,
            max: 3200,
            defaultValue: 50,
            stages: options.fontSizeStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRangePositive(inputs.fontSizeSlider, value, options.fontSizeStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected) return;
                selected.fontSize = value;
                inputs.fontSizeSlider.value = String(value);
                inputs.fontSizeNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.strokeWidthNumber,
            slider: inputs.strokeWidthSlider,
            min: 0,
            max: 3200,
            defaultValue: 0,
            stages: options.strokeStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRangePositive(inputs.strokeWidthSlider, value, options.strokeStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected || selected.type !== 'shape') return;
                selected.strokeWidth = value;
                inputs.strokeWidthSlider.value = String(value);
                inputs.strokeWidthNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.shapeWidthNumber,
            slider: inputs.shapeWidthSlider,
            min: 0,
            max: 3200,
            defaultValue: 100,
            stages: options.sizeStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRangePositive(inputs.shapeWidthSlider, value, options.sizeStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected || selected.type !== 'shape') return;
                selected.width = value;
                inputs.shapeWidthSlider.value = String(value);
                inputs.shapeWidthNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.shapeHeightNumber,
            slider: inputs.shapeHeightSlider,
            min: 0,
            max: 3200,
            defaultValue: 100,
            stages: options.sizeStages,
            getIsDragging: () => false,
            updateRange: (value: number) => updateSliderRangePositive(inputs.shapeHeightSlider, value, options.sizeStages, false),
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected || selected.type !== 'shape') return;
                selected.height = value;
                inputs.shapeHeightSlider.value = String(value);
                inputs.shapeHeightNumber.value = String(value);
                options.onPreviewRender();
            },
        },
        {
            input: inputs.cameraRangeInput,
            slider: inputs.cameraRangeInput,
            min: 1,
            max: 98,
            defaultValue: 10,
            stages: null,
            getIsDragging: () => false,
            updateRange: () => undefined,
            onCommit: (value: number) => {
                const selected = options.getSelected();
                if (!selected || selected.type !== 'camera') return;
                selected.cameraRange = value;
                inputs.cameraRangeInput.value = String(value);
                options.onPreviewRender();
                options.onTimelineRender();
            },
        },
    ];

    for (const config of numberConfigs) {
        setupNumberInput(config.input, config.slider, {
            min: config.min,
            max: config.max,
            default: config.defaultValue,
            stages: config.stages,
            getIsDragging: config.getIsDragging,
            updateSliderRangeFn: config.updateRange,
            onCommit: config.onCommit,
        });
    }
}