import { Body, PipeTransform, Query } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z, type ZodType } from 'zod';
import { badRequest } from './errors';

export class ZodValidationPipe<T extends ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw badRequest('validation_failed', 'Validation failed', {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}

/** `@ZodBody(schema) body: z.output<typeof schema>` — validates and parses the request body. */
export const ZodBody = (schema: ZodType): ParameterDecorator => Body(new ZodValidationPipe(schema));

/** Same as ZodBody for query strings. */
export const ZodQuery = (schema: ZodType): ParameterDecorator =>
  Query(new ZodValidationPipe(schema));

/** Documents a zod schema as the request body in Swagger. */
export function ApiZodBody(schema: ZodType): MethodDecorator {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;
  return ApiBody({ schema: jsonSchema });
}
