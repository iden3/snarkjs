import {read} from "./wtns_utils.js";

export default async function wtnsExportJson(wtnsFileName) {

    const w = await read(wtnsFileName);

    return w;
}
