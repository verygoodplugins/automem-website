export const SITE_ORIGIN: string;
export const CONTENT_SIGNAL: string;

export function getHomepageMarkdown(): string;
export function estimateMarkdownTokens(markdown?: string): number;
export function acceptsMarkdown(request: Request): boolean;
export function isHomepagePathname(pathname: string): boolean;
export function wantsHomepageMarkdown(request: Request, pathname: string): boolean;
export function createHomepageMarkdownResponse(method?: string): Response;
export function getAgentDiscoveryLinks(): string[];
export function withAgentDiscoveryHeaders(response: Response, url: URL): Response;
export function getApiCatalog(): Record<string, unknown>;
export function createApiCatalogResponse(method?: string): Response;
