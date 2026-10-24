/** 每个 IP 每小时最多创建的分享数量（非管理员） */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_CREATES_PER_WINDOW = 20;

export async function checkCreateRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
	const bucket = Math.floor(Date.now() / WINDOW_MS);
	const key = `rl:${ip}:${bucket}`;
	const current = Number((await kv.get(key)) ?? '0');
	if (current >= MAX_CREATES_PER_WINDOW) return false;
	await kv.put(key, String(current + 1), { expirationTtl: 7200 });
	return true;
}
