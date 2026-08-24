import "server-only";

import { createMCPClient } from "@ai-sdk/mcp";

/**
 * The Sanity Context MCP connection. Server only: the URL embeds the project and
 * dataset and the request carries the read token, and neither may reach the
 * browser. The `server-only` import turns a client import into a build error.
 */

const mcpUrl = assertValue(
  process.env.SANITY_CONTEXT_MCP_URL,
  "Missing environment variable: SANITY_CONTEXT_MCP_URL",
);

const readToken = assertValue(
  process.env.SANITY_API_READ_TOKEN,
  "Missing environment variable: SANITY_API_READ_TOKEN",
);

const authHeaders = { Authorization: `Bearer ${readToken}` };

export function createSearchMcpClient() {
  return createMCPClient({
    transport: { type: "http", url: mcpUrl, headers: authHeaders },
  });
}

/**
 * The compressed schema overview, fetched over HTTP rather than as a tool call so
 * the model already knows the dataset on its first turn. Cached for the life of
 * the process, which is why an edit to the Context document's instructions only
 * takes effect after a server restart (AGENTS.md section 12).
 *
 * The promise itself is cached, so concurrent first requests share one fetch and
 * a failure is not cached — the next request retries.
 */
let initialContextPromise: Promise<string> | null = null;

export function fetchInitialContext() {
  initialContextPromise ??= loadInitialContext().catch((error) => {
    initialContextPromise = null;
    throw error;
  });

  return initialContextPromise;
}

async function loadInitialContext() {
  // Query params may already be on the URL, so the path segment goes before them.
  const url = new URL(mcpUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/initial-context`;

  const response = await fetch(url, { headers: authHeaders });

  if (!response.ok) {
    throw new Error(`Sanity Context initial-context failed: ${response.status}`);
  }

  return response.text();
}

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined || v === "") {
    throw new Error(errorMessage);
  }

  return v;
}
