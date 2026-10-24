import type { Context } from 'hono';
import type { AppEnv, ShareItem } from '../types';
import { htmlResponse } from '../lib/http';
import { RESERVED_CODES } from '../lib/codes';
import { destroyShare, getShare, isTextPreviewable, recordVisit, saveShare } from '../lib/share';
import { timingSafeEqual } from '../lib/util';
import {
	renderDownloadPage,
	renderMessagePage,
	renderNotFoundPage,
	renderPasswordPage,
	renderPreviewPage,
	renderRedirectPage,
	renderStatsPage,
} from '../pages/views';

interface RangeSelection {
	offset: number;
	length: number;
}

/** 解析单段 Range 头（如 bytes=100- 或 bytes=-500），返回 R2 的 range 参数 */
function parseRange(header: string | null | undefined, size: number): RangeSelection | undefined {
	if (!header || size <= 0) return undefined;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match) return undefined;
	const [, startStr, endStr] = match;
	if (startStr === '' && endStr === '') return undefined;

	let start: number;
	let end: number;
	if (startStr === '') {
		const suffix = Number(endStr);
		if (!suffix) return undefined;
		start = Math.max(0, size - suffix);
		end = size - 1;
	} else {
		start = Number(startStr);
		end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1);
	}
	if (start > end || start >= size) return undefined;
	return { offset: start, length: end - start + 1 };
}

export async function handleShareGet(c: Context<AppEnv>): Promise<Response> {
	return resolveShare(c);
}

export async function handleSharePost(c: Context<AppEnv>): Promise<Response> {
	let formPassword: string | undefined;
	try {
		const form = await c.req.raw.formData();
		formPassword = String(form.get('password') ?? '');
	} catch {
		formPassword = undefined;
	}
	return resolveShare(c, formPassword);
}

async function resolveShare(c: Context<AppEnv>, formPassword?: string): Promise<Response> {
	const env = c.env;
	const url = new URL(c.req.raw.url);

	let code = c.req.param('code') ?? '';
	const isInfoRequest = code.endsWith('+');
	if (isInfoRequest) code = code.slice(0, -1);

	if (!code || code.includes('.') || RESERVED_CODES.has(code.toLowerCase())) {
		return notFound(c);
	}

	const item = await getShare(env.LINKS_KV, code);
	if (!item) {
		return notFound(c);
	}

	if (isInfoRequest) {
		return htmlResponse(renderStatsPage(code, item));
	}

	if (item.password) {
		const given = formPassword ?? url.searchParams.get('password') ?? '';
		if (!given || !timingSafeEqual(given, item.password)) {
			return htmlResponse(renderPasswordPage(code, Boolean(given)), 401);
		}
	}

	recordVisit(item, c.req.header('cf-ipcountry') ?? 'Unknown');

	if (item.oneTime) {
		await destroyShare(env.LINKS_KV, env.FILES_R2, code, item.type);
	} else {
		await saveShare(env.LINKS_KV, code, item);
	}

	switch (item.type) {
		case 'link':
			return htmlResponse(renderRedirectPage(item.target ?? '/'));
		case 'message':
			return htmlResponse(renderMessagePage({ content: item.content ?? '' }));
		case 'file':
			return serveFile(c, code, item);
		default:
			return htmlResponse(renderNotFoundPage('数据库中的分享类型无效。'), 500);
	}
}

async function serveFile(c: Context<AppEnv>, code: string, item: ShareItem): Promise<Response> {
	const url = new URL(c.req.raw.url);
	const object = await c.env.FILES_R2.get(code);
	if (!object) {
		await c.env.LINKS_KV.delete(code);
		return notFound(c, '文件不存在或已被销毁。');
	}

	const filename = item.filename || object.customMetadata?.filename || 'file';
	const contentType = item.contentType || object.httpMetadata?.contentType || 'application/octet-stream';
	const cacheControl = item.oneTime ? 'no-store' : 'private, max-age=3600';
	const disposition = `filename*=UTF-8''${encodeURIComponent(filename)}`;

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('content-type', contentType);
	headers.set('x-content-type-options', 'nosniff');
	headers.set('cache-control', cacheControl);
	headers.set('accept-ranges', 'bytes');

	// 下载参数优先于一切预览
	if (url.searchParams.get('download') === 'true') {
		headers.set('content-disposition', `attachment; ${disposition}`);
		return new Response(object.body, { headers });
	}

	const isImage = contentType.startsWith('image/');
	const isMedia =
		contentType.startsWith('video/') || contentType.startsWith('audio/') || contentType === 'application/pdf';

	if (isImage || isMedia) {
		const selection = parseRange(c.req.header('range'), object.size);
		if (selection) {
			const ranged = await c.env.FILES_R2.get(code, { range: selection });
			if (ranged) {
				headers.set('content-range', `bytes ${selection.offset}-${selection.offset + selection.length - 1}/${object.size}`);
				headers.set('content-length', String(selection.length));
				return new Response(ranged.body, { status: 206, headers });
			}
		}
		headers.set('content-length', String(object.size));
		headers.set('content-disposition', `inline; ${disposition}`);
		return new Response(object.body, { headers });
	}

	if (isTextPreviewable(filename)) {
		const text = await object.text();
		return htmlResponse(renderMessagePage({ content: text, title: filename, downloadUrl: url.href }));
	}

	return htmlResponse(
		renderDownloadPage({ fileUrl: url.href, filename, contentType, size: item.size ?? object.size }),
	);
}

function notFound(c: Context<AppEnv>, reason?: string): Response {
	return htmlResponse(renderNotFoundPage(reason), 404);
}
