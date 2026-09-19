export interface LayoutResizeOptions {
    horizontalHandle: HTMLDivElement;
    verticalHandle: HTMLDivElement;
    canvasWrapper: HTMLDivElement;
    bottomSection: HTMLDivElement;
    minPanelWidth: number;
    minTimelineHeight: number;
    onHorizontalResizeEnd: () => void;
    onVerticalResize: () => void;
}

export function setupLayoutResize(options: LayoutResizeOptions): void {
    let resizingHorizontal = false;
    let resizingVertical = false;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;

    const onHorizontalResize = (event: MouseEvent): void => {
        if (!resizingHorizontal) return;
        const delta = event.clientX - resizeStartX;
        const newWidth = resizeStartWidth + delta;
        const parentWidth = options.canvasWrapper.parentElement!.getBoundingClientRect().width - 6;
        const maxWidth = parentWidth - options.minPanelWidth;

        if (newWidth >= options.minPanelWidth && newWidth <= maxWidth) {
            options.canvasWrapper.style.flex = 'none';
            options.canvasWrapper.style.width = `${newWidth}px`;
        }
    };

    const onHorizontalResizeEnd = (): void => {
        resizingHorizontal = false;
        options.horizontalHandle.classList.remove('active');
        document.removeEventListener('mousemove', onHorizontalResize);
        document.removeEventListener('mouseup', onHorizontalResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        options.onHorizontalResizeEnd();
    };

    const onVerticalResize = (event: MouseEvent): void => {
        if (!resizingVertical) return;
        const container = document.querySelector('.main-content') as HTMLElement;
        const totalHeight = container.getBoundingClientRect().height - 50;
        const delta = -(event.clientY - resizeStartY);
        const newHeight = Math.min(
            Math.max(resizeStartHeight + delta, options.minTimelineHeight),
            totalHeight * 0.6
        );

        options.bottomSection.style.height = `${newHeight}px`;
        options.bottomSection.style.minHeight = `${options.minTimelineHeight}px`;
        options.onVerticalResize();
    };

    const onVerticalResizeEnd = (): void => {
        resizingVertical = false;
        options.verticalHandle.classList.remove('active');
        document.removeEventListener('mousemove', onVerticalResize);
        document.removeEventListener('mouseup', onVerticalResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    options.horizontalHandle.addEventListener('mousedown', (event) => {
        event.preventDefault();
        resizingHorizontal = true;
        resizeStartX = event.clientX;
        resizeStartWidth = options.canvasWrapper.getBoundingClientRect().width;
        options.horizontalHandle.classList.add('active');
        document.addEventListener('mousemove', onHorizontalResize);
        document.addEventListener('mouseup', onHorizontalResizeEnd);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    options.verticalHandle.addEventListener('mousedown', (event) => {
        event.preventDefault();
        resizingVertical = true;
        resizeStartY = event.clientY;
        resizeStartHeight = options.bottomSection.getBoundingClientRect().height;
        options.verticalHandle.classList.add('active');
        document.addEventListener('mousemove', onVerticalResize);
        document.addEventListener('mouseup', onVerticalResizeEnd);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    });
}