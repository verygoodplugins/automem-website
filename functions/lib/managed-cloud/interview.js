import { INTERVIEW_STEPS } from './constants.js';

function trimValue(value = '') {
  return String(value || '').trim();
}

function sentenceCase(value = '') {
  const text = trimValue(value);
  if (!text) {
    return '';
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function extractIdentity(answer = '') {
  const text = trimValue(answer);
  if (!text) {
    return {};
  }
  const fragments = text.split(/[\.\n]/).map((part) => part.trim()).filter(Boolean);
  const first = fragments[0] || text;
  const companyMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9&.\- ]+)/);
  const nameMatch = text.match(/(?:i am|i'm|my name is)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i);
  return {
    raw: text,
    name: nameMatch?.[1] || null,
    role: first,
    company: companyMatch?.[1]?.trim() || null,
  };
}

function updateProfile(profile, stepKey, answer) {
  const next = { ...(profile || {}) };
  if (stepKey === 'identity') {
    next.identity = {
      ...(next.identity || {}),
      ...extractIdentity(answer),
    };
    return next;
  }
  next[stepKey] = {
    answer: trimValue(answer),
  };
  return next;
}

function buildSummary(profile = {}) {
  const lines = [];
  if (profile.identity?.raw) {
    lines.push(`I have your baseline profile: ${profile.identity.raw}.`);
  }
  if (profile.tools?.answer) {
    lines.push(`Your active tool stack includes ${profile.tools.answer}.`);
  }
  if (profile.projects?.answer) {
    lines.push(`Your current focus is ${profile.projects.answer}.`);
  }
  if (profile.communication?.answer) {
    lines.push(`I will adapt to ${profile.communication.answer}.`);
  }
  if (profile.context?.answer) {
    lines.push(`I am also carrying this extra context: ${profile.context.answer}.`);
  }
  return lines.join(' ');
}

function buildFallbackReply(questionIndex, profile, answer) {
  const acknowledgement = answer
    ? `Got it. ${sentenceCase(answer).replace(/\.$/, '')}.`
    : 'I am ready when you are.';
  const nextStep = INTERVIEW_STEPS[questionIndex];
  if (!nextStep) {
    return `${acknowledgement} ${buildSummary(profile)} I am setting up your memory now.`;
  }
  return `${acknowledgement} ${nextStep.question}`;
}

export function createInitialInterviewMessage() {
  return `Welcome to AutoMem Managed Cloud. ${INTERVIEW_STEPS[0].question}`;
}

export function buildInterviewState(session) {
  return {
    current_question_index: session?.current_question_index || 0,
    interview_complete: Boolean(session?.interview_complete),
    skipped: Boolean(session?.skipped),
    transcript: session?.transcript || [],
    profile: session?.profile || {},
  };
}

export async function advanceInterview({ session, userMessage, assistantReply }) {
  const currentQuestion = INTERVIEW_STEPS[session.current_question_index] || null;
  const nextProfile = currentQuestion
    ? updateProfile(session.profile || {}, currentQuestion.key, userMessage)
    : { ...(session.profile || {}) };
  const nextQuestionIndex = currentQuestion
    ? Math.min(session.current_question_index + 1, INTERVIEW_STEPS.length)
    : session.current_question_index;
  const complete = nextQuestionIndex >= INTERVIEW_STEPS.length;
  const reply =
    assistantReply ||
    buildFallbackReply(nextQuestionIndex, nextProfile, userMessage);

  const transcript = [
    ...(session.transcript || []),
    { role: 'user', content: trimValue(userMessage) },
    { role: 'assistant', content: reply },
  ];

  return {
    transcript,
    profile: nextProfile,
    current_question_index: nextQuestionIndex,
    interview_complete: complete,
    skipped: false,
    completed_at: complete ? new Date().toISOString() : null,
    reply,
  };
}

export function skipInterview(session) {
  const reply = 'No problem. We can keep this lightweight and let AutoMem learn as you work.';
  return {
    transcript: [
      ...(session.transcript || []),
      { role: 'assistant', content: reply },
    ],
    profile: session.profile || {},
    current_question_index: session.current_question_index || 0,
    interview_complete: true,
    skipped: true,
    completed_at: new Date().toISOString(),
    reply,
  };
}
