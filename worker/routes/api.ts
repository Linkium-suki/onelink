import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv, ShareItem, ShareType } from '../types';
import { checkCreateRateLimit } from '../lib/ratelimit';
import { generateShortCode, sanitizeCustomCode } from '../lib/codes';
import { destroyShare, getShare, saveShare } from '../lib/share';
import { verifyTurnstile } from '../lib/turnstile';
import { timingSafeEqual, UserError } from '../lib/util';

export function resolveAppUrl(c: Context<AppEnv>): string {
	const configured = (c.env.APP_URL ?? '').trim();
	if (configured) return configured.replace(/\/+$/, '');
	return new URL(c.req.raw.url).origin;
}

export function isAdminRequest(c: Context<AppEnv>): boolean {
	if (!c.env.ADMIN_SECRET) return false;
	return timingSafeEqual(c.req.header('x-admin-secret') ?? '', c.env.ADMIN_SECRET);
}

/** '1h' | '7d' | … → 毫秒；'never' 或非法值 → null */
export function parseExpiry(value: string): number | null {
	const match = /^(\d+)([hd])$/.exec(value);
	if (!match) return null;
	const amount = Number(match[1]);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return amount * (match[2] === 'h' ? 3_600_000 : 86_400_000);
}

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get('/config', (c) => {
	const enabled = Boolean(c.env.TURNSTILE_SECRET_KEY);
	return c.json({ turnstile: enabled, siteKey: enabled ? c.env.TURNSTILE_SITE_KEY : '' });
});

apiRoutes.post('/create', async (c) => {
	const env = c.env;
	const admin = isAdminRequest(c);

	let form: FormData;
	try {
		form = await c.req.raw.formData();
	} catch {
		return c.json({ error: '请求格式无效，应为 multipart/form-data。' }, 400);
	}

	const ip = c.req.header('cf-connecting-ip') ?? 'unknown';

	if (!admin) {
		if (env.TURNSTILE_SECRET_KEY) {
			const token = String(form.get('cf-turnstile-response') ?? '');
			if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip))) {
				return c.json({ error: '人机验证未通过，请刷新页面后重试。' }, 403);
			}
		}
		if (!(await checkCreateRateLimit(env.LINKS_KV, ip))) {
			return c.json({ error: '创建太频繁了，请一小时后再试。' }, 429);
		}
	}

	const type = String(form.get('type') ?? '') as ShareType;
	if (type !== 'link' && type !== 'message' && type !== 'file') {
		return c.json({ error: '未知的分享类型。' }, 400);
	}

	const customCode = String(form.get('customCode') ?? '');
	let code: string;
	if (customCode.trim()) {
		code = sanitizeCustomCode(customCode);
		if (await env.LINKS_KV.get(code)) {
			return c.json({ error: `短代码 /${code} 已被占用。` }, 400);
		}
	} else {
		code = await generateShortCode(env.LINKS_KV);
	}

	const password = String(form.get('password') ?? '').trim();
	const oneTime = String(form.get('oneTime') ?? '') === 'true';

	const item: ShareItem = { v: 2, type, createdAt: new Date().toISOString(), views: 0, history: [] };
	if (password) item.password = password;
	if (oneTime) item.oneTime = true;

	const expiryMs = parseExpiry(String(form.get('expiry') ?? 'never'));
	if (expiryMs !== null) item.expiryTimestamp = Date.now() + expiryMs;

	if (type === 'link') {
		let target = String(form.get('target') ?? '').trim();
		if (!target) return c.json({ error: '链接不能为空。' }, 400);
		if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
		let parsed: URL;
		try {
			parsed = new URL(target);
		} catch {
			return c.json({ error: '链接格式无效。' }, 400);
		}
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return c.json({ error: '仅支持 http/https 链接。' }, 400);
		}
		item.target = parsed.href;
	} else if (type === 'message') {
		const content = String(form.get('content') ?? '');
		if (!content.trim()) return c.json({ error: '内容不能为空。' }, 400);
		item.content = content;
	} else {
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return c.json({ error: '未选择文件。' }, 400);
		}
		if (!admin) {
			// 非管理员上传的文件最多保留 24 小时
			const dayLater = Date.now() + 24 * 60 * 60 * 1000;
			item.expiryTimestamp = item.expiryTimestamp ? Math.min(item.expiryTimestamp, dayLater) : dayLater;
		}
		await env.FILES_R2.put(code, file.stream(), {
			httpMetadata: { contentType: file.type || 'application/octet-stream' },
			customMetadata: { filename: file.name },
		});
		item.filename = file.name;
		item.contentType = file.type || 'application/octet-stream';
		item.size = file.size;
	}

	try {
		await saveShare(env.LINKS_KV, code, item);
	} catch (error) {
		if (type === 'file') await env.FILES_R2.delete(code);
		throw error;
	}

	return c.json({ code, shortUrl: `${resolveAppUrl(c)}/${code}` });
});

apiRoutes.use('/admin/*', async (c, next) => {
	if (!isAdminRequest(c)) {
		return c.json({ error: '需要管理员凭证（x-admin-secret）。' }, 401);
	}
	await next();
});

apiRoutes.get('/admin/:code', async (c) => {
	const code = c.req.param('code');
	const item = await getShare(c.env.LINKS_KV, code);
	if (!item) return c.json({ error: '未找到该分享。' }, 404);
	const { password: _password, ...rest } = item;
	return c.json({ code, item: rest });
});

apiRoutes.delete('/admin/:code', async (c) => {
	const code = c.req.param('code');
	const item = await getShare(c.env.LINKS_KV, code);
	if (!item) return c.json({ error: '未找到该分享。' }, 404);
	await destroyShare(c.env.LINKS_KV, c.env.FILES_R2, code, item.type);
	return c.json({ ok: true, code });
});

apiRoutes.onError((error, c) => {
	if (error instanceof UserError) {
		return c.json({ error: error.message }, 400);
	}
	console.error('API error:', error);
	return c.json({ error: '服务器内部错误。' }, 500);
});
