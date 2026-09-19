// src/ui/numberInput.ts
function getSliderMax(value, stages) {
  const abs = Math.abs(value);
  for (const stage of stages) {
    if (abs < stage)
      return stage;
  }
  return stages[stages.length - 1];
}
function updateSliderRange(slider, value, stages, isDragging) {
  if (isDragging)
    return;
  const max = getSliderMax(value, stages);
  slider.min = String(-max);
  slider.max = String(max);
}
function updateSliderRangePositive(slider, value, stages, isDragging) {
  if (isDragging)
    return;
  const max = getSliderMax(value, stages);
  slider.min = "0";
  slider.max = String(max);
}
function setupNumberInput(input, slider, config) {
  input.addEventListener("click", () => input.select());
  input.addEventListener("focus", () => input.select());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNumberInput(input, slider, config);
    }
  });
  input.addEventListener("change", () => {
    commitNumberInput(input, slider, config);
  });
}
function commitNumberInput(input, slider, config) {
  let val = parseFloat(input.value);
  if (isNaN(val) || input.value.trim() === "") {
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
function setupSliderDrag(slider, onStart, onEnd) {
  const start = () => {
    onStart();
  };
  const end = () => {
    onEnd();
  };
  slider.addEventListener("mousedown", start);
  slider.addEventListener("mouseup", end);
  slider.addEventListener("mouseleave", end);
  slider.addEventListener("touchstart", start);
  slider.addEventListener("touchend", end);
  slider.addEventListener("touchcancel", end);
}

// src/config/themes.ts
var THEMES = {
  "white": { bg: "#f5f5f5", secondary: "#e8e8e8", card: "#ffffff", text: "#222222", textSecondary: "#666666", border: "#d0d0d0", accent: "#f5576c" },
  "white-red": { bg: "#fff5f5", secondary: "#f5e8e8", card: "#ffffff", text: "#331111", textSecondary: "#884444", border: "#e0c8c8", accent: "#e74c3c" },
  "white-blue": { bg: "#f0f5ff", secondary: "#e8edf5", card: "#ffffff", text: "#111833", textSecondary: "#445588", border: "#c8d8e8", accent: "#3498db" },
  "white-green": { bg: "#f0fff5", secondary: "#e8f5ed", card: "#ffffff", text: "#113311", textSecondary: "#448844", border: "#c8e0d0", accent: "#2ecc71" },
  "white-yellow": { bg: "#fffdf0", secondary: "#f5f0e8", card: "#ffffff", text: "#332b11", textSecondary: "#887744", border: "#e8e0c8", accent: "#f1c40f" },
  "white-purple": { bg: "#f8f0ff", secondary: "#f0e8f5", card: "#ffffff", text: "#1f1133", textSecondary: "#664488", border: "#d8c8e8", accent: "#9b59b6" },
  "black": { bg: "#0d0d0d", secondary: "#161616", card: "#111111", text: "#e0e0e0", textSecondary: "#888888", border: "#2a2a2a", accent: "#f5576c" },
  "black-red": { bg: "#1a0a0a", secondary: "#221111", card: "#1a0d0d", text: "#e8d0d0", textSecondary: "#aa8888", border: "#3a2020", accent: "#e74c3c" },
  "black-blue": { bg: "#0a0d1a", secondary: "#111822", card: "#0d111a", text: "#d0d8e8", textSecondary: "#8899aa", border: "#202a3a", accent: "#3498db" },
  "black-green": { bg: "#0a1a0d", secondary: "#112211", card: "#0d1a0d", text: "#d0e8d0", textSecondary: "#88aa88", border: "#203a2a", accent: "#2ecc71" },
  "black-yellow": { bg: "#1a180a", secondary: "#222211", card: "#1a1a0d", text: "#e8e0d0", textSecondary: "#aa9966", border: "#3a3820", accent: "#f1c40f" },
  "black-purple": { bg: "#120a1a", secondary: "#1f1122", card: "#1a0d1a", text: "#e0d0e8", textSecondary: "#9988aa", border: "#2a203a", accent: "#9b59b6" }
};

// src/domain/timeline.ts
function getClipsAtFrame(clips2, frame) {
  return clips2.filter((clip) => {
    return frame >= clip.startFrame && frame < clip.startFrame + clip.duration;
  });
}
function updateTimelineDuration(clips2, maxTimelineFrames) {
  if (clips2.length === 0)
    return 1;
  let maxEndFrame = 0;
  for (const clip of clips2) {
    const endFrame = clip.startFrame + clip.duration;
    if (endFrame > maxEndFrame) {
      maxEndFrame = endFrame;
    }
  }
  return Math.min(maxEndFrame, maxTimelineFrames);
}
function isOverlapping(clip, clips2, ignoreId) {
  return clips2.some((other) => {
    if (other.id === clip.id)
      return false;
    if (ignoreId && other.id === ignoreId)
      return false;
    if (other.layerId !== clip.layerId)
      return false;
    const aStart = clip.startFrame;
    const aEnd = clip.startFrame + clip.duration;
    const bStart = other.startFrame;
    const bEnd = other.startFrame + other.duration;
    return aStart < bEnd && bStart < aEnd;
  });
}
function resolveOverlap(clip, clips2, timelineDuration, preventOverlap, ignoreId) {
  if (!preventOverlap)
    return;
  let attempts = 0;
  while (isOverlapping(clip, clips2, ignoreId) && attempts < 100) {
    attempts++;
    clip.startFrame++;
    if (clip.startFrame + clip.duration > timelineDuration) {
      clip.startFrame = timelineDuration - clip.duration;
      if (clip.startFrame < 0) {
        clip.startFrame = 0;
        clip.duration = timelineDuration;
      }
      break;
    }
  }
}
function applyOverlapPrevention(clip, clips2, timelineDuration, preventOverlap, ignoreId) {
  if (!preventOverlap)
    return;
  resolveOverlap(clip, clips2, timelineDuration, preventOverlap, ignoreId);
}
function findAvailableLayer(clips2, startFrame, duration, layerCount) {
  for (let layerId = 1; layerId <= layerCount; layerId++) {
    const hasOverlap = clips2.some((clip) => {
      if (clip.layerId !== layerId)
        return false;
      const aStart = startFrame;
      const aEnd = startFrame + duration;
      const bStart = clip.startFrame;
      const bEnd = clip.startFrame + clip.duration;
      return aStart < bEnd && bStart < aEnd;
    });
    if (!hasOverlap)
      return layerId;
  }
  return null;
}

// src/domain/clipFactory.ts
function createClip(type, id, layerId, startFrame, duration, defaultFont) {
  const baseClip = {
    id,
    layerId,
    startFrame,
    duration,
    x: 0,
    y: 0,
    z: 0,
    rotation: 0
  };
  if (type === "text") {
    return {
      ...baseClip,
      type,
      text: "New Text",
      fontSize: 50,
      color: "#ffffff",
      fontFamily: defaultFont
    };
  }
  if (type === "shape") {
    return {
      ...baseClip,
      type,
      shapeType: "rectangle",
      fillColor: "#ffffff",
      strokeColor: "transparent",
      strokeWidth: 0,
      width: 100,
      height: 100
    };
  }
  return {
    ...baseClip,
    type,
    cameraRange: 10
  };
}

// src/render/shapeRenderer.ts
function drawShape(ctx2, clip) {
  const { shapeType, fillColor, strokeColor, strokeWidth, width, height, rotation } = clip;
  if (!shapeType || !width || !height)
    return;
  const w = width;
  const h = height;
  ctx2.save();
  ctx2.rotate(rotation * Math.PI / 180);
  drawShapePath(ctx2, shapeType, w, h);
  ctx2.clip();
  if (fillColor && fillColor !== "transparent") {
    ctx2.fillStyle = fillColor;
    ctx2.fill();
  }
  if (strokeColor && strokeColor !== "transparent" && strokeWidth && strokeWidth > 0) {
    ctx2.strokeStyle = strokeColor;
    ctx2.lineWidth = strokeWidth;
    drawShapePath(ctx2, shapeType, w, h);
    ctx2.stroke();
  }
  ctx2.restore();
}
function drawShapePath(ctx2, shapeType, width, height) {
  ctx2.beginPath();
  switch (shapeType) {
    case "rectangle":
      ctx2.rect(-width / 2, -height / 2, width, height);
      break;
    case "triangle":
      ctx2.moveTo(0, -height / 2);
      ctx2.lineTo(-width / 2, height / 2);
      ctx2.lineTo(width / 2, height / 2);
      ctx2.closePath();
      break;
    case "circle":
      ctx2.arc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 2);
      break;
    case "pie": {
      const radius = Math.min(width, height) / 2;
      ctx2.moveTo(0, 0);
      ctx2.arc(0, 0, radius, 0, Math.PI * 1.5);
      ctx2.closePath();
      break;
    }
    case "arrow": {
      const headSize = Math.min(width, height) * 0.35;
      const shaftWidth = height * 0.2;
      ctx2.moveTo(width / 2, 0);
      ctx2.lineTo(width / 2 - headSize, -headSize / 2);
      ctx2.lineTo(width / 2 - headSize, -shaftWidth / 2);
      ctx2.lineTo(-width / 2, -shaftWidth / 2);
      ctx2.lineTo(-width / 2, shaftWidth / 2);
      ctx2.lineTo(width / 2 - headSize, shaftWidth / 2);
      ctx2.lineTo(width / 2 - headSize, headSize / 2);
      ctx2.closePath();
      break;
    }
  }
}

// src/render/previewRenderer.ts
function renderPreview(options) {
  const {
    ctx: ctx2,
    clips: clips2,
    currentFrame: currentFrame2,
    selectedId: selectedId2,
    width,
    height,
    backgroundColor,
    defaultFont
  } = options;
  ctx2.fillStyle = backgroundColor;
  ctx2.fillRect(0, 0, width, height);
  ctx2.strokeStyle = "rgba(255,255,255,0.03)";
  ctx2.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) {
    ctx2.beginPath();
    ctx2.moveTo(x, 0);
    ctx2.lineTo(x, height);
    ctx2.stroke();
  }
  for (let y = 0; y <= height; y += 40) {
    ctx2.beginPath();
    ctx2.moveTo(0, y);
    ctx2.lineTo(width, y);
    ctx2.stroke();
  }
  ctx2.strokeStyle = "rgba(255,255,255,0.08)";
  ctx2.setLineDash([6, 8]);
  ctx2.beginPath();
  ctx2.moveTo(width / 2, 0);
  ctx2.lineTo(width / 2, height);
  ctx2.stroke();
  ctx2.beginPath();
  ctx2.moveTo(0, height / 2);
  ctx2.lineTo(width, height / 2);
  ctx2.stroke();
  ctx2.setLineDash([]);
  ctx2.fillStyle = "rgba(255,50,50,0.5)";
  ctx2.beginPath();
  ctx2.arc(width / 2, height / 2, 4, 0, Math.PI * 2);
  ctx2.fill();
  const visibleClips = getClipsAtFrame(clips2, currentFrame2);
  visibleClips.sort((a, b) => a.layerId - b.layerId);
  const activeCameras = getActiveCameras(clips2, currentFrame2);
  for (const clip of visibleClips) {
    if (clip.type === "camera")
      continue;
    const applicableCameras = activeCameras.filter((camera) => {
      const range = camera.cameraRange || 10;
      return clip.layerId > camera.layerId && clip.layerId <= camera.layerId + range;
    });
    const transformedClip = applicableCameras.length > 0 ? applyCameraTransform(clip, applicableCameras) : clip;
    const drawX = width / 2 + transformedClip.x;
    const drawY = height / 2 + transformedClip.y;
    if (transformedClip.type === "text") {
      drawText(ctx2, transformedClip, drawX, drawY, defaultFont);
      if (clip.id === selectedId2) {
        drawTextSelection(ctx2, transformedClip, drawX, drawY, defaultFont);
      }
    } else if (transformedClip.type === "shape") {
      ctx2.save();
      ctx2.translate(drawX, drawY);
      drawShape(ctx2, transformedClip);
      ctx2.restore();
      if (clip.id === selectedId2) {
        drawShapeSelection(ctx2, transformedClip, drawX, drawY);
      }
    }
  }
}
function drawText(ctx2, clip, drawX, drawY, defaultFont) {
  const lines = clip.text?.split("\n") || [""];
  const lineHeight = (clip.fontSize || 48) * 1.2;
  ctx2.save();
  ctx2.translate(drawX, drawY);
  ctx2.rotate(clip.rotation * Math.PI / 180);
  ctx2.font = `${clip.fontSize || 48}px ${clip.fontFamily || defaultFont}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  for (let i = 0; i < lines.length; i++) {
    const yOffset = (i - (lines.length - 1) / 2) * lineHeight;
    ctx2.fillStyle = clip.color || "#ffffff";
    ctx2.fillText(lines[i], 0, yOffset);
  }
  ctx2.restore();
}
function drawTextSelection(ctx2, clip, drawX, drawY, defaultFont) {
  const lines = clip.text?.split("\n") || [""];
  const lineHeight = (clip.fontSize || 48) * 1.2;
  const totalHeight = lines.length * lineHeight;
  ctx2.save();
  ctx2.translate(drawX, drawY);
  ctx2.rotate(clip.rotation * Math.PI / 180);
  ctx2.font = `${clip.fontSize || 48}px ${clip.fontFamily || defaultFont}`;
  let maxWidth = 0;
  for (const line of lines) {
    maxWidth = Math.max(maxWidth, ctx2.measureText(line).width);
  }
  const width = maxWidth || 50;
  ctx2.strokeStyle = "rgba(255,255,255,0.4)";
  ctx2.lineWidth = 4;
  ctx2.setLineDash([4, 6]);
  ctx2.strokeRect(-width / 2 - 10, -totalHeight / 2 - 10, width + 20, totalHeight + 20);
  ctx2.setLineDash([]);
  ctx2.restore();
}
function drawShapeSelection(ctx2, clip, drawX, drawY) {
  const width = clip.width || 100;
  const height = clip.height || 100;
  ctx2.save();
  ctx2.translate(drawX, drawY);
  ctx2.rotate(clip.rotation * Math.PI / 180);
  ctx2.strokeStyle = "rgba(255,255,255,0.4)";
  ctx2.lineWidth = 4;
  ctx2.setLineDash([4, 6]);
  ctx2.strokeRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 20);
  ctx2.setLineDash([]);
  ctx2.restore();
}
function applyCameraTransform(clip, cameras) {
  let transformedClip = { ...clip };
  for (const camera of cameras) {
    transformedClip = {
      ...transformedClip,
      x: transformedClip.x - camera.x,
      y: transformedClip.y - camera.y,
      z: transformedClip.z - camera.z
    };
  }
  return transformedClip;
}
function getActiveCameras(clips2, frame) {
  return clips2.filter((clip) => {
    return clip.type === "camera" && frame >= clip.startFrame && frame < clip.startFrame + clip.duration;
  });
}

// src/render/timelineRenderer.ts
function renderTimeline(options) {
  const {
    clips: clips2,
    currentFrame: currentFrame2,
    selectedId: selectedId2,
    currentLayerCount: currentLayerCount2,
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
    getClipColor: getClipColor2
  } = options;
  let html = "";
  html += `<div class="timeline-ruler" style="height:${timelineHeaderHeight}px; padding-left:${timelinePaddingLeft}px; padding-right:${timelinePaddingRight}px;">`;
  html += `<div class="timeline-ruler-inner" style="position:relative; height:100%; width:100%;">`;
  for (let seconds = 0; seconds <= timelineDurationSeconds; seconds++) {
    const x = seconds * pixelsPerSecond;
    const isMajor = seconds % 5 === 0;
    html += `<div class="timeline-tick ${isMajor ? "major" : "minor"}" style="left:${x}px;">`;
    if (isMajor)
      html += `<span class="timeline-tick-label">${seconds}s</span>`;
    html += `</div>`;
  }
  html += `</div></div>`;
  const headX = timelinePaddingLeft + currentFrame2 / fps * pixelsPerSecond;
  const totalTimelineHeight = timelineHeaderHeight + currentLayerCount2 * timelineHeight;
  html += `<div class="timeline-playhead-container" style="position:relative; width:100%; height:${totalTimelineHeight}px;">`;
  html += `<div class="timeline-playhead" style="left:${headX}px; position:absolute; top:0; width:2px; height:100%; background:var(--accent); z-index:10; pointer-events:none;"></div>`;
  html += `<div class="timeline-playhead-dot" style="position:absolute; top:-6px; left:${headX - 4}px; width:10px; height:10px; background:var(--accent); border-radius:50%; z-index:11; pointer-events:none;"></div>`;
  for (let layerId = 1; layerId <= currentLayerCount2; layerId++) {
    const layerLabel = String(layerId).padStart(2, "0");
    html += `<div class="timeline-track" style="height:${timelineHeight}px; width:${totalWidth}px; min-width:100%;">`;
    html += `<div class="timeline-track-label">LAYER ${layerLabel}</div>`;
    html += `<div class="timeline-track-area" style="position:relative; flex:1; height:100%;">`;
    for (const clip of clips2.filter((item) => item.layerId === layerId)) {
      const left = clip.startFrame / fps * pixelsPerSecond;
      const width = clip.duration / fps * pixelsPerSecond;
      const isSelected = clip.id === selectedId2;
      const isDragging = isDraggingClip && draggingClipId === clip.id;
      const opacity = isDragging ? "0.5" : "0.8";
      const label = getClipLabel(clip);
      const endFrame = clip.startFrame + clip.duration;
      const oneFrameWidth = pixelsPerSecond / fps;
      const displayWidth = Math.max(width, Math.max(1, oneFrameWidth * 0.5));
      html += `<div class="timeline-clip ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}" 
                      data-clip-id="${clip.id}"
                      data-startframe="${clip.startFrame}"
                      data-endframe="${endFrame}"
                      style="left:${left}px; width:${displayWidth}px; background:${getClipColor2(clip.type)}; opacity:${opacity};">
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
function getClipLabel(clip) {
  if (clip.type === "text") {
    return "\xA0\xA0\xA0" + (clip.text || "Text").replace(/\n/g, " ");
  }
  if (clip.type === "shape") {
    const shapeName = clip.shapeType || "shape";
    return "\xA0\xA0\xA0" + shapeName.charAt(0).toUpperCase() + shapeName.slice(1);
  }
  if (clip.type === "camera")
    return "\xA0\xA0\xA0Camera";
  return "\xA0\xA0\xA0Unknown";
}

// src/interaction/playback.ts
function createPlaybackController(options) {
  let isPlaying = false;
  let playInterval = null;
  const stop = () => {
    isPlaying = false;
    options.onPlayingStateChange(false);
    if (playInterval !== null) {
      clearInterval(playInterval);
      playInterval = null;
    }
  };
  const start = () => {
    if (isPlaying)
      return;
    if (options.getCurrentFrame() >= options.getTimelineDuration()) {
      options.setCurrentFrame(0);
    }
    isPlaying = true;
    options.onPlayingStateChange(true);
    playInterval = window.setInterval(() => {
      const nextFrame = options.getCurrentFrame() + 1;
      if (nextFrame >= options.getTimelineDuration()) {
        options.setCurrentFrame(options.getTimelineDuration());
        stop();
        options.onFrameChange();
        return;
      }
      options.setCurrentFrame(nextFrame);
      options.onFrameChange();
    }, 1e3 / options.getFps());
  };
  return {
    get isPlaying() {
      return isPlaying;
    },
    start,
    stop,
    toggle: () => {
      if (isPlaying)
        stop();
      else
        start();
    }
  };
}

// src/interaction/timelineSeek.ts
function createTimelineSeek(options) {
  let isSeeking = false;
  const getFrameFromMouseEvent = (event) => {
    const rect = options.container.getBoundingClientRect();
    const containerWidth = options.container.clientWidth - 4;
    const pixelsPerSecond = options.pixelsPerSecond(containerWidth);
    const x = event.clientX - rect.left - options.paddingLeft + options.container.scrollLeft;
    const seconds = Math.max(
      0,
      Math.min(options.timelineDurationSeconds(), x / pixelsPerSecond)
    );
    return Math.round(seconds * options.fps());
  };
  const onSeekMove = (event) => {
    if (!isSeeking)
      return;
    options.setCurrentFrame(getFrameFromMouseEvent(event));
    options.onRender();
  };
  const onSeekEnd = () => {
    if (!isSeeking)
      return;
    isSeeking = false;
    document.removeEventListener("mousemove", onSeekMove);
    document.removeEventListener("mouseup", onSeekEnd);
    document.removeEventListener("mouseleave", onSeekEnd);
  };
  const start = (event) => {
    const target = event.target;
    if (target.closest(".timeline-clip"))
      return;
    options.stopPlayback();
    isSeeking = true;
    options.setCurrentFrame(getFrameFromMouseEvent(event));
    options.onRender();
    document.addEventListener("mousemove", onSeekMove);
    document.addEventListener("mouseup", onSeekEnd);
    document.addEventListener("mouseleave", onSeekEnd);
  };
  return { start, getFrameFromMouseEvent };
}

// src/interaction/timelineResize.ts
function createTimelineResize(options) {
  let resizing = false;
  let resizeClipId = null;
  let resizeEdge = null;
  const onResizeMove = (event) => {
    if (!resizing || !resizeClipId || !resizeEdge)
      return;
    const clip = options.getClip(resizeClipId);
    if (!clip)
      return;
    const rect = options.container.getBoundingClientRect();
    const pixelsPerSecond = options.getPixelsPerSecond(options.container.clientWidth - 4);
    const mouseX = event.clientX - rect.left - options.paddingLeft + options.container.scrollLeft;
    const mouseFrame = Math.round(mouseX / pixelsPerSecond * options.fps());
    const oldStart = clip.startFrame;
    const oldDuration = clip.duration;
    const endFrame = oldStart + oldDuration;
    if (resizeEdge === "left") {
      const newStart = Math.max(0, Math.min(mouseFrame, endFrame - 1));
      clip.startFrame = newStart;
      clip.duration = endFrame - newStart;
      if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
        const direction = newStart > oldStart ? 1 : -1;
        let testStart = newStart;
        let found = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          testStart += direction * -1;
          if (testStart < 0 || testStart > endFrame - 1)
            break;
          clip.startFrame = testStart;
          clip.duration = endFrame - testStart;
          if (!options.isOverlapping(clip, clip.id)) {
            found = true;
            break;
          }
        }
        if (!found) {
          clip.startFrame = oldStart;
          clip.duration = oldDuration;
        }
      }
    } else {
      const maxDuration = options.maxTimelineFrames - clip.startFrame;
      const newEnd = Math.max(clip.startFrame + 1, Math.min(options.maxTimelineFrames, mouseFrame));
      const newDuration = newEnd - clip.startFrame;
      clip.duration = newDuration;
      if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
        const direction = newDuration > oldDuration ? 1 : -1;
        let testDuration = newDuration;
        let found = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          testDuration += direction * -1;
          if (testDuration < 1 || testDuration > maxDuration)
            break;
          clip.duration = testDuration;
          if (!options.isOverlapping(clip, clip.id)) {
            found = true;
            break;
          }
        }
        if (!found)
          clip.duration = oldDuration;
      }
    }
    options.setPropertyValues(clip);
    options.onRender();
  };
  const onResizeEnd = () => {
    if (!resizing)
      return;
    resizing = false;
    resizeClipId = null;
    resizeEdge = null;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
    document.removeEventListener("mouseleave", onResizeEnd);
    document.body.style.cursor = "";
    options.onResizeEnd();
  };
  const start = (event, clipId, edge) => {
    if (options.isDraggingClip() || resizing)
      return;
    const clip = options.getClip(clipId);
    if (!clip)
      return;
    options.stopPlayback();
    resizing = true;
    resizeClipId = clipId;
    resizeEdge = edge;
    options.setSelected(clipId);
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
    document.addEventListener("mouseleave", onResizeEnd);
    document.body.style.cursor = "ew-resize";
    options.onRender();
  };
  return { start, isResizing: () => resizing };
}

// src/interaction/timelineDrag.ts
function createTimelineDrag(options) {
  let dragging = false;
  let draggingClipId = null;
  let startMouseX = 0;
  let startFrame = 0;
  const onDragMove = (event) => {
    if (!dragging || !draggingClipId)
      return;
    const clip = options.getClip(draggingClipId);
    if (!clip)
      return;
    const rect = options.container.getBoundingClientRect();
    const pixelsPerSecond = options.getPixelsPerSecond(options.container.clientWidth - 4);
    const deltaX = (event.clientX - startMouseX) / pixelsPerSecond;
    let newStartFrame = Math.round(startFrame + deltaX * options.fps());
    const maxStart = options.timelineDuration() - clip.duration;
    newStartFrame = Math.max(0, Math.min(maxStart, newStartFrame));
    const trackY = event.clientY - rect.top - options.timelineHeaderHeight;
    const layerIndex = Math.floor(trackY / options.timelineHeight);
    const newLayerId = Math.max(1, Math.min(options.layerCount(), layerIndex + 1));
    const oldStartFrame = clip.startFrame;
    const oldLayerId = clip.layerId;
    clip.startFrame = newStartFrame;
    if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
      const direction = newStartFrame > oldStartFrame ? 1 : -1;
      let testFrame = oldStartFrame + direction;
      let found = false;
      let attempts = 0;
      while (attempts < 100 && !found) {
        attempts++;
        clip.startFrame = testFrame;
        if (!options.isOverlapping(clip, clip.id)) {
          found = true;
          break;
        }
        testFrame += direction;
        if (testFrame < 0 || testFrame > options.timelineDuration() - clip.duration)
          break;
      }
      if (!found)
        clip.startFrame = oldStartFrame;
    }
    if (newLayerId !== oldLayerId) {
      const currentStartFrame = clip.startFrame;
      clip.layerId = newLayerId;
      if (options.preventOverlap() && options.isOverlapping(clip, clip.id)) {
        const availableLayer = options.findAvailableLayer(currentStartFrame, clip.duration);
        clip.layerId = availableLayer === null ? oldLayerId : availableLayer;
      }
    }
    options.onRender();
    options.setPropertyValues(clip);
  };
  const onDragEnd = () => {
    if (!dragging)
      return;
    dragging = false;
    draggingClipId = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    document.removeEventListener("mouseleave", onDragEnd);
    document.body.style.cursor = "";
    options.onDragEnd();
  };
  const start = (event, clipId) => {
    if (dragging || options.isResizing())
      return;
    const clip = options.getClip(clipId);
    if (!clip)
      return;
    options.stopPlayback();
    dragging = true;
    draggingClipId = clipId;
    startFrame = clip.startFrame;
    startMouseX = event.clientX;
    options.setSelected(clipId);
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    document.addEventListener("mouseleave", onDragEnd);
    document.body.style.cursor = "grabbing";
    options.onRender();
  };
  return {
    start,
    isDragging: () => dragging,
    getDraggingClipId: () => draggingClipId
  };
}

// src/project/projectStorage.ts
function readProjectFile(file, onLoaded, onError) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result);
      onLoaded(data);
    } catch (error) {
      onError(error);
    }
  };
  reader.onerror = () => onError(reader.error);
  reader.readAsText(file);
}
function downloadProjectFile(data, fileName) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.ajp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// src/interaction/layoutResize.ts
function setupLayoutResize(options) {
  let resizingHorizontal = false;
  let resizingVertical = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;
  const onHorizontalResize = (event) => {
    if (!resizingHorizontal)
      return;
    const delta = event.clientX - resizeStartX;
    const newWidth = resizeStartWidth + delta;
    const parentWidth = options.canvasWrapper.parentElement.getBoundingClientRect().width - 6;
    const maxWidth = parentWidth - options.minPanelWidth;
    if (newWidth >= options.minPanelWidth && newWidth <= maxWidth) {
      options.canvasWrapper.style.flex = "none";
      options.canvasWrapper.style.width = `${newWidth}px`;
    }
  };
  const onHorizontalResizeEnd = () => {
    resizingHorizontal = false;
    options.horizontalHandle.classList.remove("active");
    document.removeEventListener("mousemove", onHorizontalResize);
    document.removeEventListener("mouseup", onHorizontalResizeEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    options.onHorizontalResizeEnd();
  };
  const onVerticalResize = (event) => {
    if (!resizingVertical)
      return;
    const container = document.querySelector(".main-content");
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
  const onVerticalResizeEnd = () => {
    resizingVertical = false;
    options.verticalHandle.classList.remove("active");
    document.removeEventListener("mousemove", onVerticalResize);
    document.removeEventListener("mouseup", onVerticalResizeEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
  options.horizontalHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    resizingHorizontal = true;
    resizeStartX = event.clientX;
    resizeStartWidth = options.canvasWrapper.getBoundingClientRect().width;
    options.horizontalHandle.classList.add("active");
    document.addEventListener("mousemove", onHorizontalResize);
    document.addEventListener("mouseup", onHorizontalResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });
  options.verticalHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    resizingVertical = true;
    resizeStartY = event.clientY;
    resizeStartHeight = options.bottomSection.getBoundingClientRect().height;
    options.verticalHandle.classList.add("active");
    document.addEventListener("mousemove", onVerticalResize);
    document.addEventListener("mouseup", onVerticalResizeEnd);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  });
}

// src/ui/settingsPanel.ts
function setupSettingsPanel(elements, callbacks) {
  const tabs = elements.settingsTabs.querySelectorAll("button");
  const contents = {
    project: elements.tabProject,
    editor: elements.tabEditor
  };
  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      tabs.forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      const tabName = button.dataset.tab;
      Object.entries(contents).forEach(([key, content]) => {
        content.classList.toggle("active", key === tabName);
      });
    });
  });
  elements.themeSelect.addEventListener("change", () => {
    callbacks.applyTheme(elements.themeSelect.value);
  });
  elements.overlapToggle.addEventListener("change", () => {
    callbacks.setOverlapPrevention(elements.overlapToggle.checked);
  });
  elements.applyLayerCountBtn.addEventListener("click", () => {
    const count = parseInt(elements.layerCountInput.value, 10);
    if (!isNaN(count))
      callbacks.setLayerCount(count);
  });
  elements.layerCountInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter")
      return;
    event.preventDefault();
    const count = parseInt(elements.layerCountInput.value, 10);
    if (!isNaN(count))
      callbacks.setLayerCount(count);
  });
  elements.bgColorPicker.addEventListener("input", () => {
    callbacks.setBackgroundColor(elements.bgColorPicker.value);
  });
  elements.resolutionSelect.addEventListener("change", () => {
    const [width, height] = elements.resolutionSelect.value.split("x").map(Number);
    callbacks.setResolution(width, height);
  });
  elements.fpsSelect.addEventListener("change", () => {
    callbacks.setFps(Number(elements.fpsSelect.value));
  });
}

// src/ui/projectPanel.ts
function getDefaultProjectName() {
  return `project-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
}
function setupProjectPanel(elements, callbacks) {
  const close = () => {
    elements.modal.classList.remove("active");
  };
  const open = () => {
    const currentName = callbacks.getProjectName();
    elements.nameInput.value = currentName !== "\u7121\u984C" ? currentName : getDefaultProjectName();
    elements.nameInput.select();
    elements.modal.classList.add("active");
  };
  const confirmSave = () => {
    let name = elements.nameInput.value.trim() || getDefaultProjectName();
    name = name.replace(/[\\/:*?"<>|]/g, "");
    if (!name)
      name = getDefaultProjectName();
    callbacks.setProjectName(name);
    close();
    callbacks.saveProject(name);
  };
  elements.saveButton.addEventListener("click", open);
  elements.confirmButton.addEventListener("click", confirmSave);
  elements.cancelButton.addEventListener("click", close);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal)
      close();
  });
  elements.nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmSave();
    } else if (event.key === "Escape") {
      close();
    }
  });
  elements.loadButton.addEventListener("click", () => elements.loadInput.click());
  elements.loadInput.addEventListener("change", () => {
    const file = elements.loadInput.files?.[0];
    if (file)
      callbacks.loadProject(file);
    elements.loadInput.value = "";
  });
}

// src/interaction/canvasResize.ts
function setupCanvasResize(canvas2, onWindowResize) {
  const resizeCanvas = () => {
    const container = canvas2.parentElement;
    const containerWidth = container.clientWidth - 32;
    const aspectRatio = 16 / 9;
    let width = Math.min(containerWidth, 960);
    let height = width / aspectRatio;
    if (height > window.innerHeight * 0.6) {
      height = window.innerHeight * 0.6;
      width = height * aspectRatio;
    }
    canvas2.style.width = `${Math.floor(width)}px`;
    canvas2.style.height = `${Math.floor(height)}px`;
  };
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("resize", onWindowResize);
  window.setTimeout(resizeCanvas, 100);
}

// src/interaction/keyboardShortcuts.ts
function setupKeyboardShortcuts(options) {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      return;
    if (event.key === " ") {
      event.preventDefault();
      options.togglePlay();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      options.deleteSelected();
      return;
    }
    if (event.key === "Escape" && options.isSettingsOpen()) {
      options.closeSettings();
    }
  });
}

// src/debug/debugApi.ts
function exposeDebugApi(options) {
  window.__editor = {
    currentFrame: options.currentFrame,
    clips: options.clips,
    drawPreview: options.drawPreview,
    drawTimeline: options.drawTimeline,
    setFrame: (frame) => {
      const boundedFrame = Math.max(0, Math.min(options.getTimelineDuration(), frame));
      options.setCurrentFrame(boundedFrame);
      options.drawPreview();
      options.drawTimeline();
      console.log(`Frame set to ${boundedFrame} (${(boundedFrame / options.getFps()).toFixed(2)}s)`);
    },
    getFrame: options.getCurrentFrame,
    getClips: () => options.clips,
    togglePlay: options.togglePlay,
    play: options.play,
    stop: options.stop,
    reset: () => {
      options.stop();
      options.setCurrentFrame(0);
      options.drawTimeline();
      options.drawPreview();
    },
    setOverlapPrevention: options.setOverlapPrevention,
    setBackgroundColor: options.setBackgroundColor,
    setLayerCount: options.setLayerCount,
    config: options.config,
    applyTheme: options.applyTheme,
    themes: options.themes
  };
}

// src/interaction/timelineEvents.ts
function setupTimelineEvents(timelineContainer2, zoomTimeline2) {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.id === "zoomOutBtn") {
      zoomTimeline2(0.8);
    } else if (target.id === "zoomInBtn") {
      zoomTimeline2(1.25);
    }
  });
  timelineContainer2.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      zoomTimeline2(event.deltaY > 0 ? 0.9 : 1.1);
    } else if (event.altKey) {
      event.preventDefault();
      timelineContainer2.scrollTop += event.deltaY * 0.3;
    } else {
      event.preventDefault();
      timelineContainer2.scrollLeft += event.deltaY;
    }
  }, { passive: false });
}

// src/interaction/editorInitialization.ts
function initializeEditor(options) {
  const savedSettings = options.loadSettings();
  if (savedSettings) {
    if (savedSettings.theme)
      options.config.theme = savedSettings.theme;
    if (savedSettings.preventOverlap !== void 0) {
      options.config.preventOverlap = savedSettings.preventOverlap;
    }
  }
  options.setSelectedNone();
  options.totalTimeDisplay.textContent = options.formatTime(options.timelineDuration);
  options.setCurrentLayerCount(options.config.layerCount);
  options.layerCountInput.value = String(options.config.layerCount);
  options.applyTheme(options.config.theme);
  options.overlapToggle.checked = options.config.preventOverlap;
  options.bgColorPicker.value = options.config.bgColor;
  options.resolutionSelect.value = `${options.config.resolution.width}x${options.config.resolution.height}`;
  options.fpsSelect.value = String(options.config.fps);
  options.setTimelineZoom(options.defaultZoom);
  options.updateZoomDisplay();
  options.syncUI();
  options.bottomSection.style.height = "270px";
  options.bottomSection.style.minHeight = `${options.minTimelineHeight}px`;
}

// src/interaction/timelineZoom.ts
function createTimelineZoom(options) {
  const updateDisplay = () => {
    const percent = Math.round(options.getZoom() * 100);
    options.onDisplayUpdate(percent);
  };
  const zoom = (factor) => {
    const oldZoom = options.getZoom();
    const newZoom = Math.max(
      options.minZoom,
      Math.min(options.maxZoom, oldZoom * factor)
    );
    if (newZoom === oldZoom)
      return;
    const oldPixelsPerSecond = options.basePixelsPerSecond * oldZoom;
    const headPixel = options.getCurrentFrame() / options.fps() * oldPixelsPerSecond + options.paddingLeft;
    options.setZoom(newZoom);
    const newPixelsPerSecond = options.basePixelsPerSecond * newZoom;
    const newHeadPixel = options.getCurrentFrame() / options.fps() * newPixelsPerSecond + options.paddingLeft;
    options.container.scrollLeft += newHeadPixel - headPixel;
    updateDisplay();
    options.onRender();
  };
  return { zoom, updateDisplay };
}

// src/utils/timelineMetrics.ts
function formatTime(frame, fps) {
  const seconds = frame / fps;
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const tenths = Math.floor(seconds % 1 * 10);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${tenths}`;
}
function getVisibleDuration(durationSeconds, zoom) {
  return durationSeconds / zoom;
}
function getPixelsPerSecond(zoom, basePixelsPerSecond) {
  return basePixelsPerSecond * zoom;
}
function getTotalTimelineWidth(durationSeconds, zoom, containerWidth, basePixelsPerSecond, paddingLeft, paddingRight) {
  const usableWidth = containerWidth - paddingLeft - paddingRight;
  const visibleDuration = getVisibleDuration(durationSeconds, zoom);
  return durationSeconds / visibleDuration * usableWidth + paddingLeft + paddingRight;
}

// src/config/editorConfig.ts
var DEFAULT_FONT = '"Hiragino Sans", "Microsoft YaHei", sans-serif';
var TIMELINE_HEIGHT = 32;
var TIMELINE_PADDING_LEFT = 80;
var TIMELINE_PADDING_RIGHT = 20;
var TIMELINE_HEADER_HEIGHT = 28;
var MAX_LAYERS = 99;
var DEFAULT_LAYER_COUNT = 10;
var BASE_PIXELS_PERSEC = 40;
var STORAGE_KEY = "aj-videditor-settings";
var CONFIG = {
  preventOverlap: true,
  theme: "white",
  bgColor: "#000000",
  layerCount: DEFAULT_LAYER_COUNT,
  resolution: { width: 1920, height: 1080 },
  fps: 60,
  text_wheel_step: 3
};
var CLIP_COLORS = {
  text: "#0065d8",
  shape: "#ff0055",
  camera: "#29f078"
};
function getClipColor(type) {
  return CLIP_COLORS[type] || "#888888";
}
var SLIDER_STAGES = {
  coord: [500, 1e3, 2e3, 4e3, 8e3],
  rotation: [180, 360, 720, 1440],
  size: [100, 200, 400, 800, 1600, 3200],
  stroke: [100, 200, 400, 800, 1600, 3200],
  fontSize: [100, 200, 400, 800, 1600, 3200]
};
var DEFAULT_CLIP_DURATION = 3 * CONFIG.fps;
var MAX_TIMELINE_FRAMES = 60 * 60 * CONFIG.fps;

// src/ui/propertyPanel.ts
function setPropertyInputsEnabled(enabled, inputs, startInput2, durationInput2) {
  const inputElements = [
    inputs.textInput,
    inputs.fontSelect,
    inputs.fontSizeSlider,
    inputs.colorPicker,
    inputs.shapeTypeSelect,
    inputs.fillColorPicker,
    inputs.strokeColorPicker,
    inputs.strokeWidthSlider,
    inputs.shapeWidthSlider,
    inputs.shapeHeightSlider,
    inputs.xSlider,
    inputs.xNumber,
    inputs.ySlider,
    inputs.yNumber,
    inputs.zSlider,
    inputs.zNumber,
    inputs.rotationSlider,
    inputs.rotationNumber,
    startInput2,
    durationInput2,
    inputs.cameraRangeInput
  ];
  for (const input of inputElements)
    input.disabled = !enabled;
  for (const label of document.querySelectorAll(".control-group label")) {
    label.classList.toggle("disabled", !enabled);
  }
  for (const value of document.querySelectorAll(".value")) {
    value.classList.toggle("disabled", !enabled);
  }
  for (const input of document.querySelectorAll(".coord-input")) {
    input.classList.toggle("disabled", !enabled);
  }
}
function syncPropertyPanel(options) {
  const { selected, inputs } = options;
  if (selected && options.hasClips) {
    options.typeDisplay.textContent = selected.type === "text" ? "\u30C6\u30AD\u30B9\u30C8" : selected.type === "shape" ? "\u56F3\u5F62" : selected.type === "camera" ? "\u30AB\u30E1\u30E9" : "-";
    if (selected.type === "text") {
      options.textProperties.style.display = "";
      options.shapeProperties.style.display = "none";
      inputs.textInput.value = selected.text || "";
      inputs.fontSelect.value = selected.fontFamily || options.defaultFont;
      inputs.fontSizeSlider.value = String(selected.fontSize || 50);
      inputs.fontSizeNumber.value = String(selected.fontSize || 50);
      inputs.colorPicker.value = selected.color || "#ffffff";
    } else if (selected.type === "shape") {
      options.textProperties.style.display = "none";
      options.shapeProperties.style.display = "";
      inputs.shapeTypeSelect.value = selected.shapeType || "rectangle";
      inputs.fillColorPicker.value = selected.fillColor || "#ffffff";
      inputs.strokeColorPicker.value = selected.strokeColor || "#ffffff";
      inputs.strokeWidthSlider.value = String(selected.strokeWidth || 0);
      inputs.strokeWidthNumber.value = String(selected.strokeWidth || 0);
      inputs.shapeWidthSlider.value = String(selected.width || 100);
      inputs.shapeWidthNumber.value = String(selected.width || 100);
      inputs.shapeHeightSlider.value = String(selected.height || 100);
      inputs.shapeHeightNumber.value = String(selected.height || 100);
    } else if (selected.type === "camera") {
      options.textProperties.style.display = "none";
      options.shapeProperties.style.display = "none";
      options.cameraProperties.style.display = "";
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
    inputs.textInput.style.height = "auto";
    inputs.textInput.style.height = `${Math.min(inputs.textInput.scrollHeight, 120)}px`;
  } else {
    options.typeDisplay.textContent = "-";
    options.textProperties.style.display = "none";
    options.shapeProperties.style.display = "none";
    inputs.textInput.value = "";
    inputs.fontSelect.value = options.defaultFont;
    inputs.xNumber.value = "";
    inputs.yNumber.value = "";
    inputs.rotationNumber.value = "";
    options.startInput.value = "";
    options.durationInput.value = "";
    options.setEnabled(false);
  }
}
function updateSelectedClip(selected, inputs, onRender) {
  if (!selected)
    return;
  if (selected.type === "text") {
    selected.text = inputs.textInput.value || " ";
    selected.fontFamily = inputs.fontSelect.value;
    selected.fontSize = parseFloat(inputs.fontSizeSlider.value) || 50;
    selected.color = inputs.colorPicker.value;
    inputs.fontSizeNumber.value = String(selected.fontSize);
  } else if (selected.type === "shape") {
    selected.shapeType = inputs.shapeTypeSelect.value;
    selected.fillColor = inputs.fillColorPicker.value;
    selected.strokeColor = inputs.strokeColorPicker.value;
    selected.strokeWidth = parseFloat(inputs.strokeWidthSlider.value) || 0;
    selected.width = parseFloat(inputs.shapeWidthSlider.value) || 100;
    selected.height = parseFloat(inputs.shapeHeightSlider.value) || 100;
    inputs.strokeWidthNumber.value = String(selected.strokeWidth);
    inputs.shapeWidthNumber.value = String(selected.width);
    inputs.shapeHeightNumber.value = String(selected.height);
  } else if (selected.type === "camera") {
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
  inputs.textInput.style.height = "auto";
  inputs.textInput.style.height = `${Math.min(inputs.textInput.scrollHeight, 120)}px`;
  onRender();
}
function setupPropertySliderDrags(options) {
  setupSliderDrag(options.xSlider, () => options.setDragging("x", true), () => {
    options.setDragging("x", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRange(options.xSlider, selected.x, options.coordStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.ySlider, () => options.setDragging("y", true), () => {
    options.setDragging("y", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRange(options.ySlider, selected.y, options.coordStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.zSlider, () => options.setDragging("z", true), () => {
    options.setDragging("z", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRange(options.zSlider, selected.z, options.coordStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.rotationSlider, () => options.setDragging("rotation", true), () => {
    options.setDragging("rotation", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRange(options.rotationSlider, selected.rotation, options.rotationStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.strokeWidthSlider, () => options.setDragging("stroke", true), () => {
    options.setDragging("stroke", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRangePositive(options.strokeWidthSlider, selected.strokeWidth || 0, options.strokeStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.shapeWidthSlider, () => options.setDragging("width", true), () => {
    options.setDragging("width", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRangePositive(options.shapeWidthSlider, selected.width || 100, options.sizeStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.shapeHeightSlider, () => options.setDragging("height", true), () => {
    options.setDragging("height", false);
    const selected = options.getSelected();
    if (selected) {
      updateSliderRangePositive(options.shapeHeightSlider, selected.height || 100, options.sizeStages, false);
      options.onRender();
    }
  });
  setupSliderDrag(options.fontSizeSlider, () => options.setDragging("fontSize", true), () => {
    options.setDragging("fontSize", false);
    const selected = options.getSelected();
    if (selected) {
      options.fontSizeNumber.value = String(selected.fontSize || 50);
      updateSliderRangePositive(options.fontSizeSlider, selected.fontSize || 50, options.fontSizeStages, false);
      options.onRender();
    }
  });
}
function setupPropertyNumberInputs(options) {
  const { inputs } = options;
  const numberConfigs = [
    {
      input: inputs.xNumber,
      slider: inputs.xSlider,
      min: -8e3,
      max: 8e3,
      defaultValue: 0,
      stages: options.coordStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRange(inputs.xSlider, value, options.coordStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        selected.x = value;
        inputs.xSlider.value = String(value);
        inputs.xNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.yNumber,
      slider: inputs.ySlider,
      min: -8e3,
      max: 8e3,
      defaultValue: 0,
      stages: options.coordStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRange(inputs.ySlider, value, options.coordStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        selected.y = value;
        inputs.ySlider.value = String(value);
        inputs.yNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.zNumber,
      slider: inputs.zSlider,
      min: -8e3,
      max: 8e3,
      defaultValue: 0,
      stages: options.coordStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRange(inputs.zSlider, value, options.coordStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        selected.z = value;
        inputs.zSlider.value = String(value);
        inputs.zNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.rotationNumber,
      slider: inputs.rotationSlider,
      min: -1440,
      max: 1440,
      defaultValue: 0,
      stages: options.rotationStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRange(inputs.rotationSlider, value, options.rotationStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        selected.rotation = value;
        inputs.rotationSlider.value = String(value);
        inputs.rotationNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: options.startInput,
      slider: options.startInput,
      min: 0,
      max: 600,
      defaultValue: 0,
      stages: null,
      getIsDragging: () => false,
      updateRange: () => void 0,
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        const oldStart = selected.startFrame;
        selected.startFrame = value;
        if (options.preventOverlap() && options.isOverlapping(selected, selected.id)) {
          selected.startFrame = oldStart;
          options.resolveOverlap(selected, selected.id);
        }
        options.startInput.value = String(selected.startFrame);
        options.onTimelineRender();
        options.onPreviewRender();
      }
    },
    {
      input: options.durationInput,
      slider: options.durationInput,
      min: 1,
      max: options.maxTimelineFrames,
      defaultValue: 90,
      stages: null,
      getIsDragging: () => false,
      updateRange: () => void 0,
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        const maxStart = options.getTimelineDuration() - value;
        if (selected.startFrame > maxStart)
          selected.startFrame = Math.max(0, maxStart);
        const oldDuration = selected.duration;
        selected.duration = value;
        if (options.preventOverlap() && options.isOverlapping(selected, selected.id)) {
          selected.duration = oldDuration;
          options.resolveOverlap(selected, selected.id);
        }
        options.durationInput.value = String(selected.duration);
        options.onTimelineRender();
        options.onPreviewRender();
      }
    },
    {
      input: inputs.fontSizeNumber,
      slider: inputs.fontSizeSlider,
      min: 0,
      max: 3200,
      defaultValue: 50,
      stages: options.fontSizeStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRangePositive(inputs.fontSizeSlider, value, options.fontSizeStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected)
          return;
        selected.fontSize = value;
        inputs.fontSizeSlider.value = String(value);
        inputs.fontSizeNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.strokeWidthNumber,
      slider: inputs.strokeWidthSlider,
      min: 0,
      max: 3200,
      defaultValue: 0,
      stages: options.strokeStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRangePositive(inputs.strokeWidthSlider, value, options.strokeStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected || selected.type !== "shape")
          return;
        selected.strokeWidth = value;
        inputs.strokeWidthSlider.value = String(value);
        inputs.strokeWidthNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.shapeWidthNumber,
      slider: inputs.shapeWidthSlider,
      min: 0,
      max: 3200,
      defaultValue: 100,
      stages: options.sizeStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRangePositive(inputs.shapeWidthSlider, value, options.sizeStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected || selected.type !== "shape")
          return;
        selected.width = value;
        inputs.shapeWidthSlider.value = String(value);
        inputs.shapeWidthNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.shapeHeightNumber,
      slider: inputs.shapeHeightSlider,
      min: 0,
      max: 3200,
      defaultValue: 100,
      stages: options.sizeStages,
      getIsDragging: () => false,
      updateRange: (value) => updateSliderRangePositive(inputs.shapeHeightSlider, value, options.sizeStages, false),
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected || selected.type !== "shape")
          return;
        selected.height = value;
        inputs.shapeHeightSlider.value = String(value);
        inputs.shapeHeightNumber.value = String(value);
        options.onPreviewRender();
      }
    },
    {
      input: inputs.cameraRangeInput,
      slider: inputs.cameraRangeInput,
      min: 1,
      max: 98,
      defaultValue: 10,
      stages: null,
      getIsDragging: () => false,
      updateRange: () => void 0,
      onCommit: (value) => {
        const selected = options.getSelected();
        if (!selected || selected.type !== "camera")
          return;
        selected.cameraRange = value;
        inputs.cameraRangeInput.value = String(value);
        options.onPreviewRender();
        options.onTimelineRender();
      }
    }
  ];
  for (const config of numberConfigs) {
    setupNumberInput(config.input, config.slider, {
      min: config.min,
      max: config.max,
      default: config.defaultValue,
      stages: config.stages,
      getIsDragging: config.getIsDragging,
      updateSliderRangeFn: config.updateRange,
      onCommit: config.onCommit
    });
  }
}

// src/interaction/previewInteraction.ts
function getCanvasCoords(canvas2, event) {
  const rect = canvas2.getBoundingClientRect();
  const canvasAspect = canvas2.width / canvas2.height;
  const rectAspect = rect.width / rect.height;
  let drawWidth;
  let drawHeight;
  let offsetX = 0;
  let offsetY = 0;
  if (canvasAspect > rectAspect) {
    drawWidth = rect.width;
    drawHeight = rect.width / canvasAspect;
    offsetY = (rect.height - drawHeight) / 2;
  } else {
    drawHeight = rect.height;
    drawWidth = rect.height * canvasAspect;
    offsetX = (rect.width - drawWidth) / 2;
  }
  const scale = canvas2.width / drawWidth;
  return {
    x: (event.clientX - rect.left - offsetX) * scale,
    y: (event.clientY - rect.top - offsetY) * scale
  };
}
function getClipAtPosition(ctx2, clips2, frame, x, y, width, height, defaultFont) {
  const visibleClips = getClipsAtFrame(clips2, frame);
  for (let index = visibleClips.length - 1; index >= 0; index--) {
    const clip = visibleClips[index];
    const drawX = width / 2 + clip.x;
    const drawY = height / 2 + clip.y;
    const bounds = getClipBounds(ctx2, clip, defaultFont);
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    if (x >= drawX - halfWidth && x <= drawX + halfWidth && y >= drawY - halfHeight && y <= drawY + halfHeight) {
      return clip;
    }
  }
  return null;
}
function getClipBounds(ctx2, clip, defaultFont) {
  if (clip.type === "shape") {
    return { width: clip.width || 100, height: clip.height || 100 };
  }
  if (clip.type !== "text") {
    return { width: 100, height: 60 };
  }
  const lines = clip.text?.split("\n") || [""];
  const fontSize = clip.fontSize || 48;
  const lineHeight = fontSize * 1.2;
  ctx2.font = `${fontSize}px ${clip.fontFamily || defaultFont}`;
  const textWidth = lines.reduce((max, line) => Math.max(max, ctx2.measureText(line).width), 0);
  return {
    width: (textWidth || 100) + 20,
    height: lines.length * lineHeight + 20
  };
}
function setupPreviewDrag(options) {
  let isPointerDown = false;
  let pointerDownClip = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let clipStartX = 0;
  let clipStartY = 0;
  const onPointerDown = (event) => {
    const position = getCanvasCoords(options.canvas, event);
    const clip = getClipAtPosition(
      options.ctx,
      options.clips,
      options.getCurrentFrame(),
      position.x,
      position.y,
      options.width,
      options.height,
      options.defaultFont
    );
    if (!clip)
      return;
    options.onSelect(clip);
    isPointerDown = true;
    pointerDownClip = clip;
    pointerStartX = position.x;
    pointerStartY = position.y;
    clipStartX = clip.x;
    clipStartY = clip.y;
    options.canvas.style.cursor = "grabbing";
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
  };
  const onPointerMove = (event) => {
    if (!isPointerDown || !pointerDownClip)
      return;
    const position = getCanvasCoords(options.canvas, event);
    if (Math.abs(position.x - pointerStartX) < 3 && Math.abs(position.y - pointerStartY) < 3)
      return;
    const newX = Math.round(clipStartX + position.x - pointerStartX);
    const newY = Math.round(clipStartY + position.y - pointerStartY);
    pointerDownClip.x = newX;
    pointerDownClip.y = newY;
    options.onMove(pointerDownClip, newX, newY);
    options.onRender();
  };
  const onPointerUp = () => {
    options.onDragEnd(pointerDownClip);
    isPointerDown = false;
    pointerDownClip = null;
    options.canvas.style.cursor = "default";
    document.removeEventListener("mousemove", onPointerMove);
    document.removeEventListener("mouseup", onPointerUp);
  };
  options.canvas.addEventListener("mousedown", onPointerDown);
}

// src/persistence/settingsStorage.ts
function saveSettings(key, settings) {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.warn("Settings save failed:", error);
  }
}
function loadSettings(key) {
  try {
    const data = localStorage.getItem(key);
    if (!data)
      return null;
    return JSON.parse(data);
  } catch (error) {
    console.warn("Settings load failed:", error);
    return null;
  }
}

// src/main.ts
var TIMELINE_DURATION = 1;
var TIMELINE_DURATION_SEC = TIMELINE_DURATION / CONFIG.fps;
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var xSlider = document.getElementById("xPos");
var ySlider = document.getElementById("yPos");
var zSlider = document.getElementById("zPos");
var rotationSlider = document.getElementById("rotationSlider");
var startInput = document.getElementById("startInput");
var durationInput = document.getElementById("durationInput");
var xNumber = document.getElementById("xNumber");
var yNumber = document.getElementById("yNumber");
var zNumber = document.getElementById("zNumber");
var rotationNumber = document.getElementById("rotationNumber");
var typeDisplay = document.getElementById("typeDisplay");
var textProperties = document.getElementById("textProperties");
var textInput = document.getElementById("textInput");
var fontSelect = document.getElementById("fontSelect");
var fontSizeSlider = document.getElementById("fontSize");
var colorPicker = document.getElementById("colorPicker");
var fontSizeNumber = document.getElementById("fontSizeNumber");
var shapeProperties = document.getElementById("shapeProperties");
var shapeTypeSelect = document.getElementById("shapeTypeSelect");
var fillColorPicker = document.getElementById("fillColorPicker");
var strokeColorPicker = document.getElementById("strokeColorPicker");
var strokeWidthSlider = document.getElementById("strokeWidthSlider");
var shapeWidthSlider = document.getElementById("shapeWidthSlider");
var shapeHeightSlider = document.getElementById("shapeHeightSlider");
var strokeWidthNumber = document.getElementById("strokeWidthNumber");
var shapeWidthNumber = document.getElementById("shapeWidthNumber");
var shapeHeightNumber = document.getElementById("shapeHeightNumber");
var cameraProperties = document.getElementById("cameraProperties");
var cameraRangeInput = document.getElementById("cameraRangeInput");
var playBtn = document.getElementById("playBtn");
var currentTimeDisplay = document.getElementById("currentTime");
var totalTimeDisplay = document.getElementById("totalTime");
var deleteBtn = document.getElementById("deleteBtn");
var timelineContainer = document.getElementById("timelineContainer");
var settingsToggle = document.getElementById("settingsToggle");
var settingsOverlay = document.getElementById("settingsOverlay");
var settingsClose = document.getElementById("settingsClose");
var settingsCloseBtn = document.getElementById("settingsCloseBtn");
var themeSelect = document.getElementById("themeSelect");
var overlapToggle = document.getElementById("overlapToggle");
var layerCountInput = document.getElementById("layerCountInput");
var applyLayerCountBtn = document.getElementById("applyLayerCountBtn");
var bgColorPicker = document.getElementById("bgColorPicker");
var resolutionSelect = document.getElementById("resolutionSelect");
var fpsSelect = document.getElementById("fpsSelect");
var settingsTabs = document.getElementById("settingsTabs");
var tabProject = document.getElementById("tabProject");
var tabEditor = document.getElementById("tabEditor");
var zoomInBtn;
var zoomOutBtn;
var zoomLevelDisplay;
var resizeHandleHorizontal = document.getElementById("resizeHandleHorizontal");
var resizeHandleVertical = document.getElementById("resizeHandleVertical");
var canvasWrapper = document.getElementById("canvasWrapper");
var propertiesPanel = document.getElementById("propertiesPanel");
var bottomSection = document.getElementById("bottomSection");
var clips = [];
var selectedId = null;
var idCounter = 0;
var currentFrame = 0;
var currentLayerCount = CONFIG.layerCount;
var currentProjectName = "\u7121\u984C";
var timelineZoom = 1;
var MIN_ZOOM = 0.0625;
var MAX_ZOOM = 16;
var isDraggingX = false;
var isDraggingY = false;
var isDraggingZ = false;
var isDraggingRotation = false;
var isDraggingStroke = false;
var isDraggingWidth = false;
var isDraggingHeight = false;
var isDraggingFontSize = false;
var MIN_PANEL_WIDTH = 200;
var MIN_TIMELINE_HEIGHT = 80;
var playbackController = createPlaybackController({
  getCurrentFrame: () => currentFrame,
  setCurrentFrame: (frame) => {
    currentFrame = frame;
  },
  getTimelineDuration: () => TIMELINE_DURATION,
  getFps: () => CONFIG.fps,
  onPlayingStateChange: (playing) => {
    playBtn.textContent = playing ? "\u2161" : "\u25B6";
    playBtn.classList.toggle("playing", playing);
  },
  onFrameChange: () => {
    drawTimeline();
    drawPreview();
  }
});
var timelineSeek = createTimelineSeek({
  container: timelineContainer,
  paddingLeft: TIMELINE_PADDING_LEFT,
  fps: () => CONFIG.fps,
  timelineDurationSeconds: () => TIMELINE_DURATION_SEC,
  pixelsPerSecond: (containerWidth) => getPixelsPerSecond2(containerWidth),
  getCurrentFrame: () => currentFrame,
  setCurrentFrame: (frame) => {
    currentFrame = frame;
  },
  stopPlayback,
  onRender: () => {
    drawTimeline();
    drawPreview();
  }
});
var timelineDrag;
var timelineResize = createTimelineResize({
  container: timelineContainer,
  paddingLeft: TIMELINE_PADDING_LEFT,
  fps: () => CONFIG.fps,
  maxTimelineFrames: MAX_TIMELINE_FRAMES,
  getPixelsPerSecond: getPixelsPerSecond2,
  getClip: (id) => clips.find((clip) => clip.id === id),
  isDraggingClip: () => timelineDrag?.isDragging() ?? false,
  preventOverlap: () => CONFIG.preventOverlap,
  isOverlapping: isOverlapping2,
  resolveOverlap: resolveOverlap2,
  setSelected: (id) => {
    selectedId = id;
  },
  setPropertyValues: (clip) => updatePropertyUI(clip),
  onRender: () => {
    drawTimeline();
    drawPreview();
  },
  onResizeEnd: () => {
    updateTimelineDuration2();
    syncUI();
  },
  stopPlayback
});
timelineDrag = createTimelineDrag({
  container: timelineContainer,
  timelineHeight: TIMELINE_HEIGHT,
  timelineHeaderHeight: TIMELINE_HEADER_HEIGHT,
  fps: () => CONFIG.fps,
  timelineDuration: () => TIMELINE_DURATION,
  layerCount: () => currentLayerCount,
  getPixelsPerSecond: getPixelsPerSecond2,
  getClip: (id) => clips.find((clip) => clip.id === id),
  isResizing: () => timelineResize.isResizing(),
  preventOverlap: () => CONFIG.preventOverlap,
  isOverlapping: isOverlapping2,
  findAvailableLayer: findAvailableLayer2,
  setSelected: (id) => {
    selectedId = id;
  },
  setPropertyValues: updatePropertyUI,
  onRender: () => {
    drawTimeline();
    drawPreview();
  },
  onDragEnd: () => {
    updateTimelineDuration2();
    syncUI();
  },
  stopPlayback
});
var timelineZoomController = createTimelineZoom({
  container: timelineContainer,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  basePixelsPerSecond: BASE_PIXELS_PERSEC,
  paddingLeft: TIMELINE_PADDING_LEFT,
  fps: () => CONFIG.fps,
  getCurrentFrame: () => currentFrame,
  getZoom: () => timelineZoom,
  setZoom: (zoom) => {
    timelineZoom = zoom;
  },
  onDisplayUpdate: (percent) => {
    if (zoomLevelDisplay)
      zoomLevelDisplay.textContent = `${percent}%`;
  },
  onRender: drawTimeline
});
function generateId() {
  return `clip-${++idCounter}`;
}
function getSelected() {
  return clips.find((c) => c.id === selectedId) || null;
}
function getClipsAtFrame2(frame) {
  return getClipsAtFrame(clips, frame);
}
function updateTimelineDuration2() {
  TIMELINE_DURATION = updateTimelineDuration(clips, MAX_TIMELINE_FRAMES);
  TIMELINE_DURATION_SEC = TIMELINE_DURATION / CONFIG.fps;
}
function setLayerCount(newCount) {
  newCount = Math.max(1, Math.min(MAX_LAYERS, newCount));
  if (newCount === currentLayerCount)
    return;
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
function saveSettings2() {
  saveSettings(STORAGE_KEY, {
    theme: CONFIG.theme,
    preventOverlap: CONFIG.preventOverlap
  });
}
function loadSettings2() {
  return loadSettings(STORAGE_KEY);
}
function applyTheme(themeName) {
  const theme = THEMES[themeName];
  if (!theme)
    return;
  const root = document.documentElement;
  root.style.setProperty("--bg-primary", theme.bg);
  root.style.setProperty("--bg-secondary", theme.secondary);
  root.style.setProperty("--bg-card", theme.card);
  root.style.setProperty("--text-primary", theme.text);
  root.style.setProperty("--text-secondary", theme.textSecondary);
  root.style.setProperty("--border-color", theme.border);
  root.style.setProperty("--accent", theme.accent);
  CONFIG.theme = themeName;
  themeSelect.value = themeName;
  saveSettings2();
}
function drawPreview() {
  renderPreview({
    ctx,
    clips,
    currentFrame,
    selectedId,
    width: CONFIG.resolution.width,
    height: CONFIG.resolution.height,
    backgroundColor: CONFIG.bgColor,
    defaultFont: DEFAULT_FONT
  });
}
function getCanvasCoords2(e) {
  return getCanvasCoords(canvas, e);
}
function getClipAtPosition2(cx, cy) {
  return getClipAtPosition(
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
function setupPreviewDrag2() {
  setupPreviewDrag({
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
      if (selectedId !== clip.id)
        return;
      xNumber.value = String(newX);
      xSlider.value = String(newX);
      yNumber.value = String(newY);
      ySlider.value = String(newY);
      updateSliderRange(xSlider, newX, SLIDER_STAGES.coord, false);
      updateSliderRange(ySlider, newY, SLIDER_STAGES.coord, false);
    },
    onDragEnd: (clip) => {
      if (clip && selectedId === clip.id)
        syncUI();
    },
    onRender: drawPreview
  });
}
canvas.addEventListener("wheel", (e) => {
  const pos = getCanvasCoords2(e);
  const clip = getClipAtPosition2(pos.x, pos.y);
  if (!clip || clip.type !== "text")
    return;
  const visibleClips = getClipsAtFrame2(currentFrame);
  const textClipsAtPos = visibleClips.filter((c) => {
    if (c.type !== "text")
      return false;
    const drawX = CONFIG.resolution.width / 2 + c.x;
    const drawY = CONFIG.resolution.height / 2 + c.y;
    const lines = c.text?.split("\n") || [""];
    const fontSize = c.fontSize || 48;
    const lineHeight = fontSize * 1.2;
    const height = lines.length * lineHeight;
    let maxWidth = 0;
    ctx.font = `${fontSize}px ${c.fontFamily || DEFAULT_FONT}`;
    for (const line of lines) {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth)
        maxWidth = metrics.width;
    }
    const width = (maxWidth || 100) + 20;
    const halfW = width / 2;
    const halfH = (height + 20) / 2;
    return pos.x >= drawX - halfW && pos.x <= drawX + halfW && pos.y >= drawY - halfH && pos.y <= drawY + halfH;
  });
  const targetClip = textClipsAtPos.sort((a, b) => b.layerId - a.layerId)[0];
  if (!targetClip)
    return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -CONFIG.text_wheel_step : CONFIG.text_wheel_step;
  const currentSize = targetClip.fontSize || 50;
  const newSize = Math.max(0, Math.min(3200, currentSize + delta));
  targetClip.fontSize = newSize;
  if (selectedId === targetClip.id) {
    fontSizeSlider.value = String(newSize);
    fontSizeNumber.value = String(newSize);
    updateSliderRangePositive(fontSizeSlider, newSize, SLIDER_STAGES.fontSize, false);
  }
  drawPreview();
  drawTimeline();
}, { passive: false });
function drawTimeline() {
  const containerWidth = timelineContainer.clientWidth - 4;
  const visibleDuration = getVisibleDuration2();
  const pixelsPerSecond = getPixelsPerSecond2(containerWidth);
  const totalWidth = getTotalTimelineWidth2(containerWidth);
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
    getClipColor
  });
  const containerHeight = timelineContainer.clientHeight || Math.min(totalHeight + 8 + 32, 500);
  timelineContainer.style.height = `${Math.max(80, containerHeight)}px`;
  timelineContainer.innerHTML = html;
  document.querySelectorAll(".timeline-clip").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (timelineDrag.isDragging())
        return;
      const id = el.getAttribute("data-clip-id");
      if (id) {
        selectedId = id;
        syncUI();
      }
    });
  });
  document.querySelectorAll(".timeline-clip").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      const id = el.getAttribute("data-clip-id");
      if (!id)
        return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const elWidth = rect.width;
      const edgeThreshold = 8;
      if (mouseX < edgeThreshold) {
        startResizeClip(e, id, "left");
      } else if (mouseX > elWidth - edgeThreshold) {
        startResizeClip(e, id, "right");
      } else {
        startClipDrag(e, id);
      }
    });
  });
  document.querySelectorAll(".timeline-clip").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      if (timelineResize.isResizing() || timelineDrag.isDragging())
        return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const elWidth = rect.width;
      const edgeThreshold = 8;
      if (mouseX < edgeThreshold || mouseX > elWidth - edgeThreshold) {
        el.style.cursor = "ew-resize";
      } else {
        el.style.cursor = "grab";
      }
    });
    el.addEventListener("mouseleave", () => {
      if (!timelineResize.isResizing() && !timelineDrag.isDragging()) {
        el.style.cursor = "grab";
      }
    });
  });
  const trackAreas = timelineContainer.querySelectorAll(".timeline-track-area");
  for (const area of trackAreas) {
    area.addEventListener("mousedown", (e) => {
      const target = e.target;
      if (target.closest(".timeline-clip"))
        return;
      startSeek(e);
    });
  }
  const ruler = timelineContainer.querySelector(".timeline-ruler-inner");
  if (ruler) {
    ruler.addEventListener("mousedown", (e) => {
      startSeek(e);
    });
  }
  const addLayerBtn = document.getElementById("addLayerBtn");
  const addLayerInputContainer = document.getElementById("addLayerInputContainer");
  const addLayerCountInput = document.getElementById("addLayerCountInput");
  const confirmAddLayerBtn = document.getElementById("confirmAddLayerBtn");
  const cancelAddLayerBtn = document.getElementById("cancelAddLayerBtn");
  if (addLayerBtn) {
    addLayerBtn.addEventListener("click", () => {
      addLayerBtn.style.display = "none";
      if (addLayerInputContainer) {
        addLayerInputContainer.style.display = "flex";
        addLayerCountInput?.focus();
        addLayerCountInput?.select();
      }
    });
  }
  if (confirmAddLayerBtn) {
    confirmAddLayerBtn.addEventListener("click", () => {
      const val = parseInt(addLayerCountInput?.value || "1", 10);
      if (!isNaN(val) && val > 0) {
        const newCount = Math.min(currentLayerCount + val, MAX_LAYERS);
        setLayerCount(newCount);
      }
      if (addLayerInputContainer) {
        addLayerInputContainer.style.display = "none";
      }
      if (addLayerBtn) {
        addLayerBtn.style.display = "";
      }
    });
  }
  if (cancelAddLayerBtn) {
    cancelAddLayerBtn.addEventListener("click", () => {
      if (addLayerInputContainer) {
        addLayerInputContainer.style.display = "none";
      }
      if (addLayerBtn) {
        addLayerBtn.style.display = "";
      }
    });
  }
  if (addLayerCountInput) {
    addLayerCountInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmAddLayerBtn?.click();
      }
      if (e.key === "Escape") {
        cancelAddLayerBtn?.click();
      }
    });
  }
  currentTimeDisplay.textContent = formatTime2(currentFrame);
  totalTimeDisplay.textContent = formatTime2(TIMELINE_DURATION);
  const timelineControls = document.querySelector(".timeline-controls");
  if (timelineControls && !document.getElementById("zoomControls")) {
    const zoomControls = document.createElement("div");
    zoomControls.id = "zoomControls";
    zoomControls.style.cssText = "display:flex; align-items:center; gap:6px; margin-left:12px;";
    zoomOutBtn = document.createElement("button");
    zoomOutBtn.id = "zoomOutBtn";
    zoomOutBtn.className = "btn-primary btn-sm";
    zoomOutBtn.textContent = "\u2212";
    zoomOutBtn.style.cssText = "padding:2px 10px; font-size:16px;";
    zoomLevelDisplay = document.createElement("span");
    zoomLevelDisplay.id = "zoomLevel";
    zoomLevelDisplay.style.cssText = "font-size:12px; color:var(--text-secondary); min-width:44px; text-align:center;";
    updateZoomDisplay();
    zoomInBtn = document.createElement("button");
    zoomInBtn.id = "zoomInBtn";
    zoomInBtn.className = "btn-primary btn-sm";
    zoomInBtn.textContent = "\uFF0B";
    zoomInBtn.style.cssText = "padding:2px 10px; font-size:16px;";
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevelDisplay);
    zoomControls.appendChild(zoomInBtn);
    timelineControls.appendChild(zoomControls);
  }
}
function startResizeClip(e, clipId, edge) {
  timelineResize.start(e, clipId, edge);
}
function startClipDrag(e, clipId) {
  timelineDrag.start(e, clipId);
}
function updatePropertyUI(clip) {
  if (selectedId !== clip.id)
    return;
  startInput.value = String(clip.startFrame);
  durationInput.value = String(clip.duration);
}
function startSeek(e) {
  timelineSeek.start(e);
}
function togglePlay() {
  playbackController.toggle();
}
function startPlayback() {
  playbackController.start();
}
function stopPlayback() {
  playbackController.stop();
}
function isOverlapping2(clip, ignoreId) {
  return isOverlapping(clip, clips, ignoreId);
}
function resolveOverlap2(clip, ignoreId) {
  resolveOverlap(clip, clips, TIMELINE_DURATION, CONFIG.preventOverlap, ignoreId);
}
function applyOverlapPrevention2(clip, ignoreId) {
  applyOverlapPrevention(
    clip,
    clips,
    TIMELINE_DURATION,
    CONFIG.preventOverlap,
    ignoreId
  );
}
function findAvailableLayer2(startFrame, duration) {
  return findAvailableLayer(clips, startFrame, duration, currentLayerCount);
}
function formatTime2(frame) {
  return formatTime(frame, CONFIG.fps);
}
function getVisibleDuration2() {
  return getVisibleDuration(TIMELINE_DURATION_SEC, timelineZoom);
}
function getPixelsPerSecond2(containerWidth) {
  return getPixelsPerSecond(timelineZoom, BASE_PIXELS_PERSEC);
}
function getTotalTimelineWidth2(containerWidth) {
  return getTotalTimelineWidth(
    TIMELINE_DURATION_SEC,
    timelineZoom,
    containerWidth,
    BASE_PIXELS_PERSEC,
    TIMELINE_PADDING_LEFT,
    TIMELINE_PADDING_RIGHT
  );
}
function updateZoomDisplay() {
  timelineZoomController.updateDisplay();
}
function zoomTimeline(factor) {
  timelineZoomController.zoom(factor);
}
function syncUI() {
  const propertyInputs = {
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
    rotationNumber
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
    setEnabled: (enabled) => setPropertyInputsEnabled(enabled, propertyInputs, startInput, durationInput)
  });
  drawTimeline();
  drawPreview();
}
function addClip(type) {
  const startFrame = currentFrame;
  const duration = DEFAULT_CLIP_DURATION;
  const layerId = findAvailableLayer2(startFrame, duration);
  if (layerId === null) {
    alert("\u3053\u308C\u4EE5\u4E0A\u30AF\u30EA\u30C3\u30D7\u3092\u8FFD\u52A0\u3067\u304D\u307E\u305B\u3093\u3002\u30EC\u30A4\u30E4\u30FC\u6570\u3092\u5897\u3084\u3059\u304B\u3001\u65E2\u5B58\u306E\u30AF\u30EA\u30C3\u30D7\u3092\u79FB\u52D5\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
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
  applyOverlapPrevention2(newClip);
  clips.push(newClip);
  selectedId = newClip.id;
  updateTimelineDuration2();
  syncUI();
}
function deleteSelected() {
  if (!selectedId)
    return;
  clips = clips.filter((c) => c.id !== selectedId);
  selectedId = clips.length > 0 ? clips[0].id : null;
  updateTimelineDuration2();
  syncUI();
}
function updateSelected() {
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
    rotationNumber
  }, () => {
    drawPreview();
    drawTimeline();
  });
}
function setupAllNumberInputs() {
  setupPropertyNumberInputs({
    inputs: {
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
      rotationNumber
    },
    startInput,
    durationInput,
    getSelected,
    getTimelineDuration: () => TIMELINE_DURATION,
    maxTimelineFrames: MAX_TIMELINE_FRAMES,
    preventOverlap: () => CONFIG.preventOverlap,
    isOverlapping: isOverlapping2,
    resolveOverlap: resolveOverlap2,
    onPreviewRender: drawPreview,
    onTimelineRender: drawTimeline,
    coordStages: SLIDER_STAGES.coord,
    rotationStages: SLIDER_STAGES.rotation,
    sizeStages: SLIDER_STAGES.size,
    strokeStages: SLIDER_STAGES.stroke,
    fontSizeStages: SLIDER_STAGES.fontSize
  });
}
function openSettings() {
  settingsOverlay.classList.add("active");
}
function closeSettings() {
  settingsOverlay.classList.remove("active");
}
settingsToggle.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
settingsCloseBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay)
    closeSettings();
});
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
  canvas
}, {
  applyTheme,
  setOverlapPrevention: (enabled) => {
    CONFIG.preventOverlap = enabled;
    overlapToggle.checked = enabled;
    saveSettings2();
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
  }
});
var addTextBtn = document.getElementById("addTextBtn");
addTextBtn.addEventListener("click", () => {
  addClip("text");
});
var addShapeBtn = document.getElementById("addShapeBtn");
addShapeBtn.addEventListener("click", () => {
  addClip("shape");
});
var addCameraBtn = document.getElementById("addCameraBtn");
if (addCameraBtn) {
  addCameraBtn.addEventListener("click", () => {
    addClip("camera");
  });
}
textInput.addEventListener("input", updateSelected);
deleteBtn.addEventListener("click", deleteSelected);
playBtn.addEventListener("click", togglePlay);
fontSizeSlider.addEventListener("input", updateSelected);
colorPicker.addEventListener("input", updateSelected);
shapeTypeSelect.addEventListener("change", updateSelected);
fillColorPicker.addEventListener("input", updateSelected);
strokeColorPicker.addEventListener("input", updateSelected);
strokeWidthSlider.addEventListener("input", updateSelected);
shapeWidthSlider.addEventListener("input", updateSelected);
shapeHeightSlider.addEventListener("input", updateSelected);
xSlider.addEventListener("input", updateSelected);
ySlider.addEventListener("input", updateSelected);
zSlider.addEventListener("input", updateSelected);
rotationSlider.addEventListener("input", updateSelected);
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
    if (key === "x")
      isDraggingX = isDragging;
    if (key === "y")
      isDraggingY = isDragging;
    if (key === "z")
      isDraggingZ = isDragging;
    if (key === "rotation")
      isDraggingRotation = isDragging;
    if (key === "stroke")
      isDraggingStroke = isDragging;
    if (key === "width")
      isDraggingWidth = isDragging;
    if (key === "height")
      isDraggingHeight = isDragging;
    if (key === "fontSize")
      isDraggingFontSize = isDragging;
  },
  coordStages: SLIDER_STAGES.coord,
  rotationStages: SLIDER_STAGES.rotation,
  strokeStages: SLIDER_STAGES.stroke,
  sizeStages: SLIDER_STAGES.size,
  fontSizeStages: SLIDER_STAGES.fontSize,
  onRender: drawPreview
});
fontSelect.addEventListener("change", updateSelected);
setupAllNumberInputs();
setupKeyboardShortcuts({
  togglePlay,
  deleteSelected,
  isSettingsOpen: () => settingsOverlay.classList.contains("active"),
  closeSettings
});
setupLayoutResize({
  horizontalHandle: resizeHandleHorizontal,
  verticalHandle: resizeHandleVertical,
  canvasWrapper,
  bottomSection,
  minPanelWidth: MIN_PANEL_WIDTH,
  minTimelineHeight: MIN_TIMELINE_HEIGHT,
  onHorizontalResizeEnd: drawPreview,
  onVerticalResize: drawTimeline
});
setupPreviewDrag2();
function setOverlapPrevention(enabled) {
  CONFIG.preventOverlap = enabled;
  overlapToggle.checked = enabled;
  if (enabled) {
    for (const clip of clips)
      resolveOverlap2(clip, clip.id);
    syncUI();
  }
}
function setBackgroundColor(color) {
  CONFIG.bgColor = color;
  drawPreview();
}
function loadProject(file) {
  readProjectFile(file, (data) => {
    try {
      if (data.version !== "1.0") {
        console.warn("Different project version:", data.version);
        if (!confirm(`\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u7570\u306A\u308A\u307E\u3059 (${data.version})\u3002
\u8AAD\u307F\u8FBC\u307F\u3092\u7D9A\u884C\u3057\u307E\u3059\u304B\uFF1F`)) {
          return;
        }
      }
      clips = data.clips || [];
      if (data.projectName) {
        currentProjectName = data.projectName;
      } else {
        currentProjectName = "\u7121\u984C";
      }
      if (data.config) {
        if (data.config.preventOverlap !== void 0) {
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
      currentFrame = data.currentFrame || 0;
      selectedId = data.selectedId || null;
      if (data.layerCount) {
        currentLayerCount = data.layerCount;
      }
      updateTimelineDuration2();
      syncUI();
      drawPreview();
      drawTimeline();
      console.log(`Project loaded successfully! (${clips.length} clips)`);
      alert(`\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\uFF01
\u30AF\u30EA\u30C3\u30D7\u6570: ${clips.length}`);
    } catch (err) {
      console.error("Load error:", err);
      alert("\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n\u30D5\u30A1\u30A4\u30EB\u304C\u58CA\u308C\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002");
    }
  }, (err) => {
    console.error("Load error:", err);
    alert("\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n\u30D5\u30A1\u30A4\u30EB\u304C\u58CA\u308C\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002");
  });
}
var saveProjectModal = document.getElementById("saveProjectModal");
var saveProjectNameInput = document.getElementById("saveProjectNameInput");
var saveProjectConfirmBtn = document.getElementById("saveProjectConfirmBtn");
var saveProjectCancelBtn = document.getElementById("saveProjectCancelBtn");
function executeSaveProject(fileName) {
  try {
    const projectData = {
      version: "1.0",
      projectName: fileName,
      clips,
      config: {
        preventOverlap: CONFIG.preventOverlap,
        bgColor: CONFIG.bgColor,
        resolution: CONFIG.resolution,
        fps: CONFIG.fps,
        layerCount: CONFIG.layerCount
      },
      currentFrame,
      selectedId,
      layerCount: currentLayerCount,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    downloadProjectFile(projectData, fileName);
    console.log(`Project saved successfully! (${fileName}.ajp)`);
  } catch (err) {
    console.error("Save error:", err);
    alert("\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
  }
}
setupProjectPanel({
  modal: saveProjectModal,
  nameInput: saveProjectNameInput,
  confirmButton: saveProjectConfirmBtn,
  cancelButton: saveProjectCancelBtn,
  saveButton: document.getElementById("saveProjectBtn"),
  loadButton: document.getElementById("loadProjectBtn"),
  loadInput: document.getElementById("loadProjectInput")
}, {
  getProjectName: () => currentProjectName,
  setProjectName: (name) => {
    currentProjectName = name;
  },
  saveProject: executeSaveProject,
  loadProject
});
exposeDebugApi({
  currentFrame,
  clips,
  getCurrentFrame: () => currentFrame,
  setCurrentFrame: (frame) => {
    currentFrame = frame;
  },
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
  getFps: () => CONFIG.fps
});
setupTimelineEvents(timelineContainer, zoomTimeline);
initializeEditor({
  config: CONFIG,
  loadSettings: loadSettings2,
  totalTimeDisplay,
  layerCountInput,
  overlapToggle,
  bgColorPicker,
  resolutionSelect,
  fpsSelect,
  bottomSection,
  minTimelineHeight: MIN_TIMELINE_HEIGHT,
  timelineDuration: TIMELINE_DURATION,
  defaultZoom: 1,
  setSelectedNone: () => {
    selectedId = null;
  },
  setCurrentLayerCount: (count) => {
    currentLayerCount = count;
  },
  setTimelineZoom: (zoom) => {
    timelineZoom = zoom;
  },
  applyTheme,
  formatTime: formatTime2,
  updateZoomDisplay,
  syncUI
});
setupCanvasResize(canvas, drawTimeline);
