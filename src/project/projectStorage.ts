export function readProjectFile(
    file: File,
    onLoaded: (data: any) => void,
    onError: (error: unknown) => void
): void {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            onLoaded(data);
        } catch (error) {
            onError(error);
        }
    };
    reader.onerror = () => onError(reader.error);
    reader.readAsText(file);
}

export function downloadProjectFile(data: unknown, fileName: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.ajp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}