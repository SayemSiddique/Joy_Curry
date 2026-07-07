/**
 * Artisan Vault — loyalty milestone configuration.
 *
 * Earning rule (enforced in models/order.js): $1 spent = 100 points
 * (points_earned = floor(total_cents / 100) * 100).
 *
 * Milestones are ordered ascending by points. A milestone is "unlocked" once
 * the customer's running balance reaches its point threshold.
 */
export const MILESTONES = [
  { points: 1000,  label: 'Infused Artisan Drink',   itemCategory: 'beverage' },
  { points: 5000,  label: 'Small Batch Side Dish',   itemCategory: 'appetizer' },
  { points: 12000, label: 'Express Lunch Selection', itemCategory: 'combo' },
  { points: 15000, label: 'Full Estate Entrée',      itemCategory: 'chicken-entree' },
];

/** Find a milestone by its exact point threshold, or null. */
export function getMilestoneByPoints(points) {
  return MILESTONES.find((m) => m.points === points) ?? null;
}

/**
 * Build the rewards summary for a given balance:
 *   - balance        current point total
 *   - unlocked       milestones the customer can redeem right now
 *   - nextMilestone  the next locked milestone (null once all unlocked)
 *   - pointsToNext   points still needed for nextMilestone (0 when maxed)
 *   - progressPct    0–100 progress from the previous tier toward nextMilestone
 */
export function buildRewardsSummary(balance) {
  const points = Number.isInteger(balance) ? balance : 0;

  const milestones = MILESTONES.map((m) => ({
    ...m,
    unlocked: points >= m.points,
  }));

  const unlocked = milestones.filter((m) => m.unlocked);
  const nextMilestone = milestones.find((m) => !m.unlocked) ?? null;

  const prevThreshold = unlocked.length > 0 ? unlocked[unlocked.length - 1].points : 0;
  const pointsToNext = nextMilestone ? nextMilestone.points - points : 0;

  let progressPct = 100;
  if (nextMilestone) {
    const span = nextMilestone.points - prevThreshold;
    progressPct = span > 0 ? Math.round(((points - prevThreshold) / span) * 100) : 0;
  }

  return {
    balance: points,
    milestones,
    unlocked,
    nextMilestone,
    pointsToNext,
    progressPct,
  };
}
