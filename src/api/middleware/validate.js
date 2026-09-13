import { ValidationError } from '../../lib/errors.js';

const formatIssues = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));

/**
 * Parse-don't-validate at the edge.
 *
 * Handlers below this point receive `req.validated`, which is typed, trimmed and
 * defaulted -- so no route or service ever re-checks whether a field is present.
 * Results are written to `req.validated` rather than back onto `req.query`,
 * which is a getter in Express 5.
 */
export const validate =
  ({ body, params, query }) =>
  (req, _res, next) => {
    const validated = {};

    for (const [key, schema, source] of [
      ['body', body, req.body],
      ['params', params, req.params],
      ['query', query, req.query],
    ]) {
      if (!schema) continue;
      const result = schema.safeParse(source ?? {});
      if (!result.success) {
        return next(
          new ValidationError(`Invalid request ${key}`, {
            source: key,
            issues: formatIssues(result.error),
          }),
        );
      }
      validated[key] = result.data;
    }

    req.validated = validated;
    return next();
  };
