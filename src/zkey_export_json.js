import { readZKey as readZKey } from "./zkey_utils.js";

export default async function zkeyExportJson(zkeyFileName) {

    const zKey = await readZKey(zkeyFileName, true);

    return zKey;
}
