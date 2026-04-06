import { createRoot } from "react-dom/client";
import { AdminApp } from "@emdash-cms/admin";
import { pluginAdmins } from "virtual:emdash/admin-registry";

let mounted = false;

export default function mountEmdashAdmin() {
  if (mounted) return;

  const rootElement = document.getElementById("admin-root");
  if (!rootElement) return;

  mounted = true;
  createRoot(rootElement).render(<AdminApp pluginAdmins={pluginAdmins} />);
}
