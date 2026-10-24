import { useCallback, useEffect, useRef, useState } from 'react';
import Dropzone from './components/Dropzone';
import ResultCard from './components/ResultCard';
import Turnstile, { type TurnstileHandle } from './components/Turnstile';
import { createShare, fetchConfig, type AppConfig } from './lib/api';
import { useTheme } from './lib/useTheme';

type ShareType = 'link' | 'message' | 'file';

const TABS: { key: ShareType; icon: string; label: string }[] = [
	{ key: 'link', icon: '🔗', label: '短链接' },
	{ key: 'message', icon: '📝', label: '消息' },
	{ key: 'file', icon: '📄', label: '文件' },
];

const EXPIRY_OPTIONS = [
	{ value: '1h', label: '1 小时' },
	{ value: '1d', label: '1 天' },
	{ value: '7d', label: '7 天' },
	{ value: '30d', label: '30 天' },
	{ value: 'never', label: '永久' },
];

export default function App() {
	const [dark, toggleTheme] = useTheme();

	const [tab, setTab] = useState<ShareType>('link');
	const [accessValue, setAccessValue] = useState('');
	const [target, setTarget] = useState('');
	const [content, setContent] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [customCode, setCustomCode] = useState('');
	const [password, setPassword] = useState('');
	const [expiry, setExpiry] = useState('never');
	const [oneTime, setOneTime] = useState(false);

	const [config, setConfig] = useState<AppConfig | null>(null);
	const [token, setToken] = useState('');
	const turnstileRef = useRef<TurnstileHandle>(null);

	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [resultUrl, setResultUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchConfig()
			.then(setConfig)
			.catch(() => setConfig({ turnstile: false, siteKey: '' }));
	}, []);

	const handleToken = useCallback((value: string) => setToken(value), []);

	const handleGo = () => {
		const value = accessValue.trim();
		if (!value) return;
		try {
			const url = new URL(value);
			if (url.origin === location.origin && url.pathname.length > 1) {
				location.href = `/${url.pathname.slice(1)}`;
			} else {
				setTarget(value);
				setTab('link');
				setAccessValue('');
			}
		} catch {
			location.href = `/${encodeURIComponent(value)}`;
		}
	};

	const invalidateToken = () => {
		setToken('');
		turnstileRef.current?.reset();
	};

	const submit = async () => {
		setError(null);
		setResultUrl(null);
		if (tab === 'link' && !target.trim()) return setError('请输入要缩短的链接。');
		if (tab === 'message' && !content.trim()) return setError('请输入要分享的内容。');
		if (tab === 'file' && !file) return setError('请选择要上传的文件。');
		if (config?.turnstile && !token) return setError('人机验证尚未完成，请稍候或刷新页面重试。');

		const formData = new FormData();
		formData.append('type', tab);
		formData.append('customCode', customCode);
		formData.append('password', password);
		formData.append('oneTime', oneTime ? 'true' : 'false');
		formData.append('expiry', expiry);
		if (tab === 'link') formData.append('target', target.trim());
		if (tab === 'message') formData.append('content', content);
		if (tab === 'file' && file) formData.append('file', file);
		if (token) formData.append('cf-turnstile-response', token);

		const uploading = tab === 'file';
		setBusy(true);
		if (uploading) setProgress(0);
		try {
			const { status, data } = await createShare(formData, (ratio) =>
				setProgress(Math.round(ratio * 100)),
			);
			if (status >= 200 && status < 300 && data.shortUrl) {
				setResultUrl(data.shortUrl);
				setFile(null);
			} else {
				setError(data.error || `创建失败（HTTP ${status}）。`);
				invalidateToken();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : '网络异常，请重试。');
			invalidateToken();
		} finally {
			setBusy(false);
			setProgress(null);
		}
	};

	return (
		<>
			<div className="container">
				<header className="hero">
					<button
						id="theme-toggle"
						className="icon-btn"
						type="button"
						aria-label="切换深浅色主题"
						onClick={toggleTheme}
					>
						{dark ? '☀️' : '🌙'}
					</button>
					<img className="hero-logo" src="/logo.svg" alt="OneLink Logo" />
					<h1 className="hero-title">OneLink</h1>
					<p className="hero-tagline">Share everything with one link.</p>
				</header>

				<main>
					<section className="card access-card" aria-label="访问分享">
						<input
							type="text"
							placeholder="输入短代码，或粘贴任意链接…"
							autoComplete="off"
							spellCheck={false}
							value={accessValue}
							onChange={(e) => setAccessValue(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleGo()}
						/>
						<button id="go-btn" type="button" onClick={handleGo}>
							前往
						</button>
					</section>

					<section className="card create-card">
						<nav className="tile-tabs" role="tablist" aria-label="分享类型">
							{TABS.map(({ key, icon, label }) => (
								<button
									key={key}
									type="button"
									role="tab"
									aria-selected={tab === key}
									className={`tile-tab${tab === key ? ' active' : ''}`}
									onClick={() => setTab(key)}
								>
									<span className="tile-icon" aria-hidden="true">
										{icon}
									</span>
									<span className="tile-label">{label}</span>
								</button>
							))}
						</nav>

						{tab === 'link' && (
							<div className="tab-panel active">
								<input
									type="url"
									placeholder="https://example.com"
									spellCheck={false}
									value={target}
									onChange={(e) => setTarget(e.target.value)}
								/>
							</div>
						)}
						{tab === 'message' && (
							<div className="tab-panel active">
								<textarea
									rows={6}
									placeholder="支持 Markdown、代码片段…粘贴即分享"
									value={content}
									onChange={(e) => setContent(e.target.value)}
								/>
							</div>
						)}
						{tab === 'file' && (
							<div className="tab-panel active">
								<Dropzone file={file} onChange={setFile} />
							</div>
						)}

						<div className="options">
							<div className="field">
								<label htmlFor="custom-code">自定义短代码</label>
								<input
									id="custom-code"
									type="text"
									placeholder="选填，如 my-link"
									autoComplete="off"
									spellCheck={false}
									value={customCode}
									onChange={(e) => setCustomCode(e.target.value)}
								/>
							</div>
							<div className="field">
								<label htmlFor="password">访问密码</label>
								<input
									id="password"
									type="password"
									placeholder="选填"
									autoComplete="new-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
							<div className="field">
								<label htmlFor="expiry-select">有效期</label>
								<select id="expiry-select" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
									{EXPIRY_OPTIONS.map(({ value, label }) => (
										<option key={value} value={value}>
											{label}
										</option>
									))}
								</select>
							</div>
							<div className="field switch-field">
								<label className="switch">
									<input
										type="checkbox"
										checked={oneTime}
										onChange={(e) => setOneTime(e.target.checked)}
									/>
									<span className="switch-track" />
									<span className="switch-label">阅后即焚</span>
								</label>
							</div>
						</div>

						{config?.turnstile && config.siteKey && (
							<Turnstile
								ref={turnstileRef}
								siteKey={config.siteKey}
								theme={dark ? 'dark' : 'light'}
								onToken={handleToken}
							/>
						)}

						<button id="create-btn" className="primary-btn" type="button" disabled={busy} onClick={submit}>
							{busy ? (tab === 'file' ? '上传中…' : '生成中…') : '生成分享链接'}
						</button>
						{progress !== null && (
							<div className="progress">
								<div style={{ width: `${progress}%` }} />
							</div>
						)}
					</section>

					{resultUrl && <ResultCard url={resultUrl} onCreateAnother={() => setResultUrl(null)} />}

					{error && (
						<div className="error-banner" role="alert">
							{error}
						</div>
					)}
				</main>

				<footer className="site-footer">
					<div className="footer-line">
						<span>Powered by Cloudflare · Crafted with ❤️</span>
						<img src="/cflogo.svg" alt="Cloudflare" className="cf-logo" />
					</div>
					<p className="tribute">Cloudflare的恩情还不完🤚😭✋</p>
					<p className="copyright">© 2026 Linkium · All rights reserved.</p>
				</footer>
			</div>
		</>
	);
}
