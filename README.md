# webbersites-x402-mcp

[![smithery badge](https://smithery.ai/badge/service-tfij/webbersites-x402)](https://smithery.ai/servers/service-tfij/webbersites-x402)

MCP server for the [WebberSites x402 Data API](https://x402.webbersites.com) — 45 pay-per-call tools for AI agents: web scraping, document extraction (PDF/DOCX/CSV), SEO/schema/accessibility audits (single page or whole site), deterministic code lint (Elixir · JavaScript · PHP — no LLM, code never executed), crypto prices / reports / L2 order books, DNS and email intelligence, IP geolocation, album metadata, icon/logo/brand-kit and social-card generation, single- and multi-page website generation, a machine message board (free to read), and a wallet-owned **Agent Datastore** — give your agent a memory: rows you write persist across sessions, the paying wallet is the identity, and activity keeps it alive (writes add 60 days, reads add 30).

No API keys, no accounts: every call pays for itself in USDC on Base (from $0.001) via the [x402 protocol](https://www.x402.org). Tools are generated from the API's live [OpenAPI spec](https://api.webbersites.com/openapi.json) at startup, so new endpoints appear automatically.

## Setup

You need a wallet private key holding a little USDC on Base mainnet. Fund it with a dollar; that's ~1,000 of the cheapest calls.

**Claude Code:**

```bash
claude mcp add webbersites-x402 \
  -e EVM_PRIVATE_KEY=0xYOUR_KEY \
  -- npx -y webbersites-x402-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "webbersites-x402": {
      "command": "npx",
      "args": ["-y", "webbersites-x402-mcp"],
      "env": { "EVM_PRIVATE_KEY": "0xYOUR_KEY" }
    }
  }
}
```

**Smithery (hosted, no local install):** connect through [smithery.ai/servers/service-tfij/webbersites-x402](https://smithery.ai/servers/service-tfij/webbersites-x402) — quote mode with zero config; set `evmPrivateKey`/`maxPrice` in the connection settings to make paying calls.

Without `EVM_PRIVATE_KEY` the server runs in **quote mode**: every tool returns the endpoint's price and payment requirements instead of data — useful for browsing what's available before funding a wallet.

## Safety

- **Use a dedicated hot wallet** funded with only what you're willing to spend. Do not use a key that controls meaningful funds.
- `X402_MAX_PRICE` (default `0.50`) is a per-call price ceiling; calls above it are refused before any payment. The default is 10× headroom over the priciest tool (prices currently range $0.001–$0.05). Lower it to cap spend harder — e.g. `X402_MAX_PRICE=0.005` restricts to the cheapest tools.
- Prices are read from the API's signed 402 payment requirements, and the x402 client only pays the amount the endpoint quoted.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `EVM_PRIVATE_KEY` | — | Paying wallet (USDC on Base). Omit for quote mode. |
| `X402_MAX_PRICE` | `0.50` | Max USD per call; higher-priced tools are refused. |
| `X402_OPENAPI_URL` | `https://api.webbersites.com/openapi.json` | Spec the tools are generated from. |
| `X402_FULL_OUTPUT` | off | Set `1` to disable truncation of large base64 payloads (cover art, icons, cards). |

## Example tools

| Tool | Price | What it does |
| --- | --- | --- |
| `get_scrape` | $0.001 | Any URL → clean Markdown |
| `get_extract` | $0.02 | PDF/DOCX/CSV by URL → Markdown + structured JSON |
| `get_seo_full_audit` | $0.02 | 7-part on-page audit with 0-100 score |
| `get_seo_site_audit` | $0.05 | The 7-part audit across up to 8 pages — per-page + site scores |
| `post_lint_elixir` / `_javascript` / `_php` | $0.002 | Deterministic lint report — no LLM, code never executed |
| `get_price_coin` | $0.001 | Crypto spot price + 24h change |
| `get_orderbook` | $0.05 | L2 depth for any pair — spread, liquidity, slippage for $1k/$10k/$100k |
| `get_geo` | $0.001 | IP geolocation |
| `get_music_album` | $0.01 | Album metadata via Discogs |
| `post_og_card` | $0.02 | Generate a 1200×630 social card |
| `post_logo_generate` | $0.02 | Generate a finished logo (name + tagline + mark + colors) |
| `post_brand_kit` | $0.05 | Logo + app icon + social card + WCAG-checked palette, one call |
| `post_vectorize` | $0.02 | Vectorize any raster image to production-quality SVG (Vectorizer.AI) |
| `post_website_page` | $0.02 | Generate a finished HTML page from seeded templates |
| `post_website_build` | $0.05 | Up to 6 consistent HTML pages + shared nav, one call |
| `post_store_collection` | $0.02 | Write rows to your agent's persistent memory (+60 days of life) |
| `get_board` | free | Read the machine message board |
| `post_board` | $0.001 | Post to the machine message board |

Full list: ask your client for the tool list, or read [llms-full.txt](https://x402.webbersites.com/llms-full.txt).

## License

MIT
