import axios from "axios";

export const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
};

export const fetchUnsplashImage = async (query) => {
  try {
    const cleanQuery = query.replace(/[^\w\s]/gi, "").trim();
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query: cleanQuery,
        per_page: 5,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
      timeout: 4000,
    });

    if (response.data.results && response.data.results.length > 0) {
      const photo = response.data.results[0];
      return {
        url: photo.urls.regular,
        photographerName: photo.user.name,
        photographerUrl: photo.user.links.html,
      };
    }
  } catch (error) {
    console.error(`Unsplash fetch fallback for query "${query}":`, error.message);
  }

  return {
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
    photographerName: "Unsplash",
    photographerUrl: "https://unsplash.com",
  };
};

export const parseLLMJson = (rawText) => {
  // 1. Strip out DeepSeek <think>...</think> reasoning blocks if present
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. Remove markdown code blocks
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/gi, "").trim();

  // 3. Extract the primary JSON object bounds
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.warn("Initial JSON parse failed. Applying control character sanitization...", parseError.message);
    
    // 4. Sanitize unescaped control characters inside JSON strings
    const sanitized = cleaned.replace(/[\u0000-\u001F]+/g, (match) => {
      if (match === '\n') return '\\n';
      if (match === '\r') return '\\r';
      if (match === '\t') return '\\t';
      return '';
    });

    return JSON.parse(sanitized);
  }
};

export const callOpenRouterAI = async (prompt, apiKey) => {
  const candidateModels = [
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "google/gemini-flash-1.5-8b:free",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-r1:free"
  ];

  let rawText = null;
  let lastError = null;

  for (const modelSlug of candidateModels) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: modelSlug,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 8000,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Benedex Admin LMS",
          },
          timeout: 90000,
        }
      );

      if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
        rawText = response.data.choices[0].message.content;
        break;
      }
    } catch (err) {
      lastError = err.response?.data || err.message;
    }
  }

  if (!rawText) {
    throw new Error(`All OpenRouter model candidates failed. Detail: ${JSON.stringify(lastError)}`);
  }

  return parseLLMJson(rawText);
};