// web3juice-mcp: connects any stdio MCP client (Claude Desktop, Cline, Zed, ...) to the hosted Web3Juice MCP server.
// It forwards each JSON-RPC message from stdin to https://web3juice.com/api/mcp and writes the reply to stdout.
// Zero dependencies. stdout carries only protocol messages; diagnostics go to stderr.
// It reads DeFi research data only: it never sees a wallet, signs a transaction or moves funds.
import {createInterface} from 'node:readline';

export const VERSION = '1.0.0';
const DEFAULT_URL = 'https://web3juice.com/api/mcp';
const KEY_PATTERN = /^w3j_[A-Za-z0-9_-]{43}$/;
const PROTOCOL_META = 'io.modelcontextprotocol/protocolVersion';
const TIMEOUT_MS = 30000;

/** Validates configuration; returns {url, key} or throws an Error whose message tells the user what to fix. */
export function readConfig(env = process.env) {
  const raw = (env.WEB3JUICE_MCP_URL || DEFAULT_URL).trim();
  let url;
  try {url = new URL(raw);} catch {throw new Error(`WEB3JUICE_MCP_URL is not a valid URL: ${raw}`);}
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('WEB3JUICE_MCP_URL must use https:// (plain http is only allowed for localhost).');
  const key = (env.WEB3JUICE_API_KEY || '').trim();
  if (key && !KEY_PATTERN.test(key)) throw new Error('WEB3JUICE_API_KEY does not look like a Web3Juice key (it starts with "w3j_" and is 47 characters long). Copy it again from your Web3Juice account page, or leave it empty to use the free tools.');
  return {url: url.href, key: key || null};
}

const errorFor = (id, message, code = -32603) => ({jsonrpc: '2.0', id: id ?? null, error: {code, message}});

/** Parses a Server-Sent Events body into the JSON messages carried in its data lines. */
function parseSse(text) {
  const messages = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (data) try {messages.push(JSON.parse(data));} catch {/* ignore keep-alive or partial blocks */}
  }
  return messages;
}

/** Creates a forwarder bound to one configuration. `fetchImpl` is injectable for tests. */
export function createBridge({url, key}, fetchImpl = fetch) {
  let protocolVersion = null;
  return async function forward(message) {
    const isRequest = message && typeof message === 'object' && 'id' in message && 'method' in message;
    const metaVersion = message?.params?._meta?.[PROTOCOL_META];
    const headers = {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': `web3juice-mcp/${VERSION}`};
    const version = typeof metaVersion === 'string' ? metaVersion : protocolVersion;
    if (version && message?.method !== 'initialize') headers['MCP-Protocol-Version'] = version;
    if (key) headers.Authorization = `Bearer ${key}`;
    let response;
    try {
      response = await fetchImpl(url, {method: 'POST', headers, body: JSON.stringify(message), signal: AbortSignal.timeout(TIMEOUT_MS)});
    } catch (error) {
      const reason = error?.name === 'TimeoutError' ? 'the request timed out' : (error?.cause?.code || error?.message || 'network error');
      return isRequest ? [errorFor(message.id, `Could not reach Web3Juice at ${url} (${reason}). Check your internet connection${process.env.WEB3JUICE_MCP_URL ? ' and WEB3JUICE_MCP_URL' : ''}.`)] : [];
    }
    if (response.status === 202 || response.status === 204) return [];
    const type = response.headers.get('content-type') || '', text = await response.text();
    let replies = [];
    if (type.includes('text/event-stream')) replies = parseSse(text);
    else try {const parsed = JSON.parse(text); replies = Array.isArray(parsed) ? parsed : [parsed];} catch {replies = [];}
    replies = replies.filter(reply => reply && typeof reply === 'object');
    if (!replies.length) {
      if (!isRequest) return [];
      const hint = response.status === 429 ? ' You have hit a rate limit; wait a minute or add an API key from your Web3Juice account page.' : response.status === 401 ? ' Check WEB3JUICE_API_KEY.' : '';
      return [errorFor(message.id, `Web3Juice returned HTTP ${response.status}.${hint}`)];
    }
    for (const reply of replies) {
      if (message?.method === 'initialize' && typeof reply?.result?.protocolVersion === 'string') protocolVersion = reply.result.protocolVersion;
      // HTTP-level errors carry id null; give them back the request id so the client can match them.
      if (isRequest && 'error' in reply && (reply.id === null || reply.id === undefined)) reply.id = message.id;
    }
    return isRequest ? replies : [];
  };
}

function log(...parts) {if (process.env.WEB3JUICE_MCP_DEBUG) process.stderr.write(`[web3juice-mcp] ${parts.join(' ')}\n`);}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--version') || argv.includes('-v')) {process.stdout.write(`${VERSION}\n`); return;}
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`web3juice-mcp ${VERSION}: connect a stdio MCP client to Web3Juice DeFi yield research.\n\nEnvironment:\n  WEB3JUICE_API_KEY   optional key from https://web3juice.com/?view=account (higher limits; Pro adds your saved alerts and notebook)\n  WEB3JUICE_MCP_URL   optional, default ${DEFAULT_URL}\n  WEB3JUICE_MCP_DEBUG set to 1 to log to stderr\n\nDocs: https://web3juice.com/mcp\n`);
    return;
  }
  let config;
  try {config = readConfig();} catch (error) {process.stderr.write(`web3juice-mcp: ${error.message}\n`); process.exitCode = 1; return;}
  log(`forwarding to ${config.url}${config.key ? ' with an API key' : ' without an API key'}`);
  const forward = createBridge(config), pending = new Set();
  const write = message => process.stdout.write(JSON.stringify(message) + '\n');
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity});
  lines.on('line', line => {
    if (!line.trim()) return;
    let parsed;
    try {parsed = JSON.parse(line);} catch {write(errorFor(null, 'Parse error: each line must be one JSON-RPC message.', -32700)); return;}
    for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
      const task = forward(message).then(replies => replies.forEach(write), error => {log('forward failed', error?.message); if (message?.id !== undefined) write(errorFor(message.id, 'The Web3Juice bridge failed to forward this request.'));});
      pending.add(task); task.finally(() => pending.delete(task));
    }
  });
  await new Promise(resolve => lines.once('close', resolve));
  await Promise.allSettled([...pending]);
}

