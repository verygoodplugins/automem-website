export function isCmsEntryNotFoundError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === 'LiveEntryNotFoundError') return true;

  return typeof message === 'string'
    && message.startsWith('Entry ')
    && message.endsWith(' was not found.');
}
