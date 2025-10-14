// Cloudflare Pages Function for email signup
// This runs on Cloudflare Workers at the edge

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    const { email, source = 'website', turnstileToken } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    
    // Optional: Verify Cloudflare Turnstile token if configured
    if (env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return new Response(JSON.stringify({ success: false, error: 'Verification required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      try {
        const ip = request.headers.get('CF-Connecting-IP') || undefined;
        const form = new URLSearchParams();
        form.set('secret', env.TURNSTILE_SECRET_KEY);
        form.set('response', turnstileToken);
        if (ip) form.set('remoteip', ip);
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST', body: form
        });
        const outcome = await res.json();
        if (!outcome.success) {
          return new Response(JSON.stringify({ success: false, error: 'Verification failed' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Verification error' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email address' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.D1 || env.DB;
    if (!db) {
      throw new Error('D1 binding not found (expected env.D1)');
    }
    // Check if already exists
    const existing = await db.prepare(
      'SELECT email FROM waitlist WHERE email = ?'
    ).bind(normalizedEmail).first();
    
    if (existing) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'You are already on the waitlist!' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store in D1 database
    const isDoubleOptIn = String(env.DOUBLE_OPT_IN || 'false').toLowerCase() === 'true';
    const confirmedFlag = isDoubleOptIn ? 0 : 1;
    await db.prepare(
      'INSERT INTO waitlist (email, source, created_at, confirmed) VALUES (?, ?, ?, ?)'
    ).bind(normalizedEmail, source, new Date().toISOString(), confirmedFlag).run();

    // Optional: Send to email service webhook (ConvertKit, etc)
    if (env.EMAIL_SERVICE_WEBHOOK) {
      const p = fetch(env.EMAIL_SERVICE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: normalizedEmail, 
          tags: ['automem-waitlist'],
          source 
        })
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('Email service webhook non-200:', res.status, text);
        }
      }).catch(err => console.error('Email service webhook failed:', err));
      if (typeof waitUntil === 'function') {
        waitUntil(p);
      }
    }

    // Optional: Double opt-in email via Resend
    if (String(env.DOUBLE_OPT_IN || 'false').toLowerCase() === 'true' && env.RESEND_API_KEY) {
      const { createToken } = await import('../lib/tokens.js');
      const secret = env.CONFIRM_SECRET || env.ADMIN_TOKEN || '';
      const token = await createToken(normalizedEmail, secret, 60 * 60 * 24 * 3); // 3 days
      const originUrl = new URL(request.url);
      const base = env.BASE_URL || `${originUrl.protocol}//${originUrl.host}`;
      const confirmUrl = `${base}/confirm?token=${encodeURIComponent(token)}`;
      const unsubscribeUrl = `${base}/unsubscribe?token=${encodeURIComponent(token)}`;

      const subject = 'Confirm your email for AutoMem';
      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px">
          <h2>Confirm your email</h2>
          <p>Click the button below to confirm your email address.</p>
          <p><a href="${confirmUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Confirm Email</a></p>
          <p>If you didn’t request this, you can ignore this email.</p>
          <p style="margin-top:24px;font-size:12px;color:#666">Or copy and paste this link:<br/><span>${confirmUrl}</span></p>
          <p style="margin-top:24px;font-size:12px;color:#666">Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>
        </div>`;

      const fromEmail = env.FROM_EMAIL || 'no-reply@automem.ai';
      const fromName = env.FROM_NAME || 'AutoMem';
      const p = fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [normalizedEmail],
          subject,
          html
        })
      }).then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          console.error('Resend email failed:', res.status, txt);
        }
      }).catch((err) => console.error('Resend error:', err));
      if (typeof waitUntil === 'function') waitUntil(p);
    }

    // Track signup count
    const count = await db.prepare(
      'SELECT COUNT(*) as total FROM waitlist'
    ).first();

    return new Response(JSON.stringify({ 
      success: true, 
      message: isDoubleOptIn
        ? 'Check your email to confirm your signup.'
        : 'Welcome to the AutoMem waitlist!',
      position: count.total
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
