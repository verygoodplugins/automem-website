/**
 * Resend Email Provider for EmDash CMS
 *
 * Delivers emdash emails (magic links, invites, etc.) via the Resend API.
 * Reads RESEND_API_KEY, FROM_EMAIL, FROM_NAME from the Cloudflare env at runtime.
 */

import { definePlugin } from 'emdash';
import type { EmailDeliverEvent, PluginContext } from 'emdash';

async function getCloudflareEnv() {
  try {
    const cf = await import('cloudflare:workers');
    return (cf.env ?? {});
  } catch {
    return {};
  }
}

export function createPlugin() {
  return definePlugin({
    id: 'automem-resend-email',
    version: '1.0.0',
    capabilities: ['email:provide', 'network:fetch:any'],
    hooks: {
      'email:deliver': {
        exclusive: true,
        handler: async (event: EmailDeliverEvent, _ctx: PluginContext) => {
          const env = await getCloudflareEnv();
          const apiKey = env.RESEND_API_KEY;
          if (!apiKey) {
            throw new Error('RESEND_API_KEY not set in Cloudflare environment');
          }

          const fromEmail = env.FROM_EMAIL || 'no-reply@automem.ai';
          const fromName = env.FROM_NAME || 'AutoMem';
          const { message } = event;

          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [message.to],
              subject: message.subject,
              text: message.text,
              ...(message.html ? { html: message.html } : {}),
            }),
          });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`Resend API error ${response.status}: ${body}`);
          }
        },
      },
    },
  });
}
