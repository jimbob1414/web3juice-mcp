# Web3Juice plugin

DeFi yield research for Claude Code. The plugin connects the hosted, read-only Web3Juice MCP server
(`https://web3juice.com/api/mcp`) and adds one skill, `defi-yield-research`, that tells Claude when to use the tools
and how to present the results.

## What you can ask

- "What does USDC lending pay on each chain right now?"
- "Find stablecoin pools on Base with at least $5M TVL and no reward tokens."
- "How has the APY on this pool moved over the last 30 days?"
- "Compare the two largest USDC lending pools on Arbitrum."

Web3Juice covers about 17,000 pools on 100+ chains, refreshed about every 15 minutes. Each rate keeps base yield and
reward-token yield apart and carries the time Web3Juice retrieved it and, where the source states it, the time the
source measured it.

## What the skill makes Claude do

- Treat every number as dated research data, not advice: no "deposit here", no "best" pool, no allocation tactics.
- Never call a pool safe. The evidence assessment is experimental and most pools do not yet have enough evidence.
- Say that APY is variable, keep unknown values as "not stated" (never 0) and keep the source's measurement time
  separate from Web3Juice's retrieval time.
- Remember that Web3Juice is read-only: it never holds funds, sees wallet keys or signs transactions.

## Install

```bash
claude plugin marketplace add jimbob1414/web3juice-mcp
```

```bash
claude plugin install web3juice@web3juice
```

No account is needed for the research tools. For higher limits, create an API key on your
[Web3Juice account page](https://web3juice.com/?view=account) and set `WEB3JUICE_API_KEY` in your environment before
starting Claude Code.

## Contents

| Path | Purpose |
| --- | --- |
| `.claude-plugin/plugin.json` | Plugin manifest |
| `.mcp.json` | Registers the remote MCP server (Streamable HTTP, optional bearer key) |
| `skills/defi-yield-research/SKILL.md` | The research skill ([Agent Skills](https://agentskills.io) format) |

## Data and privacy

The MCP server is read-only. It receives the tool arguments Claude sends (filters and pool ids) and, if you set one,
your API key. See [web3juice.com/privacy](https://web3juice.com/privacy). Not financial advice.
