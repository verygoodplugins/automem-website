export function primaryPercent(score) {
  if (!score) return "n/a";
  const match = String(score).match(/\d+(?:\.\d+)?%/);
  return match?.[0] ?? "n/a";
}

export function formatGeneratedDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function statusTone(status) {
  if (status === "canonical") return "accent";
  if (status === "representative_canary" || status === "fresh_verification") return "secondary";
  return "muted";
}

export function sourceLabel(source) {
  if (!source) return "Source";
  if (source.includes("EXPERIMENT_LOG.md")) return "Experiment log";
  if (source.includes("fresh-verification.md")) return "Fresh verification notes";
  if (source.includes("automem-evals")) return "automem-evals";
  return source.split(";")[0];
}

export function artifactUrl(sourceRepo, path) {
  return `https://github.com/${sourceRepo}/blob/main/${path}`;
}
