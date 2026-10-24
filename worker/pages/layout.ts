export interface PageOptions {
	title: string;
	body: string;
	headExtra?: string;
	scripts?: string;
}

const DYNAMIC_CSS = `
:root{--bg:#ffffff;--surface:#f6f6f6;--surface-2:#ededed;--surface-3:#e0e0e0;--text:#1b1b1b;--text-2:#616161;--border:#e3e3e3;--accent:#0067c0;--accent-hover:#0078d4;--accent-contrast:#ffffff;--accent-soft:rgba(0,103,192,.1);--accent-2:#f7630c;--accent-2-soft:rgba(247,99,12,.12);--danger:#e81123;--danger-soft:rgba(232,17,35,.08);--ok:#10893e;--ring:rgba(0,103,192,.35)}
html.dark{--bg:#1f1f1f;--surface:#2a2a2a;--surface-2:#333333;--surface-3:#3d3d3d;--text:#ffffff;--text-2:#9d9d9d;--border:#3f3f3f;--accent:#4cc2ff;--accent-hover:#66ccff;--accent-contrast:#1f1f1f;--accent-soft:rgba(76,194,255,.12);--accent-2:#ff9440;--accent-2-soft:rgba(255,148,64,.14);--danger:#ff8a94;--danger-soft:rgba(255,138,148,.1);--ok:#6ccb5f;--ring:rgba(76,194,255,.4)}
*{box-sizing:border-box;border-radius:0!important}
html{height:100%}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;font-family:"Segoe UI Variable Text","Segoe UI",-apple-system,"PingFang SC","Microsoft YaHei",Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:28px 16px;border-top:5px solid var(--accent)}
.card{background:var(--surface);border:1px solid var(--border);padding:34px 30px;width:100%;max-width:560px;margin:auto 0;animation:slide-in .2s ease}
.wide-card{max-width:860px}
@keyframes slide-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.card-head{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.page-logo{width:46px;height:46px;flex:none}
.page-logo.small{width:38px;height:38px}
.home-link{display:flex;flex:none}
h1{font-size:1.35rem;margin:0;font-weight:600;letter-spacing:-.01em}
.eyebrow{margin:14px 0 4px;font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-2)}
.subtitle{margin:0 0 18px;color:var(--text-2);font-size:.95rem}
.hint{color:var(--text-2);font-size:.85rem}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-size:.98rem;font-weight:600;border:1px solid transparent;padding:11px 20px;cursor:pointer;text-decoration:none;transition:background .15s,border-color .15s;color:var(--text)}
.btn.primary{color:var(--accent-contrast);background:var(--accent)}
.btn.primary:hover{background:var(--accent-hover)}
.btn.ghost{background:var(--surface-2);border-color:var(--border)}
.btn.ghost:hover{background:var(--surface-3)}
.btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}
input[type="text"],input[type="password"]{width:100%;font:inherit;font-size:1rem;color:var(--text);background:var(--surface-2);border:1px solid var(--border);padding:12px 14px;outline:none;transition:border-color .15s,background .15s}
input:focus-visible{border-color:var(--accent);background:var(--surface)}
::placeholder{color:var(--text-2);opacity:1}
.meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:18px 0}
.meta-item{background:var(--surface-2);border-left:3px solid var(--accent);padding:10px 12px}
.meta-item .k{font-size:.7rem;color:var(--text-2);letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.meta-item .v{font-size:.92rem;font-weight:600;word-break:break-all}
.views-line{display:flex;align-items:baseline;gap:10px;margin:6px 0 4px}
.views-num{font-size:3rem;font-weight:300;color:var(--accent);line-height:1.1}
.table-wrap{border:1px solid var(--border);overflow:auto;max-height:320px;margin-top:12px}
table.stats{width:100%;border-collapse:collapse;font-size:.9rem;text-align:left}
table.stats th,table.stats td{padding:9px 12px;border-bottom:1px solid var(--border)}
table.stats th{font-weight:600;color:var(--text-2);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase}
table.stats tr:last-child td{border-bottom:none}
.empty-row{text-align:center;color:var(--text-2);padding:26px 0}
.target-line{margin:8px 0 2px;color:var(--text-2);font-size:.95rem}
.target-full{margin:0 0 14px;font-size:1.02rem;font-weight:600;word-break:break-all;color:var(--accent)}
.countdown-wrap{margin:18px 0 4px;display:flex;flex-direction:column;align-items:center;gap:8px}
.countdown-bar{width:200px;height:6px;background:var(--surface-3);overflow:hidden}
.countdown-bar span{display:block;height:100%;width:0;background:var(--accent-2)}
.countdown-num{font-size:1.6rem;font-weight:300;color:var(--accent)}
.media-frame{width:100%;background:#000;max-height:70vh}
.pdf-frame{width:100%;height:72vh;border:1px solid var(--border)}
.file-meta{color:var(--text-2);font-size:.9rem;margin:8px 0 0}
.file-title{word-break:break-all}
.error-text{color:var(--danger);background:var(--danger-soft);border-left:4px solid var(--danger);padding:10px 14px;font-size:.9rem;text-align:left}
.markdown-body{font-size:1rem;overflow-wrap:break-word}
.markdown-body h1,.markdown-body h2,.markdown-body h3{letter-spacing:-.01em}
.markdown-body h1{border-bottom:2px solid var(--accent);padding-bottom:6px}
.markdown-body pre{background:#282c34;color:#e6e6e6;padding:16px;overflow:auto;font-size:.88rem}
.markdown-body code{font-family:"Cascadia Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.markdown-body :not(pre)>code{background:var(--surface-2);border:1px solid var(--border);padding:.12em .4em;font-size:.9em}
.markdown-body blockquote{margin:0;padding:2px 16px;border-left:4px solid var(--accent-2);color:var(--text-2)}
.markdown-body img{max-width:100%}
.markdown-body table{border-collapse:collapse}
.markdown-body th,.markdown-body td{border:1px solid var(--border);padding:6px 12px}
.markdown-body a{color:var(--accent)}
.markdown-body hr{border:none;border-top:1px solid var(--border)}
.site-footer{text-align:center;margin-top:30px;padding-top:18px;border-top:1px solid var(--border);font-size:.85rem;color:var(--text-2);width:100%}
.footer-line{display:flex;align-items:center;justify-content:center;gap:8px}
.cf-logo{height:16px;width:auto;opacity:.85}
.tribute{font-family:"Cascadia Mono","Courier New",monospace;font-size:.78rem;opacity:.75;margin:8px 0 6px}
.copyright{margin:0;font-size:.8rem;opacity:.8}
.hidden{display:none!important}
@media (max-width:480px){.card{padding:26px 20px}}
`;

export function renderFooter(): string {
	const year = new Date().getFullYear();
	return `
<footer class="site-footer">
  <div class="footer-line">
    <span>Powered by Cloudflare · Crafted with ❤️</span>
    <img src="/cflogo.svg" alt="Cloudflare" class="cf-logo">
  </div>
  <p class="tribute">Cloudflare的恩情还不完🤚😭✋</p>
  <p class="copyright">© ${year} Linkium · All rights reserved.</p>
</footer>`;
}

export function renderPage({ title, body, headExtra = '', scripts = '' }: PageOptions): string {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title} · OneLink</title>
<link rel="icon" href="/logo.svg" type="image/svg+xml">
<style>${DYNAMIC_CSS}</style>
${headExtra}
</head>
<body>
${body}
${renderFooter()}
${scripts}
</body>
</html>`;
}
