import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const {
  fetchInventorySnapshot,
  invalidateInventoryCache,
} = await import('@/features/inventory/service');

async function runBenchmark(label: string, force: boolean) {
  const start = performance.now();
  const snapshot = await fetchInventorySnapshot({ force });
  const duration = performance.now() - start;

  console.log(
    `${label}: ${Math.round(duration)}ms (${snapshot.items.length} items, ${snapshot.transactions.length} transactions)`,
  );

  return duration;
}

console.log('Inventory load benchmark (3 parallel Supabase queries per cold load)\n');

invalidateInventoryCache();
const coldMs = await runBenchmark('Cold load', true);

invalidateInventoryCache();
const connectedMs = await runBenchmark('Connected load', true);

const warmMs = await runBenchmark('Warm cache', false);

console.log('');
console.log('Target: < 1000ms connected load, < 50ms warm cache');
console.log(`First cold: ${Math.round(coldMs)}ms | Connected: ${Math.round(connectedMs)}ms | Warm: ${Math.round(warmMs)}ms`);

if (connectedMs >= 1000) {
  console.warn('Connected load exceeded 1s target — check network latency or apply latest migrations.');
  process.exitCode = 1;
} else {
  console.log('Performance target met.');
}
