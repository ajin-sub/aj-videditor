// ============================================================
// 初期微動継続時間 - エントリーポイント
// ============================================================

import type { Clip, ClipType, ShapeType } from './types/clip';
import {
    updateSliderRange,
    updateSliderRangePositive,
} from './ui/numberInput';
import { THEMES } from './config/themes';
import {
    applyOverlapPrevention as applyTimelineOverlapPrevention,
    findAvailableLayer as findTimelineAvailableLayer,
    getClipsAtFrame as getTimelineClipsAtFrame,
    isOverlapping as isTimelineOverlapping,
    resolveOverlap as resolveTimelineOverlap,
    updateTimelineDuration as calculateTimelineDuration,
} from './domain/timeline';
import { createClip } from './domain/clipFactory';
import { renderPreview } from './render/previewRenderer';
import { renderTimeline } from './render/timelineRenderer';
import { createPlaybackController } from './interaction/playback';
import { createTimelineSeek } from './interaction/timelineSeek';
import { createTimelineResize } from './interaction/timelineResize';
import { createTimelineDrag } from './interaction/timelineDrag';
import { downloadProjectFile, readProjectFile } from './project/projectStorage';
import { setupLayoutResize } from './interaction/layoutResize';
import { setupSettingsPanel } from './ui/settingsPanel';
import { setupProjectPanel } from './ui/projectPanel';
import { setupCanvasResize } from './interaction/canvasResize';
import { setupKeyboardShortcuts as setupKeyboardShortcutEvents } from './interaction/keyboardShortcuts';
import { exposeDebugApi } from './debug/debugApi';
import { setupTimelineEvents } from './interaction/timelineEvents';
import { initializeEditor } from './interaction/editorInitialization';
import { createTimelineZoom } from './interaction/timelineZoom';
import {
    formatTime as formatTimelineTime,
    getPixelsPerSecond as calculatePixelsPerSecond,
    getTotalTimelineWidth as calculateTotalTimelineWidth,
    getVisibleDuration as calculateVisibleDuration,
} from './utils/timelineMetrics';
import {
    BASE_PIXELS_PERSEC,
    CONFIG,
    DEFAULT_CLIP_DURATION,
    DEFAULT_FONT,
    DEFAULT_LAYER_COUNT,
    getClipColor,
    MAX_LAYERS,
    MAX_TIMELINE_FRAMES,
    SLIDER_STAGES,
    STORAGE_KEY,
    TIMELINE_HEADER_HEIGHT,
    TIMELINE_HEIGHT,
    TIMELINE_PADDING_LEFT,
    TIMELINE_PADDING_RIGHT,
} from './config/editorConfig';
import {
    setupPropertyNumberInputs,
    setupPropertySliderDrags,
    setPropertyInputsEnabled,
    syncPropertyPanel,
    updateSelectedClip,
} from './ui/propertyPanel';
import {
    getCanvasCoords as getPreviewCanvasCoords,
    getClipAtPosition as getPreviewClipAtPosition,
    setupPreviewDrag as setupPreviewDragInteraction,
} from './interaction/previewInteraction';
import {
    loadSettings as loadStoredSettings,
    saveSettings as saveStoredSettings,
} from './persistence/settingsStorage';

// -------- configを参照する変数 --------
let TIMELINE_DURATION = 1;
let TIMELINE_DURATION_SEC = TIMELINE_DURATION / CONFIG.fps

// -------- DOM要素 --------
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// X,Y,Z,Rotation等
const xSlider = document.getElementById('xPos') as HTMLInputElement;
const ySlider = document.getElementById('yPos') as HTMLInputElement;
const zSlider = document.getElementById('zPos') as HTMLInputElement;
const rotationSlider = document.getElementById('rotationSlider') as HTMLInputElement;
const startInput = document.getElementById('startInput') as HTMLInputElement;
const durationInput = document.getElementById('durationInput') as HTMLInputElement;
// 数値入力欄
const xNumber = document.getElementById('xNumber') as HTMLInputElement;
const yNumber = document.getElementById('yNumber') as HTMLInputElement;
const zNumber = document.getElementById('zNumber') as HTMLInputElement;
const rotationNumber = document.getElementById('rotationNumber') as HTMLInputElement;

// テキスト
const typeDisplay = document.getElementById('typeDisplay') as HTMLSpanElement;
const textProperties = document.getElementById('textProperties') as HTMLDivElement;
// fontSize,colorPicker等
const textInput = document.getElementById('textInput') as HTMLTextAreaElement;
const fontSelect = document.getElementById('fontSelect') as HTMLSelectElement;
const fontSizeSlider = document.getElementById('fontSize') as HTMLInputElement;
const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
// 数値入力欄
const fontSizeNumber = document.getElementById('fontSizeNumber') as HTMLInputElement;

// shape
const shapeProperties = document.getElementById('shapeProperties') as HTMLDivElement;
// type,Width,Height
const shapeTypeSelect = document.getElementById('shapeTypeSelect') as HTMLSelectElement;
const fillColorPicker = document.getElementById('fillColorPicker') as HTMLInputElement;
const strokeColorPicker = document.getElementById('strokeColorPicker') as HTMLInputElement;
const strokeWidthSlider = document.getElementById('strokeWidthSlider') as HTMLInputElement;
const shapeWidthSlider = document.getElementById('shapeWidthSlider') as HTMLInputElement;
const shapeHeightSlider = document.getElementById('shapeHeightSlider') as HTMLInputElement;
// 数値入力欄
const strokeWidthNumber = document.getElementById('strokeWidthNumber') as HTMLInputElement;
const shapeWidthNumber = document.getElementById('shapeWidthNumber') as HTMLInputElement;
const shapeHeightNumber = document.getElementById('shapeHeightNumber') as HTMLInputElement;

// カメラ用DOM
const cameraProperties = document.getElementById('cameraProperties') as HTMLDivElement;
const cameraRangeInput = document.getElementById('cameraRangeInput') as HTMLInputElement;

// 再生開始
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const currentTimeDisplay = document.getElementById('currentTime') as HTMLSpanElement;
const totalTimeDisplay = document.getElementById('totalTime') as HTMLSpanElement;

// 削除
const deleteBtn = document.getElementById('deleteBtn') as HTMLButtonElement;
const timelineContainer = document.getElementById('timelineContainer') as HTMLDivElement;

// 設定
const settingsToggle = document.getElementById('settingsToggle') as HTMLButtonElement;
const settingsOverlay = document.getElementById('settingsOverlay') as HTMLDivElement;
const settingsClose = document.getElementById('settingsClose') as HTMLButtonElement;
const settingsCloseBtn = document.getElementById('settingsCloseBtn') as HTMLButtonElement;
const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
const overlapToggle = document.getElementById('overlapToggle') as HTMLInputElement;
const layerCountInput = document.getElementById('layerCountInput') as HTMLInputElement;
const applyLayerCountBtn = document.getElementById('applyLayerCountBtn') as HTMLButtonElement;
const bgColorPicker = document.getElementById('bgColorPicker') as HTMLInputElement;
const resolutionSelect = document.getElementById('resolutionSelect') as HTMLSelectElement;
const fpsSelect = document.getElementById('fpsSelect') as HTMLSelectElement;
// タブ
const settingsTabs = document.getElementById('settingsTabs') as HTMLDivElement;
const tabProject = document.getElementById('tabProject') as HTMLDivElement;
const tabEditor = document.getElementById('tabEditor') as HTMLDivElement;

// ズーム関連
let zoomInBtn: HTMLButtonElement;
let zoomOutBtn: HTMLButtonElement;
let zoomLevelDisplay: HTMLSpanElement;

// リサイズ用DOM
const resizeHandleHorizontal = document.getElementById('resizeHandleHorizontal') as HTMLDivElement;
const resizeHandleVertical = document.getElementById('resizeHandleVertical') as HTMLDivElement;
const canvasWrapper = document.getElementById('canvasWrapper') as HTMLDivElement;
const propertiesPanel = document.getElementById('propertiesPanel') as HTMLDivElement;
const bottomSection = document.getElementById('bottomSection') as HTMLDivElement;

// -------- 状態 --------
let clips: Clip[] = [];
let selectedId: string | null = null;
let idCounter = 0;
let currentFrame = 0;
let currentLayerCount = CONFIG.layerCount;

let currentProjectName = '無題';

// ズーム関連
let timelineZoom = 1.0;
const MIN_ZOOM = 0.0625;
const MAX_ZOOM = 16.0;

// ドラッグ中フラグ
let isDraggingX = false;
let isDraggingY = false;
let isDraggingZ = false;
let isDraggingRotation = false;
let isDraggingStroke = false;
let isDraggingWidth = false;
let isDraggingHeight = false;
let isDraggingFontSize = false;


// リサイズ用状態
const MIN_PANEL_WIDTH = 200;
const MIN_TIMELINE_HEIGHT = 80;

const playbackController = createPlaybackController({
    getCurrentFrame: () => currentFrame,
    setCurrentFrame: (frame) => { currentFrame = frame; },
    getTimelineDuration: () => TIMELINE_DURATION,
    getFps: () => CONFIG.fps,
    onPlayingStateChange: (playing) => {
        playBtn.textContent = playing ? 'Ⅱ' : '▶';
        playBtn.classList.toggle('playing', playing);
    },
    onFrameChange: () => {
        drawTimeline();
        drawPreview();
    },
});

const timelineSeek = createTimelineSeek({
    container: timelineContainer,
    paddingLeft: TIMELINE_PADDING_LEFT,
    fps: () => CONFIG.fps,
    timelineDurationSeconds: () => TIMELINE_DURATION_SEC,
    pixelsPerSecond: (containerWidth) => getPixelsPerSecond(containerWidth),
    getCurrentFrame: () => currentFrame,
    setCurrentFrame: (frame) => { currentFrame = frame; },
    stopPlayback,
    onRender: () => {
        drawTimeline();
        drawPreview();
    },
});

let timelineDrag: ReturnType<typeof createTimelineDrag>;

const timelineResize = createTimelineResize({
    container: timelineContainer,
    paddingLeft: TIMELINE_PADDING_LEFT,
    fps: () => CONFIG.fps,
    maxTimelineFrames: MAX_TIMELINE_FRAMES,
    getPixelsPerSecond,
    getClip: (id) => clips.find(clip => clip.id === id),
    isDraggingClip: () => timelineDrag?.isDragging() ?? false,
    preventOverlap: () => CONFIG.preventOverlap,
    isOverlapping,
    resolveOverlap,
    setSelected: (id) => { selectedId = id; },
    setPropertyValues: (clip) => updatePropertyUI(clip),
    onRender: () => {
        drawTimeline();
        drawPreview();
    },
    onResizeEnd: () => {
        updateTimelineDuration();
        syncUI();
    },
    stopPlayback,
});

timelineDrag = createTimelineDrag({
    container: timelineContainer,
    timelineHeight: TIMELINE_HEIGHT,
    timelineHeaderHeight: TIMELINE_HEADER_HEIGHT,
    fps: () => CONFIG.fps,
    timelineDuration: () => TIMELINE_DURATION,
    layerCount: () => currentLayerCount,
    getPixelsPerSecond,
    getClip: (id) => clips.find(clip => clip.id === id),
    isResizing: () => timelineResize.isResizing(),
    preventOverlap: () => CONFIG.preventOverlap,
    isOverlapping,
    findAvailableLayer,
    setSelected: (id) => { selectedId = id; },
    setPropertyValues: updatePropertyUI,
    onRender: () => {
        drawTimeline();
        drawPreview();
    },
    onDragEnd: () => {
        updateTimelineDuration();
        syncUI();
    },
    stopPlayback,
});

const timelineZoomController = createTimelineZoom({
    container: timelineContainer,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    basePixelsPerSecond: BASE_PIXELS_PERSEC,
    paddingLeft: TIMELINE_PADDING_LEFT,
    fps: () => CONFIG.fps,
    getCurrentFrame: () => currentFrame,
    getZoom: () => timelineZoom,
    setZoom: (zoom) => { timelineZoom = zoom; },
    onDisplayUpdate: (percent) => {
        if (zoomLevelDisplay) zoomLevelDisplay.textContent = `${percent}%`;
    },
    onRender: drawTimeline,
});

// -------- ユーティリティ --------
function generateId(): string {
    return `clip-${++idCounter}`;
}

function getSelected(): Clip | null {
    return clips.find(c => c.id === selectedId) || null;
}

function getClipsAtFrame(frame: number): Clip[] {
    return getTimelineClipsAtFrame(clips, frame);
}

// タイムラインの長さをクリップに合わせて自動調整
function updateTimelineDuration(): void {
    TIMELINE_DURATION = calculateTimelineDuration(clips, MAX_TIMELINE_FRAMES);
    TIMELINE_DURATION_SEC = TIMELINE_DURATION / CONFIG.fps;
}

// -------- レイヤー数変更 --------
function setLayerCount(newCount: number): void {
    newCount = Math.max(1, Math.min(MAX_LAYERS, newCount));
    if (newCount === currentLayerCount) return;

    if (newCount < currentLayerCount) {
        for (const clip of clips) {
            if (clip.layerId > newCount) {
                clip.layerId = newCount;
            }
        }
    }

    currentLayerCount = newCount;
    CONFIG.layerCount = newCount;
    layerCountInput.value = String(newCount);
    drawTimeline();
    drawPreview();

}

// -------- テーマ適用 --------

// 設定をlocalStorageに保存
function saveSettings(): void {
    saveStoredSettings(STORAGE_KEY, {
        theme: CONFIG.theme,
        preventOverlap: CONFIG.preventOverlap,
    });
}

// localStorageから設定を読み込む
function loadSettings() {
    return loadStoredSettings(STORAGE_KEY);
}

function applyTheme(themeName: string): void {
    const theme = THEMES[themeName];
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.bg);
    root.style.setProperty('--bg-secondary', theme.secondary);
    root.style.setProperty('--bg-card', theme.card);
    root.style.setProperty('--text-primary', theme.text);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--border-color', theme.border);
    root.style.setProperty('--accent', theme.accent);
    CONFIG.theme = themeName;
    themeSelect.value = themeName;

    //  テーマ変更時に保存
    saveSettings();
}

// -------- プレビュー描画 --------
function drawPreview(): void {
    renderPreview({
        ctx,
        clips,
        currentFrame,
        selectedId,
        width: CONFIG.resolution.width,
        height: CONFIG.resolution.height,
        backgroundColor: CONFIG.bgColor,
        defaultFont: DEFAULT_FONT,
    });
}

// 共通の座標変換関数
function getCanvasCoords(e: MouseEvent): { x: number, y: number } {
    return getPreviewCanvasCoords(canvas, e);
}

// -------- プレビュードラッグ --------
function getClipAtPosition(cx: number, cy: number): Clip | null {
    return getPreviewClipAtPosition(
        ctx,
        clips,
        currentFrame,
        cx,
        cy,
        CONFIG.resolution.width,
        CONFIG.resolution.height,
        DEFAULT_FONT
    );
}

function setupPreviewDrag(): void {
    setupPreviewDragInteraction({
        canvas,
        ctx,
        clips,
        getCurrentFrame: () => currentFrame,
        width: CONFIG.resolution.width,
        height: CONFIG.resolution.height,
        defaultFont: DEFAULT_FONT,
        onSelect: (clip) => {
            selectedId = clip.id;
            syncUI();
        },
        onMove: (clip, newX, newY) => {
            if (selectedId !== clip.id) return;
            xNumber.value = String(newX);
            xSlider.value = String(newX);
            yNumber.value = String(newY);
            ySlider.value = String(newY);
            updateSliderRange(xSlider, newX, SLIDER_STAGES.coord, false);
            updateSliderRange(ySlider, newY, SLIDER_STAGES.coord, false);
        },
        onDragEnd: (clip) => {
            if (clip && selectedId === clip.id) syncUI();
        },
        onRender: drawPreview,
    });
}

// -------- プレビュー上のテキストをホイールでサイズ変更 --------
canvas.addEventListener('wheel', (e: WheelEvent) => {
    // マウス位置のクリップを取得
    const pos = getCanvasCoords(e);
    const clip = getClipAtPosition(pos.x, pos.y);

    // テキストクリップ以外は無視
    if (!clip || clip.type !== 'text') return;

    // 重なり対応: 同じ位置に複数ある場合は最前面（layerIdが最大）を選ぶ
    const visibleClips = getClipsAtFrame(currentFrame);
    const textClipsAtPos = visibleClips.filter(c => {
        if (c.type !== 'text') return false;
        const drawX = CONFIG.resolution.width / 2 + c.x;
        const drawY = CONFIG.resolution.height / 2 + c.y;
        const lines = c.text?.split('\n') || [''];
        const fontSize = c.fontSize || 48;
        const lineHeight = fontSize * 1.2;
        const height = lines.length * lineHeight;
        let maxWidth = 0;
        ctx.font = `${fontSize}px ${c.fontFamily || DEFAULT_FONT}`;
        for (const line of lines) {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxWidth) maxWidth = metrics.width;
        }
        const width = (maxWidth || 100) + 20;
        const halfW = width / 2;
        const halfH = (height + 20) / 2;
        return pos.x >= drawX - halfW && pos.x <= drawX + halfW &&
            pos.y >= drawY - halfH && pos.y <= drawY + halfH;
    });

    // 最前面（layerIdが最大）のテキストを選ぶ
    const targetClip = textClipsAtPos.sort((a, b) => b.layerId - a.layerId)[0];
    if (!targetClip) return;

    // スクロール防止
    e.preventDefault();

    // サイズ変更
    const delta = e.deltaY > 0 ? -CONFIG.text_wheel_step : CONFIG.text_wheel_step;
    const currentSize = targetClip.fontSize || 50;
    const newSize = Math.max(0, Math.min(3200, currentSize + delta));

    targetClip.fontSize = newSize;

    // パネル連動（選択中なら更新）
    if (selectedId === targetClip.id) {
        fontSizeSlider.value = String(newSize);
        fontSizeNumber.value = String(newSize);
        updateSliderRangePositive(fontSizeSlider, newSize, SLIDER_STAGES.fontSize, false);
    }

    drawPreview();
    drawTimeline();
}, { passive: false });


// -------- タイムライン描画 --------
function drawTimeline(): void {
    const containerWidth = timelineContainer.clientWidth - 4;
    const visibleDuration = getVisibleDuration();
    const pixelsPerSecond = getPixelsPerSecond(containerWidth);
    const totalWidth = getTotalTimelineWidth(containerWidth);

    const totalTrackHeight = currentLayerCount * TIMELINE_HEIGHT;
    const totalHeight = TIMELINE_HEADER_HEIGHT + totalTrackHeight;

    const html = renderTimeline({
        clips,
        currentFrame,
        selectedId,
        currentLayerCount,
        timelineDurationSeconds: TIMELINE_DURATION_SEC,
        fps: CONFIG.fps,
        pixelsPerSecond,
        totalWidth,
        timelineHeight: TIMELINE_HEIGHT,
        timelineHeaderHeight: TIMELINE_HEADER_HEIGHT,
        timelinePaddingLeft: TIMELINE_PADDING_LEFT,
        timelinePaddingRight: TIMELINE_PADDING_RIGHT,
        draggingClipId: timelineDrag.getDraggingClipId(),
        isDraggingClip: timelineDrag.isDragging(),
        getClipColor,
    });

    const containerHeight = timelineContainer.clientHeight || Math.min(totalHeight + 8 + 32, 500);
    timelineContainer.style.height = `${Math.max(80, containerHeight)}px`;
    timelineContainer.innerHTML = html;

    document.querySelectorAll<HTMLElement>('.timeline-clip').forEach(el => {
        el.addEventListener('click', (e) => {
            if (timelineDrag.isDragging()) return;
            const id = el.getAttribute('data-clip-id');
            if (id) {
                selectedId = id;
                syncUI();
            }
        });
    });

    document.querySelectorAll<HTMLElement>('.timeline-clip').forEach(el => {
        el.addEventListener('mousedown', (e: MouseEvent) => {
            const id = el.getAttribute('data-clip-id');
            if (!id) return;

            const rect = el.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const elWidth = rect.width;
            const edgeThreshold = 8;

            if (mouseX < edgeThreshold) {
                startResizeClip(e, id, 'left');
            } else if (mouseX > elWidth - edgeThreshold) {
                startResizeClip(e, id, 'right');
            } else {
                startClipDrag(e, id);
            }
        });
    });

    document.querySelectorAll<HTMLElement>('.timeline-clip').forEach(el => {
        el.addEventListener('mousemove', (e: MouseEvent) => {
            if (timelineResize.isResizing() || timelineDrag.isDragging()) return;
            const rect = el.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const elWidth = rect.width;
            const edgeThreshold = 8;

            if (mouseX < edgeThreshold || mouseX > elWidth - edgeThreshold) {
                el.style.cursor = 'ew-resize';
            } else {
                el.style.cursor = 'grab';
            }
        });

        el.addEventListener('mouseleave', () => {
            if (!timelineResize.isResizing() && !timelineDrag.isDragging()) {
                el.style.cursor = 'grab';
            }
        });
    });

    const trackAreas = timelineContainer.querySelectorAll('.timeline-track-area');
    for (const area of trackAreas) {
        area.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.timeline-clip')) return;
            startSeek(e as MouseEvent);
        });
    }
    const ruler = timelineContainer.querySelector('.timeline-ruler-inner');
    if (ruler) {
        ruler.addEventListener('mousedown', (e) => {
            startSeek(e as MouseEvent);
        });
    }

    const addLayerBtn = document.getElementById('addLayerBtn');
    const addLayerInputContainer = document.getElementById('addLayerInputContainer');
    const addLayerCountInput = document.getElementById('addLayerCountInput') as HTMLInputElement;
    const confirmAddLayerBtn = document.getElementById('confirmAddLayerBtn');
    const cancelAddLayerBtn = document.getElementById('cancelAddLayerBtn');

    if (addLayerBtn) {
        addLayerBtn.addEventListener('click', () => {
            addLayerBtn.style.display = 'none';
            if (addLayerInputContainer) {
                addLayerInputContainer.style.display = 'flex';
                addLayerCountInput?.focus();
                addLayerCountInput?.select();
            }
        });
    }

    if (confirmAddLayerBtn) {
        confirmAddLayerBtn.addEventListener('click', () => {
            const val = parseInt(addLayerCountInput?.value || '1', 10);
            if (!isNaN(val) && val > 0) {
                const newCount = Math.min(currentLayerCount + val, MAX_LAYERS);
                setLayerCount(newCount);
            }
            if (addLayerInputContainer) {
                addLayerInputContainer.style.display = 'none';
            }
            if (addLayerBtn) {
                addLayerBtn.style.display = '';
            }
        });
    }

    if (cancelAddLayerBtn) {
        cancelAddLayerBtn.addEventListener('click', () => {
            if (addLayerInputContainer) {
                addLayerInputContainer.style.display = 'none';
            }
            if (addLayerBtn) {
                addLayerBtn.style.display = '';
            }
        });
    }

    if (addLayerCountInput) {
        addLayerCountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmAddLayerBtn?.click();
            }
            if (e.key === 'Escape') {
                cancelAddLayerBtn?.click();
            }
        });
    }

    currentTimeDisplay.textContent = formatTime(currentFrame);
    totalTimeDisplay.textContent = formatTime(TIMELINE_DURATION);

    const timelineControls = document.querySelector('.timeline-controls');
    if (timelineControls && !document.getElementById('zoomControls')) {
        const zoomControls = document.createElement('div');
        zoomControls.id = 'zoomControls';
        zoomControls.style.cssText = 'display:flex; align-items:center; gap:6px; margin-left:12px;';

        zoomOutBtn = document.createElement('button');
        zoomOutBtn.id = 'zoomOutBtn';
        zoomOutBtn.className = 'btn-primary btn-sm';
        zoomOutBtn.textContent = '−';
        zoomOutBtn.style.cssText = 'padding:2px 10px; font-size:16px;';

        zoomLevelDisplay = document.createElement('span');
        zoomLevelDisplay.id = 'zoomLevel';
        zoomLevelDisplay.style.cssText = 'font-size:12px; color:var(--text-secondary); min-width:44px; text-align:center;';
        updateZoomDisplay();

        zoomInBtn = document.createElement('button');
        zoomInBtn.id = 'zoomInBtn';
        zoomInBtn.className = 'btn-primary btn-sm';
        zoomInBtn.textContent = '＋';
        zoomInBtn.style.cssText = 'padding:2px 10px; font-size:16px;';

        zoomControls.appendChild(zoomOutBtn);
        zoomControls.appendChild(zoomLevelDisplay);
        zoomControls.appendChild(zoomInBtn);
        timelineControls.appendChild(zoomControls);
    }
}

// -------- タイムライン操作 --------
// -------- クリップリサイズ --------
function startResizeClip(e: MouseEvent, clipId: string, edge: 'left' | 'right'): void {
    timelineResize.start(e, clipId, edge);
}

// -------- クリップ移動 --------
function startClipDrag(e: MouseEvent, clipId: string): void {
    timelineDrag.start(e, clipId);
}

function updatePropertyUI(clip: Clip): void {
    if (selectedId !== clip.id) return;
    startInput.value = String(clip.startFrame);
    durationInput.value = String(clip.duration);
}

// -------- シーク --------
function getFrameFromMouseEvent(e: MouseEvent): number {
    return timelineSeek.getFrameFromMouseEvent(e);
}

function startSeek(e: MouseEvent): void {
    timelineSeek.start(e);
}

// -------- 再生制御 --------
function togglePlay(): void {
    playbackController.toggle();
}

function startPlayback(): void {
    playbackController.start();
}

function stopPlayback(): void {
    playbackController.stop();
}

// -------- 重なり関連 --------
function isOverlapping(clip: Clip, ignoreId?: string): boolean {
    return isTimelineOverlapping(clip, clips, ignoreId);
}

function resolveOverlap(clip: Clip, ignoreId?: string): void {
    resolveTimelineOverlap(clip, clips, TIMELINE_DURATION, CONFIG.preventOverlap, ignoreId);
}

function applyOverlapPrevention(clip: Clip, ignoreId?: string): void {
    applyTimelineOverlapPrevention(
        clip,
        clips,
        TIMELINE_DURATION,
        CONFIG.preventOverlap,
        ignoreId
    );
}

function findAvailableLayer(startFrame: number, duration: number): number | null {
    return findTimelineAvailableLayer(clips, startFrame, duration, currentLayerCount);
}

//  -------- 時間表示 --------
function formatTime(frame: number): string {
    return formatTimelineTime(frame, CONFIG.fps);
}

// ヘルパー関数
function getVisibleDuration(): number {
    return calculateVisibleDuration(TIMELINE_DURATION_SEC, timelineZoom);
}

function getPixelsPerSecond(containerWidth: number): number {
    return calculatePixelsPerSecond(timelineZoom, BASE_PIXELS_PERSEC);
}

function getTotalTimelineWidth(containerWidth: number): number {
    return calculateTotalTimelineWidth(
        TIMELINE_DURATION_SEC,
        timelineZoom,
        containerWidth,
        BASE_PIXELS_PERSEC,
        TIMELINE_PADDING_LEFT,
        TIMELINE_PADDING_RIGHT
    );
}

function updateZoomDisplay(): void {
    timelineZoomController.updateDisplay();
}

// ズーム制御関数
function zoomTimeline(factor: number): void {
    timelineZoomController.zoom(factor);
}

// -------- UI同期 --------
function syncUI(): void {
    const propertyInputs = {
        textInput, fontSelect, fontSizeSlider, colorPicker, fontSizeNumber,
        shapeTypeSelect, fillColorPicker, strokeColorPicker, strokeWidthSlider,
        shapeWidthSlider, shapeHeightSlider, strokeWidthNumber, shapeWidthNumber,
        shapeHeightNumber, cameraRangeInput, xSlider, ySlider, zSlider,
        rotationSlider, xNumber, yNumber, zNumber, rotationNumber,
    };
    syncPropertyPanel({
        selected: getSelected(),
        hasClips: clips.length > 0,
        defaultFont: DEFAULT_FONT,
        inputs: propertyInputs,
        typeDisplay,
        textProperties,
        shapeProperties,
        cameraProperties,
        startInput,
        durationInput,
        isDraggingX,
        isDraggingY,
        isDraggingZ,
        isDraggingRotation,
        isDraggingStroke,
        isDraggingWidth,
        isDraggingHeight,
        isDraggingFontSize,
        updateSliderRange,
        updateSliderRangePositive,
        coordStages: SLIDER_STAGES.coord,
        rotationStages: SLIDER_STAGES.rotation,
        sizeStages: SLIDER_STAGES.size,
        strokeStages: SLIDER_STAGES.stroke,
        fontSizeStages: SLIDER_STAGES.fontSize,
        setEnabled: (enabled) => setPropertyInputsEnabled(enabled, propertyInputs, startInput, durationInput),
    });

    drawTimeline();
    drawPreview();
}

// -------- クリップ追加 --------
function addClip(type: ClipType): void {

    const startFrame = currentFrame;
    const duration = DEFAULT_CLIP_DURATION;
    const layerId = findAvailableLayer(startFrame, duration);

    if (layerId === null) {
        alert('これ以上クリップを追加できません。レイヤー数を増やすか、既存のクリップを移動してください。');
        return;
    }

    const newClip = createClip(
        type,
        generateId(),
        layerId,
        startFrame,
        duration,
        DEFAULT_FONT
    );

    applyOverlapPrevention(newClip);
    clips.push(newClip);
    selectedId = newClip.id;
    updateTimelineDuration();
    syncUI();
}

// -------- テキスト削除 --------
function deleteSelected(): void {
    if (!selectedId) return;
    clips = clips.filter(c => c.id !== selectedId);
    selectedId = clips.length > 0 ? clips[0].id : null;
    updateTimelineDuration();
    syncUI();
}

// -------- 選択中のプロパティ更新 --------
function updateSelected(): void {
    updateSelectedClip(getSelected(), {
        textInput,
        fontSelect,
        fontSizeSlider,
        colorPicker,
        fontSizeNumber,
        shapeTypeSelect,
        fillColorPicker,
        strokeColorPicker,
        strokeWidthSlider,
        shapeWidthSlider,
        shapeHeightSlider,
        strokeWidthNumber,
        shapeWidthNumber,
        shapeHeightNumber,
        cameraRangeInput,
        xSlider,
        ySlider,
        zSlider,
        rotationSlider,
        xNumber,
        yNumber,
        zNumber,
        rotationNumber,
    }, () => {
        drawPreview();
        drawTimeline();
    });
}

// -------- 数値入力の共通設定（ループ化） --------
function setupAllNumberInputs(): void {
    setupPropertyNumberInputs({
        inputs: {
            textInput, fontSelect, fontSizeSlider, colorPicker, fontSizeNumber,
            shapeTypeSelect, fillColorPicker, strokeColorPicker, strokeWidthSlider,
            shapeWidthSlider, shapeHeightSlider, strokeWidthNumber, shapeWidthNumber,
            shapeHeightNumber, cameraRangeInput, xSlider, ySlider, zSlider,
            rotationSlider, xNumber, yNumber, zNumber, rotationNumber,
        },
        startInput,
        durationInput,
        getSelected,
        getTimelineDuration: () => TIMELINE_DURATION,
        maxTimelineFrames: MAX_TIMELINE_FRAMES,
        preventOverlap: () => CONFIG.preventOverlap,
        isOverlapping,
        resolveOverlap,
        onPreviewRender: drawPreview,
        onTimelineRender: drawTimeline,
        coordStages: SLIDER_STAGES.coord,
        rotationStages: SLIDER_STAGES.rotation,
        sizeStages: SLIDER_STAGES.size,
        strokeStages: SLIDER_STAGES.stroke,
        fontSizeStages: SLIDER_STAGES.fontSize,
    });
}

// -------- パネルリサイズ機能 --------
// -------- 設定UI --------
function openSettings(): void { settingsOverlay.classList.add('active'); }
function closeSettings(): void { settingsOverlay.classList.remove('active'); }

settingsToggle.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsCloseBtn.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });

setupSettingsPanel({
    settingsTabs,
    tabProject,
    tabEditor,
    themeSelect,
    overlapToggle,
    layerCountInput,
    applyLayerCountBtn,
    bgColorPicker,
    resolutionSelect,
    fpsSelect,
    canvas,
}, {
    applyTheme,
    setOverlapPrevention: (enabled) => {
        CONFIG.preventOverlap = enabled;
        overlapToggle.checked = enabled;
        saveSettings();
    },
    setLayerCount,
    setBackgroundColor,
    setResolution: (width, height) => {
        CONFIG.resolution = { width, height };
        canvas.width = width;
        canvas.height = height;
        drawPreview();
        drawTimeline();
    },
    setFps: (fps) => {
        CONFIG.fps = fps;
        drawPreview();
        drawTimeline();
    },
});

//-------- クリップ追加ボタン --------
// テキスト
const addTextBtn = document.getElementById('addTextBtn') as HTMLButtonElement;
addTextBtn.addEventListener('click', () => {
    addClip('text');
});

// 図形
const addShapeBtn = document.getElementById('addShapeBtn') as HTMLButtonElement;
addShapeBtn.addEventListener('click', () => {
    addClip('shape');
});

// カメラ
const addCameraBtn = document.getElementById('addCameraBtn') as HTMLButtonElement;
if (addCameraBtn) {
    addCameraBtn.addEventListener('click', () => {
        addClip('camera');
    });
}

// -------- イベント登録 --------
// テキスト入力のリアルタイム更新
textInput.addEventListener('input', updateSelected);

deleteBtn.addEventListener('click', deleteSelected);
playBtn.addEventListener('click', togglePlay);

fontSizeSlider.addEventListener('input', updateSelected);
colorPicker.addEventListener('input', updateSelected);

shapeTypeSelect.addEventListener('change', updateSelected);
fillColorPicker.addEventListener('input', updateSelected);
strokeColorPicker.addEventListener('input', updateSelected);
strokeWidthSlider.addEventListener('input', updateSelected);
shapeWidthSlider.addEventListener('input', updateSelected);
shapeHeightSlider.addEventListener('input', updateSelected);

xSlider.addEventListener('input', updateSelected);
ySlider.addEventListener('input', updateSelected);
zSlider.addEventListener('input', updateSelected);
rotationSlider.addEventListener('input', updateSelected);

setupPropertySliderDrags({
    xSlider,
    ySlider,
    zSlider,
    rotationSlider,
    strokeWidthSlider,
    shapeWidthSlider,
    shapeHeightSlider,
    fontSizeSlider,
    fontSizeNumber,
    getSelected,
    setDragging: (key, isDragging) => {
        if (key === 'x') isDraggingX = isDragging;
        if (key === 'y') isDraggingY = isDragging;
        if (key === 'z') isDraggingZ = isDragging;
        if (key === 'rotation') isDraggingRotation = isDragging;
        if (key === 'stroke') isDraggingStroke = isDragging;
        if (key === 'width') isDraggingWidth = isDragging;
        if (key === 'height') isDraggingHeight = isDragging;
        if (key === 'fontSize') isDraggingFontSize = isDragging;
    },
    coordStages: SLIDER_STAGES.coord,
    rotationStages: SLIDER_STAGES.rotation,
    strokeStages: SLIDER_STAGES.stroke,
    sizeStages: SLIDER_STAGES.size,
    fontSizeStages: SLIDER_STAGES.fontSize,
    onRender: drawPreview,
});

fontSelect.addEventListener('change', updateSelected);

setupAllNumberInputs();
setupKeyboardShortcutEvents({
    togglePlay,
    deleteSelected,
    isSettingsOpen: () => settingsOverlay.classList.contains('active'),
    closeSettings,
});
setupLayoutResize({
    horizontalHandle: resizeHandleHorizontal,
    verticalHandle: resizeHandleVertical,
    canvasWrapper,
    bottomSection,
    minPanelWidth: MIN_PANEL_WIDTH,
    minTimelineHeight: MIN_TIMELINE_HEIGHT,
    onHorizontalResizeEnd: drawPreview,
    onVerticalResize: drawTimeline,
});
setupPreviewDrag();

// -------- 設定切り替え用関数 --------
function setOverlapPrevention(enabled: boolean): void {
    CONFIG.preventOverlap = enabled;
    overlapToggle.checked = enabled;
    if (enabled) {
        for (const clip of clips) resolveOverlap(clip, clip.id);
        syncUI();
    }
}

function setBackgroundColor(color: string): void {
    CONFIG.bgColor = color;
    drawPreview();
}


// プロジェクト読み込み
function loadProject(file: File): void {
    readProjectFile(file, (data) => {
        try {
            // バージョンチェック
            if (data.version !== '1.0') {
                console.warn('Different project version:', data.version);
                if (!confirm(`プロジェクトのバージョンが異なります (${data.version})。\n読み込みを続行しますか？`)) {
                    return;
                }
            }

            // クリップデータを復元（IDカウンターはリセットしない）
            clips = data.clips || [];

            // プロジェクト名を復元
            if (data.projectName) {
                currentProjectName = data.projectName;
            } else {
                currentProjectName = '無題';
            }

            // 設定を復元
            if (data.config) {
                if (data.config.preventOverlap !== undefined) {
                    CONFIG.preventOverlap = data.config.preventOverlap;
                    overlapToggle.checked = CONFIG.preventOverlap;
                }
                if (data.config.bgColor) {
                    CONFIG.bgColor = data.config.bgColor;
                    bgColorPicker.value = CONFIG.bgColor;
                }
                if (data.config.resolution) {
                    CONFIG.resolution = data.config.resolution;
                    canvas.width = CONFIG.resolution.width;
                    canvas.height = CONFIG.resolution.height;
                    resolutionSelect.value = `${CONFIG.resolution.width}x${CONFIG.resolution.height}`;
                }
                if (data.config.fps) {
                    CONFIG.fps = data.config.fps;
                    fpsSelect.value = String(CONFIG.fps);
                }
                if (data.config.layerCount) {
                    CONFIG.layerCount = data.config.layerCount;
                    currentLayerCount = data.config.layerCount;
                    layerCountInput.value = String(CONFIG.layerCount);
                }
            }

            // 再生位置を復元
            currentFrame = data.currentFrame || 0;

            // 選択状態を復元
            selectedId = data.selectedId || null;

            // レイヤー数を復元
            if (data.layerCount) {
                currentLayerCount = data.layerCount;
            }

            // UIを更新
            updateTimelineDuration();
            syncUI();
            drawPreview();
            drawTimeline();

            console.log(`Project loaded successfully! (${clips.length} clips)`);
            alert(`プロジェクトを読み込みました！\nクリップ数: ${clips.length}`);
        } catch (err) {
            console.error('Load error:', err);
            alert('プロジェクトの読み込みに失敗しました。\nファイルが壊れている可能性があります。');
        }
    }, (err) => {
        console.error('Load error:', err);
        alert('プロジェクトの読み込みに失敗しました。\nファイルが壊れている可能性があります。');
    });
}

// プロジェクト保存/読み込みのイベント
// モーダル用DOM取得
const saveProjectModal = document.getElementById('saveProjectModal') as HTMLDivElement;
const saveProjectNameInput = document.getElementById('saveProjectNameInput') as HTMLInputElement;
const saveProjectConfirmBtn = document.getElementById('saveProjectConfirmBtn') as HTMLButtonElement;
const saveProjectCancelBtn = document.getElementById('saveProjectCancelBtn') as HTMLButtonElement;

// 実際の保存処理
function executeSaveProject(fileName: string): void {
    try {
        const projectData = {
            version: '1.0',
            projectName: fileName,
            clips: clips,
            config: {
                preventOverlap: CONFIG.preventOverlap,
                bgColor: CONFIG.bgColor,
                resolution: CONFIG.resolution,
                fps: CONFIG.fps,
                layerCount: CONFIG.layerCount,
            },
            currentFrame: currentFrame,
            selectedId: selectedId,
            layerCount: currentLayerCount,
            timestamp: new Date().toISOString(),
        };

        downloadProjectFile(projectData, fileName);
        console.log(`Project saved successfully! (${fileName}.ajp)`);
    } catch (err) {
        console.error('Save error:', err);
        alert('プロジェクトの保存に失敗しました。');
    }
}

setupProjectPanel({
    modal: saveProjectModal,
    nameInput: saveProjectNameInput,
    confirmButton: saveProjectConfirmBtn,
    cancelButton: saveProjectCancelBtn,
    saveButton: document.getElementById('saveProjectBtn') as HTMLButtonElement,
    loadButton: document.getElementById('loadProjectBtn') as HTMLButtonElement,
    loadInput: document.getElementById('loadProjectInput') as HTMLInputElement,
}, {
    getProjectName: () => currentProjectName,
    setProjectName: (name) => { currentProjectName = name; },
    saveProject: executeSaveProject,
    loadProject,
});

exposeDebugApi({
    currentFrame,
    clips,
    getCurrentFrame: () => currentFrame,
    setCurrentFrame: (frame) => { currentFrame = frame; },
    getTimelineDuration: () => TIMELINE_DURATION,
    drawPreview,
    drawTimeline,
    togglePlay,
    play: startPlayback,
    stop: stopPlayback,
    setOverlapPrevention,
    setBackgroundColor,
    setLayerCount,
    config: CONFIG,
    applyTheme,
    themes: THEMES,
    getFps: () => CONFIG.fps,
});

setupTimelineEvents(timelineContainer, zoomTimeline);

initializeEditor({
    config: CONFIG,
    loadSettings,
    totalTimeDisplay,
    layerCountInput,
    overlapToggle,
    bgColorPicker,
    resolutionSelect,
    fpsSelect,
    bottomSection,
    minTimelineHeight: MIN_TIMELINE_HEIGHT,
    timelineDuration: TIMELINE_DURATION,
    defaultZoom: 1.0,
    setSelectedNone: () => { selectedId = null; },
    setCurrentLayerCount: (count) => { currentLayerCount = count; },
    setTimelineZoom: (zoom) => { timelineZoom = zoom; },
    applyTheme,
    formatTime,
    updateZoomDisplay,
    syncUI,
});

setupCanvasResize(canvas, drawTimeline);