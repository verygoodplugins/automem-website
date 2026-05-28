import { createApiCatalogResponse } from "../../lib/agent-readiness.mjs";

export const prerender = false;

export function GET() {
  return createApiCatalogResponse("GET");
}

export function HEAD() {
  return createApiCatalogResponse("HEAD");
}
