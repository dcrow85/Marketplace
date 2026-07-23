function send(response, status, body, profileLink) {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    link: profileLink,
    "x-content-type-options": "nosniff"
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function rejectDuplicateMembers(text) {
  let cursor = 0;
  const whitespace = () => {
    while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
  };
  const stringToken = () => {
    const start = cursor;
    if (text[cursor++] !== '"') throw new SyntaxError("string expected");
    while (cursor < text.length) {
      const character = text[cursor++];
      if (character === '"') return JSON.parse(text.slice(start, cursor));
      if (character === "\\") {
        const escape = text[cursor++];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(cursor, cursor + 4))) throw new SyntaxError("invalid unicode escape");
          cursor += 4;
        } else if (!'"\\/bfnrt'.includes(escape ?? "")) {
          throw new SyntaxError("invalid string escape");
        }
      } else if (character.charCodeAt(0) < 0x20) {
        throw new SyntaxError("control character in string");
      }
    }
    throw new SyntaxError("unterminated string");
  };
  const value = () => {
    whitespace();
    const character = text[cursor];
    if (character === "{") {
      cursor += 1;
      whitespace();
      const keys = new Set();
      if (text[cursor] === "}") {
        cursor += 1;
        return;
      }
      while (true) {
        whitespace();
        const key = stringToken();
        if (keys.has(key)) throw new SyntaxError("duplicate object member");
        keys.add(key);
        whitespace();
        if (text[cursor++] !== ":") throw new SyntaxError("colon expected");
        value();
        whitespace();
        const separator = text[cursor++];
        if (separator === "}") return;
        if (separator !== ",") throw new SyntaxError("object separator expected");
      }
    }
    if (character === "[") {
      cursor += 1;
      whitespace();
      if (text[cursor] === "]") {
        cursor += 1;
        return;
      }
      while (true) {
        value();
        whitespace();
        const separator = text[cursor++];
        if (separator === "]") return;
        if (separator !== ",") throw new SyntaxError("array separator expected");
      }
    }
    if (character === '"') {
      stringToken();
      return;
    }
    for (const literal of ["true", "false", "null"]) {
      if (text.startsWith(literal, cursor)) {
        cursor += literal.length;
        return;
      }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(text.slice(cursor))?.[0];
    if (!number) throw new SyntaxError("JSON value expected");
    cursor += number.length;
  };
  value();
  whitespace();
  if (cursor !== text.length) throw new SyntaxError("trailing JSON data");
}

async function readJson(request, maximumBytes) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) {
      const error = new Error("request_too_large");
      error.code = "request_too_large";
      throw error;
    }
    chunks.push(chunk);
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  rejectDuplicateMembers(text);
  return JSON.parse(text);
}

function mediaType(request) {
  return String(request.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function createReferenceHttpHandler({ service, authenticateRequest, maximumBytes = 1_048_576 }) {
  if (!service || typeof authenticateRequest !== "function") throw new TypeError("service and authentication callback required");
  return async (request, response) => {
    const url = new URL(request.url, "http://reference.invalid");
    if (request.method === "GET" && url.pathname === "/cairn/0.1/capabilities") {
      try {
        send(response, 200, service.capabilities(), service.profileLink);
      } catch {
        send(response, 503, { error: "capabilities_unavailable" }, service.profileLink);
      }
      return;
    }
    if (request.method !== "POST" || url.pathname !== "/cairn/0.1/messages") {
      send(response, 404, { error: "route_not_found" }, service.profileLink);
      return;
    }
    if (mediaType(request) !== "application/json") {
      send(response, 415, { error: "unsupported_content_type" }, service.profileLink);
      return;
    }
    if (request.headers["cairn-protocol-version"] !== "0.1") {
      send(response, 400, { error: "protocol_version_mismatch" }, service.profileLink);
      return;
    }

    let envelope;
    try {
      const parsed = await readJson(request, maximumBytes);
      // Keep the parsed value outside this boundary so later failures are never
      // mislabeled as JSON errors.
      envelope = parsed;
    } catch (error) {
      const tooLarge = error?.code === "request_too_large";
      send(response, tooLarge ? 413 : 400, { error: tooLarge ? "request_too_large" : "invalid_json" }, service.profileLink);
      return;
    }

    const operation = service.registry.operations.find(({ name }) => name === envelope?.message_type);
    if (operation?.object_store_mutating && request.headers["idempotency-key"] !== envelope.idempotency_key) {
      send(response, 400, { error: "idempotency_header_mismatch" }, service.profileLink);
      return;
    }

    let authentication;
    try {
      authentication = await authenticateRequest(request, envelope);
    } catch {
      send(response, 401, { error: "authentication_failed" }, service.profileLink);
      return;
    }

    try {
      const result = service.handleEnvelope(envelope, authentication);
      send(response, result.status, result.ok ? result.body : { error: result.code, failures: result.failures }, service.profileLink);
    } catch {
      send(response, 503, { error: "reference_service_unavailable" }, service.profileLink);
    }
  };
}
