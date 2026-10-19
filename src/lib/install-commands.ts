// Single source of truth for the install commands surfaced on the homepage hero
// and the /install page. `script` uses get.automem.ai — a Cloudflare Worker
// (workers/install-redirect) that 302-redirects to public/install.sh, a thin
// wrapper around `npx -y @verygoodplugins/mcp-automem@latest install`. `npm` is
// that same guided installer, which is on npm latest. `setup` aliases it
// only after the mcp-automem release that follows 0.16.0.
export const INSTALL_COMMANDS = {
  script: 'curl -fsSL get.automem.ai | sh',
  npm: 'npx @verygoodplugins/mcp-automem install',
} as const;

export type InstallCommandKey = keyof typeof INSTALL_COMMANDS;
