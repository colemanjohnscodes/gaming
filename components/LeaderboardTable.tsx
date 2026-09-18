import type { LedgerEntry } from "@/lib/scores";

type LeaderboardTableProps = {
  entries: LedgerEntry[];
  empty: string;
};

export function LeaderboardTable({ entries, empty }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return <p className="text-sm leading-relaxed text-ink-muted">{empty}</p>;
  }

  return (
    <ol className="divide-y divide-gold/20">
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className="flex items-baseline justify-between gap-4 py-3 text-sm"
        >
          <span className="flex min-w-0 items-baseline gap-4">
            <span className="w-6 shrink-0 text-ink-muted tabular-nums">
              {index + 1}
            </span>
            <span className="truncate text-cream">{entry.display_name}</span>
          </span>
          <span className="shrink-0 tracking-[0.12em] text-gold tabular-nums">
            {entry.score}
          </span>
        </li>
      ))}
    </ol>
  );
}
