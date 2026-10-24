import { useCallback, useEffect, useState } from 'react';

/** 主题状态与 <html class="dark"> 保持同步；初始类名由 index.html 内联脚本设置以避免闪烁 */
export function useTheme(): [boolean, () => void] {
	const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark);
	}, [dark]);

	const toggle = useCallback(() => {
		setDark((prev) => {
			const next = !prev;
			try {
				localStorage.setItem('onelink-theme', next ? 'dark' : 'light');
			} catch {
				/* noop */
			}
			return next;
		});
	}, []);

	return [dark, toggle];
}
