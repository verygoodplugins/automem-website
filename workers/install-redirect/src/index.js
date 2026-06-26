// Short installer URL worker: https://get.automem.ai
//
// 302-redirects every request to the canonical install script at
// automem.ai/install.sh (served from public/install.sh by the Pages site),
// so there is a single source of truth. Curl's -L follows the hop:
//   curl -fsSL get.automem.ai | sh
//
// Deployed independently of the Pages pipeline:
//   npx wrangler deploy -c workers/install-redirect/wrangler.jsonc
const TARGET = "https://automem.ai/install.sh";

export default {
  fetch() {
    return Response.redirect(TARGET, 302);
  },
};
