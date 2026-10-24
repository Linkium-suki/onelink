export class UserError extends Error {}

const ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/**
 * 将数据嵌入 <script type="application/json">。必须转义 `<`，
 * 否则内容中的 `</script>` 会提前闭合标签造成 XSS。
 */
export function jsonForScript(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** 恒定时间字符串比较，用于密钥与密码校验 */
export function timingSafeEqual(a: string, b: string): boolean {
	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);
	if (aBytes.length !== bBytes.length) return false;
	let diff = 0;
	for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
	return diff === 0;
}

export function countryFlag(code: string): string {
	if (!/^[A-Z]{2}$/.test(code)) return '🌐';
	return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

export function formatBytes(bytes?: number): string {
	if (!bytes || bytes <= 0) return '—';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatUtcTime(time: number | string): string {
	const date = typeof time === 'number' ? new Date(time) : new Date(time);
	return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
