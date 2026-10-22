import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

interface RequestSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Validates body/params/query against zod schemas. On success the parsed
 * (trimmed, coerced, unknown-keys-stripped) values replace the originals.
 */
export const validate = (schemas: RequestSchemas) => (req: Request, res: Response, next: NextFunction): void => {
  const errors: { location: string; path: string; message: string }[] = [];

  for (const location of ['params', 'query', 'body'] as const) {
    const schema = schemas[location];
    if (!schema) continue;

    const result = schema.safeParse(req[location]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ location, path: issue.path.join('.'), message: issue.message });
      }
      continue;
    }

    if (location === 'body') {
      req.body = result.data;
    } else {
      // req.query / req.params may be getter-only in some Express versions
      Object.defineProperty(req, location, { value: result.data, writable: true, configurable: true, enumerable: true });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
    return;
  }

  next();
};
