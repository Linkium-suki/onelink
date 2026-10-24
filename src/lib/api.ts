export interface AppConfig {
	turnstile: boolean;
	siteKey: string;
}

export interface CreateResponse {
	shortUrl?: string;
	code?: string;
	error?: string;
}

export interface CreateResult {
	status: number;
	data: CreateResponse;
}

export async function fetchConfig(): Promise<AppConfig> {
	const response = await fetch('/api/config');
	if (!response.ok) throw new Error('无法加载服务配置');
	return (await response.json()) as AppConfig;
}

/** XHR 而非 fetch，以获得上传进度回调 */
export function createShare(
	formData: FormData,
	onProgress?: (ratio: number) => void,
): Promise<CreateResult> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/create');
		xhr.responseType = 'json';
		xhr.upload.addEventListener('progress', (event) => {
			if (event.lengthComputable) onProgress?.(event.loaded / event.total);
		});
		xhr.addEventListener('load', () => {
			resolve({ status: xhr.status, data: (xhr.response as CreateResponse | null) ?? {} });
		});
		xhr.addEventListener('error', () => reject(new Error('网络异常，请重试。')));
		xhr.send(formData);
	});
}
