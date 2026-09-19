export function setupCanvasResize(
    canvas: HTMLCanvasElement,
    onWindowResize: () => void
): void {
    const resizeCanvas = (): void => {
        const container = canvas.parentElement!;
        const containerWidth = container.clientWidth - 32;
        const aspectRatio = 16 / 9;
        let width = Math.min(containerWidth, 960);
        let height = width / aspectRatio;
        if (height > window.innerHeight * 0.6) {
            height = window.innerHeight * 0.6;
            width = height * aspectRatio;
        }
        canvas.style.width = `${Math.floor(width)}px`;
        canvas.style.height = `${Math.floor(height)}px`;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('resize', onWindowResize);
    window.setTimeout(resizeCanvas, 100);
}