import axios from "axios";

import { buildQrespServerList } from "../Utils/qrespServers";
import { requestOrigin, resolveServerSideApiBase } from "../Utils/serverSideApi";

// Explorer is a pure server-side redirect. It fetches the federation list,
// orders it, and forwards directly to /search. Node selection lives in the
// Advanced Search panel on the search page — there is no picker page.
export async function getServerSideProps(ctx) {
  const base = resolveServerSideApiBase(ctx, "");
  const origin = requestOrigin(ctx);

  let ordered = [];
  try {
    const { data } = await axios.get(`${base || ""}/api/federation/servers`);
    const registry = Array.isArray((data || {}).servers) ? data.servers : [];
    const published = (data || {}).default_server;
    const orderedRegistry =
      published && registry.some((e) => (e || {}).qresp_server_url === published)
        ? [
            ...registry.filter((e) => (e || {}).qresp_server_url === published),
            ...registry.filter((e) => (e || {}).qresp_server_url !== published),
          ]
        : registry;
    ordered = buildQrespServerList(orderedRegistry, origin)
      .map((e) => (e || {}).qresp_server_url)
      .filter(Boolean);
  } catch (_) {
    // Federation unreachable: search just this node.
    if (origin) ordered = [origin];
  }

  const destination =
    ordered.length
      ? `/search?servers=${ordered.map(encodeURIComponent).join(",")}`
      : "/search";

  return { redirect: { destination, permanent: false } };
}

// This component never renders — getServerSideProps always redirects.
export default function Explorer() {
  return null;
}
