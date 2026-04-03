export const STRIPE_API_VERSION = '2026-02-25.clover';
export const DEFAULT_TRIAL_DAYS = 30;

export const TIER_FEATURES = {
  starter: {
    qdrant_enabled: false,
    graph_expansion: false,
    max_connections: 1,
    embeddings: 'byo',
    automem_watch: false,
    data_export: false,
  },
  pro: {
    qdrant_enabled: true,
    graph_expansion: true,
    max_connections: 25,
    embeddings: 'managed',
    automem_watch: true,
    data_export: true,
  },
  ultimate: {
    qdrant_enabled: true,
    graph_expansion: true,
    max_connections: 250,
    embeddings: 'premium',
    automem_watch: true,
    data_export: true,
  },
};

export const PLAN_PRICE_ENV = {
  pro: 'STRIPE_PRICE_PRO',
  ultimate: 'STRIPE_PRICE_ULTIMATE',
};

export const PROFESSIONAL_SOURCE_HOSTS = [
  'linkedin.com',
  'github.com',
  'x.com',
  'twitter.com',
  'dev.to',
  'medium.com',
  'substack.com',
  'speakerdeck.com',
  'youtube.com',
  'hashnode.com',
];

export const INTERVIEW_STEPS = [
  {
    key: 'identity',
    question: "What is your name, and what do you do day to day?",
    placeholder: 'Example: I am Maya, a staff engineer building AI tools at Acme...',
  },
  {
    key: 'tools',
    question: 'Which AI tools are part of your workflow right now?',
    placeholder: 'Example: Claude Code, Cursor, ChatGPT, and Copilot...',
  },
  {
    key: 'projects',
    question: 'What are you working on right now, and what matters most this month?',
    placeholder: 'Example: shipping a launch, refactoring billing, hiring...',
  },
  {
    key: 'communication',
    question: 'How should your AI communicate with you when work gets messy?',
    placeholder: 'Example: direct, concise, code-heavy, challenge me when needed...',
  },
  {
    key: 'context',
    question: 'Anything else your AI should know before you get started?',
    placeholder: 'Example: team norms, preferences, goals, recurring pain points...',
  },
];
