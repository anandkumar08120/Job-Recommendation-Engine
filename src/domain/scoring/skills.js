import { canonicalSkill, uniqueCanonicalSkills } from '../../lib/text.js';

export const scoreSkills = (candidate, job, tuning) => {
  const candidateSkills = uniqueCanonicalSkills(candidate.skills);
  const required = job.requiredSkills ?? [];

  const mustHave = required.filter((skill) => skill.mustHave);
  const niceToHave = required.filter((skill) => !skill.mustHave);

  const has = (skill) => candidateSkills.has(canonicalSkill(skill.name));
  const missingMustHave = mustHave.filter((skill) => !has(skill)).map((skill) => skill.name);
  const matchedMustHave = mustHave.filter(has).map((skill) => skill.name);
  const matchedNiceToHave = niceToHave.filter(has).map((skill) => skill.name);
  const missingNiceToHave = niceToHave.filter((skill) => !has(skill)).map((skill) => skill.name);

  if (missingMustHave.length > 0) {
    return {
      eligible: false,
      ratio: 0,
      reason: `Missing must-have skill(s): ${missingMustHave.join(', ')}`,
      detail: {
        mustHave: {
          required: mustHave.length,
          matched: matchedMustHave.length,
          missing: missingMustHave,
        },
        niceToHave: {
          required: niceToHave.length,
          matched: matchedNiceToHave.length,
          missing: missingNiceToHave,
        },
      },
    };
  }

  const niceToHaveCoverage =
    niceToHave.length === 0 ? 1 : matchedNiceToHave.length / niceToHave.length;

  const ratio = tuning.mustHaveShare + (1 - tuning.mustHaveShare) * niceToHaveCoverage;

  const mustHavePhrase =
    mustHave.length === 0
      ? 'Job lists no must-have skills'
      : `Has all ${mustHave.length} must-have skill${mustHave.length === 1 ? '' : 's'}`;

  const reason =
    niceToHave.length === 0
      ? `${mustHavePhrase}; no nice-to-haves listed`
      : `${mustHavePhrase}; matched ${matchedNiceToHave.length} of ${niceToHave.length} nice-to-haves`;

  return {
    eligible: true,
    ratio,
    reason,
    detail: {
      mustHave: { required: mustHave.length, matched: matchedMustHave.length, missing: [] },
      niceToHave: {
        required: niceToHave.length,
        matched: matchedNiceToHave.length,
        missing: missingNiceToHave,
      },
    },
  };
};
