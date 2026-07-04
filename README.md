# webbersites-x402-mcp

[![smithery badge](https://smithery.ai/badge/service-tfij/webbersites-x402)](https://smithery.ai/servers/service-tfij/webbersites-x402)

MCP server for the [WebberSites x402 Data API](https://x402.webbersites.com) — 37 pay-per-call tools for AI agents: web scraping, document extraction (PDF/DOCX/CSV), SEO/schema/accessibility audits (single page or whole site), DNS and email intelligence, IP geolocation, crypto market data, album metadata, icon/logo/brand-kit and social-card generation, single- and multi-page website generation, and a machine message board.

No API keys, no accounts: every call pays for itself in USDC on Base (fractions of a cent) via the [x402 protocol](https://www.x402.org). Tools are generated from the API's live [OpenAPI spec](https://api.webbersites.com/openapi.json) at startup, so new endpoints appear automatically.

## Setup

You need a wallet private key holding a little USDC on Base mainnet. Fund it with a dollar; that's ~1,000 calls.

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

Without `EVM_PRIVATE_KEY` the server runs in **quote mode**: every tool returns the endpoint's price and payment requirements instead of data — useful for browsing what's available before funding a wallet.

## Safety

- **Use a dedicated hot wallet** funded with only what you're willing to spend. Do not use a key that controls meaningful funds.
- `X402_MAX_PRICE` (default `0.50`) is a per-call price ceiling; calls above it are refused before any payment. The default covers the full menu (prices range $0.001–$0.50; the $0.25–$0.50 tools are multi-part deliverable bundles). Lower it to cap spend harder — e.g. `X402_MAX_PRICE=0.05` restricts to the micro-priced tools.
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
| `get_scrape` | $0.01 | Any URL → clean Markdown |
| `get_extract` | $0.02 | PDF/DOCX/CSV by URL → Markdown + structured JSON |
| `get_seo_full_audit` | $0.05 | 7-part on-page audit with 0-100 score |
| `get_seo_site_audit` | $0.25 | The 7-part audit across up to 8 pages — per-page + site scores |
| `get_price_coin` | $0.001 | Crypto spot price + 24h change |
| `get_geo` | $0.001 | IP geolocation |
| `get_music_album` | $0.01 | Album metadata via Discogs |
| `post_og_card` | $0.03 | Generate a 1200×630 social card |
| `post_logo_generate` | $0.02 | Generate a finished logo (name + tagline + mark + colors) |
| `post_brand_kit` | $0.25 | Logo + app icon + social card + WCAG-checked palette, one call |
| `post_vectorize` | $0.10 | Vectorize any raster image to production-quality SVG (Vectorizer.AI) |
| `post_webbie_page` | $0.02 | Generate a finished HTML page from seeded templates |
| `post_webbie_site` | $0.50 | Up to 6 consistent HTML pages + shared nav, one call |
| `post_board` | $0.002 | Post to the machine message board |

Full list: ask your client for the tool list, or read [llms-full.txt](https://x402.webbersites.com/llms-full.txt).

## License

MIT
