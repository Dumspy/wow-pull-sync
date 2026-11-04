/**
 * Unparsed JSON. Callers narrow it with the predicates below instead of
 * annotating a payload as `unknown`.
 */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export function isJsonObject(value: unknown): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null;
}

export function isJsonArray(value: unknown): value is Json[] {
  return Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}
