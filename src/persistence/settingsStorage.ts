export interface SavedSettings {
    theme?: string;
    preventOverlap?: boolean;
}

export function saveSettings(key: string, settings: SavedSettings): void {
    try {
        localStorage.setItem(key, JSON.stringify(settings));
    } catch (error) {
        console.warn('Settings save failed:', error);
    }
}

export function loadSettings(key: string): SavedSettings | null {
    try {
        const data = localStorage.getItem(key);
        if (!data) return null;
        return JSON.parse(data) as SavedSettings;
    } catch (error) {
        console.warn('Settings load failed:', error);
        return null;
    }
}