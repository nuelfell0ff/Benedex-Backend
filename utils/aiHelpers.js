import axios from "axios";

// ==========================================
// OPENROUTER CONFIGURATION
// ==========================================

// Keep the model chain here instead of scattering
// model names throughout the application.
//
// OpenRouter supports model-level fallbacks through
// the `models` array. It also handles provider-level
// failover automatically.
const OPENROUTER_MODELS = [
  "meta-llama/llama-3.1-8b-instruct",
  "openrouter/free",
];

// ==========================================
// SLUGIFY
// ==========================================

export const slugify = (text) => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

// ==========================================
// UNSPLASH IMAGE FETCHER
// ==========================================

export const fetchUnsplashImage = async (query) => {
  try {
    const cleanQuery = String(query || "")
      .replace(/[^\w\s]/gi, "")
      .trim();

    if (!cleanQuery) {
      throw new Error(
        "Unsplash query is empty."
      );
    }

    const response = await axios.get(
      "https://api.unsplash.com/search/photos",
      {
        params: {
          query: cleanQuery,
          per_page: 5,
          orientation: "landscape",
        },

        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },

        timeout: 10000,
      }
    );

    if (
      response.data?.results &&
      response.data.results.length > 0
    ) {
      const photo =
        response.data.results[0];

      return {
        url: photo.urls.regular,

        photographerName:
          photo.user?.name ||
          "Unsplash",

        photographerUrl:
          photo.user?.links?.html ||
          "https://unsplash.com",
      };
    }

    console.warn(
      `⚠️ Unsplash returned no images for "${query}". Using fallback image.`
    );
  } catch (error) {
    console.error(
      `⚠️ Unsplash fetch failed for query "${query}":`,
      error.response?.data ||
        error.message
    );
  }

  // ==========================================
  // FALLBACK IMAGE
  // ==========================================

  return {
    url:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",

    photographerName: "Unsplash",

    photographerUrl:
      "https://unsplash.com",
  };
};

// ==========================================
// EXTRACT JSON OBJECT FROM AI RESPONSE
// ==========================================

const extractJsonObject = (text) => {
  const firstBrace =
    text.indexOf("{");

  const lastBrace =
    text.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1
  ) {
    throw new Error(
      "No JSON object found in AI response."
    );
  }

  if (lastBrace <= firstBrace) {
    throw new Error(
      "AI returned an incomplete JSON object."
    );
  }

  return text.slice(
    firstBrace,
    lastBrace + 1
  );
};

// ==========================================
// REPAIR JSON STRING CONTROL CHARACTERS
// ==========================================

const repairJsonStringCharacters = (
  json
) => {
  let result = "";

  let insideString = false;

  let escaped = false;

  for (
    let i = 0;
    i < json.length;
    i++
  ) {
    const char = json[i];

    // ----------------------------------------
    // Previous character was an escape
    // ----------------------------------------

    if (escaped) {
      result += char;

      escaped = false;

      continue;
    }

    // ----------------------------------------
    // Escape character
    // ----------------------------------------

    if (char === "\\") {
      result += char;

      escaped = true;

      continue;
    }

    // ----------------------------------------
    // String delimiter
    // ----------------------------------------

    if (char === '"') {
      result += char;

      insideString =
        !insideString;

      continue;
    }

    // ----------------------------------------
    // Repair characters inside strings
    // ----------------------------------------

    if (insideString) {
      switch (char) {
        case "\n":
          result += "\\n";
          break;

        case "\r":
          result += "\\r";
          break;

        case "\t":
          result += "\\t";
          break;

        case "\b":
          result += "\\b";
          break;

        case "\f":
          result += "\\f";
          break;

        default:
          if (
            char.charCodeAt(0) < 32
          ) {
            continue;
          }

          result += char;
      }

      continue;
    }

    result += char;
  }

  return result;
};

// ==========================================
// LLM JSON PARSER
// ==========================================

export const parseLLMJson = (
  rawText
) => {
  if (
    !rawText ||
    typeof rawText !== "string"
  ) {
    throw new Error(
      "AI returned an empty response."
    );
  }

  let cleaned =
    rawText.trim();

  // ----------------------------------------
  // Remove <think> blocks
  // ----------------------------------------

  cleaned = cleaned.replace(
    /<think>[\s\S]*?<\/think>/gi,
    ""
  );

  // ----------------------------------------
  // Remove markdown code fences
  // ----------------------------------------

  cleaned = cleaned
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // ----------------------------------------
  // Extract JSON object
  // ----------------------------------------

  cleaned =
    extractJsonObject(cleaned);

  // ----------------------------------------
  // First JSON parse attempt
  // ----------------------------------------

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    console.warn(
      "⚠️ Initial JSON parse failed. Attempting JSON repair...",
      firstError.message
    );
  }

  // ----------------------------------------
  // Second attempt: repair control chars
  // ----------------------------------------

  const repaired =
    repairJsonStringCharacters(
      cleaned
    );

  try {
    const parsed =
      JSON.parse(repaired);

    console.log(
      "✅ JSON successfully repaired and parsed."
    );

    return parsed;
  } catch (secondError) {
    console.error(
      "❌ JSON repair failed:",
      secondError.message
    );

    const match =
      secondError.message.match(
        /position (\d+)/
      );

    if (match) {
      const position =
        Number(match[1]);

      const start = Math.max(
        0,
        position - 500
      );

      const end = Math.min(
        repaired.length,
        position + 500
      );

      console.error(
        "JSON around error position:\n",
        repaired.slice(
          start,
          end
        )
      );
    }

    console.error(
      "AI JSON response beginning:\n",
      repaired.slice(
        0,
        1000
      )
    );

    throw new Error(
      `AI returned invalid JSON: ${secondError.message}`
    );
  }
};

// ==========================================
// OPENROUTER ERROR FORMATTER
// ==========================================

const getOpenRouterErrorMessage = (
  error
) => {
  const status =
    error.response?.status;

  const data =
    error.response?.data;

  const message =
    data?.error?.message ||
    data?.message ||
    error.message ||
    "Unknown OpenRouter error.";

  if (status === 401) {
    return "OpenRouter authentication failed. Check OPENROUTER_API_KEY.";
  }

  if (status === 402) {
    return "OpenRouter requires credits for the selected model.";
  }

  if (status === 403) {
    return `OpenRouter rejected the request: ${message}`;
  }

  if (status === 404) {
    return `The requested OpenRouter model is unavailable: ${message}`;
  }

  if (status === 408) {
    return "OpenRouter request timed out.";
  }

  if (status === 429) {
    return "OpenRouter rate limit reached. Please try again shortly.";
  }

  if (
    status >= 500 &&
    status <= 599
  ) {
    return "OpenRouter is temporarily unavailable. Please try again shortly.";
  }

  return message;
};

// ==========================================
// OPENROUTER AI CALL
// ==========================================

export const callOpenRouterAI = async (
  prompt,
  apiKey,
  options = {}
) => {
  if (
    !apiKey ||
    typeof apiKey !== "string"
  ) {
    throw new Error(
      "OPENROUTER_API_KEY is missing."
    );
  }

  if (
    !prompt ||
    typeof prompt !== "string"
  ) {
    throw new Error(
      "AI prompt is missing."
    );
  }

  const hasStructuredOutput =
    Boolean(
      options.responseFormat
    );

  const returnRaw =
    options.returnRaw === true;

  // Allow a specific model to be supplied
  // when necessary, while still using the
  // normal fallback chain by default.
  const models =
    Array.isArray(options.models) &&
    options.models.length > 0
      ? options.models
      : OPENROUTER_MODELS;

  console.log(
    "🤖 OpenRouter model fallback chain:",
    models
  );

  const requestBody = {
    // Primary model.
    model: models[0],

    // OpenRouter model-level fallback chain.
    models,

    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],

    // Keep this high enough for your course
    // outline and lesson generation.
    max_tokens:
      options.maxTokens ||
      12000,

    temperature:
      options.temperature ??
      0.2,

    // Explicitly allow provider-level
    // fallback.
    provider: {
      allow_fallbacks: true,
    },
  };

  // ----------------------------------------
  // Structured JSON output
  // ----------------------------------------

  if (hasStructuredOutput) {
    requestBody.response_format =
      options.responseFormat;

    console.log(
      "🧩 Structured JSON output enabled."
    );
  }

  let lastError = null;

  // ----------------------------------------
  // Retry entire request if OpenRouter
  // temporarily fails.
  //
  // This is intentionally small so we don't
  // hammer the API.
  // ----------------------------------------

  const maxAttempts =
    options.maxAttempts || 2;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `🤖 OpenRouter request attempt ${attempt}/${maxAttempts}`
      );

      const response =
        await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          requestBody,
          {
            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              "Content-Type":
                "application/json",

              "HTTP-Referer":
                "https://benedex.org",

              "X-Title":
                "Benedex Admin LMS",
            },

            timeout:
              options.timeout ||
              120000,
          }
        );

      const content =
        response.data
          ?.choices?.[0]
          ?.message?.content;

      if (
        !content ||
        typeof content !==
          "string"
      ) {
        throw new Error(
          "OpenRouter returned no usable message content."
        );
      }

      console.log(
        "✅ AI response received."
      );

      console.log(
        `📦 AI response length: ${content.length} characters`
      );

      console.log(
        `🧠 Actual model used: ${
          response.data?.model ||
          "unknown"
        }`
      );

      // --------------------------------------
      // RAW RESPONSE MODE
      // --------------------------------------

      if (returnRaw) {
        return content.trim();
      }

      // --------------------------------------
      // STRUCTURED JSON OUTPUT
      // --------------------------------------

      if (hasStructuredOutput) {
        try {
          return JSON.parse(
            content
          );
        } catch (error) {
          console.warn(
            "⚠️ Structured output was not directly parseable. Falling back to JSON parser..."
          );

          return parseLLMJson(
            content
          );
        }
      }

      // --------------------------------------
      // NORMAL JSON RESPONSE
      // --------------------------------------

      return parseLLMJson(
        content
      );
    } catch (error) {
      lastError = error;

      const status =
        error.response?.status;

      const formattedError =
        getOpenRouterErrorMessage(
          error
        );

      console.error(
        `❌ OpenRouter attempt ${attempt} failed:`,
        {
          status,
          message:
            formattedError,
          providerResponse:
            error.response?.data ||
            null,
        }
      );

      // --------------------------------------
      // Do not retry authentication errors.
      // --------------------------------------

      if (
        status === 401 ||
        status === 403
      ) {
        break;
      }

      // --------------------------------------
      // Wait briefly before retrying.
      // --------------------------------------

      if (
        attempt < maxAttempts
      ) {
        const delay =
          1500 * attempt;

        console.log(
          `⏳ Retrying OpenRouter in ${delay}ms...`
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delay
            )
        );
      }
    }
  }

  // ==========================================
  // EVERYTHING FAILED
  // ==========================================

  const finalMessage =
    getOpenRouterErrorMessage(
      lastError
    );

  throw new Error(
    `AI generation failed after ${maxAttempts} attempt(s). ${finalMessage}`
  );
};