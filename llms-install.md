# Installing Web3Juice MCP

Web3Juice is a hosted, read-only MCP server. No API key is needed for the research tools.

## Remote (preferred)

Add a Streamable HTTP server with URL https://web3juice.com/api/mcp

## Local stdio bridge

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

Optional: set WEB3JUICE_API_KEY (from https://web3juice.com/?view=account) for higher limits.

Verify by asking: "What does USDC lending pay on each chain right now?"
