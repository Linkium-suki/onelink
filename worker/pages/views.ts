import { renderPage } from './layout';
import type { ShareItem } from '../types';
import { countryFlag, escapeHtml, formatBytes, formatUtcTime, jsonForScript } from '../lib/util';

export function renderRedirectPage(target: string): string {
	let host = '';
	try {
		host = new URL(target).host;
	} catch {
		// 无效 URL 在创建时已被拦截
	}
	const safeTarget = escapeHtml(target);
	const body = `
<main class="card" style="text-align:center">
  <p class="eyebrow">安全跳转</p>
  <h1>即将离开 OneLink</h1>
  <p class="target-line">你将被重定向到 <strong>${escapeHtml(host)}</strong></p>
  <p class="target-full">${safeTarget}</p>
  <div class="countdown-wrap">
    <div class="countdown-bar"><span id="bar"></span></div>
    <span id="countdown" class="countdown-num">3</span>
  </div>
  <div class="btn-row">
    <a id="go-now" class="btn primary" href="${safeTarget}" rel="noopener noreferrer">立即前往</a>
    <button id="stay" class="btn ghost" type="button">留在此页</button>
  </div>
</main>`;
	const scripts = `
<script type="application/json" id="payload">${jsonForScript({ target })}</script>
<script>
(function () {
  var payload = JSON.parse(document.getElementById('payload').textContent);
  var seconds = 3;
  var num = document.getElementById('countdown');
  var bar = document.getElementById('bar');
  var timer = setInterval(function () {
    seconds -= 1;
    if (seconds <= 0) { clearInterval(timer); location.replace(payload.target); return; }
    num.textContent = String(seconds);
    bar.style.width = ((3 - seconds) / 3 * 100) + '%';
  }, 1000);
  document.getElementById('go-now').addEventListener('click', function () { clearInterval(timer); });
  document.getElementById('stay').addEventListener('click', function () {
    clearInterval(timer);
    num.textContent = '已取消';
    bar.style.width = '0%';
  });
})();
</script>`;
	return renderPage({ title: '正在跳转', body, scripts });
}

export function renderMessagePage(options: { content: string; title?: string; downloadUrl?: string }): string {
	const payload = {
		content: options.content,
		title: options.title ?? '分享内容',
		downloadUrl: options.downloadUrl ?? null,
	};
	const body = `
<main class="card wide-card">
  <div class="card-head">
    <a href="/" class="home-link" aria-label="返回首页"><img class="page-logo small" src="/logo.svg" alt="OneLink"></a>
    <h1 id="page-title"></h1>
  </div>
  <article id="content" class="markdown-body"></article>
  <div class="btn-row">
    <button id="copy-btn" class="btn ghost" type="button">复制原文</button>
    <a id="download-btn" class="btn primary hidden" rel="noopener noreferrer">下载原始文件</a>
  </div>
</main>`;
	const headExtra = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" defer></script>`;
	const scripts = `
<script type="application/json" id="payload">${jsonForScript(payload)}</script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  var payload = JSON.parse(document.getElementById('payload').textContent);
  document.getElementById('page-title').textContent = payload.title;
  var rendered = marked.parse(payload.content);
  document.getElementById('content').innerHTML = DOMPurify.sanitize(rendered);
  document.querySelectorAll('#content pre code').forEach(function (block) { hljs.highlightElement(block); });
  document.getElementById('copy-btn').addEventListener('click', function (event) {
    navigator.clipboard.writeText(payload.content).then(function () {
      event.target.textContent = '已复制 ✓';
      setTimeout(function () { event.target.textContent = '复制原文'; }, 1800);
    });
  });
  if (payload.downloadUrl) {
    var link = document.getElementById('download-btn');
    link.href = payload.downloadUrl + (payload.downloadUrl.indexOf('?') === -1 ? '?download=true' : '&download=true');
    link.classList.remove('hidden');
  }
});
</script>`;
	return renderPage({ title: payload.title, body, headExtra, scripts });
}

export function renderPasswordPage(code: string, wrong: boolean): string {
	const body = `
<main class="card" style="text-align:center">
  <p class="eyebrow">密码保护</p>
  <h1>此内容已被加密</h1>
  <p class="subtitle">输入创建者设置的访问密码以继续</p>
  ${wrong ? '<p class="error-text">密码不正确，请重试。</p>' : ''}
  <form method="POST" action="/${escapeHtml(code)}" style="display:flex;gap:10px;margin-top:8px">
    <input type="password" name="password" placeholder="访问密码" required autofocus autocomplete="off">
    <button class="btn primary" type="submit" style="flex:none">解锁</button>
  </form>
</main>`;
	return renderPage({ title: '需要密码', body });
}

const TYPE_LABELS: Record<ShareItem['type'], string> = {
	link: '🔗 短链接',
	message: '📝 消息',
	file: '📄 文件',
};

export function renderStatsPage(code: string, item: ShareItem): string {
	const meta = [
		{ k: '类型', v: TYPE_LABELS[item.type] },
		{ k: '创建时间', v: formatUtcTime(item.createdAt) },
		{
			k: '有效期',
			v: item.oneTime ? '阅后即焚' : item.expiryTimestamp ? formatUtcTime(item.expiryTimestamp) : '永久',
		},
	];
	if (item.filename) meta.push({ k: '文件', v: `${item.filename}（${formatBytes(item.size)}）` });
	if (item.password) meta.push({ k: '密码保护', v: '已启用' });

	const historyRows = (item.history ?? [])
		.map(
			(record) =>
				`<tr><td>${countryFlag(record.country)} ${escapeHtml(record.country || 'N/A')}</td><td>${formatUtcTime(record.time)}</td></tr>`,
		)
		.join('');

	const body = `
<main class="card wide-card">
  <div class="card-head">
    <a href="/" class="home-link" aria-label="返回首页"><img class="page-logo small" src="/logo.svg" alt="OneLink"></a>
    <h1>访问统计 /${escapeHtml(code)}</h1>
  </div>
  <div class="views-line"><span class="views-num">${item.views}</span><span class="hint">总访问次数</span></div>
  <div class="meta-grid">
    ${meta.map((entry) => `<div class="meta-item"><div class="k">${entry.k}</div><div class="v">${escapeHtml(entry.v)}</div></div>`).join('')}
  </div>
  <div class="table-wrap">
    <table class="stats">
      <thead><tr><th>来源国家 / 地区</th><th>时间（UTC）</th></tr></thead>
      <tbody>
        ${historyRows || '<tr><td colspan="2" class="empty-row">暂无访问记录</td></tr>'}
      </tbody>
    </table>
  </div>
</main>`;
	return renderPage({ title: `统计 /${code}`, body });
}

export function renderPreviewPage(options: {
	fileUrl: string;
	contentType: string;
	filename: string;
	size?: number;
}): string {
	const { fileUrl, contentType, filename, size } = options;
	const safeName = escapeHtml(filename);
	let media = '';
	if (contentType.startsWith('video/')) {
		media = `<video class="media-frame" controls preload="metadata" src="${escapeHtml(fileUrl)}"></video>`;
	} else if (contentType.startsWith('audio/')) {
		media = `<audio controls preload="metadata" style="width:100%" src="${escapeHtml(fileUrl)}"></audio>`;
	} else if (contentType === 'application/pdf') {
		media = `<object class="pdf-frame" data="${escapeHtml(fileUrl)}" type="application/pdf"><p class="hint">浏览器无法内嵌预览 PDF，<a href="${escapeHtml(fileUrl)}?download=true">点此下载</a>。</p></object>`;
	}
	const body = `
<main class="card wide-card">
  <div class="card-head">
    <a href="/" class="home-link" aria-label="返回首页"><img class="page-logo small" src="/logo.svg" alt="OneLink"></a>
    <h1 class="file-title">${safeName}</h1>
  </div>
  ${media}
  <p class="file-meta">${escapeHtml(contentType)} · ${formatBytes(size)}</p>
  <div class="btn-row"><a class="btn primary" href="${escapeHtml(fileUrl)}?download=true">下载文件</a></div>
</main>`;
	return renderPage({ title: `预览 ${filename}`, body });
}

export function renderDownloadPage(options: {
	fileUrl: string;
	filename: string;
	contentType: string;
	size?: number;
}): string {
	const body = `
<main class="card" style="text-align:center">
  <p class="eyebrow">文件分享</p>
  <h1 class="file-title">${escapeHtml(options.filename)}</h1>
  <p class="subtitle">${escapeHtml(options.contentType)} · ${formatBytes(options.size)}</p>
  <div class="btn-row"><a class="btn primary" href="${escapeHtml(options.fileUrl)}?download=true">立即下载</a></div>
</main>`;
	return renderPage({ title: `下载 ${options.filename}`, body });
}

export function renderNotFoundPage(reason = '这个短链接不存在，或已经过期销毁。'): string {
	const body = `
<main class="card" style="text-align:center">
  <p class="views-num" style="margin:0">404</p>
  <h1>找不到这个链接</h1>
  <p class="subtitle">${escapeHtml(reason)}</p>
  <div class="btn-row"><a class="btn primary" href="/">去创建一个分享</a></div>
</main>`;
	return renderPage({ title: '404', body });
}

export function renderErrorPage(): string {
	const body = `
<main class="card" style="text-align:center">
  <p class="views-num" style="margin:0">:(</p>
  <h1>服务器开小差了</h1>
  <p class="subtitle">发生了意外错误，请稍后重试。</p>
  <div class="btn-row"><a class="btn ghost" href="/">返回首页</a></div>
</main>`;
	return renderPage({ title: '错误', body });
}
