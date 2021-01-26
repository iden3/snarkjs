import * as fs from "fs";
import * as wtnsUtils from "./wtns_utils.js";
import * as binFileUtils from "@iden3/binfileutils";
import { Scalar } from "ffjavascript";

export default async function wtnsConvertJson(jsonFileName, wtnsFileName, prime) {
    const w = JSON.parse(fs.readFileSync(jsonFileName));
    const fdWtns = await binFileUtils.createBinFile(wtnsFileName, "wtns", 2, 2);

    const p = Scalar.fromString(prime, 10);
    await wtnsUtils.write(fdWtns, w, p);
    await fdWtns.close();
}
