import type { Clip, ClipType } from '../types/clip';

export function createClip(
    type: ClipType,
    id: string,
    layerId: number,
    startFrame: number,
    duration: number,
    defaultFont: string
): Clip {
    const baseClip = {
        id,
        layerId,
        startFrame,
        duration,
        x: 0,
        y: 0,
        z: 0,
        rotation: 0,
    };

    if (type === 'text') {
        return {
            ...baseClip,
            type,
            text: 'New Text',
            fontSize: 50,
            color: '#ffffff',
            fontFamily: defaultFont,
        };
    }

    if (type === 'shape') {
        return {
            ...baseClip,
            type,
            shapeType: 'rectangle',
            fillColor: '#ffffff',
            strokeColor: 'transparent',
            strokeWidth: 0,
            width: 100,
            height: 100,
        };
    }

    if (type === 'image') return { ...baseClip, type, width: 100, height: 100 };
    if (type === 'audio') return { ...baseClip, type, volume: 1 };
    if (type === 'media') return { ...baseClip, type };
    if (type === 'cameraPosition') return { ...baseClip, type };
    if (type === 'cameraOrbit') {
        return {
            ...baseClip,
            type,
            cameraVerticalAngle: 0,
            cameraHorizontalAngle: 0,
            cameraOrbitDistance: 0,
        };
    }
    if (type === 'rotationControl') return { ...baseClip, type };
    return { ...baseClip, type, cameraFov: 50 };
}