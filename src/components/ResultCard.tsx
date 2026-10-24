import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface ResultCardProps {
	url: string;
	onCreateAnother: () => void;
}

export default function ResultCard({ url, onCreateAnother }: ResultCardProps) {
	const qrRef = useRef<HTMLDivElement>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const box = qrRef.current;
		if (!box) return;
		let cancelled = false;
		box.innerHTML = '';
		QRCode.toCanvas(url, { width: 148, margin: 1, color: { dark: '#191c26', light: '#ffffff' } })
			.then((canvas) => {
				if (cancelled) return;
				box.innerHTML = '';
				box.appendChild(canvas);
			})
			.catch(() => {
				/* 二维码失败不影响主流程 */
			});
		return () => {
			cancelled = true;
		};
	}, [url]);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			const input = document.getElementById('result-url') as HTMLInputElement | null;
			input?.select();
			document.execCommand('copy');
		}
		setCopied(true);
		setTimeout(() => setCopied(false), 1800);
	};

	return (
		<section className="card result-card" aria-live="polite">
			<p className="result-badge">✨ 创建成功</p>
			<div className="result-row">
				<input type="text" id="result-url" value={url} readOnly />
				<button type="button" onClick={copy}>
					{copied ? '已复制 ✓' : '复制'}
				</button>
			</div>
			<div className="result-actions">
				<a href={url} target="_blank" rel="noopener noreferrer">
					打开
				</a>
				<span aria-hidden="true">·</span>
				<a href={`${url}+`} target="_blank" rel="noopener noreferrer">
					访问统计
				</a>
				<span aria-hidden="true">·</span>
				<button type="button" onClick={onCreateAnother}>
					再创建一个
				</button>
			</div>
			<div ref={qrRef} className="qrcode" title="扫码访问" />
		</section>
	);
}
