import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  startTransition,
} from 'react';
import {
  canRevealInstall,
  copyToClipboard,
  getJson,
  postJson,
  statusCopy,
  trialCopy,
  type ManagedCloudStatus,
} from '../lib/managed-cloud';

type TranscriptEntry = {
  role: 'assistant' | 'user';
  content: string;
};

type OnboardingState = {
  current_question_index: number;
  interview_complete: boolean;
  skipped: boolean;
  transcript: TranscriptEntry[];
  profile: Record<string, any>;
};

type EnrichmentItem = {
  item_key: string;
  source_url: string;
  source_type: string;
  title: string;
  summary: string;
  approved: boolean;
};

type Props = {
  token: string;
};

export default function ManagedCloudOnboarding({ token }: Props) {
  const [status, setStatus] = useState<ManagedCloudStatus | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [enrichmentItems, setEnrichmentItems] = useState<EnrichmentItem[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [preseeding, setPreseeding] = useState(false);
  const [resent, setResent] = useState(false);

  const latestAssistantMessage = onboarding?.transcript?.filter((entry) => entry.role === 'assistant').at(-1)?.content;
  const shouldRequestEnrichment = Boolean(onboarding?.profile?.identity?.raw) && !onboarding?.skipped;
  const shouldPreseed = Boolean(
    status &&
      onboarding &&
      !onboarding.skipped &&
      onboarding.interview_complete &&
      ['ready', 'active'].includes(status.status) &&
      !status.onboarding.preseeded_at &&
      !preseeding,
  );

  const revealInstall = canRevealInstall(status);
  const manualConfig = status?.manual_config || '';

  const loadStatus = useEffectEvent(async () => {
    const payload = await getJson<{ success: boolean } & ManagedCloudStatus>(`/api/v1/status/${encodeURIComponent(token)}`);
    startTransition(() => {
      setStatus(payload as ManagedCloudStatus);
    });
  });

  const loadOnboarding = useEffectEvent(async () => {
    const payload = await getJson<{ onboarding: OnboardingState; enrichment_items: EnrichmentItem[] }>(
      `/api/v1/onboarding/${encodeURIComponent(token)}`,
    );
    startTransition(() => {
      setOnboarding(payload.onboarding);
      setEnrichmentItems(payload.enrichment_items || []);
    });
  });

  useEffect(() => {
    let cancelled = false;
    loadStatus().catch((err) => !cancelled && setError(err.message));
    loadOnboarding().catch((err) => !cancelled && setError(err.message));
    const interval = window.setInterval(() => {
      loadStatus().catch(() => undefined);
    }, 5000);
    void postJson('/api/v1/track', { token, event_name: 'onboarding_viewed', page: '/onboarding' }).catch(() => undefined);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadOnboarding, loadStatus, token]);

  useEffect(() => {
    if (!shouldRequestEnrichment || enrichmentItems.length || enriching) {
      return;
    }
    const identity = onboarding?.profile?.identity;
    setEnriching(true);
    void postJson<{ items: EnrichmentItem[] }>(`/api/v1/enrich/${encodeURIComponent(token)}`, {
      identity,
    })
      .then((payload) => {
        startTransition(() => setEnrichmentItems(payload.items || []));
      })
      .catch((err) => setError(err.message))
      .finally(() => setEnriching(false));
  }, [enrichmentItems.length, enriching, onboarding?.profile?.identity, shouldRequestEnrichment, token]);

  useEffect(() => {
    if (!shouldPreseed) {
      return;
    }
    setPreseeding(true);
    void postJson(`/api/v1/preseed/${encodeURIComponent(token)}`)
      .then(() => loadStatus())
      .catch((err) => setError(err.message))
      .finally(() => setPreseeding(false));
  }, [loadStatus, shouldPreseed, token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = await postJson<{ onboarding: OnboardingState }>(`/api/v1/onboarding/${encodeURIComponent(token)}/chat`, {
        message,
      });
      startTransition(() => {
        setOnboarding(payload.onboarding);
        setMessage('');
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = await postJson<{ onboarding: OnboardingState }>(`/api/v1/onboarding/${encodeURIComponent(token)}/chat`, {
        skip: true,
      });
      startTransition(() => setOnboarding(payload.onboarding));
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to skip right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleItem = async (itemKey: string, approved: boolean) => {
    const nextItems = enrichmentItems.map((item) =>
      item.item_key === itemKey ? { ...item, approved } : item,
    );
    setEnrichmentItems(nextItems);
    try {
      const payload = await postJson<{ items: EnrichmentItem[] }>(`/api/v1/enrich/${encodeURIComponent(token)}`, {
        items: nextItems.map(({ item_key, approved: currentApproved }) => ({
          item_key,
          approved: currentApproved,
        })),
      });
      setEnrichmentItems(payload.items || nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save enrichment preferences.');
    }
  };

  const handleResend = async () => {
    setResent(false);
    try {
      await postJson(`/api/v1/verification/${encodeURIComponent(token)}/resend`);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification.');
    }
  };

  const statusSummary = useMemo(() => {
    if (!status) {
      return 'Loading status...';
    }
    return `${statusCopy(status.status)} - ${trialCopy(status.trial_days_remaining, status.tier)}`;
  }, [status]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="border-2 border-lab-text rounded-2xl bg-lab-surface shadow-hard overflow-hidden">
        <header className="border-b border-lab-border px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lab-secondary">Onboarding Wizard</p>
            <h2 className="text-3xl font-bold text-balance mt-2">Build Your Memory Graph While The Pod Comes Online</h2>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="btn-lab"
            disabled={busy}
          >
            Skip For Now
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div className="border border-lab-border rounded-xl bg-lab-bg/70 p-4 min-h-[320px]">
            <div className="space-y-4">
              {(onboarding?.transcript || []).map((entry, index) => (
                <div
                  key={`${entry.role}-${index}`}
                  className={entry.role === 'assistant' ? 'max-w-[90%]' : 'max-w-[85%] ml-auto text-right'}
                >
                  <div
                    className={
                      entry.role === 'assistant'
                        ? 'inline-block rounded-2xl border border-lab-border bg-lab-surface px-4 py-3 text-left'
                        : 'inline-block rounded-2xl border border-lab-accent bg-lab-accent/10 px-4 py-3'
                    }
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="onboarding-answer" className="block text-sm font-bold">
              Your Answer
            </label>
            <textarea
              id="onboarding-answer"
              name="onboarding_answer"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell AutoMem enough to get started..."
              autoComplete="off"
              rows={4}
              className="w-full rounded-xl border border-lab-text bg-lab-bg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-lab-accent"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-lab-accent" disabled={busy || !message.trim()}>
                {busy ? 'Saving...' : 'Send Answer'}
              </button>
              <p className="text-sm text-lab-muted" aria-live="polite">
                {latestAssistantMessage ? 'AutoMem keeps this moving one question at a time.' : 'Warming up the interview...'}
              </p>
            </div>
          </form>

          {error ? (
            <p className="rounded-xl border border-lab-error bg-lab-error/10 px-4 py-3 text-sm" aria-live="polite">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="border-2 border-lab-accent rounded-2xl bg-lab-bg p-6 shadow-hard">
          <p className="text-xs uppercase tracking-[0.2em] text-lab-accent">Provisioning</p>
          <h3 className="text-2xl font-bold mt-2">Managed Cloud Status</h3>
          <p className="text-sm text-lab-muted mt-3">{statusSummary}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt>Email Verified</dt>
              <dd>{status?.email_verified ? 'Yes' : 'Pending'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Pod Status</dt>
              <dd>{status ? statusCopy(status.status) : 'Loading'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Memories Seeded</dt>
              <dd>{status?.stats?.memories_stored ?? 0}</dd>
            </div>
          </dl>
          {!status?.email_verified ? (
            <div className="mt-5 rounded-xl border border-lab-border bg-lab-surface p-4">
              <p className="text-sm">You can keep onboarding right now. Confirm your email to unlock the final install step.</p>
              <button type="button" className="btn-lab mt-4" onClick={handleResend}>
                Resend Verification Email
              </button>
              {resent ? <p className="text-xs text-lab-success mt-2">Verification email sent.</p> : null}
            </div>
          ) : null}
        </section>

        <section className="border-2 border-lab-text rounded-2xl bg-lab-surface p-6 shadow-hard">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-lab-secondary">Public Enrichment</p>
              <h3 className="text-2xl font-bold mt-2">Professional Sources Only</h3>
            </div>
            <span className="text-xs text-lab-muted">{enriching ? 'Searching...' : `${enrichmentItems.length} items`}</span>
          </div>
          <div className="mt-5 space-y-3">
            {enrichmentItems.length ? enrichmentItems.map((item) => (
              <article key={item.item_key} className="rounded-xl border border-lab-border bg-lab-bg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-lab-muted">{item.source_type}</p>
                    <p className="font-bold mt-1 break-words">{item.title}</p>
                    <p className="text-sm text-lab-muted mt-2">{item.summary}</p>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-block mt-3 text-sm underline text-lab-accent"
                    >
                      Open Source
                    </a>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button type="button" className="btn-lab-accent" onClick={() => handleToggleItem(item.item_key, true)}>
                      Keep
                    </button>
                    <button type="button" className="btn-lab" onClick={() => handleToggleItem(item.item_key, false)}>
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-xs text-lab-muted mt-3">{item.approved ? 'Included in onboarding memory.' : 'Excluded from onboarding memory.'}</p>
              </article>
            )) : (
              <p className="text-sm text-lab-muted">
                Once AutoMem learns who you are, it will look for public profiles, talks, and writing that you can approve or remove.
              </p>
            )}
          </div>
        </section>

        <section className="border-2 border-lab-text rounded-2xl bg-lab-bg p-6 shadow-hard">
          <p className="text-xs uppercase tracking-[0.2em] text-lab-secondary">Connect</p>
          <h3 className="text-2xl font-bold mt-2">Install Command</h3>
          {revealInstall ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-lab-accent bg-lab-accent/10 p-4">
                <p className="text-sm font-bold">Your memory is ready.</p>
                <code className="block mt-3 whitespace-pre-wrap break-all text-sm">{status?.install_command}</code>
              </div>
              <button
                type="button"
                className="btn-lab-accent w-full"
                onClick={() => status?.install_command && copyToClipboard(status.install_command)}
              >
                Copy Install Command
              </button>
              {manualConfig ? (
                <>
                  <pre className="rounded-xl border border-lab-border bg-lab-surface p-4 overflow-x-auto text-xs">{manualConfig}</pre>
                  <button
                    type="button"
                    className="btn-lab w-full"
                    onClick={() => copyToClipboard(manualConfig)}
                  >
                    Copy Manual MCP Config
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-lab-muted mt-4">
              AutoMem will reveal the install command as soon as your pod is ready and your email is verified.
            </p>
          )}
          {preseeding ? <p className="text-xs text-lab-muted mt-3">Seeding your first memories...</p> : null}
        </section>
      </aside>
    </div>
  );
}
