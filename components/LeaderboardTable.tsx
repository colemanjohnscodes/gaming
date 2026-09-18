import { cn } from "@/lib/cn";
import { ledgerRank, type LedgerBest } from "@/lib/scores";

type LeaderboardTableProps = {
  entries: LedgerBest[];
  empty: string;
  highlightUserId?: string | null;
  showSittings?: boolean;
};

export function LeaderboardTable({
  entries,
  empty,
  highlightUserId,
  showSittings = false,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return <p className="text-sm leading-relaxed text-ink-muted">{empty}</p>;
  }

  return (
    <ol className="divide-y divide-gold/20">
      {entries.map((entry, index) => {
        const mine = Boolean(highlightUserId && entry.user_id === highlightUserId);
        return (
          <li
            key={entry.user_id}
            className={cn(
              "flex items-baseline justify-between gap-4 py-3 text-sm",
              mine && "bg-cream/[0.04] px-2 -mx-2",
            )}
          >
            <span className="flex min-w-0 items-baseline gap-4">
              <span
                className={cn(
                  "w-6 shrink-0 tabular-nums",
                  index === 0 ? "text-gold" : "text-ink-muted",
                )}
              >
                {ledgerRank(index)}
              </span>
              <span className="truncate text-cream">{entry.display_name}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-4 tabular-nums">
              {showSittings ? (
                <span className="text-ink-muted">{entry.sittings}</span>
              ) : null}
              <span className="tracking-[0.12em] text-gold">{entry.score}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
