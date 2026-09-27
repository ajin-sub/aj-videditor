export type ClipType = 'text' | 'shape' | 'image' | 'audio' | 'media' | 'cameraPosition' | 'cameraOrbit' | 'rotationControl' | 'fovControl';
export type ShapeType = 'rectangle' | 'triangle' | 'circle' | 'pie' | 'arrow';

export interface Clip {
    id: string;
    type: ClipType;
    layerId: number;
    startFrame: number;
    duration: number;
    x: number;
    y: number;
    z: number;
    rotation: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    cameraDisabled?: boolean;
    cameraFov?: number;
    cameraVerticalAngle?: number;
    cameraHorizontalAngle?: number;
    cameraOrbitDistance?: number;
    text?: string;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
    shapeType?: ShapeType;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    width?: number;
    height?: number;
    mediaId?: string;
    mediaName?: string;
    mediaType?: string;
    fileName?: string;
    src?: string;
    volume?: number;
}