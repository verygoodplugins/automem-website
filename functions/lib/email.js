// Branded email templates for AutoMem
// Returns { subject, html, text }

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildWelcomeEmail(opts) {
  const {
    baseUrl = 'https://automem.ai',
    repoUrl = 'https://github.com/verygoodplugins/automem',
    docsUrl = baseUrl + '/docs',
    quickstartUrl = baseUrl + '/docs/quickstart',
    unsubscribeUrl = baseUrl + '/unsubscribe',
    userEmail = '',
  } = opts || {};

  const subject = '🤖 Beep boop! Your AutoMem node is online';
  const preheader = 'Links inside: repo, quickstart, docs — welcome aboard!';

  const text = [
    'Beep boop! Welcome to AutoMem.',
    'Useful links:',
    `• GitHub: ${repoUrl}`,
    `• Quickstart: ${quickstartUrl}`,
    `• Docs: ${docsUrl}`,
    '',
    'Unsubscribe: ' + unsubscribeUrl,
  ].join('\n');

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>${escapeHtml(subject)}</title>
       <style>
        body { background:#f7fafc; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; line-height:1.6; }
        a { color:#111827; text-decoration:underline; }
        .container { max-width:680px; margin:0 auto; padding:32px; }
        .card { background:#ffffff; border:1px solid #e5e7eb; border-radius:20px; padding:32px; }
        .brand { display:flex; align-items:center; gap:16px; }
        .title { font-size:24px; margin:6px 0 0 0; color:#111827; }
        .label { display:inline-block; padding:4px 10px; border-radius:999px; background:#eef2f7; color:#374151; font-size:12px; border:1px solid #e5e7eb; }
        .btn { display:inline-block; background:#374151; color:#ffffff !important; padding:14px 18px; border-radius:12px; font-weight:600; margin-top:8px; }
        .btn.secondary { background:#6b7280; }
        .list { list-style:none; padding-left:0; margin:0; }
        .list li { margin:10px 0; }
        .footer { color:#6b7280; font-size:12px; margin-top:28px; }
        @media (prefers-color-scheme: dark) {
          body { background:#0f0f10; color:#eaeaea; }
          .card { background:#111214; border-color:#2a2a2e; }
          .title { color:#ffffff; }
          a { color:#e5e7eb; }
          .label { background:#1f2937; color:#e5e7eb; border-color:#374151; }
          .footer { color:#9ca3af; }
        }
       </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="brand">
            <img src="https://automem.ai/robot-icon.png" alt="AutoMem robot" width="48" height="48" style="display:block;border-radius:8px;" />
            <div>
              <span class="label">automem.ai</span>
              <h1 class="title">Beep boop! Your memory node is online.</h1>
            </div>
          </div>
          <p style="margin-top:20px">Hello${userEmail ? ' ' + escapeHtml(userEmail) : ''}! I’m your friendly memory robot. I’ll help your AI remember things across tools. Here are your launch links:</p>
          <ul class="list">
            <li>🔗 GitHub repo: <a href="${repoUrl}">${repoUrl}</a></li>
            <li>🚀 Quickstart: <a href="${quickstartUrl}">${quickstartUrl}</a></li>
            <li>📚 Docs: <a href="${docsUrl}">${docsUrl}</a></li>
          </ul>
          <p style="margin:20px 0 8px 0">Pro tip: ⭐️ star the repo to follow along. I’ll send occasional updates and memory tips.</p>
          <p style="margin:6px 0 10px 0">Questions? Just reply to this email — a friendly robot will read it (and a human will answer).</p>
          <div style="margin-top:16px;">
            <a class="btn" href="${quickstartUrl}">Open Quickstart 🚀</a>
            <span style="margin-left:8px"></span>
            <a class="btn secondary" href="${repoUrl}">View Repo ⭐️</a>
          </div>
          <p class="footer">Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>
        </div>
      </div>
      <div style="display:none;overflow:hidden;height:0;width:0;">${escapeHtml(preheader)}</div>
    </body>
  </html>`;

  return { subject, html, text };
}

export function buildConfirmEmail(opts) {
  const {
    baseUrl = 'https://automem.ai',
    confirmUrl = baseUrl + '/confirm',
    unsubscribeUrl = baseUrl + '/unsubscribe',
    userEmail = ''
  } = opts || {};

  const subject = '🤖 Confirm to activate your memory node';
  const preheader = 'One click to activate. Beep boop!';
  const text = [
    'Please confirm your email to activate AutoMem.',
    'Confirm: ' + confirmUrl,
    'If this wasn’t you, ignore this email.',
    'Unsubscribe: ' + unsubscribeUrl,
  ].join('\n');
  const html = `
  <!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>${escapeHtml(subject)}</title>
       <style>
        body { background:#f7fafc; margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#111827; line-height:1.6; }
        a { color:#111827; text-decoration:underline; }
        .container { max-width:680px; margin:0 auto; padding:32px; }
        .card { background:#ffffff; border:1px solid #e5e7eb; border-radius:20px; padding:32px; }
        .title { font-size:24px; margin:6px 0 0 0; color:#111827; }
        .chip { display:inline-block; padding:4px 10px; border-radius:999px; background:#eef2f7; color:#374151; font-size:12px; border:1px solid #e5e7eb; }
        .btn { display:inline-block; background:#374151; color:#fff !important; padding:14px 18px; border-radius:12px; font-weight:600; margin-top:8px; }
        .footer { color:#6b7280; font-size:12px; margin-top:28px; }
        @media (prefers-color-scheme: dark) { body { background:#0f0f10; color:#eaeaea; } .card { background:#111214; border-color:#2a2a2e; } .title{color:#ffffff;} a{color:#e5e7eb;} .chip{background:#1f2937;color:#e5e7eb;border-color:#374151} .footer{color:#9ca3af;} }
       </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="https://automem.ai/robot-icon.png" alt="AutoMem robot" width="48" height="48" style="display:block;border-radius:8px;" />
            <div>
              <span class="chip">automem.ai</span>
              <h1 class="title">Confirm to activate your memory node ✅</h1>
            </div>
          </div>
          <p style="margin-top:18px">Hi${userEmail ? ' ' + escapeHtml(userEmail) : ''}! Click once to confirm your email. Then I’ll start remembering across your tools. 🤖</p>
          <p style="margin-top:20px"><a class="btn" href="${confirmUrl}">Confirm Email</a></p>
          <p class="footer">Questions? Reply to this email — we read every message.</p>
          <p class="footer">If this wasn’t you, ignore this message. Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>
        </div>
      </div>
      <div style="display:none;overflow:hidden;height:0;width:0;">${escapeHtml(preheader)}</div>
    </body>
  </html>`;
  return { subject, html, text };
}

export function buildManagedCloudVerifyEmail(opts) {
  const {
    baseUrl = 'https://automem.ai',
    confirmUrl = `${baseUrl}/confirm`,
    unsubscribeUrl = `${baseUrl}/unsubscribe`,
    name = '',
  } = opts || {};

  const subject = 'Confirm your AutoMem Managed Cloud setup';
  const text = [
    `Confirm your email to finish setting up AutoMem Managed Cloud: ${confirmUrl}`,
    '',
    'You can keep onboarding right away, but connecting your tools stays locked until this email is verified.',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>${escapeHtml(subject)}</title>
      <style>
        body { background:#0a0a0a; margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e0e0e0; line-height:1.6; }
        .container { max-width:680px; margin:0 auto; padding:32px; }
        .card { background:#1a1a1a; border:1px solid #333333; border-radius:20px; padding:32px; }
        .chip { display:inline-block; padding:4px 10px; border-radius:999px; background:#8b5cf6; color:#0a0a0a; font-size:12px; font-weight:700; }
        h1 { margin:16px 0 8px 0; font-size:28px; line-height:1.1; }
        p { margin:14px 0; }
        .btn { display:inline-block; background:#f9d857; color:#1a1a1a !important; padding:14px 20px; border-radius:12px; font-weight:700; text-decoration:none; margin-top:18px; }
        a { color:#f9d857; }
        .muted { color:#9ca3af; font-size:12px; margin-top:24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <span class="chip">Managed Cloud</span>
          <h1>Confirm Your Email & Unlock Setup</h1>
          <p>${name ? `Hi ${escapeHtml(name)},` : 'Hi,'} your memory pod is starting in the background. Confirm this email to unlock the final install step and connect AutoMem to your tools.</p>
          <p><a class="btn" href="${confirmUrl}">Confirm Email</a></p>
          <p>You can come back to onboarding any time. Once confirmed, we will drop you right back into the flow.</p>
          <p class="muted">If this was not you, ignore this message. Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>
        </div>
      </div>
    </body>
  </html>`;

  return { subject, html, text };
}
