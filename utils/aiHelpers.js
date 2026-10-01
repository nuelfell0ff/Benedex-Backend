import axios from "axios";

// ==========================================
// SLUGIFY
// ==========================================

export const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

// ==========================================
// UNSPLASH IMAGE FETCHER
// ==========================================

export const fetchUnsplashImage = async (query) => {
  try {
    const cleanQuery = query
      .replace(/[^\w\s]/gi, "")
      .trim();

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
        timeout: 4000,
      }
    );

    if (
      response.data.results &&
      response.data.results.length > 0
    ) {
      const photo = response.data.results[0];

      return {
        url: photo.urls.regular,
        photographerName: photo.user.name,
        photographerUrl: photo.user.links.html,
      };
    }
  } catch (error) {
    console.error(
      `Unsplash fetch fallback for query "${query}":`,
      error.message
    );
  }

  return {
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
    photographerName: "Unsplash",
    photographerUrl: "https://unsplash.com",
  };
};

// ==========================================
// EXTRACT JSON OBJECT FROM AI RESPONSE
// ==========================================

const extractJsonObject = (text) => {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
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

const repairJsonStringCharacters = (json) => {
  let result = "";
  let insideString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      insideString = !insideString;
      continue;
    }

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
          if (char.charCodeAt(0) < 32) {
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

export const parseLLMJson = (rawText) => {
  if (
    !rawText ||
    typeof rawText !== "string"
  ) {
    throw new Error(
      "AI returned an empty response."
    );
  }

  let cleaned = rawText.trim();

  // ----------------------------------------
  // Remove reasoning blocks
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

  cleaned = extractJsonObject(cleaned);

  // ----------------------------------------
  // First attempt
  // ----------------------------------------

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    console.warn(
      "Initial JSON parse failed. Attempting JSON repair...",
      firstError.message
    );
  }

  // ----------------------------------------
  // Second attempt: repair control chars
  // ----------------------------------------

  const repaired =
    repairJsonStringCharacters(cleaned);

  try {
    const parsed = JSON.parse(repaired);

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
      const position = Number(
        match[1]
      );

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
        repaired.slice(start, end)
      );
    }

    console.error(
      "AI JSON response beginning:\n",
      repaired.slice(0, 1000)
    );

    throw new Error(
      `AI returned invalid JSON: ${secondError.message}`
    );
  }
};

// ==========================================
// OPENROUTER AI CALL
// ==========================================

export const callOpenRouterAI = async (
  prompt,
  apiKey,
  options = {}
) => {
  const hasStructuredOutput =
    Boolean(options.responseFormat);

  const returnRaw =
    options.returnRaw === true;

  const candidateModels = [
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-3.1-8b-instruct:free",
  ];

  let rawText = null;
  let lastError = null;

  for (const modelSlug of candidateModels) {
    try {
      console.log(
        `🤖 Calling OpenRouter model: ${modelSlug}`
      );

      const requestBody = {
        model: modelSlug,

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        max_tokens: 12000,

        temperature: 0.2,
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

      // ----------------------------------------
      // OpenRouter request
      // ----------------------------------------

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              "http://localhost:5173",
            "X-Title":
              "Benedex Admin LMS",
          },

          timeout: 120000,
        }
      );

      const content =
        response.data?.choices?.[0]?.message
          ?.content;

      if (content) {
        rawText = content;

        console.log(
          `✅ AI response received from ${modelSlug}`
        );

        console.log(
          `📦 AI response length: ${rawText.length} characters`
        );

        break;
      }

      console.warn(
        `⚠️ ${modelSlug} returned no message content.`
      );
    } catch (error) {
      lastError =
        error.response?.data ||
        error.message;

      console.error(
        `❌ OpenRouter model failed: ${modelSlug}`,
        lastError
      );
    }
  }

  // ==========================================
  // NO MODEL SUCCEEDED
  // ==========================================

  if (!rawText) {
    throw new Error(
      `All OpenRouter model candidates failed. Detail: ${JSON.stringify(
        lastError
      )}`
    );
  }

  // ==========================================
  // RAW RESPONSE MODE
  // ==========================================

  if (returnRaw) {
    return rawText.trim();
  }

  // ==========================================
  // STRUCTURED JSON OUTPUT
  // ==========================================

  if (hasStructuredOutput) {
    try {
      return JSON.parse(rawText);
    } catch (error) {
      console.warn(
        "⚠️ Structured output was not directly parseable. Falling back to JSON parser..."
      );

      return parseLLMJson(rawText);
    }
  }

  // ==========================================
  // NORMAL JSON RESPONSE
  // ==========================================

  return parseLLMJson(rawText);
};