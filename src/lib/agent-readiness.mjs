export const SITE_ORIGIN = "https://automem.ai";
export const CONTENT_SIGNAL = "ai-train=yes, search=yes, ai-input=yes";

const HOMEPAGE_MARKDOWN = `---
title: AutoMem
description: Persistent memory for MCP-compatible AI tools across Claude, Cursor, Codex, ChatGPT, and more.
url: https://automem.ai/
---

# AutoMem

AutoMem is an open-source persistent memory layer for AI agents and MCP-compatible tools.
It gives assistants a durable memory graph instead of forcing every conversation to start from scratch.

## What AutoMem Provides

- Hybrid memory recall with vector, keyword, metadata, recency, and graph signals.
- Typed memory operations for storing, recalling, updating, deleting, and associating memories.
- MCP client support for Claude Desktop, Claude Code, Cursor, OpenAI Codex, ChatGPT, GitHub Copilot, ElevenLabs, Alexa, OpenClaw, and Google AntiGravity.
- Self-hosted deployment paths for Docker, Railway, and InstaPods.
- Documentation for authentication, operations, health checks, backups, and architecture.

## Agent Entry Points

- Documentation: https://automem.ai/docs/
- Quick start: https://automem.ai/docs/getting-started/quick-start/
- API reference: https://automem.ai/docs/reference/api/direct-vs-mcp/
- Authentication docs: https://automem.ai/docs/reference/authentication/
- Operations health docs: https://automem.ai/docs/operations/health/
- GitHub server repo: https://github.com/verygoodplugins/automem
- GitHub MCP client repo: https://github.com/verygoodplugins/mcp-automem

## Integration Notes

automem.ai is the marketing and documentation origin. It does not issue hosted OAuth
credentials or expose the production AutoMem API directly from this domain. Agents should
use the deployment-specific API base URL and credentials from the user's own AutoMem
deployment.
`;

const AGENT_DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</auth.md>; rel="describedby"; type="text/markdown"',
  '</.well-known/agent-skills/index.json>; rel="service-desc"; type="application/json"',
];

export function getHomepageMarkdown() {
  return HOMEPAGE_MARKDOWN;
}

export function estimateMarkdownTokens(markdown = HOMEPAGE_MARKDOWN) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.33));
}

export function acceptsMarkdown(request) {
  const accept = request.headers.get("accept") || "";
  return accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === "text/markdown" || part.startsWith("text/markdown;"));
}

export function isHomepagePathname(pathname) {
  return pathname === "/" || pathname === "";
}

export function wantsHomepageMarkdown(request, pathname) {
  return (
    (request.method === "GET" || request.method === "HEAD") &&
    isHomepagePathname(pathname) &&
    acceptsMarkdown(request)
  );
}

export function createHomepageMarkdownResponse(method = "GET") {
  return new Response(method === "HEAD" ? null : HOMEPAGE_MARKDOWN, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Vary": "Accept",
      "x-markdown-tokens": String(estimateMarkdownTokens()),
      "Content-Signal": CONTENT_SIGNAL,
    },
  });
}

export function getAgentDiscoveryLinks() {
  return [...AGENT_DISCOVERY_LINKS];
}

export function withAgentDiscoveryHeaders(response, url) {
  if (!isHomepagePathname(url.pathname)) {
    return response;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const link of AGENT_DISCOVERY_LINKS) {
    headers.append("Link", link);
  }
  headers.set("Content-Signal", CONTENT_SIGNAL);
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Accept");
  } else if (!vary.split(",").some((part) => part.trim().toLowerCase() === "accept")) {
    headers.set("Vary", `${vary}, Accept`);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function getApiCatalog() {
  return {
    linkset: [
      {
        anchor: `${SITE_ORIGIN}/`,
        "service-doc": [
          {
            href: `${SITE_ORIGIN}/docs/`,
            type: "text/html",
          },
        ],
        "service-desc": [
          {
            href: `${SITE_ORIGIN}/docs/reference/api/direct-vs-mcp/`,
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${SITE_ORIGIN}/docs/operations/health/`,
            type: "text/html",
          },
        ],
      },
      {
        anchor: "https://github.com/verygoodplugins/automem",
        "service-doc": [
          {
            href: `${SITE_ORIGIN}/docs/getting-started/quick-start/`,
            type: "text/html",
          },
        ],
        "service-desc": [
          {
            href: `${SITE_ORIGIN}/docs/reference/api/memory-operations/`,
            type: "text/html",
          },
        ],
      },
      {
        anchor: "https://github.com/verygoodplugins/mcp-automem",
        "service-doc": [
          {
            href: `${SITE_ORIGIN}/docs/cli/setup/`,
            type: "text/html",
          },
        ],
        "service-desc": [
          {
            href: `${SITE_ORIGIN}/docs/reference/api/direct-vs-mcp/`,
            type: "text/html",
          },
        ],
      },
    ],
  };
}

export function createApiCatalogResponse(method = "GET") {
  const body = JSON.stringify(getApiCatalog(), null, 2);
  return new Response(method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
