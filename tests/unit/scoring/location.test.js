import { describe, expect, it } from 'vitest';
import { scoreLocation } from '../../../src/domain/scoring/location.js';
import { DEFAULT_TUNING } from '../../../src/domain/scoring/weights.js';
import { aCandidate, aJob } from '../../factories.js';

const score = (candidateLocation, jobLocation, remoteAllowed) =>
  scoreLocation(
    aCandidate({ location: candidateLocation }),
    aJob({ location: jobLocation, remoteAllowed }),
    DEFAULT_TUNING,
  );

describe('scoreLocation', () => {
  it('ranks exact match above remote-allowed above mismatch', () => {
    const exact = score('Bengaluru', 'Bengaluru', false).ratio;
    const remote = score('Bengaluru', 'Berlin', true).ratio;
    const mismatch = score('Bengaluru', 'Berlin', false).ratio;

    expect(exact).toBeGreaterThan(remote);
    expect(remote).toBeGreaterThan(mismatch);
    expect(mismatch).toBe(0);
  });

  it('normalises formatting differences in place names', () => {
    expect(score('bengaluru,  india', 'Bengaluru India', false).ratio).toBe(1);
  });

  it('treats a remote-seeking candidate and a remote-friendly job as a perfect fit', () => {
    const result = score('Remote', 'Berlin', true);

    expect(result.ratio).toBe(1);
    expect(result.match).toBe('remote-preferred');
  });

  it('scores zero when a remote-seeking candidate meets an on-site job', () => {
    expect(score('Remote', 'Berlin', false).ratio).toBe(0);
  });

  it('awards the configured share for a remote-friendly mismatch', () => {
    expect(score('Bengaluru', 'Berlin', true).ratio).toBe(DEFAULT_TUNING.remoteLocationShare);
  });
});
