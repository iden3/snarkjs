import puppeteer from "puppeteer";
import st from "st";
import http from "http";
import url from "url";

const projectRoot = new URL("../..", import.meta.url);

const mount = st({ path: url.fileURLToPath(projectRoot), passthrough: true });

const server = http
    .createServer((req, res) => {
        mount(req, res, () => res.end());
    })
    .listen(1337);

const browser = await puppeteer.launch({
    headless: "new",
    args: [
        // Necessary to have WebCrypto on localhost
        "--allow-insecure-localhost",
        // Necessary to download the PTAU file from AWS within the tests
        "--disable-web-security"
    ],
});
const page = await browser.newPage();

page.on("console", (msg) => {
    if (msg.type === "assert") {
        throw new Error(msg.text());
    } else {
        console.log(msg.text());
    }
});

page.on("pageerror", (err) => {
    throw err;
});

await page.exposeFunction("shutdown", async () => {
    await browser.close();
    server.close();
});

await page.goto("http://localhost:1337/browser_tests/test/groth16.html");
