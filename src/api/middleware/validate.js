import { ValidationError } from '../../lib/errors.js';

const formatIssues = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));

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
