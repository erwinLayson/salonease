export function formatDateExport(value: string | number | Date): string {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatTimeExport(value: string | number | Date): string {
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTimeExport(value: string | number | Date): string {
    return `${formatDateExport(value)} ${formatTimeExport(value)}:00`;
}

export function formatNowExport(): string {
    return formatDateTimeExport(new Date());
}

export function formatDurationExport(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${(seconds % 3600) / 60}m`;
}

export function formatBytesExport(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}
export { formatDateExport as f, formatTimeExport as t, formatDateTimeExport as d, formatNowExport as n, formatDurationExport as s, formatBytesExport as b };
