import { canonicalLocation, meansRemote } from '../../lib/text.js';

/**
 * Location dimension.
 *
 * Ordered exactly as the brief requires: same city > remote-friendly > mismatch.
 * Remote is deliberately worth less than an exact match (default 60%) rather
 * than being equivalent -- it removes the relocation blocker but still tends to
 * bring timezone, on-site-day and payroll friction that a local hire does not
 * have. A candidate who explicitly lists themselves as remote is the one case
 * where a remote-friendly job *is* a perfect fit, so that scores full marks.
 */
export const scoreLocation = (candidate, job, tuning) => {
  const candidateLocation = canonicalLocation(candidate.location ?? '');
  const jobLocation = canonicalLocation(job.location ?? '');
  const remoteAllowed = Boolean(job.remoteAllowed);
  const detail = {
    candidateLocation: candidate.location ?? null,
    jobLocation: job.location ?? null,
    remoteAllowed,
  };

  if (candidateLocation && candidateLocation === jobLocation) {
    return { ratio: 1, match: 'exact', reason: `Both based in ${job.location}`, detail };
  }

  if (meansRemote(candidateLocation) && remoteAllowed) {
    return {
      ratio: 1,
      match: 'remote-preferred',
      reason: 'Candidate wants remote work and the job allows it',
      detail,
    };
  }

  if (remoteAllowed) {
    return {
      ratio: tuning.remoteLocationShare,
      match: 'remote-allowed',
      reason: `Different location (${candidate.location} vs ${job.location}) but the job is remote-friendly`,
      detail,
    };
  }

  return {
    ratio: 0,
    match: 'mismatch',
    reason: `On-site in ${job.location}, candidate is in ${candidate.location}`,
    detail,
  };
};
