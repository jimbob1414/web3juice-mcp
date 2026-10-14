import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBridge, readConfig} from '../lib/bridge.mjs';

const KEY = 'w3j_' + 'A'.repeat(43);
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

test('configuration: defaults, key format and https-only URLs', () => {
  assert.deepEqual(readConfig({}), {url: 'https://web3juice.com/api/mcp', key: null});
  assert.equal(readConfig({WEB3JUICE_API_KEY: KEY}).key, KEY);
  assert.throws(() => readConfig({WEB3JUICE_API_KEY: 'sk_live_wrong'}), /does not look like a Web3Juice key/);
  assert.throws(() => readConfig({WEB3JUICE_MCP_URL: 'http://example.com/api/mcp'}), /must use https/);
  assert.equal(readConfig({WEB3JUICE_MCP_URL: 'http://127.0.0.1:3030/api/mcp'}).url, 'http://127.0.0.1:3030/api/mcp');
  assert.throws(() => readConfig({WEB3JUICE_MCP_URL: 'not a url'}), /not a valid URL/);
});

test('forwards requests with the key and negotiated protocol version, drops notification acks', async () => {
  const seen = [];
  const forward = createBridge({url: 'https://web3juice.com/api/mcp', key: KEY}, async (url, init) => {
    seen.push({url, headers: init.headers, body: JSON.parse(init.body)});
    const body = JSON.parse(init.body);
    if (body.method === 'notifications/initialized') return new Response(null, {status: 202});
    if (body.method === 'initialize') return json({jsonrpc: '2.0', id: body.id, result: {protocolVersion: '2025-11-25', capabilities: {}, serverInfo: {name: 'web3juice', version: '1.0.0'}}});
    return json({jsonrpc: '2.0', id: body.id, result: {tools: []}});
  });
  assert.equal((await forward({jsonrpc: '2.0', id: 1, method: 'initialize', params: {}}))[0].result.protocolVersion, '2025-11-25');
  assert.deepEqual(await forward({jsonrpc: '2.0', method: 'notifications/initialized'}), []);
  assert.deepEqual((await forward({jsonrpc: '2.0', id: 2, method: 'tools/list'}))[0].result, {tools: []});
  assert.equal(seen[0].headers.Authorization, `Bearer ${KEY}`);
  assert.equal(seen[0].headers['MCP-Protocol-Version'], undefined);
  assert.equal(seen[2].headers['MCP-Protocol-Version'], '2025-11-25');
  assert.match(seen[2].headers.Accept, /application\/json/);
});

test('turns HTTP and network failures into JSON-RPC errors with the request id', async () => {
  const limited = createBridge({url: 'https://web3juice.com/api/mcp', key: null}, async () => json({jsonrpc: '2.0', id: null, error: {code: -32600, message: 'Daily MCP limit reached'}}, 429));
  assert.deepEqual(await limited({jsonrpc: '2.0', id: 7, method: 'tools/call'}), [{jsonrpc: '2.0', id: 7, error: {code: -32600, message: 'Daily MCP limit reached'}}]);
  const down = createBridge({url: 'https://web3juice.com/api/mcp', key: null}, async () => {throw Object.assign(new Error('fetch failed'), {cause: {code: 'ENOTFOUND'}});});
  const [reply] = await down({jsonrpc: '2.0', id: 'a', method: 'tools/list'});
  assert.equal(reply.id, 'a'); assert.match(reply.error.message, /Could not reach Web3Juice.*ENOTFOUND/);
  const html = createBridge({url: 'https://web3juice.com/api/mcp', key: null}, async () => new Response('<html>bad gateway</html>', {status: 502}));
  assert.match((await html({jsonrpc: '2.0', id: 3, method: 'tools/list'}))[0].error.message, /HTTP 502/);
  assert.deepEqual(await down({jsonrpc: '2.0', method: 'notifications/cancelled'}), []);
});

test('reads Server-Sent Events responses', async () => {
  const forward = createBridge({url: 'https://web3juice.com/api/mcp', key: null}, async () => new Response('event: message\ndata: {"jsonrpc":"2.0","id":4,"result":{"ok":true}}\n\n', {headers: {'content-type': 'text/event-stream'}}));
  assert.deepEqual(await forward({jsonrpc: '2.0', id: 4, method: 'ping'}), [{jsonrpc: '2.0', id: 4, result: {ok: true}}]);
});

test('the CLI prints its version, refuses a bad key on stderr and keeps stdout clean', async () => {
  const bin = fileURLToPath(new URL('../bin/web3juice-mcp.mjs', import.meta.url));
  const run = (args, env) => new Promise(resolve => {
    const child = spawn(process.execPath, [bin, ...args], {env: {...process.env, ...env}});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk); child.stderr.on('data', chunk => stderr += chunk);
    child.stdin.end(); child.on('close', code => resolve({code, stdout, stderr}));
  });
  assert.equal((await run(['--version'], {})).stdout.trim(), '1.0.0');
  const bad = await run([], {WEB3JUICE_API_KEY: 'nope'});
  assert.equal(bad.code, 1); assert.equal(bad.stdout, ''); assert.match(bad.stderr, /does not look like a Web3Juice key/);
});
