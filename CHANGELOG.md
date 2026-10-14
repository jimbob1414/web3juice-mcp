# Changelog

All notable changes to the Web3Juice MCP server and the `web3juice-mcp` package. Dates are UTC.

## 1.0.0 — 2026-10-14

First public release of the MCP product.

### Server (`https://web3juice.com/api/mcp`)
- Readable markdown answers on every tool (percentages, USD, dates, short and full addresses) with the full result
  kept as structured content.
- New tools: `summarize_yields` (market overview by chain, protocol or strategy) and `compare_pools`.
- `get_pool_history` now covers most pools, falling back to Web3Juice's own retrieved snapshots when no provider
  history is cached.
- Sensible search defaults (10 rows, pools with at least $100K TVL), descriptions on every filter, a warning when a
  rate looks like a percentage instead of a fraction, and errors that say how to fix the request.
- Four prompts and four resources (guide, methodology, data sources, pool detail template).
- API keys: higher limits per plan; Pro, Power and Team keys add read-only workspace tools (alerts, notebook,
  investments, saved wallets).
- MCP SDK 2.3.1.

### Package
- `npx web3juice-mcp`: zero-dependency stdio bridge with `WEB3JUICE_API_KEY`, `WEB3JUICE_MCP_URL` and
  `WEB3JUICE_MCP_DEBUG`; refuses plain-http URLs except localhost.
- Claude Desktop extension manifest (`manifest.json`) and MCP Registry metadata (`server.json`).

## 0.1.0 — 2026-10-05

- Public read-only server with `search_pools`, `get_pool`, `get_pool_history`, `get_data_sources` and
  `get_methodology`.
