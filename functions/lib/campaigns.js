// Fun, on-brand email campaigns for AutoMem

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildDay1Email(opts = {}) {
  const {
    baseUrl = 'https://automem.ai',
    repoUrl = 'https://github.com/verygoodplugins/automem',
    quickstartUrl = baseUrl + '/docs/quickstart',
    docsUrl = baseUrl + '/docs',
    unsubscribeUrl = baseUrl + '/unsubscribe',
  } = opts;

  const subject = '🤖 Memory Tricks: 3 pro tips in 3 minutes';
  const text = [
    'Beep boop! Day 1 memory tips:',
    '1) Tag smartly: project and topic (e.g. #backend #typescript)\n2) Associate memories: connect insights to decisions\n3) Hybrid search: mix semantic + tags + time',
    `Quickstart: ${quickstartUrl}`,
    `Docs: ${docsUrl}`,
    `Repo: ${repoUrl}`,
    '',
    'Unsubscribe: ' + unsubscribeUrl
  ].join('\n');

  const robot = 'https://automem.ai/robot-icon.svg';
  const html = `
  <html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{background:#f7fafc;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0}
    a{color:#111827;text-decoration:underline}
    .wrap{max-width:640px;margin:0 auto;padding:24px}
    .card{background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:24px}
    .h{display:flex;gap:12px;align-items:center}
    .chip{display:inline-block;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:#fff;border-radius:999px;padding:4px 10px;font-size:12px}
    h1{font-size:22px;margin:8px 0 0 0;color:#111827}
    ul{margin:12px 0 0 18px}
    .btn{display:inline-block;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:#fff;padding:10px 14px;border-radius:10px;font-weight:600;margin-right:8px}
    .ft{color:#6b7280;font-size:12px;margin-top:24px}
    @media (prefers-color-scheme:dark){body{background:#0f0f10;color:#eaeaea}.card{background:#111214;border-color:#2a2a2e}h1{color:#fff}.ft{color:#9ca3af}}
  </style></head>
  <body><div class="wrap"><div class="card">
    <div class="h">
      <span style="width:42px;height:42px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;overflow:hidden;display:inline-block;vertical-align:middle"><img src="https://automem.ai/robot-icon.png" width="42" height="42" alt="AutoMem robot" style="display:block;border-radius:8px"/></span>
      <div><span class="chip">automem.ai</span><h1>Day 1: Memory power‑ups</h1></div>
    </div>
    <p style="margin-top:12px">Beep boop! Three quick wins to supercharge your AI’s memory:</p>
    <ol style="margin-left:18px">
      <li><strong>Tag smartly</strong> — use <code>#project</code> + <code>#topic</code> (e.g. <code>typescript</code>, <code>backend</code>).</li>
      <li><strong>Associate memories</strong> — connect insights to decisions for graph traversal.</li>
      <li><strong>Hybrid search</strong> — combine semantic + tags + time filters.</li>
    </ol>
    <p style="margin-top:14px">
      <a class="btn" href="${esc(quickstartUrl)}">Open Quickstart</a>
      <a class="btn" href="${esc(repoUrl)}">View Repo</a>
    </p>
    <p class="ft">Got questions? Reply to this email — we’ll help you get set up fast.</p>
    <p class="ft">Docs: <a href="${esc(docsUrl)}">${esc(docsUrl)}</a> • Unsubscribe: <a href="${esc(unsubscribeUrl)}">${esc(unsubscribeUrl)}</a></p>
  </div></div></body></html>`;

  return { subject, html, text };
}
