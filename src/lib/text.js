/**
 * Text canonicalisation used for matching skills and locations.
 *
 * Matching is string equality on a canonical form rather than fuzzy/semantic
 * similarity: the brief asks for a transparent, explainable scorer, and a
 * deterministic comparison is something a recruiter can reason about and a test
 * can pin down. See README ("Assumptions") for the trade-off this implies.
 */

/** "Node.js", "node js", "NODE-JS" -> "nodejs" */
export const canonicalSkill = (value) =>
  String(value)
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[\s._\-/\\]+/g, '');

/** "Bengaluru, India" / "bengaluru  india" -> "bengaluru india" */
export const canonicalLocation = (value) =>
  String(value)
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Locations that mean "I am not tied to a city". */
const REMOTE_ALIASES = new Set(['remote', 'anywhere', 'work from home', 'wfh']);

export const meansRemote = (value) => REMOTE_ALIASES.has(canonicalLocation(value));

export const uniqueCanonicalSkills = (skills = []) => {
  const seen = new Set();
  for (const skill of skills) {
    const canonical = canonicalSkill(skill);
    if (canonical) seen.add(canonical);
  }
  return seen;
};
