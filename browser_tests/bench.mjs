// Instrumented browser groth16 proving benchmark.
//
// Serves the snarkjs IIFE bundle plus a circuit's zkey/witness, drives
// headless Chrome to run snarkjs.groth16.prove in-page, and reports:
//   - prove wall time (performance.now in-page)
//   - fetch time for zkey+wtns
//   - peak in-page JS heap (performance.memory, main thread only)
//   - peak renderer-process RSS, sampled externally and scoped to THIS
//     Chrome's process tree (captures workers + wasm + ArrayBuffers, which
//     the JS heap number misses)
//   - in-page proof verification when a verification key is provided
//
// Usage:
//   node bench.mjs <circuit.zkey> <witness.wtns> [vkey.json]
// Env:
//   BUNDLE=/path/to/snarkjs.js   IIFE bundle to serve (default ../build/snarkjs.min.js)
//   PORT=1338                    HTTP port
//
// The zkey/wtns are fetched into browser memory ({type:"mem"}), so the peak
// RSS includes them; a 1 GB zkey needs a machine with several GB free.
import { createServer } from "http";
import { createReadStream, statSync } from "fs";
import { execSync } from "child_process";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer");

const [zkeyPath, wtnsPath, vkPath] = process.argv.slice(2);
if (!zkeyPath || !wtnsPath) {
    console.error("usage: node bench.mjs <circuit.zkey> <witness.wtns> [vkey.json]");
    process.exit(1);
}
const BUNDLE = process.env.BUNDLE || join(here, "..", "build", "snarkjs.min.js");
const PORT = parseInt(process.env.PORT || "1338", 10);

const HTML = `<!doctype html><html><head><meta charset=utf8></head><body>
<script src="/snarkjs.js"></script>
<script>
window.__run = async () => {
  const log = (m) => window.__log(String(m));
  try {
    const fetchU8 = async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer());
    log("fetching zkey+wtns...");
    const t0 = performance.now();
    const zkey = await fetchU8("/zkey");
    const wtns = await fetchU8("/wtns");
    const fetchMs = performance.now() - t0;
    log("fetched in " + fetchMs.toFixed(0) + "ms; zkey=" + (zkey.length/1048576).toFixed(0) + "MB");
    let peakHeap = 0;
    const heapTimer = setInterval(() => { if (performance.memory) peakHeap = Math.max(peakHeap, performance.memory.usedJSHeapSize); }, 50);
    const tp = performance.now();
    const { proof, publicSignals } = await snarkjs.groth16.prove({type:"mem", data: zkey}, {type:"mem", data: wtns});
    const proveMs = performance.now() - tp;
    clearInterval(heapTimer);
    let verified = "n/a";
    try {
      const r = await fetch("/vk");
      if (r.ok) verified = await snarkjs.groth16.verify(await r.json(), publicSignals, proof);
    } catch (e) { /* no vkey served */ }
    await window.__done({ proveMs, fetchMs, peakHeapMB: peakHeap/1048576, nPublic: publicSignals.length, verified });
  } catch (e) { await window.__done({ error: String(e && e.stack || e) }); }
};
</script></body></html>`;

// ---- static server (whole-file, streamed) ----
const server = createServer((req, res) => {
    const url = req.url.split("?")[0];
    let file;
    if (url === "/" || url === "/prove.html") { res.setHeader("content-type", "text/html"); return res.end(HTML); }
    else if (url === "/snarkjs.js") file = BUNDLE;
    else if (url === "/zkey") file = zkeyPath;
    else if (url === "/wtns") file = wtnsPath;
    else if (url === "/vk" && vkPath) { res.setHeader("content-type", "application/json"); return createReadStream(vkPath).pipe(res); }
    else { res.statusCode = 404; return res.end("nf"); }
    res.setHeader("content-length", statSync(file).size);
    createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

// ---- renderer-process RSS sampler, scoped to OUR Chrome's descendants ----
// Summing all system renderers would include the user's own browser, so walk
// only the launched browser's process tree and sum --type=renderer RSS.
function rendererRssMB(rootPid) {
    try {
        const out = execSync("ps -eo pid,ppid,rss,args 2>/dev/null", { encoding: "utf8" });
        const rows = out.trim().split("\n").slice(1).map((l) => {
            const m = l.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
            return m ? { pid: +m[1], ppid: +m[2], rss: +m[3], args: m[4] } : null;
        }).filter(Boolean);
        const childrenOf = new Map();
        for (const r of rows) { if (!childrenOf.has(r.ppid)) childrenOf.set(r.ppid, []); childrenOf.get(r.ppid).push(r); }
        const byPid = new Map(rows.map((r) => [r.pid, r]));
        const seen = new Set([rootPid]); const queue = [rootPid]; let kb = 0;
        while (queue.length) {
            const p = queue.shift();
            for (const c of (childrenOf.get(p) || [])) if (!seen.has(c.pid)) { seen.add(c.pid); queue.push(c.pid); }
        }
        for (const pid of seen) { const r = byPid.get(pid); if (r && /--type=renderer/.test(r.args)) kb += r.rss; }
        return kb / 1024;
    } catch { return 0; }
}

const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-precise-memory-info", "--js-flags=--max-old-space-size=12288"],
});
const page = await browser.newPage();
const logs = [];
await page.exposeFunction("__log", (m) => { logs.push(m); });
let result = null;
const done = new Promise((res) => page.exposeFunction("__done", (r) => { result = r; res(r); }));

const browserPid = browser.process().pid;
await page.goto(`http://localhost:${PORT}/prove.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 500));   // let the renderer settle
const baseRss = rendererRssMB(browserPid);      // bundle loaded, before fetch+prove
let peakRss = baseRss;
const rssTimer = setInterval(() => { peakRss = Math.max(peakRss, rendererRssMB(browserPid)); }, 100);

await page.evaluate(() => window.__run());
await done;
clearInterval(rssTimer);

console.log(`\n=== browser groth16 prove: ${zkeyPath} ===`);
for (const l of logs) console.log("  " + l);
if (result.error) console.log("  ERROR:", result.error);
else {
    console.log(`  prove wall:        ${result.proveMs.toFixed(0)} ms`);
    console.log(`  fetch (zkey+wtns): ${result.fetchMs.toFixed(0)} ms`);
    console.log(`  peak JS heap:      ${result.peakHeapMB.toFixed(0)} MB  (main-thread only)`);
    console.log(`  renderer RSS:      base ${baseRss.toFixed(0)} MB -> peak ${peakRss.toFixed(0)} MB  (delta ${(peakRss-baseRss).toFixed(0)} MB; page+workers+wasm+ArrayBuffers)`);
    console.log(`  publicSignals:     ${result.nPublic}  verified: ${result.verified}`);
}
await browser.close();
server.close();
process.exit(result && !result.error && result.verified !== false ? 0 : 1);
