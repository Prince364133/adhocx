// Records a CPU profile (and optionally heap stats) of the API via the inspector (127.0.0.1:9230)
// and prints the top self-time functions. Usage: node profile.js <seconds>
const fs = require('fs');
const path = require('path');
const secs = Number(process.argv[2] || 20);
(async () => {
  const list = await (await fetch('http://127.0.0.1:9230/json/list')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pend = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) {
      pend.get(d.id)(d);
      pend.delete(d.id);
    }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 1000 });
  await send('Profiler.start');
  await new Promise((r) => setTimeout(r, secs * 1000));
  const prof = (await send('Profiler.stop')).result.profile;
  fs.writeFileSync(path.join(__dirname, `api-${Date.now()}.cpuprofile`), JSON.stringify(prof));
  const byId = new Map(prof.nodes.map((n) => [n.id, n]));
  const self = new Map();
  let total = 0;
  prof.samples.forEach((sid, i) => {
    const dt = prof.timeDeltas[i] || 0;
    total += dt;
    const cf = byId.get(sid).callFrame;
    const file = cf.url.replace(/^.*[\\/](node_modules[\\/].*?[\\/][^\\/]+)[\\/].*$/, '$1').replace(/^.*[\\/]dist[\\/]apps[\\/]api[\\/]src[\\/]/, 'src/').split('?')[0];
    const key = `${cf.functionName || '(anon)'}  ${file}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + dt);
  });
  const idle = [...self.entries()].filter(([k]) => k.startsWith('(idle)')).reduce((a, [, v]) => a + v, 0);
  console.log(`profile ${secs}s: busy ${(((total - idle) / total) * 100).toFixed(1)}% of one core`);
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, us]) => console.log(`${(us / 1000).toFixed(0).padStart(7)} ms  ${k}`));
  // Aggregate by module (node_modules package or src file)
  const byMod = new Map();
  for (const [k, us] of self) {
    const file = k.split('  ')[1] || '';
    const mod = file.startsWith('node_modules') ? file.split(/[\\/]/).slice(0, 2).join('/') : file.split(':')[0];
    byMod.set(mod, (byMod.get(mod) || 0) + us);
  }
  console.log('\nby module:');
  [...byMod.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([m, us]) => console.log(`${(us / 1000).toFixed(0).padStart(7)} ms  ${m}`));
  ws.close();
  process.exit(0);
})();
