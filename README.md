# web3juice-mcp

**Evidence-backed DeFi yield data for your AI assistant.** Ask Claude, Cursor or any MCP client what ~17,000 DeFi
pools pay, where the yield comes from (base vs reward tokens), how it has moved over 90 days and how pools compare —
with every number dated and linked to its source.

This package is a tiny, dependency-free bridge from a local **stdio** MCP client to the hosted Web3Juice MCP server at
`https://web3juice.com/api/mcp`. Clients that support remote servers can connect to that URL directly; see
[web3juice.com/mcp](https://web3juice.com/mcp).

Read-only: it never sees a wallet's keys, signs a transaction or moves funds. Not financial advice.

## Quick start

Claude Desktop → Settings → Developer → Edit Config, then add:

```json
{
  "mcpServers": {
    "web3juice": {
      "command": "npx",
      "args": ["-y", "web3juice-mcp"]
    }
  }
}
```

Restart Claude Desktop and ask: *"What does USDC lending pay on each chain right now?"*

Requires Node.js 18.17 or newer.

### With an API key (higher limits, your own alerts and notebook on Pro)

Create a key on your [Web3Juice account page](https://web3juice.com/?view=account) and add it as an environment
variable:

```json
{
  "mcpServers": {
    "web3juice": {
      "command": "npx",
      "args": ["-y", "web3juice-mcp"],
      "env": {"WEB3JUICE_API_KEY": "w3j_your_key_here"}
    }
  }
}
```

## Other clients

**Claude Code** (remote, no install):

```bash
claude mcp add --transport http web3juice https://web3juice.com/api/mcp
```

**Claude Code plugin** (this repository is also a plugin marketplace):

```bash
claude plugin marketplace add jimbob1414/web3juice-mcp
```

```bash
claude plugin install web3juice@web3juice
```

Set `WEB3JUICE_API_KEY` in your environment to use your own limits.

**Cursor, VS Code, ChatGPT, Claude.ai and others:** see [web3juice.com/mcp](https://web3juice.com/mcp).

**Claude Desktop extension:** download `web3juice.mcpb` from the [latest release](https://github.com/jimbob1414/web3juice-mcp/releases/latest) and open it.

## Tools

| Tool | What it does |
| --- | --- |
| `summarize_yields` | Market overview for any filter: median and TVL-weighted APY by chain, protocol or strategy. |
| `search_pools` | Find and rank pools by token, chain, protocol, APY and TVL. |
| `get_pool` | One pool: APY split, TVL, data age, contract and token addresses, deposit and source links, assessment. |
| `get_pool_history` | 7/30/90-day APY trend with dated samples. |
| `compare_pools` | 2–5 pools side by side with 30-day ranges. |
| `get_data_sources` | Feed health and last update. |
| `get_methodology` | How the experimental evidence assessment works. |

With a Pro, Power or Team key, read-only workspace tools are added: `list_alerts`, `get_alert`,
`list_notebook_entries`, `get_notebook_entry`, `list_investments`, `list_wallets`, `get_wallet_positions`.

Prompts: `find_stablecoin_yields`, `analyse_pool`, `compare_yields`, `yield_market_snapshot`.
Resources: `web3juice://guide`, `web3juice://methodology`, `web3juice://data-sources`, `web3juice://pool/{poolId}`.

## Limits and pricing

| | No key | Free account key | Pro (£10/month) | Power (£39/month) |
| --- | --- | --- | --- | --- |
| Calls per day | 500 per address | 500 | 10,000 | 50,000 |
| Calls per minute | 30 | 30 | 120 | 300 |
| Your alerts, notebook, investments, wallets | — | — | yes | yes |

Current prices: [web3juice.com/pricing](https://web3juice.com/pricing).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEB3JUICE_API_KEY` | none | Optional key (`w3j_…`). Without it you get the free limits. |
| `WEB3JUICE_MCP_URL` | `https://web3juice.com/api/mcp` | Server URL. Must be `https://` (plain `http` only for localhost). |
| `WEB3JUICE_MCP_DEBUG` | off | Set to `1` to log to stderr. |

## Security

- The bridge writes only MCP messages to stdout; diagnostics go to stderr.
- Your API key is sent only to the configured HTTPS URL, in the `Authorization` header. It is never logged.
- Keys can only read. Revoke a key at any time on your account page; the next call fails with a clear message.
- Pool names and labels come from third-party data sources and are treated as data, not instructions.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npx` not found / server fails to start | Install Node.js 18.17+ from nodejs.org, then restart your client. |
| "API key is not valid or has been revoked" | Create a new key on your account page and update `WEB3JUICE_API_KEY`. |
| "Daily MCP limit reached" | Wait until 00:00 UTC, add a key, or upgrade at web3juice.com/pricing. |
| Search returns nothing | Results default to pools with at least $100K TVL and data under 60 minutes old; ask for smaller pools or older data. |
| Rates look 100× too big | Filters use fractions: 0.05 means 5%. |

## Licence

MIT for this bridge. The data and service at web3juice.com are not covered by this licence.
