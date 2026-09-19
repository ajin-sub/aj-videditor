export interface ProjectPanelElements {
    modal: HTMLDivElement;
    nameInput: HTMLInputElement;
    confirmButton: HTMLButtonElement;
    cancelButton: HTMLButtonElement;
    saveButton: HTMLButtonElement;
    loadButton: HTMLButtonElement;
    loadInput: HTMLInputElement;
}

export interface ProjectPanelCallbacks {
    getProjectName: () => string;
    setProjectName: (name: string) => void;
    saveProject: (name: string) => void;
    loadProject: (file: File) => void;
}

function getDefaultProjectName(): string {
    return `project-${new Date().toISOString().slice(0, 10)}`;
}

export function setupProjectPanel(
    elements: ProjectPanelElements,
    callbacks: ProjectPanelCallbacks
): void {
    const close = (): void => {
        elements.modal.classList.remove('active');
    };

    const open = (): void => {
        const currentName = callbacks.getProjectName();
        elements.nameInput.value = currentName !== '無題' ? currentName : getDefaultProjectName();
        elements.nameInput.select();
        elements.modal.classList.add('active');
    };

    const confirmSave = (): void => {
        let name = elements.nameInput.value.trim() || getDefaultProjectName();
        name = name.replace(/[\\/:*?"<>|]/g, '');
        if (!name) name = getDefaultProjectName();
        callbacks.setProjectName(name);
        close();
        callbacks.saveProject(name);
    };

    elements.saveButton.addEventListener('click', open);
    elements.confirmButton.addEventListener('click', confirmSave);
    elements.cancelButton.addEventListener('click', close);
    elements.modal.addEventListener('click', (event) => {
        if (event.target === elements.modal) close();
    });
    elements.nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmSave();
        } else if (event.key === 'Escape') {
            close();
        }
    });

    elements.loadButton.addEventListener('click', () => elements.loadInput.click());
    elements.loadInput.addEventListener('change', () => {
        const file = elements.loadInput.files?.[0];
        if (file) callbacks.loadProject(file);
        elements.loadInput.value = '';
    });
}