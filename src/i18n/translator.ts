import type { Messages } from "@/i18n/messages";

type InterpolationVars = Record<string, string | number>;

function resolvePath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function createTranslator(messages: Messages) {
  return function t(key: string, vars?: InterpolationVars): string {
    const template = resolvePath(messages, key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = vars[name];
      return value != null ? String(value) : `{${name}}`;
    });
  };
}

export type Translator = ReturnType<typeof createTranslator>;
