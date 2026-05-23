export * from "./api/core";
export * from "./api/organization-projects";
export * from "./api/messaging-runtime-oauth";
export * from "./api/workflow-skills-subtasks";
export * from "./api/providers-reports-github";

/** Returns only the keys of `next` whose value differs from `prev` (shallow). */
export function diffPatch<T extends object>(prev: T, next: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (prev[key] !== next[key]) result[key] = next[key];
  }
  return result;
}
