import { requireOptionalNativeModule } from 'expo';

export type DownloadItem = {
  id: number;
  title: string;
  status: 'pending' | 'running' | 'paused' | 'done' | 'failed';
  bytes: number;
  total: number;
  mime: string | null;
  at: number;
};

type NativeDownloads = {
  start(url: string, userAgent: string | null, mime: string | null): boolean;
  list(): DownloadItem[];
  open(id: number): boolean;
  remove(id: number): void;
};

const native = requireOptionalNativeModule<NativeDownloads>('Downloads');

export const downloadsAvailable = native !== null;

export function startDownload(url: string, userAgent?: string, mime?: string) {
  return native?.start(url, userAgent ?? null, mime ?? null) ?? false;
}

export function listDownloads(): DownloadItem[] {
  return native?.list() ?? [];
}

export function openDownload(id: number) {
  return native?.open(id) ?? false;
}

export function removeDownload(id: number) {
  native?.remove(id);
}
