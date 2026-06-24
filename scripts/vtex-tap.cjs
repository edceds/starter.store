/**
 * vtex-tap — logs every outbound VTEX REST request the FastStore BFF makes.
 *
 * Usage (preferred — propagates into the child Next.js process):
 *   bun run dev:tap        # or:  npm run dev:tap
 *
 * which expands to:
 *   NODE_OPTIONS="--require $(pwd)/scripts/vtex-tap.cjs" faststore dev
 *
 * `faststore dev` spawns `next dev` as a child process; the real VTEX fetches
 * happen there, so we inject via NODE_OPTIONS (inherited by children) rather
 * than a top-level --require (which only the parent process would see).
 *
 * Trigger a GraphQL query in the browser (or curl your localhost BFF) and the
 * terminal prints the real backend URL(s) it resolved to, e.g.
 *   [vtex-tap] GET https://newstore.vtexcommercestable.com.br/api/io/_v/api/intelligent-search/product_search?query=&page=1&...
 *
 * No guessing about param names — this is the actual request FastStore sends.
 */

const MATCH =
  /vtexcommercestable\.com|myvtex\.com|vtexpayments|vtexassets\.com|vtex\.com\.br|content-platform/i
const origFetch = globalThis.fetch

if (typeof origFetch !== "function") {
  console.warn("[vtex-tap] global fetch not found — are you on Node 18+?")
} else {
  globalThis.fetch = function (input, init) {
    try {
      const url =
        typeof input === "string"
          ? input
          : input && input.url
          ? input.url
          : String(input)
      const method = (init && init.method) || (input && input.method) || "GET"
      if (MATCH.test(url)) {
        const u = new URL(url)
        // Pretty-print: host + path on one line, query params indented.
        console.log(`\n[vtex-tap] ${method} ${u.origin}${u.pathname}`)
        if ([...u.searchParams.keys()].length) {
          for (const [k, v] of u.searchParams.entries()) {
            console.log(`           ${k} = ${v}`)
          }
        }
      }
    } catch (e) {
      // Never let logging break a real request.
    }
    return origFetch.apply(this, arguments)
  }
  console.log("[vtex-tap] active — logging outbound VTEX requests")
}
