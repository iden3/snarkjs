import newZKey from "./zkey_new.js";
import phase2verifyFromInit from "./zkey_verify_frominit.js";

export default async function phase2verifyFromR1cs(r1csFileName, pTauFileName, zkeyFileName, logger) {

    // const initFileName = "~" + zkeyFileName + ".init";
    const initFileName = {type: "bigMem"};
    await newZKey(r1csFileName, pTauFileName, initFileName, logger);

    return await phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger);
}

