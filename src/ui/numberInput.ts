export function getSliderMax(value: number, stages: number[]): number {
    const abs = Math.abs(value);
    for (const stage of stages) {
        if (abs < stage) return stage;
    }
    return stages[stages.length - 1];
}

export function updateSliderRange(
    slider: HTMLInputElement,
    value: number,
    stages: number[],
    isDragging: boolean
): void {
    if (isDragging) return;
    const max = getSliderMax(value, stages);
    slider.min = String(-max);
    slider.max = String(max);
}

export function updateSliderRangePositive(
    slider: HTMLInputElement,
    value: number,
    stages: number[],
    isDragging: boolean
): void {
    if (isDragging) return;
    const max = getSliderMax(value, stages);
    slider.min = '0';
    slider.max = String(max);
}

interface NumberInputConfig {
    min: number;
    max: number;
    default: number;
    stages: number[] | null;
    getIsDragging: () => boolean;
    updateSliderRangeFn: (value: number) => void;
    onCommit: (value: number) => void;
}

export function setupNumberInput(
    input: HTMLInputElement,
    slider: HTMLInputElement,
    config: NumberInputConfig
): void {
    input.addEventListener('click', () => input.select());
    input.addEventListener('focus', () => input.select());

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitNumberInput(input, slider, config);
        }
    });

    input.addEventListener('change', () => {
        commitNumberInput(input, slider, config);
    });
}

function commitNumberInput(
    input: HTMLInputElement,
    slider: HTMLInputElement,
    config: NumberInputConfig
): void {
    let val = parseFloat(input.value);

    if (isNaN(val) || input.value.trim() === '') {
        val = config.default;
    }

    val = Math.max(config.min, Math.min(config.max, val));

    slider.value = String(val);
    input.value = String(val);

    if (config.stages) {
        config.updateSliderRangeFn(val);
    }

    config.onCommit(val);
    input.blur();
}

export function setupSliderDrag(
    slider: HTMLInputElement,
    onStart: () => void,
    onEnd: () => void
): void {
    const start = () => { onStart(); };
    const end = () => { onEnd(); };

    slider.addEventListener('mousedown', start);
    slider.addEventListener('mouseup', end);
    slider.addEventListener('mouseleave', end);
    slider.addEventListener('touchstart', start);
    slider.addEventListener('touchend', end);
    slider.addEventListener('touchcancel', end);
}