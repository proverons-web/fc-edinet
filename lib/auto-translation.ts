import { createHash } from "node:crypto";

export type TranslationFields = Record<string, string | null | undefined>;

export type TranslationDiagnosticDetails = {
  model: string;
  httpStatus: number | null;
  errorType: string | null;
  errorCode: string | null;
  message: string;
  requestId: string | null;
};

export type AutoTranslationResult = {
  values: Record<string, string | null>;
  sourceHash: string | null;
  translatedAt: string | null;
  warning?: string;
  diagnostic?: TranslationDiagnosticDetails;
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
      diagnostic: translated.diagnostic,
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
  | { ok: false; error: string; diagnostic: TranslationDiagnosticDetails }
> {
  const model = translationModel();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const diagnostic = makeDiagnostic({
      model,
      errorType: "configuration_error",
      errorCode: "missing_api_key",
      message: "OPENAI_API_KEY не настроен на сервере.",
    });
    return { ok: false, error: diagnostic.message, diagnostic };
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
        model,
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

    const requestId = response.headers.get("x-request-id");
    const rawBody = await response.text();
    const body = parseJson(rawBody);

    if (!response.ok) {
      const apiError = body?.error ?? {};
      const message = String(apiError?.message || rawBody || `HTTP ${response.status}`).slice(0, 2000);
      const diagnostic = makeDiagnostic({
        model,
        httpStatus: response.status,
        errorType: stringOrNull(apiError?.type),
        errorCode: stringOrNull(apiError?.code),
        message,
        requestId,
      });
      return {
        ok: false,
        error: `OpenAI API: ${message}`,
        diagnostic,
      };
    }

    if (!body) {
      const diagnostic = makeDiagnostic({
        model,
        httpStatus: response.status,
        errorType: "invalid_response",
        errorCode: "response_not_json",
        message: "OpenAI вернул ответ, который не удалось прочитать как JSON.",
        requestId,
      });
      return { ok: false, error: diagnostic.message, diagnostic };
    }

    const outputText = extractOutputText(body);
    if (!outputText) {
      const diagnostic = makeDiagnostic({
        model,
        httpStatus: response.status,
        errorType: "invalid_response",
        errorCode: "empty_output",
        message: "OpenAI не вернул текст перевода.",
        requestId,
      });
      return { ok: false, error: diagnostic.message, diagnostic };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(outputText) as Record<string, unknown>;
    } catch {
      const diagnostic = makeDiagnostic({
        model,
        httpStatus: response.status,
        errorType: "invalid_response",
        errorCode: "invalid_translation_json",
        message: "OpenAI вернул перевод в некорректном JSON-формате.",
        requestId,
      });
      return { ok: false, error: diagnostic.message, diagnostic };
    }

    const values: Record<string, string | null> = {};
    for (const key of Object.keys(normalized)) {
      if (!normalized[key]) {
        values[key] = null;
        continue;
      }

      const value = parsed[key];
      if (typeof value !== "string" || !value.trim()) {
        const diagnostic = makeDiagnostic({
          model,
          httpStatus: response.status,
          errorType: "invalid_response",
          errorCode: "missing_translation_field",
          message: `OpenAI не вернул обязательное поле перевода: ${key}.`,
          requestId,
        });
        return { ok: false, error: diagnostic.message, diagnostic };
      }
      values[key] = value.trim();
    }

    return { ok: true, values };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    const message = aborted
      ? "Превышено время ожидания OpenAI API (45 секунд)."
      : error instanceof Error
        ? error.message
        : "Неизвестная ошибка соединения с OpenAI API.";
    const diagnostic = makeDiagnostic({
      model,
      errorType: aborted ? "timeout_error" : "network_error",
      errorCode: aborted ? "request_timeout" : "request_failed",
      message,
    });
    return { ok: false, error: message, diagnostic };
  } finally {
    clearTimeout(timeout);
  }
}

function makeDiagnostic(input: Partial<TranslationDiagnosticDetails> & { model: string; message: string }): TranslationDiagnosticDetails {
  return {
    model: input.model,
    httpStatus: input.httpStatus ?? null,
    errorType: input.errorType ?? null,
    errorCode: input.errorCode ?? null,
    message: input.message,
    requestId: input.requestId ?? null,
  };
}

function normalizeFields(fields: TranslationFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, normalizeSource(value) || null])
  ) as Record<string, string | null>;
}

function normalizeSource(value: string | null | undefined) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function parseJson(raw: string) {
  try {
    return JSON.parse(raw) as any;
  } catch {
    return null;
  }
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
