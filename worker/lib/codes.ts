import { UserError } from './util';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const CODE_LENGTH = 6;

/** 与静态资源、路由冲突或无意义的短代码 */
export const RESERVED_CODES = new Set([
	'api',
	'admin',
	'assets',
	'static',
	'index',
	'app',
	'style',
	'login',
	'logout',
	'favicon.ico',
	'robots.txt',
	'sitemap.xml',
]);

export async function generateShortCode(kv: KVNamespace): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
		let code = '';
		for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
		if (!(await kv.get(code))) return code;
	}
	throw new UserError('短代码生成失败，请重试。');
}

export function sanitizeCustomCode(raw: string): string {
	const code = raw.trim().replace(/\s+/g, '-');
	if (!code) throw new UserError('自定义短代码不能为空。');
	if (code.length > 64) throw new UserError('自定义短代码过长（最多 64 个字符）。');
	if (code.includes('.')) throw new UserError('自定义短代码不能包含点号。');
	if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new UserError('自定义短代码只能包含字母、数字、下划线和连字符。');
	if (RESERVED_CODES.has(code.toLowerCase())) throw new UserError('该短代码为系统保留，请换一个。');
	return code;
}
