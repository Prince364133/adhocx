// Forces a full GC in the API (inspector at 127.0.0.1:9230) and prints the retained heap.
(async () => {
  const list = await (await fetch('http://127.0.0.1:9230/json/list')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('HeapProfiler.enable');
  for (let i = 0; i < 3; i++) await send('HeapProfiler.collectGarbage');
  const r = await send('Runtime.evaluate', { expression: 'JSON.stringify(process.memoryUsage())', returnByValue: true });
  const m = JSON.parse(r.result.result.value);
  console.log(`${process.argv[2] || 'heap'}: heapUsed=${(m.heapUsed / 1048576).toFixed(1)}MB rss=${(m.rss / 1048576).toFixed(1)}MB external=${(m.external / 1048576).toFixed(1)}MB`);
  ws.close();
  process.exit(0);
})();
