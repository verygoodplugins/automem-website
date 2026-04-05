import { advanceInterview, buildInterviewState, createInitialInterviewMessage, skipInterview } from '../../lib/managed-cloud/interview.js';
import { generateInterviewReply } from '../../lib/managed-cloud/providers.js';
import { findAccountByToken, getEnrichmentItems, getOnboardingSession, recordFunnelEvent, upsertOnboardingSession } from '../../lib/managed-cloud/store.js';
import { jsonResponse, readJson } from '../../lib/managed-cloud/utils.js';

export async function onRequestGet({ env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  let session = await getOnboardingSession(env, params.token);
  if (!session) {
    session = await upsertOnboardingSession(env, params.token, {});
  }
  if (!session.transcript?.length) {
    session = await upsertOnboardingSession(env, params.token, {
      transcript: [{ role: 'assistant', content: createInitialInterviewMessage() }],
    });
  }
  return jsonResponse({
    success: true,
    onboarding: buildInterviewState(session),
    enrichment_items: await getEnrichmentItems(env, params.token),
  });
}

export async function onRequestPost({ request, env, params }) {
  const account = await findAccountByToken(env, params.token);
  if (!account) {
    return jsonResponse({ success: false, error: 'Account not found.' }, { status: 404 });
  }
  const body = await readJson(request);
  const session = await getOnboardingSession(env, params.token) || await upsertOnboardingSession(env, params.token, {});

  if (body.skip) {
    const next = await upsertOnboardingSession(env, params.token, skipInterview(session));
    await recordFunnelEvent(env, {
      token: params.token,
      event_name: 'onboarding_skipped',
      page: '/onboarding',
    });
    return jsonResponse({
      success: true,
      onboarding: buildInterviewState(next),
      reply: next.transcript.at(-1)?.content || '',
    });
  }

  if (!body.message) {
    return jsonResponse({
      success: true,
      onboarding: buildInterviewState(session),
      reply: session.transcript?.at(-1)?.content || createInitialInterviewMessage(),
    });
  }

  const assistantReply = await generateInterviewReply(env, session, body.message).catch(() => null);
  const patch = await advanceInterview({
    session,
    userMessage: body.message,
    assistantReply,
  });
  const next = await upsertOnboardingSession(env, params.token, patch);
  await recordFunnelEvent(env, {
    token: params.token,
    event_name: 'onboarding_answered',
    page: '/onboarding',
    properties: {
      current_question_index: next.current_question_index,
      complete: next.interview_complete,
    },
  });

  return jsonResponse({
    success: true,
    onboarding: buildInterviewState(next),
    reply: patch.reply,
  });
}
