import type { ShareItem, ShareType, VisitRecord } from '../types';

export async function getShare(kv: KVNamespace, code: string): Promise<ShareItem | null> {
	const raw = await kv.get(code);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as ShareItem;
	} catch {
		return null;
	}
}

export function kvExpiryOptions(item: ShareItem): { expiration?: number } {
	return item.expiryTimestamp ? { expiration: Math.floor(item.expiryTimestamp / 1000) } : {};
}

export async function saveShare(kv: KVNamespace, code: string, item: ShareItem): Promise<void> {
	await kv.put(code, JSON.stringify(item), kvExpiryOptions(item));
}

export async function destroyShare(kv: KVNamespace, r2: R2Bucket, code: string, type: ShareType): Promise<void> {
	await kv.delete(code);
	if (type === 'file') await r2.delete(code);
}

export function recordVisit(item: ShareItem, country: string): void {
	item.views = (item.views ?? 0) + 1;
	const history: VisitRecord[] = item.history ?? [];
	history.unshift({ time: Date.now(), country });
	item.history = history.slice(0, 100);
}

const TEXT_PREVIEW_EXTENSIONS = [
	'.md',
	'.markdown',
	'.txt',
	'.log',
	'.csv',
	'.srt',
	'.json',
	'.xml',
	'.yml',
	'.yaml',
	'.toml',
	'.ini',
	'.conf',
	'.env',
	'.js',
	'.mjs',
	'.cjs',
	'.ts',
	'.jsx',
	'.tsx',
	'.py',
	'.rb',
	'.php',
	'.java',
	'.kt',
	'.swift',
	'.c',
	'.h',
	'.cpp',
	'.hpp',
	'.cs',
	'.go',
	'.rs',
	'.sh',
	'.bat',
	'.ps1',
	'.sql',
	'.html',
	'.htm',
	'.css',
	'.scss',
	'.less',
	'.vue',
];

export function isTextPreviewable(filename: string): boolean {
	const lower = filename.toLowerCase();
	return TEXT_PREVIEW_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
