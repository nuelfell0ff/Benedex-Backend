export const parseJsonBody = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    return next();
  }

  if (typeof req.body !== "string") {
    if (req.body === undefined) {
      req.body = {};
    }

    return next();
  }

  const rawBody = req.body.trim();

  if (!rawBody) {
    req.body = {};
    return next();
  }

  try {
    let parsedBody = JSON.parse(rawBody);

    if (typeof parsedBody === "string") {
      const nestedBody = parsedBody.trim();

      if (nestedBody.startsWith("{") || nestedBody.startsWith("[")) {
        parsedBody = JSON.parse(nestedBody);
      }
    }

    req.body = parsedBody;
    return next();
  } catch (error) {
    return res.status(400).json({
      message: "Invalid JSON payload",
      details: error.message
    });
  }
};