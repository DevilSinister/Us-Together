export type ProjectionVisibility = "shared" | "private" | "secret";

export type DashboardCandidate = {
  id: string;
  kind: "plan" | "memory" | "milestone" | "bucket";
  visibility: ProjectionVisibility;
  occurredAt: string;
};

export function localDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return `${value("year").toString().padStart(4, "0")}-${value("month").toString().padStart(2, "0")}-${value("day").toString().padStart(2, "0")}`;
}

function dateOrdinal(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function relationshipDayCount(startedOn: string, timeZone: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startedOn)) return null;
  return Math.max(0, dateOrdinal(localDateKey(now, timeZone)) - dateOrdinal(startedOn));
}

export function privacySafeCandidates(candidates: DashboardCandidate[]) {
  return candidates.filter((candidate) => candidate.visibility === "shared");
}

export function selectRelevantCandidate(candidates: DashboardCandidate[], kind: DashboardCandidate["kind"]) {
  return privacySafeCandidates(candidates)
    .filter((candidate) => candidate.kind === kind)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id))[0] ?? null;
}
