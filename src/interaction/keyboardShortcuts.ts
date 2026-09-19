export interface KeyboardShortcutOptions {
    togglePlay: () => void;
    deleteSelected: () => void;
    isSettingsOpen: () => boolean;
    closeSettings: () => void;
}

export function setupKeyboardShortcuts(options: KeyboardShortcutOptions): void {
    document.addEventListener('keydown', (event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

        if (event.key === ' ') {
            event.preventDefault();
            options.togglePlay();
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            options.deleteSelected();
            return;
        }
        if (event.key === 'Escape' && options.isSettingsOpen()) {
            options.closeSettings();
        }
    });
}