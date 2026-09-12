import { createHash } from "node:crypto";

export type TranslationFields = Record<string, string | null | undefined>;

export type AutoTranslationResult = {
  values: Record<string, string | null>;
  sourceHash: string | null;
  translatedAt: string | null;
  warning?: string;
  translated: boolean;
};

export function translationConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function translationModel() {
  return process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.6-luna";
}

export function sourceHash(fields: TranslationFields) {
  const entries = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, normalizeSource(value)]);

  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

export async function resolveRomanianTranslation(options: {
  source: TranslationFields;
  manual: TranslationFields;
  context: string;
  locked?: boolean;
  previousHash?: string | null;
  force?: boolean;
}): Promise<AutoTranslationResult> {
  const source = normalizeFields(options.source);
  const manual = normalizeFields(options.manual);
  const hash = sourceHash(source);
  const hasSource = Object.values(source).some(Boolean);

  if (!hasSource) {
    return {
      values: Object.fromEntries(Object.keys(source).map((key) => [key, null])),
      sourceHash: hash,
      translatedAt: new Date().toISOString(),
      translated: false,
    };
  }

  if (options.locked) {
    return {
      values: manual,
      sourceHash: options.previousHash ?? null,
      translatedAt: null,
      translated: false,
    };
  }

  if (!options.force && options.previousHash && options.previousHash === hash) {
    return {
      values: manual,
      sourceHash: options.previousHash,
      translatedAt: null,
      translated: false,
    };
  }

  const translated = await translateRuToRo(source, options.context);
  if (!translated.ok) {
    return {
      values: manual,
      sourceHash: options.previousHash ?? null,
      translatedAt: null,
      translated: false,
      warning: translated.error,
    };
  }

  return {
    values: translated.values,
    sourceHash: hash,
    translatedAt: new Date().toISOString(),
    translated: true,
  };
}

export async function translateRuToRo(
  fields: TranslationFields,
  context: string
): Promise<
  | { ok: true; values: Record<string, string | null> }
  | { ok: false; error: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Автоперевод не выполнен: OPENAI_API_KEY не настроен на сервере. Русская версия сохранена, RO использует существующий перевод или fallback.",
    };
  }

  const normalized = normalizeFields(fields);
  const nonEmpty = Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => Boolean(value))
  ) as Record<string, string>;

  if (Object.keys(nonEmpty).length === 0) {
    return {
      ok: true,
      values: Object.fromEntries(Object.keys(normalized).map((key) => [key, null])),
    };
  }

  const properties = Object.fromEntries(
    Object.keys(nonEmpty).map((key) => [
      key,
      { type: "string", description: `Romanian translation for ${key}` },
    ])
  );

  const schema = {
    type: "object",
    properties,
    required: Object.keys(nonEmpty),
    additionalProperties: false,
  };

  const inputChars = Object.values(nonEmpty).reduce(
    (sum, value) => sum + value.length,
    0
  );
  const maxOutputTokens = Math.min(
    12000,
    Math.max(1200, Math.ceil(inputChars / 2) + 600)
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: translationModel(),
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: maxOutputTokens,
        instructions: [
          "Translate official football-club website content from Russian into natural Romanian used in Moldova.",
          "Preserve meaning, paragraph breaks, dates, scores, numbers, URLs and formatting.",
          "Do not translate club names, team names, player names, sponsor names, usernames, URLs or technical identifiers unless a standard Romanian form is obvious.",
          "Use professional sports/editorial Romanian, not literal word-for-word phrasing.",
          "Do not add facts, commentary, headings or explanations that are not present in the source.",
          `Content context: ${context}.`,
        ].join(" "),
        input: JSON.stringify(nonEmpty),
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "romanian_translation",
            strict: true,
            schema,
          },
        },
      }),
    });

    const body = (await response.json()) as any;

    if (!response.ok) {
      const message = body?.error?.message || `HTTP ${response.status}`;
      return {
        ok: false,
        error: `Автоперевод временно недоступен: ${message}`,
      };
    }

    const outputText = extractOutputText(body);
    if (!outputText) {
      return {
        ok: false,
        error: "Автоперевод не вернул текст. Русская версия сохранена без изменений.",
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(outputText) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error: "Автоперевод вернул некорректный формат. Русская версия сохранена без изменений.",
      };
    }

    const values: Record<string, string | null> = {};
    for (const key of Object.keys(normalized)) {
      if (!normalized[key]) {
        values[key] = null;
        continue;
      }

      const value = parsed[key];
      if (typeof value !== "string" || !value.trim()) {
        return {
          ok: false,
          error: `Автоперевод не вернул поле ${key}. Русская версия сохранена без изменений.`,
        };
      }

      values[key] = value.trim();
    }

    return { ok: true, values };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "превышено время ожидания"
        : error instanceof Error
          ? error.message
          : "неизвестная ошибка";

    return {
      ok: false,
      error: `Автоперевод временно недоступен: ${message}. Русская версия сохранена без изменений.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeFields(fields: TranslationFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, normalizeSource(value) || null])
  ) as Record<string, string | null>;
}

function normalizeSource(value: string | null | undefined) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function extractOutputText(body: any) {
  if (typeof body?.output_text === "string") {
    return body.output_text;
  }

  const output = Array.isArray(body?.output) ? body.output : [];
  for (const item of output) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}
