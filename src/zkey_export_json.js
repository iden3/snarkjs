const {stringifyBigInts} = require("ffjavascript").utils;
const fs = require("fs");
const readZKey = require("./zkey_utils").read;
module.exports = zkeyExportJson;

async function zkeyExportJson(zkeyFileName, jsonFileName, verbose) {

    const zKey = await readZKey(zkeyFileName);

    const S = JSON.stringify(stringifyBigInts(zKey), null, 1);
    await fs.promises.writeFile(jsonFileName, S);
}
