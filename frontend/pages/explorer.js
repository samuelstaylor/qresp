import axios from "axios";

import SHIPPED_SERVERS from "../data/qresp_servers.js";
import { buildQrespServerList } from "../Utils/qrespServers";
import { resolveServerSideApiBase } from "../Utils/serverSideApi";

// Explorer is a pure server-side redirect. It fetches the federation list,
// orders it (published server first), and forwards directly to /search.
// Node selection lives in the Advanced Search panel on the search page —
// there is no picker page.
//
// Localhost is deliberately excluded from the server list: the local dev DB
// is empty, so including it only adds a slow-failing request on every search.
export async function getServerSideProps(ctx) {
  const base = resolveServerSideApiBase(ctx, "");

  let ordered = [];
  try {
    const { data } = await axios.get(`${base}/api/federation/servers`);
    const registry = Array.isArray((data || {}).servers) ? data.servers : [];
    const published = (data || {}).default_server;
    const orderedRegistry =
      published && registry.some((e) => (e || {}).qresp_server_url === published)
        ? [
            ...registry.filter((e) => (e || {}).qresp_server_url === published),
            ...registry.filter((e) => (e || {}).qresp_server_url !== published),
          ]
        : registry;
    ordered = orderedRegistry
      .map((e) => (e || {}).qresp_server_url)
      .filter(Boolean);
  } catch (_) {
    // Federation API unreachable — fall back to the shipped server list so
    // the Explorer still works even while the backend is warming up.
    ordered = SHIPPED_SERVERS.map((s) => s.qresp_server_url).filter(Boolean);
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
