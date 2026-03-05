import type { OGVariable } from '@og/shared'

export class VariableValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VariableValidationError'
  }
}

/**
 * Validates and coerces a raw string map of variables against the declared
 * schema.  Returns a typed map ready to pass into `transpileTemplate`.
 *
 * Throws `VariableValidationError` on the first invalid value.
 */
export function validateAndCoerceVariables(
  schema: OGVariable[],
  raw: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const variable of schema) {
    const value = raw[variable.name]

    // Missing / empty value — apply required check then fall back to default
    if (value === undefined || value === '') {
      if (variable.required && variable.default === undefined) {
        throw new VariableValidationError(
          `Missing required variable: "${variable.name}"`,
        )
      }
      result[variable.name] = variable.default ?? ''
      continue
    }

    switch (variable.type) {
      case 'number': {
        const num = Number(value)
        if (Number.isNaN(num)) {
          throw new VariableValidationError(
            `Variable "${variable.name}" must be a number, got: "${value}"`,
          )
        }
        result[variable.name] = num
        break
      }

      case 'boolean': {
        if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
          throw new VariableValidationError(
            `Variable "${variable.name}" must be a boolean (true/false/1/0), got: "${value}"`,
          )
        }
        result[variable.name] = value === 'true' || value === '1'
        break
      }

      case 'string':
      default:
        result[variable.name] = value
        break
    }
  }

  return result
}
