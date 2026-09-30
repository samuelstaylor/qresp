import { useEffect, useContext, Fragment, useState } from "react";

import { useRouter } from "next/router";

import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";

import SEO from "../components/seo";

import { RegularStyledButton } from "../components/button";
import RecordTable from "../components/Table/Table";
import AdvancedSearch from "../components/AdvancedSearch";
import Summary from "../components/Paper/Summary";

import axios from "axios";
import AlertContext from "../Context/Alert/alertContext";
import ServerContext from "../Context/Servers/serverContext";
import { resolveServerSideApiBase } from "../Utils/serverSideApi";
import { mergeRecordsByServer } from "../Utils/recordSources";


const EMPTY_DATA = { papers: {}, authors: [], collections: [], publications: [] };
const EMPTY_ERROR = { is: false, msg: "", failed: [], filters: {}, total: false };

const search = ({
  selectedservers,
  servernames = {},
}) => {
  const { setAlert, unsetAlert } = useContext(AlertContext);
  const { setSelected } = useContext(ServerContext);

  const searchDescription =
    "Search allows users to find data on specific Qresp instances using various filters";
  const searchAuthor = "Giulia Galli, Macro Govoni";

  const router = useRouter();
  const refresh = () => {
    router.reload();
    unsetAlert();
  };

  // HOW MANY sources are missing, never WHICH institution runs them.
  //
  // A public notice reading "Duke University could not be reached" puts an
  // institution's name next to a failure it has nothing to do with -- a Qresp
  // node is shared search infrastructure, and a reader has no use for its
  // operator's name. The count is the part they can act on: it says whether
  // the results in front of them are complete.
  //
  // The origins themselves are unchanged in `error.failed`, so an operator
  // reading the response still knows exactly which node failed.
  const sourceCount = (servers) => (servers || []).length;
  const sourcesUnavailable = (servers) => {
    const count = sourceCount(servers);
    return count === 1 ? "one source is unavailable"
                       : `${count} sources are unavailable`;
  };

  // All data fetched client-side after the page renders — external server
  // requests happen in the browser, not in SSR, so the page loads instantly.
  const [baseData, setBaseData] = useState(EMPTY_DATA);
  const [data, setData] = useState(EMPTY_DATA);
  const [error, setError] = useState(EMPTY_ERROR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedservers?.length) {
      setError({ ...EMPTY_ERROR, is: true, total: true, msg: "No servers selected" });
      setLoading(false);
      return;
    }
    Promise.allSettled(
      selectedservers.map(async (server) => {
        const [searchRes, collectionsRes, authorsRes, pubsRes] = await Promise.allSettled([
          axios.get(`${server}/api/search`),
          axios.get(`${server}/api/collections`),
          axios.get(`${server}/api/authors`),
          axios.get(`${server}/api/publications`),
        ]);
        return { server, searchRes, collectionsRes, authorsRes, pubsRes };
      })
    ).then((results) => {
      const newData = { papers: {}, authors: [], collections: [], publications: [] };
      const newError = { ...EMPTY_ERROR };
      results.forEach((r) => {
        if (r.status !== "fulfilled") return;
        const { server, searchRes, collectionsRes, authorsRes, pubsRes } = r.value;
        if (searchRes.status === "fulfilled") {
          newData.papers[server] = searchRes.value.data;
        } else {
          newError.is = true;
          if (!newError.failed.includes(server)) newError.failed.push(server);
        }
        [["collections", collectionsRes], ["authors", authorsRes], ["publications", pubsRes]].forEach(
          ([key, res]) => {
            if (res.status === "fulfilled") {
              newData[key].push(...(res.value.data || []));
            } else {
              newError.is = true;
              newError.filters[server] = (newError.filters[server] || []).concat(key);
            }
          }
        );
      });
      newError.total = Object.keys(newData.papers).length === 0;
      setBaseData(newData);
      setData(newData);
      setError(newError);
      setLoading(false);
    });
  }, []);

  const [runtime, setRuntime] = useState(null);

  const clearSearch = () => {
    setData(baseData);
    setRuntime(null);
  };

  const onSearchStart = () => setRuntime(null);

  const onSearchResult = ({ papers, failedServers, totalFailure, retry }) => {
    if (!totalFailure) setData((prev) => ({ ...prev, papers }));
    if (!failedServers.length) {
      setRuntime(null);
      return;
    }
    setRuntime({
      failed: failedServers,
      total: totalFailure,
      keptPrevious: totalFailure && Object.keys(data.papers || {}).length > 0,
      retry,
    });
  };

  const { papers, authors, collections, publications } = data || {};

  const columns = [
    {
      label: "Record",
      name: "paper",
      view: Summary,
      options: {
        align: "left",
        sort: true,
        searchable: true,
        value: (data) => data._Search__title,
        searchValue: (data) =>
          data._Search__title +
          data._Search__authors +
          data._Search__tags.join(" "),
      },
    },
    {
      label: "Author",
      name: "author",
      view: null,
      hidden: true,
      options: {
        sort: true,
        value: (data) => (typeof data === "string" ? data.toLowerCase() : ""),
      },
    },
    {
      label: "Journal",
      name: "journal",
      view: null,
      hidden: true,
      options: {
        sort: true,
        value: (data) => (typeof data === "string" ? data.toLowerCase() : ""),
      },
    },
    {
      label: "Year",
      name: "year",
      view: null,
      options: {
        align: "right",
        sort: true,
        searchable: true,
        value: (data) => data,
      },
    },
  ];

  const sortBarOptions = [
    { label: "Title", field: "paper" },
    { label: "Author", field: "author" },
    { label: "Year", field: "year" },
    { label: "Journal", field: "journal" },
  ];

  const taglist = new Set();
  if (baseData.papers) {
    Object.keys(baseData.papers).forEach((server) => {
      (baseData.papers[server] || []).forEach((paper) => {
        (paper["_Search__tags"] || []).forEach((element) => {
          taglist.add(element.toLowerCase());
        });
      });
    });
  }

  // Friendly label for each server, for the node selector in AdvancedSearch.
  const serverOptions = (selectedservers || []).map((url) => {
    const key = url.replace(/\/+$/, "");
    let label = (servernames || {})[key] || key;
    if (label === key) {
      try { label = new URL(key).host; } catch (_) {}
    }
    return { url, label };
  });

  // ONE list across every node that answered, with the same paper shown once.
  //
  // The Explorer now opens on the whole federation, so a paper published on
  // both UChicago and Duke used to appear as two identical rows — searching,
  // sorting and the record count all counted it twice. Merging by DOI is
  // done here, before anything downstream sees the rows, so search, filter,
  // sort and the empty state all operate on the same combined list.
  const rows = mergeRecordsByServer(papers, servernames, selectedservers);

  useEffect(() => {
    setSelected(selectedservers);
  }, []);

  // Explorer sends every visitor straight here, so a navigation to /search is
  // now the front door and its latency is visible. Next keeps the PREVIOUS
  // page mounted while it fetches the next one's props, which would leave a
  // stale record count on screen reading as the new one -- so the count is
  // replaced by an explicit loading state instead. "0 Records Available" is
  // never used to mean "still working": it is what a healthy empty node says.
  const [navigating, setNavigating] = useState(false);
  useEffect(() => {
    const { events } = router;
    if (!events) return undefined;
    const start = (url) => {
      if (String(url || "").startsWith("/search")) setNavigating(true);
    };
    const done = () => setNavigating(false);
    events.on("routeChangeStart", start);
    events.on("routeChangeComplete", done);
    events.on("routeChangeError", done);
    return () => {
      events.off("routeChangeStart", start);
      events.off("routeChangeComplete", done);
      events.off("routeChangeError", done);
    };
  }, [router]);

  const failed = (error && error.failed) || [];
  const filterFailures = Object.entries((error && error.filters) || {});
  const unavailable = !loading && Boolean(error && error.total);
  const countIsUnknown =
    loading || Boolean(runtime && runtime.total && !runtime.keptPrevious);

  return (
    <Fragment>
      <SEO
        title="Qresp | Search"
        description={searchDescription}
        author={searchAuthor}
      />
      <Container>
        <Box sx={{ display: "flex", flexDirection: "column", m: 2 }}>
          {/* NO banner when only some sources failed.
              
              Federation is plumbing. A visitor searching for a paper did not
              choose which nodes back this search, cannot tell which node
              would have held their paper, and cannot do anything about one
              being down -- so a warning above every result asked them to
              worry about something they have no move on, on a page that was
              working. The results that DID arrive are shown normally.
              
              The failure is not swallowed: `error.failed` still carries the
              exact origins for an operator reading the response, and the
              TOTAL failure below still says so plainly and offers a retry,
              because there the page genuinely has nothing to show. */}

          {/* Records ARE here; some of the dropdowns above the table just
              have fewer options than they should. Announcing that as missing
              records contradicted the rows the reader can see. */}
          {!unavailable && filterFailures.length > 0 ? (
            <Box sx={{ mb: 2 }} data-testid="search-filter-failure">
              <Alert severity="info">
                {/* WHICH filters are short, not which institution's node was
                    short of them. The endpoint names are the actionable part
                    -- they say which dropdown to distrust -- so they stay;
                    the node's name is what goes. */}
                {`Records were loaded, but some search filters have fewer options than usual (${Array.from(
                  new Set(
                    filterFailures.flatMap(([, endpoints]) => endpoints || [])
                  )
                ).join(", ")}) — ${sourcesUnavailable(
                  filterFailures.map(([server]) => server)
                )}.`}
              </Alert>
            </Box>
          ) : null}

          {/* The last Advanced Search, if it had trouble. Separate from the
              two notices above because it describes a DIFFERENT event: those
              are about how the page loaded, this is about a search the
              curator ran on top of it. Both can be true at once. */}
          {runtime ? (
            <Box sx={{ mb: 2 }} data-testid="advanced-search-failure">
              <Alert
                severity={runtime.total ? "error" : "warning"}
                action={
                  <RegularStyledButton onClick={runtime.retry}>
                    Retry
                  </RegularStyledButton>
                }
                // A node URL is long and a phone is narrow; without this the
                // alert pushes the whole page sideways.
                sx={{ overflowWrap: "anywhere" }}
              >
                {runtime.total
                  ? runtime.keptPrevious
                    ? `The search could not be refreshed and the previous results are still shown — ${sourcesUnavailable(
                        runtime.failed
                      )}.`
                    : `The search could not be run — ${sourcesUnavailable(
                        runtime.failed
                      )}.`
                  : `Some matching records are missing from these results — ${sourcesUnavailable(
                      runtime.failed
                    )}.`}
              </Alert>
            </Box>
          ) : null}

          {unavailable ? (
            <Box sx={{ my: 4 }} data-testid="search-unavailable">
              <Alert
                severity="error"
                action={
                  <RegularStyledButton onClick={refresh}>
                    Retry
                  </RegularStyledButton>
                }
              >
                {failed.length
                  ? `No records could be loaded — ${sourcesUnavailable(failed)}.`
                  : "No records could be loaded — no source could be reached."}{" "}
                No records could be loaded — this is a connection problem, not
                an empty node.
              </Alert>
            </Box>
          ) : (
            <Fragment>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
                {(navigating || loading) ? (
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    data-testid="search-loading"
                  >
                    <CircularProgress size={22} />
                    <Typography variant="h6">Searching…</Typography>
                  </Box>
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    Qresp Record Explorer
                  </Typography>
                )}
              </Box>
              <RecordTable
                rows={rows}
                columns={columns}
                defaultOrderBy="year"
                defaultOrder="desc"
                sortBarOptions={sortBarOptions}
                hideCount={navigating || countIsUnknown}
                advancedSearch={
                  <AdvancedSearch
                    collections={collections}
                    authors={authors}
                    publications={publications}
                    tags={Array.from(taglist)}
                    clearSearch={clearSearch}
                    onSearchStart={onSearchStart}
                    onSearchResult={onSearchResult}
                    serverOptions={serverOptions}
                  />
                }
              />
            </Fragment>
          )}
        </Box>
      </Container>
    </Fragment>
  );
};

export async function getServerSideProps(ctx) {
  const { query } = ctx;

  const servers = query.servers ? query.servers.split(",").filter(Boolean) : [];

  // Only fetch server labels — one fast internal request. All record and
  // filter data is fetched client-side so the page renders immediately.
  let servernames = {};
  try {
    const base = resolveServerSideApiBase(ctx, "");
    const { data } = await axios.get(`${base}/api/federation/servers`);
    (Array.isArray((data || {}).servers) ? data.servers : []).forEach((entry) => {
      const origin = String((entry || {}).qresp_server_url || "").replace(/\/+$/, "");
      const name = String((entry || {}).qresp_server_name || "").trim();
      if (origin && name) servernames[origin] = name;
    });
  } catch (e) {
    /* labels fall back to the host; records are unaffected */
  }

  return {
    props: { selectedservers: servers, servernames },
  };
}

export default search;
