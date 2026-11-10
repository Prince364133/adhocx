// Samples API heap/RSS, API CPU, Postgres/Redis container stats, PG connections and Redis keys every
// INTERVAL ms into monitor.csv until killed (or DURATION_S elapses).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, process.env.OUT || 'monitor.csv');
const INTERVAL = Number(process.env.INTERVAL || 10000);
const DURATION_S = Number(process.env.DURATION_S || 900);
const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim();
  } catch {
    return '';
  }
};
const apiPid = () =>
  sh(`powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${process.env.PORT || 7101} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"`);

fs.writeFileSync(OUT, 'ts,elapsed_s,heap_mb,heap_total_mb,rss_mb,api_cpu_s,api_ws_mb,api_handles,pg_cpu,pg_mem,redis_cpu,redis_mem,pg_conns,redis_used_mb,redis_keys,redis_clients\n');
const t0 = Date.now();
const pid = apiPid();
console.log('api pid', pid);

async function sample() {
  let heap = '', heapTotal = '', rss = '';
  try {
    const r = await fetch(`http://localhost:${process.env.PORT || 7101}/api/v1/health`, { signal: AbortSignal.timeout(5000) });
    const m = (await r.json())?.data?.components?.memory || {};
    heap = m.heapUsedMb; heapTotal = m.heapTotalMb; rss = m.rssMb;
  } catch {}
  const proc = pid
    ? sh(`powershell -NoProfile -Command "$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if($p){[string]::Join('|',@([int]$p.CPU,[int]($p.WorkingSet64/1MB),$p.HandleCount))}"`).replace(/\s/g, '').replace(/\|/g, ',') || ',,'
    : ',,';
  const stats = sh('docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}" adhocx-load-pg adhocx-load-redis');
  const st = {};
  for (const line of stats.split(/\r?\n/)) {
    const [name, cpu, mem] = line.split('|');
    if (name) st[name.trim()] = { cpu: cpu?.trim(), mem: (mem || '').split('/')[0].trim() };
  }
  const pgConns = sh(`docker exec adhocx-load-pg psql -U load -d adhocx_load -tAc "select count(*) from pg_stat_activity where datname='adhocx_load'"`);
  const info = sh('docker exec adhocx-load-redis redis-cli info');
  const usedMb = (Number(/used_memory:(\d+)/.exec(info)?.[1] || 0) / 1048576).toFixed(1);
  const keys = /db0:keys=(\d+)/.exec(info)?.[1] || 0;
  const clients = /connected_clients:(\d+)/.exec(info)?.[1] || 0;
  const row = [
    new Date().toISOString(), Math.round((Date.now() - t0) / 1000), heap, heapTotal, rss, proc,
    st['adhocx-load-pg']?.cpu, st['adhocx-load-pg']?.mem, st['adhocx-load-redis']?.cpu, st['adhocx-load-redis']?.mem,
    pgConns, usedMb, keys, clients,
  ].join(',');
  fs.appendFileSync(OUT, row + '\n');
}

(async () => {
  while ((Date.now() - t0) / 1000 < DURATION_S) {
    const s = Date.now();
    await sample();
    await new Promise((r) => setTimeout(r, Math.max(500, INTERVAL - (Date.now() - s))));
  }
})();
