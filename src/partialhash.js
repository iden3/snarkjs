
const blake2wasm = require("blake2b-wasm");



async function run() {
    await blake2wasm.ready();

    const hasher1 = blake2wasm(64);

    hasher1.update(Uint8Array.of(1,2,3,4));

    const ph = hasher1.getPartialHash();

    hasher1.update(Uint8Array.of(5,6,7,8));

    console.log(hasher1.digest("hex"));

    const hasher2 = blake2wasm(64);

    hasher2.setPartialHash(ph);

    hasher2.update(Uint8Array.of(5,6,7,8));

    console.log(hasher2.digest("hex"));

}

run().then(() => {
    process.exit();
});
