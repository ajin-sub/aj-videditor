import type { Clip, ClipType } from '../types/clip';

export interface TimelineRenderOptions {
    clips: Clip[];
    currentFrame: number;
    selectedId: string | null;
    currentLayerCount: number;
    timelineDurationSeconds: number;
    fps: number;
    pixelsPerSecond: number;
    totalWidth: number;
    timelineHeight: number;
    timelineHeaderHeight: number;
    timelinePaddingLeft: number;
    timelinePaddingRight: number;
    draggingClipId: string | null;
    isDraggingClip: boolean;
    getClipColor: (type: ClipType) => string;
}

export function renderTimeline(options: TimelineRenderOptions): string {
    const {
        clips,
        currentFrame,
        selectedId,
        currentLayerCount,
        timelineDurationSeconds,
        fps,
        pixelsPerSecond,
        totalWidth,
        timelineHeight,
        timelineHeaderHeight,
        timelinePaddingLeft,
        timelinePaddingRight,
        draggingClipId,
        isDraggingClip,
        getClipColor,
    } = options;
    let html = '';

    html += `<div class="timeline-ruler" style="height:${timelineHeaderHeight}px; padding-left:${timelinePaddingLeft}px; padding-right:${timelinePaddingRight}px;">`;
    html += `<div class="timeline-ruler-inner" style="position:relative; height:100%; width:100%;">`;
    for (let seconds = 0; seconds <= timelineDurationSeconds; seconds++) {
        const x = seconds * pixelsPerSecond;
        const isMajor = seconds % 5 === 0;
        html += `<div class="timeline-tick ${isMajor ? 'major' : 'minor'}" style="left:${x}px;">`;
        if (isMajor) html += `<span class="timeline-tick-label">${seconds}s</span>`;
        html += `</div>`;
    }
    html += `</div></div>`;

    const headX = timelinePaddingLeft + (currentFrame / fps) * pixelsPerSecond;
    const totalTimelineHeight = timelineHeaderHeight + currentLayerCount * timelineHeight;
    html += `<div class="timeline-playhead-container" style="position:relative; width:100%; height:${totalTimelineHeight}px;">`;
    html += `<div class="timeline-playhead" style="left:${headX}px; position:absolute; top:0; width:2px; height:100%; background:var(--accent); z-index:10; pointer-events:none;"></div>`;
    html += `<div class="timeline-playhead-dot" style="position:absolute; top:-6px; left:${headX - 4}px; width:10px; height:10px; background:var(--accent); border-radius:50%; z-index:11; pointer-events:none;"></div>`;

    for (let layerId = 1; layerId <= currentLayerCount; layerId++) {
        const layerLabel = String(layerId).padStart(2, '0');
        html += `<div class="timeline-track" style="height:${timelineHeight}px; width:${totalWidth}px; min-width:100%;">`;
        html += `<div class="timeline-track-label">LAYER ${layerLabel}</div>`;
        html += `<div class="timeline-track-area" style="position:relative; flex:1; height:100%;">`;

        for (const clip of clips.filter(item => item.layerId === layerId)) {
            const left = (clip.startFrame / fps) * pixelsPerSecond;
            const width = (clip.duration / fps) * pixelsPerSecond;
            const isSelected = clip.id === selectedId;
            const isDragging = isDraggingClip && draggingClipId === clip.id;
            const opacity = isDragging ? '0.5' : '0.8';
            const label = getClipLabel(clip);
            const endFrame = clip.startFrame + clip.duration;
            const oneFrameWidth = pixelsPerSecond / fps;
            const displayWidth = Math.max(width, Math.max(1, oneFrameWidth * 0.5));

            html += `<div class="timeline-clip ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}" 
                      data-clip-id="${clip.id}"
                      data-startframe="${clip.startFrame}"
                      data-endframe="${endFrame}"
                      style="left:${left}px; width:${displayWidth}px; background:${getClipColor(clip.type)}; opacity:${opacity};">
                    <span class="timeline-clip-label">${label}</span>
                 </div>`;
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    html += `<div class="timeline-add-layer">`;
    html += `<button class="btn-primary btn-sm" id="addLayerBtn" style="width:100%; max-width:200px;">+ Add Layer</button>`;
    html += `<div id="addLayerInputContainer">`;
    html += `<input type="number" id="addLayerCountInput" value="1" min="1" max="99" />`;
    html += `<span class="hint">layers</span>`;
    html += `<button class="btn-primary btn-sm" id="confirmAddLayerBtn">Add</button>`;
    html += `<button class="btn-primary btn-sm btn-danger" id="cancelAddLayerBtn">Cancel</button>`;
    html += `</div></div>`;
    return html;
}

function getClipLabel(clip: Clip): string {
    if (clip.type === 'text') {
        return '\u00A0\u00A0\u00A0' + (clip.text || 'Text').replace(/\n/g, ' ');
    }
    if (clip.type === 'shape') {
        const shapeName = clip.shapeType || 'shape';
        return '\u00A0\u00A0\u00A0' + shapeName.charAt(0).toUpperCase() + shapeName.slice(1);
    }
    if (clip.type === 'camera') return '\u00A0\u00A0\u00A0Camera';
    return '\u00A0\u00A0\u00A0Unknown';
}