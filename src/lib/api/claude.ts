import Anthropic from "@anthropic-ai/sdk";
import { apiEnv } from "@/config/api-env";

export const CLAUDE_MODEL = "claude-sonnet-4-6";

export type ClaudeUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: apiEnv.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function callClaudeJson<T>({
  systemPrompt,
  userPrompt,
  maxTokens = 2000,
  temperature = 0.3,
  schema,
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  schema: string;
}): Promise<{ data: T; usage: ClaudeUsage }> {
  const enhancedSystem = `${systemPrompt}

KRYTYCZNE WYMAGANIA OUTPUTU:
- Odpowiadasz WYŁĄCZNIE poprawnym JSON, bez \`\`\`json\`\`\` fence'ów
- Output musi pasować do schematu: ${schema}
- Każdy fakt który podajesz MUSI pochodzić z dostarczonych danych
- Jeśli czegoś nie ma w danych - NIE wymyślaj, użyj null lub pomiń pole
- NIE generuj cen, nazw, linków których nie ma w input data`;

  const response = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: enhancedSystem,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  if (textBlocks.length === 0) {
    throw new Error("Claude returned no text content");
  }

  const text = textBlocks.map((b) => (b as { text: string }).text).join("");

  const cleanText = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  let data: T;
  try {
    data = JSON.parse(cleanText) as T;
  } catch (e) {
    throw new Error(
      `Claude returned invalid JSON: ${e instanceof Error ? e.message : "parse error"}\nResponse: ${text.substring(0, 500)}`,
    );
  }

  return {
    data,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens:
        response.usage.cache_read_input_tokens ?? undefined,
      cache_creation_input_tokens:
        response.usage.cache_creation_input_tokens ?? undefined,
    },
  };
}
