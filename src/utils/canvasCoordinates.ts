export interface CanvasDisplayRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export function getCanvasDisplayRect(canvas: HTMLCanvasElement): CanvasDisplayRect {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;
    const rectAspect = rect.width / rect.height;

    if (canvasAspect > rectAspect) {
        const height = rect.width / canvasAspect;
        return {
            left: rect.left,
            top: rect.top + (rect.height - height) / 2,
            width: rect.width,
            height,
        };
    }

    const width = rect.height * canvasAspect;
    return {
        left: rect.left + (rect.width - width) / 2,
        top: rect.top,
        width,
        height: rect.height,
    };
}
