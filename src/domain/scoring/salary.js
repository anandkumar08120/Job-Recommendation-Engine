/**
 * Salary dimension -- scored on how the expectation sits against the band.
 *
 *   expected <= min            -> 1.0   the whole band clears the expectation
 *   min < expected <= max      -> 1.0 .. floor (default 0.5), linearly
 *                                       payable, but the headroom is shrinking
 *   max < expected <= max*1.1  -> 0.15 .. 0, linearly
 *                                       "near zero": a small, negotiable gap
 *   expected > max*1.1         -> 0     the job cannot pay what they want
 *
 * The interesting choice is the in-range floor. An expectation sitting exactly
 * at the top of the band is technically affordable but leaves nothing for a
 * counter-offer or a raise, so it is worth materially less than a band that
 * starts above the expectation -- half marks rather than full. The tolerance
 * Crossing the ceiling is a cliff rather than a slope. The brief requires a job
 * whose max is below the expectation to score near zero, so the moment the
 * expectation passes max the dimension drops to `salaryOverreachCeiling` (15%)
 * and decays from there to exactly zero. The narrow tolerance band exists only
 * because advertised ranges are negotiable -- it is never enough to carry an
 * unaffordable job into the top results on its own.
 */
export const scoreSalary = (candidate, job, tuning) => {
  const expected = candidate.expectedSalary ?? 0;
  const { min, max } = job.salaryRange ?? {};
  const detail = { expectedSalary: expected, salaryRange: { min, max } };

  if (expected <= 0) {
    return {
      ratio: 1,
      fit: 'no-expectation',
      reason: 'Candidate stated no salary expectation',
      detail,
    };
  }

  if (expected <= min) {
    return {
      ratio: 1,
      fit: 'below-range',
      reason: `Expectation (${expected}) is at or below the bottom of the band (${min}-${max})`,
      detail,
    };
  }

  if (expected <= max) {
    const span = max - min;
    // position: 0 at the bottom of the band, 1 at the ceiling.
    const position = span > 0 ? (expected - min) / span : 1;
    const ratio = 1 - (1 - tuning.salaryInRangeFloor) * position;
    return {
      ratio,
      fit: 'within-range',
      reason: `Expectation (${expected}) sits inside the band (${min}-${max}) with ${Math.round((1 - position) * 100)}% headroom`,
      detail: { ...detail, headroomPct: Math.round((1 - position) * 100) },
    };
  }

  const tolerance = max * tuning.salaryOverreachTolerance;
  const overreach = expected - max;

  if (tolerance > 0 && overreach < tolerance) {
    const ratio = tuning.salaryOverreachCeiling * (1 - overreach / tolerance);
    return {
      ratio,
      fit: 'slightly-above-range',
      reason: `Expectation (${expected}) is ${Math.round((overreach / max) * 100)}% above the ceiling (${max}) -- close enough to negotiate`,
      detail: { ...detail, overreach },
    };
  }

  return {
    ratio: 0,
    fit: 'above-range',
    reason: `Job ceiling (${max}) cannot meet the expectation (${expected})`,
    detail: { ...detail, overreach },
  };
};
