const {stringifyBigInts} = require("ffjavascript").utils;
const fs = require("fs");
const readZKey = require("./zkey_utils").read;
const loadR1cs = require("r1csfile").load;

module.exports = r1csExportJson;

async function r1csExportJson(r1csFileName, jsonFileName, verbose) {

    const cir = await loadR1cs(r1csFileName, true, true);

    const S = JSON.stringify(stringifyBigInts(cir), null, 1);
    await fs.promises.writeFile(jsonFileName, S);
}
