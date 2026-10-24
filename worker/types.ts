export interface Env {
	LINKS_KV: KVNamespace;
	FILES_R2: R2Bucket;
	/** 对外展示的短链域名，留空时自动使用请求的 origin */
	APP_URL: string;
	/** Turnstile 前端 Site Key（公开变量） */
	TURNSTILE_SITE_KEY: string;
	/** Turnstile 服务端 Secret（wrangler secret） */
	TURNSTILE_SECRET_KEY: string;
	/** 管理员凭证（wrangler secret） */
	ADMIN_SECRET: string;
}

export type AppEnv = { Bindings: Env };

export type ShareType = 'link' | 'message' | 'file';

export interface VisitRecord {
	time: number;
	country: string;
}

export interface ShareItem {
	v: 2;
	type: ShareType;
	target?: string;
	content?: string;
	filename?: string;
	contentType?: string;
	size?: number;
	password?: string;
	oneTime?: boolean;
	createdAt: string;
	views: number;
	history?: VisitRecord[];
	expiryTimestamp?: number;
}
