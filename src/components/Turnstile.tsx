import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

declare global {
	interface Window {
		turnstile?: {
			render: (element: HTMLElement, options: Record<string, unknown>) => string | undefined;
			reset: (widgetId?: string) => void;
			remove: (widgetId: string) => void;
		};
		onelinkTurnstileLoad?: () => void;
	}
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
	if (window.turnstile) return Promise.resolve();
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise((resolve, reject) => {
		window.onelinkTurnstileLoad = () => resolve();
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onelinkTurnstileLoad';
		script.async = true;
		script.onerror = () => reject(new Error('Turnstile 脚本加载失败'));
		document.head.appendChild(script);
	});
	return scriptPromise;
}

export interface TurnstileHandle {
	reset: () => void;
}

interface TurnstileProps {
	siteKey: string;
	theme: 'light' | 'dark';
	onToken: (token: string) => void;
}

const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(({ siteKey, theme, onToken }, ref) => {
	const hostRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);

	useImperativeHandle(
		ref,
		() => ({
			reset: () => {
				if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
			},
		}),
		[],
	);

	useEffect(() => {
		let cancelled = false;
		loadTurnstileScript()
			.then(() => {
				if (cancelled || !hostRef.current || !window.turnstile) return;
				widgetIdRef.current =
					window.turnstile.render(hostRef.current, {
						sitekey: siteKey,
						theme,
						callback: (token: string) => onToken(token),
						'expired-callback': () => onToken(''),
						'error-callback': () => onToken(''),
					}) ?? null;
			})
			.catch(() => {
				/* 静默失败：提交时缺少 token 会被拦截并提示 */
			});
		return () => {
			cancelled = true;
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
				widgetIdRef.current = null;
			}
		};
	}, [siteKey, theme, onToken]);

	return <div ref={hostRef} className="turnstile" />;
});

export default Turnstile;
