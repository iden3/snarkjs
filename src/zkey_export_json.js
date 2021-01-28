import { readZKey as readZKey } from "./zkey_utils.js";

export default async function zkeyExportJson(zkeyFileName, verbose) {

    const zKey = await readZKey(zkeyFileName, true);

    return zKey;
}
