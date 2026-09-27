import * as THREE from 'three';
import type { Clip } from '../types/clip';

export interface ThreePreviewRendererOptions {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    backgroundColor: string;
}

export class ThreePreviewRenderer {
    readonly scene = new THREE.Scene();
    readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100_000);
    private readonly defaultCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100_000);
    private readonly cameraExemptScene = new THREE.Scene();
    private readonly cameraHandleScene = new THREE.Scene();

    private readonly renderer: THREE.WebGLRenderer;
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointer = new THREE.Vector2();
    private readonly meshes = new Map<string, THREE.Mesh>();
    private readonly cameraHandles = new Map<string, THREE.Mesh>();
    private readonly signatures = new Map<string, string>();
    private readonly selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffffff);
    private readonly grid = new THREE.Group();
    private width: number;
    private height: number;

    constructor(private readonly options: ThreePreviewRendererOptions) {
        this.width = options.width;
        this.height = options.height;
        this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(this.width, this.height, false);
        this.renderer.sortObjects = true;
        this.scene.background = new THREE.Color(options.backgroundColor);
        this.cameraExemptScene.background = null;
        this.cameraHandleScene.background = null;
        this.selectionBox.visible = false;
        this.scene.add(this.selectionBox, this.grid);
        this.setGridSize();
        this.setDefaultCamera();
    }

    render(clips: Clip[], frame: number, selectedId: string | null, backgroundColor: string, hiddenLayers: Set<number> = new Set()): void {
        this.scene.background = new THREE.Color(backgroundColor);
        const visibleIds = new Set<string>();

        for (const clip of clips) {
            // 非表示レイヤーはスキップ
            if (hiddenLayers.has(clip.layerId)) {
                continue;
            }
            if (!isVisualClip(clip) || frame < clip.startFrame || frame >= clip.startFrame + clip.duration) {
                continue;
            }
            visibleIds.add(clip.id);
            this.ensureMesh(clip);
            const mesh = this.meshes.get(clip.id)!;
            const targetScene = clip.cameraDisabled ? this.cameraExemptScene : this.scene;
            if (mesh.parent !== targetScene) targetScene.add(mesh);
            mesh.position.set(clip.x, -clip.y, clip.z);
            mesh.renderOrder = clip.layerId;
            mesh.rotation.set(
                THREE.MathUtils.degToRad(clip.rotationX || 0),
                THREE.MathUtils.degToRad(clip.rotationY || 0),
                THREE.MathUtils.degToRad(clip.rotationZ ?? clip.rotation),
                'XYZ'
            );
            mesh.visible = true;
        }

        for (const [id, mesh] of this.meshes) {
            if (!visibleIds.has(id)) {
                mesh.visible = false;
                this.scene.remove(mesh);
                this.cameraExemptScene.remove(mesh);
            }
        }

        // 非表示レイヤーのカメラ系クリップは updateCamera で無視する
        this.updateCamera(clips, frame, hiddenLayers);
        this.updateCameraHandle(clips, frame, selectedId);
        const selectedMesh = selectedId ? this.meshes.get(selectedId) : undefined;
        const selectedExempt = Boolean(selectedMesh?.visible && clips.find(clip => clip.id === selectedId)?.cameraDisabled);
        this.scene.remove(this.selectionBox);
        this.cameraExemptScene.remove(this.selectionBox);
        this.selectionBox.visible = Boolean(selectedMesh?.visible);
        if (selectedMesh?.visible) {
            this.selectionBox.setFromObject(selectedMesh);
            (selectedExempt ? this.cameraExemptScene : this.scene).add(this.selectionBox);
        }
        this.renderer.render(this.scene, this.camera);

        const previousAutoClear = this.renderer.autoClear;
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.setDefaultCamera();
        this.renderer.render(this.cameraExemptScene, this.defaultCamera);
        this.renderer.clearDepth();
        this.renderer.render(this.cameraHandleScene, this.defaultCamera);
        this.renderer.autoClear = previousAutoClear;
        this.updateCamera(clips, frame, hiddenLayers);
    }

    resize(width: number, height: number): void {
        if (this.width === width && this.height === height) return;
        this.width = width;
        this.height = height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.defaultCamera.aspect = width / height;
        this.defaultCamera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        this.setGridSize();
    }

    pick(clientX: number, clientY: number): string | null {
        this.setPointer(clientX, clientY);
        this.raycaster.setFromCamera(this.pointer, this.defaultCamera);
        const cameraHit = this.raycaster.intersectObjects(
            [...this.cameraHandles.values()].filter(handle => handle.visible),
            false
        )[0];
        if (cameraHit) return cameraHit.object.userData.clipId as string;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const regularHits = this.raycaster.intersectObjects(
            [...this.meshes.values()].filter(mesh => mesh.visible && mesh.parent === this.scene),
            false
        ).sort((a, b) => a.distance - b.distance || b.object.renderOrder - a.object.renderOrder);
        this.raycaster.setFromCamera(this.pointer, this.defaultCamera);
        const exemptHits = this.raycaster.intersectObjects(
            [...this.meshes.values()].filter(mesh => mesh.visible && mesh.parent === this.cameraExemptScene),
            false
        ).sort((a, b) => a.distance - b.distance || b.object.renderOrder - a.object.renderOrder);
        const hit = exemptHits[0] || regularHits[0];
        return hit?.object.userData.clipId as string | undefined ?? null;
    }

    pointerToClipPosition(clientX: number, clientY: number, clip: Clip): { x: number; y: number } | null {
        this.setPointer(clientX, clientY);
        const exempt = clip.cameraDisabled || clip.type === 'cameraPosition';
        this.raycaster.setFromCamera(this.pointer, exempt ? this.defaultCamera : this.camera);
        const planeZ = clip.z;
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
        const point = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        return point ? { x: point.x, y: -point.y } : null;
    }

    orbitCamera(clip: Clip, deltaX: number, deltaY: number): void {
        if (clip.type !== 'cameraOrbit') return;
        clip.cameraHorizontalAngle = (clip.cameraHorizontalAngle || 0) - deltaX * 0.25;
        clip.cameraVerticalAngle = THREE.MathUtils.clamp(
            (clip.cameraVerticalAngle || 0) + deltaY * 0.25,
            -1440,
            1440
        );
    }

    dispose(): void {
        this.renderer.dispose();
        for (const mesh of this.meshes.values()) this.disposeMesh(mesh);
        for (const handle of this.cameraHandles.values()) this.disposeMesh(handle);
    }

    private ensureMesh(clip: Clip): void {
        const signature = JSON.stringify([
            clip.type, clip.shapeType, clip.width, clip.height, clip.fillColor, clip.strokeColor,
            clip.strokeWidth, clip.text, clip.fontSize, clip.fontFamily, clip.color, clip.src,
        ]);
        if (this.signatures.get(clip.id) === signature) return;

        const previous = this.meshes.get(clip.id);
        let reusableTexture: THREE.Texture | undefined;
        if (previous) {
            this.scene.remove(previous);
            if (isImageClip(clip) && previous.userData.isImageMesh && previous.userData.mediaSrc === clip.src) {
                const previousMaterial = previous.material as THREE.MeshBasicMaterial;
                reusableTexture = previousMaterial.map || undefined;
                previousMaterial.map = null;
            }
            this.disposeMesh(previous);
        }
        let mesh: THREE.Mesh;
        if (clip.type === 'text') mesh = this.createTextMesh(clip);
        else if (clip.type === 'image' || (clip.type === 'media' && clip.mediaType?.startsWith('image/'))) {
            mesh = this.createImageMesh(clip, reusableTexture);
        } else mesh = this.createShapeMesh(clip);
        if (isImageClip(clip)) {
            mesh.userData.isImageMesh = true;
            mesh.userData.mediaSrc = clip.src;
        }
        mesh.userData.clipId = clip.id;
        this.meshes.set(clip.id, mesh);
        this.signatures.set(clip.id, signature);
        this.scene.add(mesh);
    }

    private createShapeMesh(clip: Clip): THREE.Mesh {
        const width = clip.width || 100;
        const height = clip.height || 100;
        const geometry = createShapeGeometry(clip, width, height);
        const fillTransparent = (clip.fillColor || '').toLowerCase() === 'transparent';
        const material = new THREE.MeshBasicMaterial({
            color: fillTransparent ? '#ffffff' : clip.fillColor || '#ffffff',
            side: THREE.DoubleSide,
            transparent: fillTransparent,
            opacity: fillTransparent ? 0 : 1,
            depthWrite: !fillTransparent,
            depthFunc: THREE.LessEqualDepth,
        });
        const mesh = new THREE.Mesh(geometry, material);
        if (clip.strokeColor && clip.strokeColor !== 'transparent' && (clip.strokeWidth || 0) > 0) {
            const edgeGeometry = new THREE.EdgesGeometry(geometry);
            const edgeMaterial = new THREE.LineBasicMaterial({
                color: clip.strokeColor,
                depthFunc: THREE.LessEqualDepth,
            });
            const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            edges.renderOrder = clip.layerId;
            mesh.add(edges);
        }
        return mesh;
    }

    private createImageMesh(clip: Clip, reusableTexture?: THREE.Texture): THREE.Mesh {
        const material = new THREE.MeshBasicMaterial({
            color: clip.src ? '#ffffff' : '#888888',
            side: THREE.DoubleSide,
            depthWrite: true,
            depthFunc: THREE.LessEqualDepth,
            alphaTest: 0.5,
            map: reusableTexture || null,
        });
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(clip.width || 100, clip.height || 100),
            material
        );
        if (clip.src && !reusableTexture) {
            const texture = new THREE.TextureLoader().load(clip.src, () => {
                const currentMaterial = this.meshes.get(clip.id)?.material as THREE.MeshBasicMaterial | undefined;
                if (currentMaterial?.map !== texture) {
                    texture.dispose();
                    return;
                }
                currentMaterial.needsUpdate = true;
                this.renderer.render(this.scene, this.camera);
            });
            texture.colorSpace = THREE.SRGBColorSpace;
            material.map = texture;
        }
        return mesh;
    }

    private createTextMesh(clip: Clip): THREE.Mesh {
        const lines = (clip.text || '').split('\n');
        const fontSize = clip.fontSize || 50;
        const lineHeight = fontSize * 1.2;
        const textureCanvas = document.createElement('canvas');
        const measureContext = textureCanvas.getContext('2d')!;
        const font = `${fontSize}px ${clip.fontFamily || 'sans-serif'}`;
        measureContext.font = font;
        const textWidth = Math.max(1, ...lines.map(line => measureContext.measureText(line).width));
        const padding = Math.max(8, fontSize * 0.2);
        textureCanvas.width = Math.ceil(textWidth + padding * 2);
        textureCanvas.height = Math.ceil(lines.length * lineHeight + padding * 2);

        const context = textureCanvas.getContext('2d')!;
        context.font = font;
        context.fillStyle = clip.color || '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        lines.forEach((line, index) => {
            const y = textureCanvas.height / 2 + (index - (lines.length - 1) / 2) * lineHeight;
            context.fillText(line, textureCanvas.width / 2, y);
        });

        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthFunc: THREE.LessEqualDepth,
        });
        return new THREE.Mesh(new THREE.PlaneGeometry(textureCanvas.width, textureCanvas.height), material);
    }

    private updateCamera(clips: Clip[], frame: number, hiddenLayers: Set<number>): void {
        const active = clips
            .filter(clip => {
                if (hiddenLayers.has(clip.layerId)) return false;
                return frame >= clip.startFrame && frame < clip.startFrame + clip.duration;
            })
            .sort((a, b) => a.layerId - b.layerId);
        const positionCameras = active.filter(clip => clip.type === 'cameraPosition');
        const orbitCameras = active.filter(clip => clip.type === 'cameraOrbit');
        const positionLayer = positionCameras[positionCameras.length - 1]?.layerId ?? -1;
        const orbitLayer = orbitCameras[orbitCameras.length - 1]?.layerId ?? -1;
        const activeMode = positionLayer >= orbitLayer ? 'position' : 'orbit';
        const fovControls = active.filter(clip => clip.type === 'fovControl');
        const fovControl = fovControls[fovControls.length - 1];
        this.camera.fov = THREE.MathUtils.clamp(fovControl?.cameraFov ?? 50, 1, 179);
        this.camera.up.set(0, 1, 0);

        if (activeMode === 'position' && positionCameras.length > 0) {
            const offset = positionCameras.reduce((sum, clip) => ({
                x: sum.x + clip.x,
                y: sum.y + clip.y,
                z: sum.z + clip.z,
                rotationX: sum.rotationX + (clip.rotationX || 0),
                rotationY: sum.rotationY + (clip.rotationY || 0),
                rotationZ: sum.rotationZ + (clip.rotationZ ?? clip.rotation),
            }), { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0 });
            this.camera.position.set(offset.x, -offset.y, this.defaultCameraDistance() + offset.z);
            this.camera.rotation.order = 'XYZ';
            this.camera.rotation.set(
                THREE.MathUtils.degToRad(offset.rotationX),
                THREE.MathUtils.degToRad(offset.rotationY),
                THREE.MathUtils.degToRad(offset.rotationZ)
            );
        } else if (activeMode === 'orbit' && orbitCameras.length > 0) {
            const orbit = orbitCameras.reduce((sum, clip) => ({
                vertical: sum.vertical + (clip.cameraVerticalAngle || 0),
                horizontal: sum.horizontal + (clip.cameraHorizontalAngle || 0),
                distance: sum.distance + (clip.cameraOrbitDistance || 0),
            }), { vertical: 0, horizontal: 0, distance: 0 });
            // 回転制御は複数ある場合、座標を合成して注視点にする。
            const controls = active.filter(clip => clip.type === 'rotationControl');
            const center = controls.reduce((sum, clip) => ({
                x: sum.x + clip.x,
                y: sum.y + clip.y,
                z: sum.z + clip.z,
            }), { x: 0, y: 0, z: 0 });
            const centerX = center.x;
            const centerY = center.y;
            const centerZ = center.z;
            const radius = Math.max(1, this.defaultCameraDistance() + orbit.distance);
            const verticalAngle = THREE.MathUtils.clamp(orbit.vertical, -1440, 1440);
            const vertical = THREE.MathUtils.degToRad(verticalAngle);
            const horizontal = THREE.MathUtils.degToRad(orbit.horizontal);
            const horizontalRadius = radius * Math.cos(vertical);
            const wrappedVertical = ((verticalAngle % 360) + 360) % 360;
            this.camera.up.set(
                0,
                wrappedVertical > 90 && wrappedVertical < 270 ? -1 : 1,
                0
            );
            this.camera.position.set(
                centerX + horizontalRadius * Math.sin(horizontal),
                -(centerY + radius * Math.sin(vertical)),
                centerZ + horizontalRadius * Math.cos(horizontal)
            );
            this.camera.lookAt(centerX, -centerY, centerZ);
        } else {
            this.camera.position.set(0, 0, this.defaultCameraDistance());
            this.camera.rotation.order = 'XYZ';
            this.camera.rotation.set(0, 0, 0);
        }

        this.camera.updateProjectionMatrix();
    }

    private updateCameraHandle(clips: Clip[], frame: number, selectedId: string | null): void {
        for (const [id, handle] of this.cameraHandles) {
            handle.visible = id === selectedId;
        }
        const selected = clips.find(clip => clip.id === selectedId);
        if (!selected || (selected.type !== 'cameraPosition' && selected.type !== 'cameraOrbit')) return;

        let handle = this.cameraHandles.get(selected.id);
        if (!handle) {
            handle = new THREE.Mesh(
                new THREE.OctahedronGeometry(28),
                new THREE.MeshBasicMaterial({ color: selected.type === 'cameraPosition' ? '#29f078' : '#00b8a9' })
            );
            handle.userData.clipId = selected.id;
            handle.material.depthTest = false;
            this.cameraHandles.set(selected.id, handle);
            this.cameraHandleScene.add(handle);
        }

        // cameraPosition / cameraOrbit ともに、ひし形は常にプレビュー中心に固定する。
        // z を反映すると defaultCamera からの距離が変わり、見た目の大きさが変わってしまう。
        // そのため、ひし形の位置は常に (0, 0, 0) に固定する。
        handle.position.set(0, 0, 0);
        handle.visible = true;
    }

    private setPointer(clientX: number, clientY: number): void {
        const rect = this.options.canvas.getBoundingClientRect();
        this.pointer.set(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    private setDefaultCamera(): void {
        for (const camera of [this.camera, this.defaultCamera]) {
            camera.fov = 50;
            camera.position.set(0, 0, this.defaultCameraDistance());
            camera.up.set(0, 1, 0);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
        }
    }

    private defaultCameraDistance(): number {
        return this.height / (2 * Math.tan(THREE.MathUtils.degToRad(50 / 2)));
    }

    private setGridSize(): void {
        this.grid.clear();
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const points: THREE.Vector3[] = [];
        for (let x = -halfWidth; x <= halfWidth; x += 40) {
            points.push(new THREE.Vector3(x, -halfHeight, -10), new THREE.Vector3(x, halfHeight, -10));
        }
        for (let y = -halfHeight; y <= halfHeight; y += 40) {
            points.push(new THREE.Vector3(-halfWidth, y, -10), new THREE.Vector3(halfWidth, y, -10));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
        this.grid.add(new THREE.LineSegments(geometry, material));
        const axisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-halfWidth, 0, -9), new THREE.Vector3(halfWidth, 0, -9),
            new THREE.Vector3(0, -halfHeight, -9), new THREE.Vector3(0, halfHeight, -9),
        ]);
        this.grid.add(new THREE.LineSegments(axisGeometry, new THREE.LineBasicMaterial({
            color: 0xff5050,
            transparent: true,
            opacity: 0.35,
        })));
    }

    private disposeMesh(mesh: THREE.Mesh): void {
        mesh.traverse(object => {
            if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
                material.dispose();
            }
        });
    }
}

function isVisualClip(clip: Clip): boolean {
    return clip.type === 'text' || clip.type === 'shape' || clip.type === 'image' ||
        (clip.type === 'media' && Boolean(clip.mediaType?.startsWith('image/')));
}

function isImageClip(clip: Clip): boolean {
    return clip.type === 'image' || (clip.type === 'media' && Boolean(clip.mediaType?.startsWith('image/')));
}

function createShapeGeometry(clip: Clip, width: number, height: number): THREE.BufferGeometry {
    if (clip.shapeType === 'circle') return new THREE.CircleGeometry(Math.min(width, height) / 2, 48);
    const shape = new THREE.Shape();
    if (clip.shapeType === 'triangle') {
        shape.moveTo(0, height / 2);
        shape.lineTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.closePath();
    } else if (clip.shapeType === 'pie') {
        shape.moveTo(0, 0);
        shape.absarc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 1.5, false);
        shape.closePath();
    } else if (clip.shapeType === 'arrow') {
        const head = Math.min(width, height) * 0.35;
        const shaft = height * 0.2;
        shape.moveTo(width / 2, 0);
        shape.lineTo(width / 2 - head, head / 2);
        shape.lineTo(width / 2 - head, shaft / 2);
        shape.lineTo(-width / 2, shaft / 2);
        shape.lineTo(-width / 2, -shaft / 2);
        shape.lineTo(width / 2 - head, -shaft / 2);
        shape.lineTo(width / 2 - head, -head / 2);
        shape.closePath();
    } else {
        shape.moveTo(-width / 2, -height / 2);
        shape.lineTo(width / 2, -height / 2);
        shape.lineTo(width / 2, height / 2);
        shape.lineTo(-width / 2, height / 2);
        shape.closePath();
    }
    return new THREE.ShapeGeometry(shape);
}