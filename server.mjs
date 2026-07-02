#!/usr/bin/env node
// ----------------------------------------------------------------------------
// MCP server for the WebberSites x402 Data API (https://x402.webbersites.com).
//
// Tools are GENERATED from the API's live OpenAPI spec at startup, so new
// endpoints appear here automatically — nothing in this file lists endpoints.
//
// Payment: set EVM_PRIVATE_KEY to a wallet holding USDC on Base and every tool
// call pays for itself via x402 (fractions of a cent per call). Without a key
// the tools still work in "quote mode": they return the endpoint's payment
// requirements instead of data, so you can see what a call would cost.
//
// Env:
//   EVM_PRIVATE_KEY      0x… key for the paying wallet (USDC on Base)
//   X402_MAX_PRICE       max USD price per call this server will pay
//                        (default 0.10 — blocks only the $0.50 sticky post)
//   X402_OPENAPI_URL     spec to build tools from
//                        (default https://api.webbersites.com/openapi.json)
//   X402_FULL_OUTPUT     set to 1 to disable truncation of huge base64 fields
// ----------------------------------------------------------------------------
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const OPENAPI_URL = process.env.X402_OPENAPI_URL || "https://api.webbersites.com/openapi.json";
const MAX_PRICE = Number(process.env.X402_MAX_PRICE || "0.10");
const FULL_OUTPUT = process.env.X402_FULL_OUTPUT === "1";

// Paying fetch if a key is configured; plain fetch otherwise (quote mode).
let payingFetch = fetch;
let walletAddress = null;
if (process.env.EVM_PRIVATE_KEY) {
  const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
  walletAddress = signer.address;
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));
  payingFetch = wrapFetchWithPayment(fetch, client);
}

// ---- Build tools from the OpenAPI spec (lazy + memoized) -------------------
let toolsPromise = null;

function toolNameFor(operationId) {
  // "get_api_music_album" -> "get_music_album"; MCP allows [a-zA-Z0-9_-]{1,64}
  return operationId.replace(/^(get|post|put|delete|patch)_api_/, "$1_").slice(0, 64);
}

async function loadTools() {
  const res = await fetch(OPENAPI_URL);
  if (!res.ok) throw new Error(`Could not load OpenAPI spec (${res.status}) from ${OPENAPI_URL}`);
  const spec = await res.json();
  const serverUrl = spec.servers?.[0]?.url || "https://api.webbersites.com";

  const tools = [];
  const registry = new Map(); // toolName -> { method, pathTemplate, op }
  for (const [path, ops] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(ops)) {
      if (!op.operationId) continue;
      const name = toolNameFor(op.operationId);

      // Merge path/query params and request-body properties into one flat schema.
      const properties = {};
      const required = [];
      for (const p of op.parameters || []) {
        properties[p.name] = { ...(p.schema || { type: "string" }), ...(p.description ? { description: p.description } : {}) };
        if (p.required) required.push(p.name);
      }
      const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
      if (bodySchema?.properties) {
        for (const [k, v] of Object.entries(bodySchema.properties)) properties[k] = v;
        for (const r of bodySchema.required || []) required.push(r);
      }

      const price = op["x-price"] || "";
      tools.push({
        name,
        description: `${op.description || op.summary || ""}${price ? `` : ""}`.trim(),
        inputSchema: { type: "object", properties, ...(required.length ? { required } : {}) },
      });
      registry.set(name, { method: method.toUpperCase(), pathTemplate: path, op, serverUrl });
    }
  }
  return { tools, registry };
}
function getTools() {
  if (!toolsPromise) toolsPromise = loadTools().catch((e) => { toolsPromise = null; throw e; });
  return toolsPromise;
}

// Keep huge base64/svg payloads from flooding the model's context.
function compactOutput(data) {
  if (FULL_OUTPUT || typeof data !== "object" || data === null) return data;
  const out = Array.isArray(data) ? [...data] : { ...data };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === "string" && v.length > 4000 && /base64|data_uri|svg|image/i.test(k)) {
      out[k] = v.slice(0, 200) + `… [truncated: ${v.length} chars total — set X402_FULL_OUTPUT=1 for full payloads]`;
    } else if (typeof v === "object" && v !== null) {
      out[k] = compactOutput(v);
    }
  }
  return out;
}

async function callEndpoint(entry, args) {
  const { method, pathTemplate, op, serverUrl } = entry;

  // Price ceiling — refuse before any network call.
  const priceNum = parseFloat(String(op["x-price"] || "").replace(/[^0-9.]/g, ""));
  if (!Number.isNaN(priceNum) && priceNum > MAX_PRICE) {
    return {
      error: `This tool costs ${op["x-price"]} per call, above this server's ceiling of $${MAX_PRICE}. ` +
             `Raise it by setting the X402_MAX_PRICE environment variable.`,
    };
  }

  // Substitute {path} params; everything else becomes query (GET) or body (POST).
  const used = new Set();
  const path = pathTemplate.replace(/\{([^}]+)\}/g, (_, name) => {
    used.add(name);
    return encodeURIComponent(String(args?.[name] ?? ""));
  });
  const url = new URL(serverUrl + path);
  const rest = Object.fromEntries(Object.entries(args || {}).filter(([k, v]) => !used.has(k) && v != null));

  let fetchOpts = { method };
  if (method === "GET") {
    for (const [k, v] of Object.entries(rest)) url.searchParams.set(k, String(v));
  } else {
    fetchOpts.headers = { "Content-Type": "application/json" };
    fetchOpts.body = JSON.stringify(rest);
  }

  const res = await payingFetch(url.toString(), fetchOpts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 4000) }; }

  if (res.status === 402) {
    return {
      payment_required: true,
      note: walletAddress
        ? "Payment was attempted but not accepted — check the wallet's USDC balance on Base."
        : "No EVM_PRIVATE_KEY configured, so this is a quote: the endpoint returned its payment requirements instead of data. " +
          "Set EVM_PRIVATE_KEY to a wallet holding USDC on Base to make paying calls.",
      price: op["x-price"] || null,
      requirements_header: res.headers.get("PAYMENT-REQUIRED") ? "present" : "absent",
      body: data,
    };
  }
  if (!res.ok) return { http_status: res.status, ...((typeof data === "object" && data) || { body: data }) };
  return compactOutput(data);
}

// ---- MCP wiring -------------------------------------------------------------
const server = new Server(
  { name: "webbersites-x402", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const { tools } = await getTools();
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { registry } = await getTools();
  const entry = registry.get(req.params.name);
  if (!entry) {
    return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
  try {
    const result = await callEndpoint(entry, req.params.arguments || {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      ...(result?.error || result?.payment_required ? { isError: true } : {}),
    };
  } catch (e) {
    return { content: [{ type: "text", text: `Call failed: ${String(e?.message || e)}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `webbersites-x402 MCP server ready — spec: ${OPENAPI_URL}` +
  (walletAddress ? ` | paying wallet: ${walletAddress} | max $${MAX_PRICE}/call` : " | QUOTE MODE (no EVM_PRIVATE_KEY)")
);
