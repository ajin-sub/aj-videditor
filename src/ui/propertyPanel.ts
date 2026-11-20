import type { Clip, ShapeType } from '../types/clip';
import { AUDIO_VOLUME, AUDIO_VOLUME_PERCENT_SCALE } from '../config/editorConfig';
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
    audioVolumeSlider: HTMLInputElement;
    audioVolumeNumber: HTMLInputElement;
    xSlider: HTMLInputElement;
    ySlider: HTMLInputElement;
    zSlider: HTMLInputElement;
    rotationSlider: HTMLInputElement;
    rotationXSlider: HTMLInputElement;
    rotationYSlider: HTMLInputElement;
    xNumber: HTMLInputElement;
    yNumber: HTMLInputElement;
    zNumber: HTMLInputElement;
    rotationNumber: HTMLInputElement;
    rotationXNumber: HTMLInputElement;
    rotationYNumber: HTMLInputElement;
    cameraFovInput: HTMLInputElement;
    cameraFovSlider: HTMLInputElement;
    cameraVerticalAngleNumber: HTMLInputElement;
    cameraVerticalAngleSlider: HTMLInputElement;
    cameraHorizontalAngleNumber: HTMLInputElement;
    cameraHorizontalAngleSlider: HTMLInputElement;
    cameraOrbitDistanceNumber: HTMLInputElement;
    cameraOrbitDistanceSlider: HTMLInputElement;
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
        inputs.audioVolumeSlider, inputs.audioVolumeNumber,
        inputs.xSlider, inputs.xNumber, inputs.ySlider, inputs.yNumber,
        inputs.zSlider, inputs.zNumber, inputs.rotationSlider, inputs.rotationNumber,
        inputs.rotationXSlider, inputs.rotationYSlider, inputs.rotationXNumber, inputs.rotationYNumber,
        startInput, durationInput,
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
    isDraggingAudioVolume: boolean;
    updateSliderRange: (slider: HTMLInputElement, value: number, stages: number[], isDragging: boolean) => void;
    updateSliderRangePositive: (slider: HTMLInputElement, value: number, stages: number[], isDragging: boolean) => void;
    coordStages: number[];
    rotationStages: number[];
    sizeStages: number[];
    strokeStages: number[];
    fontSizeStages: number[];
    audioVolumeStages: number[];
    setEnabled: (enabled: boolean) => void;
}

export function syncPropertyPanel(options: PropertyPanelSyncOptions): void {
    const { selected, inputs } = options;
    const isVideo = isVideoClip(selected);

    if (selected && options.hasClips) {
        options.typeDisplay.textContent = selected.type === 'text'
            ? 'テキスト'
            : selected.type === 'shape'
                ? '図形'
                : selected.type === 'image' ? `画像: ${selected.fileName || selected.mediaName || ''}`
                : selected.type === 'audio' ? `音声: ${selected.mediaName || ''}`
                : isVideo ? `動画: ${selected.mediaName || selected.fileName || ''}`
                : selected.type === 'media' ? `メディア: ${selected.mediaName || ''}`
                : selected.type === 'cameraPosition' ? 'カメラ - 位置・角度'
                    : selected.type === 'cameraOrbit' ? 'カメラ - 回り込み'
                        : selected.type === 'rotationControl' ? '回転制御'
                            : selected.type === 'fovControl' ? '視野制御' : '-';

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
            setShapeOnlyControlsVisible(options.shapeProperties, true);
            inputs.shapeTypeSelect.value = selected.shapeType || 'rectangle';
            inputs.fillColorPicker.value = selected.fillColor || '#ffffff';
            inputs.strokeColorPicker.value = !selected.strokeColor || selected.strokeColor === 'transparent'
                ? '#000000'
                : selected.strokeColor;
            inputs.strokeWidthSlider.value = String(selected.strokeWidth || 0);
            inputs.strokeWidthNumber.value = String(selected.strokeWidth || 0);
            inputs.shapeWidthSlider.value = String(selected.width || 100);
            inputs.shapeWidthNumber.value = String(selected.width || 100);
            inputs.shapeHeightSlider.value = String(selected.height || 100);
            inputs.shapeHeightNumber.value = String(selected.height || 100);
        } else if (selected.type === 'image' || isVideo) {
            options.textProperties.style.display = 'none';
            options.shapeProperties.style.display = '';
            // 画像では寸法だけを編集できるよう Shape 固有項目を隠す。
            setShapeOnlyControlsVisible(options.shapeProperties, false);
            options.updateSliderRangePositive(
                inputs.shapeWidthSlider,
                selected.width || 100,
                options.sizeStages,
                options.isDraggingWidth
            );
            options.updateSliderRangePositive(
                inputs.shapeHeightSlider,
                selected.height || 100,
                options.sizeStages,
                options.isDraggingHeight
            );
            inputs.shapeWidthSlider.value = String(selected.width || 100);
            inputs.shapeWidthNumber.value = String(selected.width || 100);
            inputs.shapeHeightSlider.value = String(selected.height || 100);
            inputs.shapeHeightNumber.value = String(selected.height || 100);
        } else {
            options.textProperties.style.display = 'none';
            options.shapeProperties.style.display = 'none';
        }
        options.cameraProperties.style.display = selected.type === 'cameraPosition' ||
            selected.type === 'cameraOrbit' || selected.type === 'rotationControl' || selected.type === 'fovControl' ? '' : 'none';
        const audioProperties = document.getElementById('audioProperties');
        if (audioProperties) audioProperties.style.display = selected.type === 'audio' || isVideo ? '' : 'none';
        if (selected.type === 'audio' || isVideo) {
            const minGain = AUDIO_VOLUME.minPercent / AUDIO_VOLUME_PERCENT_SCALE;
            const maxGain = AUDIO_VOLUME.maxPercent / AUDIO_VOLUME_PERCENT_SCALE;
            const volumeGain = Math.max(minGain, Math.min(maxGain,
                selected.volume ?? AUDIO_VOLUME.defaultPercent / AUDIO_VOLUME_PERCENT_SCALE));
            const volumePercent = volumeGain * AUDIO_VOLUME_PERCENT_SCALE;
            options.updateSliderRange(
                inputs.audioVolumeSlider,
                volumePercent,
                options.audioVolumeStages,
                options.isDraggingAudioVolume
            );
            inputs.audioVolumeSlider.value = String(volumePercent);
            inputs.audioVolumeNumber.value = String(volumePercent);
        }

        inputs.xSlider.value = String(selected.x);
        inputs.ySlider.value = String(selected.y);
        inputs.zSlider.value = String(selected.z);
        inputs.xNumber.value = String(selected.x);
        inputs.yNumber.value = String(selected.y);
        inputs.zNumber.value = String(selected.z);
        inputs.rotationSlider.value = String(selected.rotation);
        inputs.rotationNumber.value = String(selected.rotation);
        inputs.rotationXSlider.value = String(selected.rotationX || 0);
        inputs.rotationXNumber.value = String(selected.rotationX || 0);
        inputs.rotationYSlider.value = String(selected.rotationY || 0);
        inputs.rotationYNumber.value = String(selected.rotationY || 0);
        options.startInput.value = String(selected.startFrame);
        options.durationInput.value = String(selected.duration);

        options.updateSliderRange(inputs.xSlider, selected.x, options.coordStages, options.isDraggingX);
        options.updateSliderRange(inputs.ySlider, selected.y, options.coordStages, options.isDraggingY);
        options.updateSliderRange(inputs.zSlider, selected.z, options.coordStages, options.isDraggingZ);
        options.updateSliderRange(inputs.rotationSlider, selected.rotation, options.rotationStages, options.isDraggingRotation);
        options.updateSliderRange(inputs.rotationXSlider, selected.rotationX || 0, options.rotationStages, options.isDraggingRotation);
        options.updateSliderRange(inputs.rotationYSlider, selected.rotationY || 0, options.rotationStages, options.isDraggingRotation);
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
        options.cameraProperties.style.display = 'none';
        const audioProperties = document.getElementById('audioProperties');
        if (audioProperties) audioProperties.style.display = 'none';
        inputs.textInput.value = '';
        inputs.fontSelect.value = options.defaultFont;
        inputs.xNumber.value = '';
        inputs.yNumber.value = '';
        inputs.rotationNumber.value = '';
        inputs.rotationXNumber.value = '';
        inputs.rotationYNumber.value = '';
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
        selected.strokeWidth = parseFloat(inputs.strokeWidthSlider.value) || 0;
        selected.width = parseFloat(inputs.shapeWidthSlider.value) || 100;
        selected.height = parseFloat(inputs.shapeHeightSlider.value) || 100;
        inputs.strokeWidthNumber.value = String(selected.strokeWidth);
        inputs.shapeWidthNumber.value = String(selected.width);
        inputs.shapeHeightNumber.value = String(selected.height);
    } else if (selected.type === 'image' || isVideoClip(selected)) {
        selected.width = parseFloat(inputs.shapeWidthSlider.value) || 100;
        selected.height = parseFloat(inputs.shapeHeightSlider.value) || 100;
        inputs.shapeWidthNumber.value = String(selected.width);
        inputs.shapeHeightNumber.value = String(selected.height);
    }

    if (selected.type === 'audio' || isVideoClip(selected)) {
        const volumePercent = Math.max(
            AUDIO_VOLUME.minPercent,
            Math.min(AUDIO_VOLUME.maxPercent, parseFloat(inputs.audioVolumeSlider.value) || 0)
        );
        selected.volume = volumePercent / AUDIO_VOLUME_PERCENT_SCALE;
        inputs.audioVolumeSlider.value = String(volumePercent);
        inputs.audioVolumeNumber.value = String(volumePercent);
    }

    const positionEditable = selected.type === 'text' || selected.type === 'shape' ||
        selected.type === 'image' || isVideoClip(selected) ||
        selected.type === 'cameraPosition' || selected.type === 'rotationControl';
    if (positionEditable) {
        selected.x = parseFloat(inputs.xSlider.value) || 0;
        selected.y = parseFloat(inputs.ySlider.value) || 0;
        selected.z = parseFloat(inputs.zSlider.value) || 0;
        inputs.xNumber.value = String(selected.x);
        inputs.yNumber.value = String(selected.y);
        inputs.zNumber.value = String(selected.z);
    }

    const rotationEditable = selected.type === 'text' || selected.type === 'shape' ||
        selected.type === 'image' || isVideoClip(selected) || selected.type === 'cameraPosition';
    if (rotationEditable) {
        selected.rotation = parseFloat(inputs.rotationSlider.value) || 0;
        selected.rotationX = parseFloat(inputs.rotationXSlider.value) || 0;
        selected.rotationY = parseFloat(inputs.rotationYSlider.value) || 0;
        inputs.rotationNumber.value = String(selected.rotation);
        inputs.rotationXNumber.value = String(selected.rotationX);
        inputs.rotationYNumber.value = String(selected.rotationY);
    }

    inputs.textInput.style.height = 'auto';
    inputs.textInput.style.height = `${Math.min(inputs.textInput.scrollHeight, 120)}px`;
    onRender();
}

function isVideoClip(clip: Clip | null): boolean {
    return clip?.type === 'media' && Boolean(clip.mediaType?.startsWith('video/'));
}

function setShapeOnlyControlsVisible(container: HTMLDivElement, visible: boolean): void {
    const shapeOnlyLabels = new Set(['Shape', 'Fill', 'Stroke', 'Stroke W']);
    container.querySelectorAll<HTMLElement>('.control-group').forEach(group => {
        const label = group.querySelector('label')?.textContent?.trim() || '';
        if (shapeOnlyLabels.has(label)) group.style.display = visible ? '' : 'none';
    });
}

export type SliderDragKey = 'x' | 'y' | 'z' | 'rotation' | 'rotationX' | 'rotationY' | 'cameraVerticalAngle' | 'cameraHorizontalAngle' | 'cameraOrbitDistance' | 'stroke' | 'width' | 'height' | 'fontSize' | 'audioVolume';

export interface PropertySliderOptions {
    xSlider: HTMLInputElement;
    ySlider: HTMLInputElement;
    zSlider: HTMLInputElement;
    rotationSlider: HTMLInputElement;
    rotationXSlider: HTMLInputElement;
    rotationYSlider: HTMLInputElement;
    cameraVerticalAngleSlider: HTMLInputElement;
    cameraHorizontalAngleSlider: HTMLInputElement;
    cameraOrbitDistanceSlider: HTMLInputElement;
    strokeWidthSlider: HTMLInputElement;
    shapeWidthSlider: HTMLInputElement;
    shapeHeightSlider: HTMLInputElement;
    fontSizeSlider: HTMLInputElement;
    fontSizeNumber: HTMLInputElement;
    audioVolumeSlider: HTMLInputElement;
    getSelected: () => Clip | null;
    setDragging: (key: SliderDragKey, isDragging: boolean) => void;
    coordStages: number[];
    rotationStages: number[];
    strokeStages: number[];
    sizeStages: number[];
    fontSizeStages: number[];
    audioVolumeStages: number[];
    onRender: () => void;
}

export function setupPropertySliderDrags(options: PropertySliderOptions): void {
    const dragConfigs: {
        key: SliderDragKey;
        slider: HTMLInputElement;
        stages: number[];
        getValue: (clip: Clip) => number;
        positive?: boolean;
        appliesTo?: (clip: Clip) => boolean;
        onEnd?: (clip: Clip) => void;
    }[] = [
        { key: 'x', slider: options.xSlider, stages: options.coordStages, getValue: clip => clip.x },
        { key: 'y', slider: options.ySlider, stages: options.coordStages, getValue: clip => clip.y },
        { key: 'z', slider: options.zSlider, stages: options.coordStages, getValue: clip => clip.z },
        { key: 'rotation', slider: options.rotationSlider, stages: options.rotationStages, getValue: clip => clip.rotation },
        { key: 'rotationX', slider: options.rotationXSlider, stages: options.rotationStages, getValue: clip => clip.rotationX || 0 },
        { key: 'rotationY', slider: options.rotationYSlider, stages: options.rotationStages, getValue: clip => clip.rotationY || 0 },
        {
            key: 'cameraVerticalAngle',
            slider: options.cameraVerticalAngleSlider,
            stages: options.rotationStages,
            getValue: clip => clip.type === 'cameraOrbit' ? clip.cameraVerticalAngle || 0 : 0,
            appliesTo: clip => clip.type === 'cameraOrbit',
        },
        {
            key: 'cameraHorizontalAngle',
            slider: options.cameraHorizontalAngleSlider,
            stages: options.rotationStages,
            getValue: clip => clip.type === 'cameraOrbit' ? clip.cameraHorizontalAngle || 0 : 0,
            appliesTo: clip => clip.type === 'cameraOrbit',
        },
        {
            key: 'cameraOrbitDistance',
            slider: options.cameraOrbitDistanceSlider,
            stages: options.coordStages,
            getValue: clip => clip.type === 'cameraOrbit' ? clip.cameraOrbitDistance || 0 : 0,
            appliesTo: clip => clip.type === 'cameraOrbit',
        },
        { key: 'stroke', slider: options.strokeWidthSlider, stages: options.strokeStages, getValue: clip => clip.strokeWidth || 0, positive: true },
        { key: 'width', slider: options.shapeWidthSlider, stages: options.sizeStages, getValue: clip => clip.width || 100, positive: true },
        { key: 'height', slider: options.shapeHeightSlider, stages: options.sizeStages, getValue: clip => clip.height || 100, positive: true },
        {
            key: 'fontSize',
            slider: options.fontSizeSlider,
            stages: options.fontSizeStages,
            getValue: clip => clip.fontSize || 50,
            positive: true,
            onEnd: clip => { options.fontSizeNumber.value = String(clip.fontSize || 50); },
        },
        {
            key: 'audioVolume',
            slider: options.audioVolumeSlider,
            stages: options.audioVolumeStages,
            getValue: clip => (clip.volume ?? AUDIO_VOLUME.defaultPercent / AUDIO_VOLUME_PERCENT_SCALE) *
                AUDIO_VOLUME_PERCENT_SCALE,
            appliesTo: clip => clip.type === 'audio' || isVideoClip(clip),
        },
    ];

    for (const config of dragConfigs) {
        setupSliderDrag(
            config.slider,
            () => options.setDragging(config.key, true),
            () => {
                options.setDragging(config.key, false);
                const selected = options.getSelected();
                if (!selected || (config.appliesTo && !config.appliesTo(selected))) return;
                const value = config.getValue(selected);
                if (config.positive) {
                    updateSliderRangePositive(config.slider, value, config.stages, false);
                } else {
                    updateSliderRange(config.slider, value, config.stages, false);
                }
                config.onEnd?.(selected);
                options.onRender();
            }
        );
    }
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
    onValueChange: () => void;
    onPreviewRender: () => void;
    onTimelineRender: () => void;
    coordStages: number[];
    rotationStages: number[];
    sizeStages: number[];
    strokeStages: number[];
    fontSizeStages: number[];
    audioVolumeStages: number[];
}

export function setupPropertyNumberInputs(options: PropertyNumberInputOptions): void {
    const { inputs } = options;
    type NumberConfig = {
        input: HTMLInputElement;
        slider: HTMLInputElement;
        min: number;
        max: number;
        defaultValue: number;
        updateRange?: (value: number) => void;
        onCommit?: (value: number) => void;
    };

    const numberConfigs: NumberConfig[] = [
        {
            input: inputs.xNumber,
            slider: inputs.xSlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.xSlider, value, options.coordStages, false),
        },
        {
            input: inputs.yNumber,
            slider: inputs.ySlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.ySlider, value, options.coordStages, false),
        },
        {
            input: inputs.zNumber,
            slider: inputs.zSlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.zSlider, value, options.coordStages, false),
        },
        {
            input: inputs.rotationNumber,
            slider: inputs.rotationSlider,
            min: -1440,
            max: 1440,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.rotationSlider, value, options.rotationStages, false),
        },
        {
            input: inputs.rotationXNumber,
            slider: inputs.rotationXSlider,
            min: -1440,
            max: 1440,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.rotationXSlider, value, options.rotationStages, false),
        },
        {
            input: inputs.rotationYNumber,
            slider: inputs.rotationYSlider,
            min: -1440,
            max: 1440,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.rotationYSlider, value, options.rotationStages, false),
        },
        {
            input: options.startInput,
            slider: options.startInput,
            min: 0,
            max: 600,
            defaultValue: 0,
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
            updateRange: (value: number) => updateSliderRangePositive(inputs.fontSizeSlider, value, options.fontSizeStages, false),
        },
        {
            input: inputs.strokeWidthNumber,
            slider: inputs.strokeWidthSlider,
            min: 0,
            max: 3200,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRangePositive(inputs.strokeWidthSlider, value, options.strokeStages, false),
        },
        {
            input: inputs.shapeWidthNumber,
            slider: inputs.shapeWidthSlider,
            min: 0,
            max: 3200,
            defaultValue: 100,
            updateRange: (value: number) => updateSliderRangePositive(inputs.shapeWidthSlider, value, options.sizeStages, false),
        },
        {
            input: inputs.shapeHeightNumber,
            slider: inputs.shapeHeightSlider,
            min: 0,
            max: 3200,
            defaultValue: 100,
            updateRange: (value: number) => updateSliderRangePositive(inputs.shapeHeightSlider, value, options.sizeStages, false),
        },
        {
            input: inputs.audioVolumeNumber,
            slider: inputs.audioVolumeSlider,
            min: AUDIO_VOLUME.minPercent,
            max: AUDIO_VOLUME.maxPercent,
            defaultValue: AUDIO_VOLUME.defaultPercent,
            updateRange: (value: number) => updateSliderRange(inputs.audioVolumeSlider, value, options.audioVolumeStages, false),
        },
        {
            input: inputs.cameraFovInput,
            slider: inputs.cameraFovSlider,
            min: 1,
            max: 179,
            defaultValue: 50,
        },
        {
            input: inputs.cameraVerticalAngleNumber,
            slider: inputs.cameraVerticalAngleSlider,
            min: -1440,
            max: 1440,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.cameraVerticalAngleSlider, value, options.rotationStages, false),
        },
        {
            input: inputs.cameraHorizontalAngleNumber,
            slider: inputs.cameraHorizontalAngleSlider,
            min: -1440,
            max: 1440,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.cameraHorizontalAngleSlider, value, options.rotationStages, false),
        },
        {
            input: inputs.cameraOrbitDistanceNumber,
            slider: inputs.cameraOrbitDistanceSlider,
            min: -8000,
            max: 8000,
            defaultValue: 0,
            updateRange: (value: number) => updateSliderRange(inputs.cameraOrbitDistanceSlider, value, options.coordStages, false),
        },
    ];

    for (const config of numberConfigs) {
        setupNumberInput(config.input, config.slider, {
            min: config.min,
            max: config.max,
            default: config.defaultValue,
            updateSliderRangeFn: config.updateRange,
            onCommit: config.onCommit ?? options.onValueChange,
            onSliderInput: options.onValueChange,
        });
    }
}