interface Level {
  name: string;
  cls: string;
}

export function levelFor(reviewCount: number): Level {
  if (reviewCount >= 100) return { name: 'Master', cls: 'border-deep-700 bg-deep-50 text-deep-700' };
  if (reviewCount >= 50) return { name: 'Expert', cls: 'border-deep-500 bg-deep-50 text-deep-700' };
  if (reviewCount >= 20) return { name: 'Pro', cls: 'border-ground-500 bg-ground-50 text-ground-700' };
  if (reviewCount >= 5) return { name: 'Contributor', cls: 'border-zinc-300 bg-zinc-50 text-zinc-700' };
  if (reviewCount >= 1) return { name: 'Member', cls: 'border-zinc-200 bg-white text-zinc-600' };
  return { name: 'Newcomer', cls: 'border-zinc-200 bg-white text-zinc-500' };
}

export function LevelBadge({
  reviewCount,
  trustScore,
}: {
  reviewCount: number;
  trustScore: number;
}) {
  const level = levelFor(reviewCount);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${level.cls}`}
      title={`${reviewCount} recensioner, ${trustScore}% trust`}
    >
      {level.name}
    </span>
  );
}
