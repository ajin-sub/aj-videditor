export function setupTimelineEvents(
    timelineContainer: HTMLDivElement,
    zoomTimeline: (factor: number) => void
): void {
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.id === 'zoomOutBtn') {
            zoomTimeline(0.8);
        } else if (target.id === 'zoomInBtn') {
            zoomTimeline(1.25);
        }
    });

    timelineContainer.addEventListener('wheel', (event) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomTimeline(event.deltaY > 0 ? 0.9 : 1.1);
        } else if (event.altKey) {
            event.preventDefault();
            timelineContainer.scrollTop += event.deltaY * 0.3;
        } else {
            event.preventDefault();
            timelineContainer.scrollLeft += event.deltaY;
        }
    }, { passive: false });
}