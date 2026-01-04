import type { AnyRouter } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import { OperationMeta } from './meta';

type ZodTypeAny = z.ZodType;
type AnyZodObject = z.ZodObject;

type ProcedureDef = {
  inputs?: unknown[];
  output?: unknown;
  meta?: OperationMeta;
  type?: 'query' | 'mutation' | 'subscription';
  query?: boolean;
  mutation?: boolean;
  subscription?: boolean;
};

type ProcedureLike = {
  _def: ProcedureDef;
};

const ARRAY_TYPES = new Set(['array', 'ZodArray']);
const OBJECT_TYPES = new Set(['object', 'ZodObject']);
const VOID_TYPES = new Set(['void', 'ZodVoid']);
const PIPE_TYPES = new Set(['pipe', 'ZodPipe', 'ZodPipeline']);
const EFFECT_TYPES = new Set([
  'effects',
  'ZodEffects',
  'transform',
  'ZodTransform',
]);

/**
 * @public
 */
export function generateOpenAPIDocumentFromTRPCRouter<R extends AnyRouter>(
  inRouter: R,
  options: GenerateOpenAPIDocumentOptions<MetaOf<R>> = {},
) {
  const procs = inRouter._def.procedures as Record<string, ProcedureLike>;
  const paths: OpenAPIV3.PathsObject = {};
  const processOperation = (
    op: OpenAPIV3.OperationObject,
    meta?: MetaOf<R>,
  ): OpenAPIV3.OperationObject => {
    return options.processOperation?.(op, meta) || op;
  };
  for (const [procName, proc] of Object.entries(procs)) {
    const procDef = proc._def;

    // ZodArrays are also correct, as .splice(1) will return an empty array
    // it's ok just to return the array itself
    const inputs = Array.isArray(procDef.inputs) ? procDef.inputs : [];
    const firstInput = inputs[0] ?? z.object({});
    const unwrappedFirstInput = unwrapZodType(firstInput) ?? z.object({});
    const input = ARRAY_TYPES.has(getZodTypeName(unwrappedFirstInput) ?? '')
      ? (unwrappedFirstInput as z.ZodArray<ZodTypeAny>)
      : inputs
          .slice(1)
          .reduce<AnyZodObject>(
            (acc, cur) => mergeZodObjects(acc, cur),
            asZodObject(unwrappedFirstInput),
          );
    const output = unwrapZodType(procDef.output);
    const inputSchema = toJsonSchema(input, 'input');
    const outputSchema = output
      ? toJsonSchema(
          z.object({
            result: z.object({
              data: asZodType(output),
            }),
          }),
          'output',
        )
      : undefined;
    const key = [
      '',
      ...(options.pathPrefix || '/').split('/').filter(Boolean),
      procName,
    ].join('/');
    const responses = {
      200: {
        description: (output && asZodType(output).description) || '',
        ...(outputSchema
          ? {
              content: {
                'application/json': {
                  schema: outputSchema,
                },
              },
            }
          : {}),
      },
    };
    const operationInfo: OperationMeta = {
      tags: procName.split('.').slice(0, -1).slice(0, 1),
    };
    if (procDef.meta?.summary !== undefined) {
      operationInfo.summary = procDef.meta.summary;
    }
    if (procDef.meta?.description !== undefined) {
      operationInfo.description = procDef.meta.description;
    }
    if (procDef.meta?.externalDocs !== undefined) {
      operationInfo.externalDocs = procDef.meta.externalDocs;
    }
    if (procDef.meta?.deprecated !== undefined) {
      operationInfo.deprecated = procDef.meta.deprecated;
    }
    if (procDef.meta?.tags !== undefined) {
      operationInfo.tags = procDef.meta.tags;
    }
    if (procDef.type === 'query') {
      paths[key] = {
        get: processOperation(
          {
            ...operationInfo,
            operationId: procName,
            responses,
            parameters: [
              {
                in: 'query',
                name: 'input',
                content: {
                  'application/json': {
                    schema: inputSchema,
                  },
                },
              },
            ],
          },
          procDef.meta,
        ),
      };
    } else {
      paths[key] = {
        post: processOperation(
          {
            ...operationInfo,
            operationId: procName,
            responses,
            requestBody: {
              content: {
                'application/json': {
                  schema: inputSchema,
                },
              },
            },
          },
          procDef.meta,
        ),
      };
    }
  }
  const api: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'tRPC HTTP-RPC',
      version: '',
    },
    paths,
  };
  return api;
}

function getZodTypeName(input: unknown): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const schema = input as {
    type?: unknown;
    _def?: { typeName?: unknown; type?: unknown };
    def?: { type?: unknown };
  };
  if (typeof schema.type === 'string') {
    return schema.type;
  }
  if (typeof schema._def?.type === 'string') {
    return schema._def.type;
  }
  if (typeof schema._def?.typeName === 'string') {
    return schema._def.typeName;
  }
  if (typeof schema.def?.type === 'string') {
    return schema.def.type;
  }
  return null;
}

function hasInnerType(
  value: ZodTypeAny,
): value is ZodTypeAny & { innerType: () => ZodTypeAny } {
  return typeof (value as { innerType?: unknown }).innerType === 'function';
}

function hasUnwrap(
  value: ZodTypeAny,
): value is ZodTypeAny & { unwrap: () => ZodTypeAny } {
  return typeof (value as { unwrap?: unknown }).unwrap === 'function';
}

function hasRemoveDefault(
  value: ZodTypeAny,
): value is ZodTypeAny & { removeDefault: () => ZodTypeAny } {
  return (
    typeof (value as { removeDefault?: unknown }).removeDefault === 'function'
  );
}

function unwrapZodType(input: unknown): ZodTypeAny | null {
  if (!getZodTypeName(input)) {
    return null;
  }

  let current = input as ZodTypeAny;
  let safety = 0;
  while (safety < 10) {
    const typeName = getZodTypeName(current);
    if (!typeName) {
      break;
    }

    if (PIPE_TYPES.has(typeName)) {
      const pipe = current as { out?: ZodTypeAny; in?: ZodTypeAny };
      const next = pipe.out ?? pipe.in;
      if (!next || next === current) {
        break;
      }
      current = next;
      safety += 1;
      continue;
    }

    if (EFFECT_TYPES.has(typeName) && hasInnerType(current)) {
      current = current.innerType();
      safety += 1;
      continue;
    }

    if (hasUnwrap(current)) {
      current = current.unwrap();
      safety += 1;
      continue;
    }

    if (typeName === 'ZodDefault' && hasRemoveDefault(current)) {
      current = current.removeDefault();
      safety += 1;
      continue;
    }

    break;
  }

  return current;
}

function asZodObject(input: unknown) {
  const unwrapped = unwrapZodType(input);
  if (!unwrapped) {
    return z.object({});
  }
  const typeName = getZodTypeName(unwrapped);
  if (typeName && VOID_TYPES.has(typeName)) {
    return z.object({});
  }
  if (!typeName || !OBJECT_TYPES.has(typeName)) {
    throw new Error(`Expected a ZodObject, received: ${String(input)}`);
  }
  return unwrapped as AnyZodObject;
}

function mergeZodObjects(base: AnyZodObject, next: unknown) {
  const unwrapped = unwrapZodType(next);
  if (!unwrapped) {
    return base;
  }
  if (!OBJECT_TYPES.has(getZodTypeName(unwrapped) ?? '')) {
    return base;
  }
  return base.merge(unwrapped as AnyZodObject);
}

function asZodType(input: unknown) {
  const unwrapped = unwrapZodType(input);
  if (!unwrapped) {
    throw new Error(`Expected a Zod schema, received: ${String(input)}`);
  }
  return unwrapped as ZodTypeAny;
}

/**
 * @public
 */
export interface GenerateOpenAPIDocumentOptions<M extends OperationMeta> {
  pathPrefix?: string;
  processOperation?: (
    operation: OpenAPIV3.OperationObject,
    meta: M | undefined,
  ) => OpenAPIV3.OperationObject | undefined;
}

/**
 * Convert a Zod schema to JSON Schema, with compatibility for both Zod 3 and Zod 4
 */
function toJsonSchema(
  input: ZodTypeAny,
  io?: 'input' | 'output',
): OpenAPIV3.SchemaObject {
  try {
    const output = z.toJSONSchema(input, {
      target: 'openapi-3.0',
      ...(io ? { io } : {}),
    }) as OpenAPIV3.SchemaObject & { $schema?: unknown };
    if ('$schema' in output) {
      delete output.$schema;
    }
    return output;
  } catch {
    return {
      type: 'object',
      additionalProperties: true,
    };
  }
}

type MetaOf<R extends AnyRouter> = R['_def']['_config']['$types']['meta'];
