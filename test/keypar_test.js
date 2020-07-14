import assert from "assert";
import { getCurveFromName } from "../src/curves.js";
import { hex2ByteArray } from "../src/misc.js";
import { Scalar } from "ffjavascript";

import { getG2sp } from "../src/keypair.js";

describe("keypair", () => {
    let curve;

    before( async () => {
        curve = await getCurveFromName("bn128");
    });
    after( async () => {
        await curve.terminate();
    });

    it("It should calculate the right g2_s for the test vectors", async () => {
        const challenge = hex2ByteArray(
            "bc0bde7980381fa642b2097591dd83f1"+
            "ed15b003e15c35520af32c95eb519149"+
            "2a6f3175215635cfc10e6098e2c612d0"+
            "ca84f1a9f90b5333560c8af59b9209f4"
        );

        const tau_g1_s = curve.G1.fromObject([
            Scalar.e("0x1403cf4fed293e66a8cd522be9f938524111f6f08762371bff53ee387a39cf13"),
            Scalar.e("0x2accbda355c222301a1bd802db7454d86a4ec2ee89ae895ca21f147d6b705740"),
            Scalar.e("1")
        ]);
        const tau_g1_sx = curve.G1.fromObject([
            Scalar.e("0x12996cf89d854246f1ab002e446436b77a64349117ec1fb2aa57a304890e81ef"),
            Scalar.e("0x0c17fd067df52c480a1db3c6890821f975932d89d0d53c6c60777cc56f1dd712"),
            Scalar.e("1")
        ]);
        const tau_g2_sp = getG2sp(curve, 0, challenge, tau_g1_s, tau_g1_sx);

        const tau_g2_spx = curve.G2.fromObject([
            [
                Scalar.e("0x0fe02fcc3aee51c1f3a37f3f152ebe5476ae659468f2ee81cdeb19d0dad366c5"),
                Scalar.e("0x01aeb4db892bcb273aada80f5eab10e2e50ae59a5c274b0d7303f5c5a52ee88b"),
            ],[
                Scalar.e("0x2d00022d840d493fb93c68a63b29e2692c0cd3caf354fe60eae1ebacefc2c948"),
                Scalar.e("0x204065ff10344153a08cfe4ae543c47fba883ef8a54530fa6a52c87e5c28ef2b"),
            ],[
                Scalar.e("1"),
                Scalar.e("0")
            ]
        ]);


        assert(curve.F12.eq(
            curve.pairing(tau_g1_sx, tau_g2_sp),
            curve.pairing(tau_g1_s, tau_g2_spx)));


        const alpha_g1_s = curve.G1.fromObject([
            Scalar.e("0x12a64bbe8af7fcb19052e25e188c1fcdac454928142f8e89f58e03249e18b223"),
            Scalar.e("0x22be31a388d0ec551530e1b1581b671b4340e88990de805a7bfed8bdb9c1accd"),
            Scalar.e("1")
        ]);
        const alpha_g1_sx = curve.G1.fromObject([
            Scalar.e("0x262ff8dd594374c6ed5e892ba31315f6e47c500784a12ea8d2c573730888a392"),
            Scalar.e("0x0b3a94f2b61178f2974e039cfd671e7405ec43eb2c09dc8f43a34f450917a62f"),
            Scalar.e("1")
        ]);
        const alpha_g2_sp = getG2sp(curve, 1, challenge, alpha_g1_s, alpha_g1_sx);

        const alpha_g2_spx = curve.G2.fromObject([
            [
                Scalar.e("0x2e649d01a58a7795762df8f0634c273ebce6950a9a2ba3d4459458620d3164a0"),
                Scalar.e("0x1b58044d3e205a918124fea3983583199b4f99fd0abb39ede2c684b0810bdc1e"),
            ],[
                Scalar.e("0x021d41558cea5fa32c9f3de5834cb2ee45ce4cdf471353395d019dfe0c9c2509"),
                Scalar.e("0x1c04148bac3f17b219c2655cd63ad2596ea63293103487be488a1d5a9054ddbf"),
            ],[
                Scalar.e("1"),
                Scalar.e("0")
            ]
        ]);

        assert(curve.F12.eq(
            curve.pairing(alpha_g1_sx, alpha_g2_sp),
            curve.pairing(alpha_g1_s, alpha_g2_spx)));




        const beta_g1_s = curve.G1.fromObject([
            Scalar.e("0x0d9b3088b69daf6746c6bba4f9b359234abbfd3306bce14b198e7a5556c777e6"),
            Scalar.e("0x066d1acac914883df6a9dc57dc2037a481ba4b8646efe13e2584b9258bd52d0c"),
            Scalar.e("1")
        ]);
        const beta_g1_sx = curve.G1.fromObject([
            Scalar.e("0x248232878c359dbe632c387dc0d955520e8d3363f1cd9621ec9fd4a05460c754"),
            Scalar.e("0x12074f06ef232a472cb36c328e760c4acfb4bedad4ca3ee09971578a0fe185ab"),
            Scalar.e("1")
        ]);
        const beta_g2_sp = getG2sp(curve, 2, challenge, beta_g1_s, beta_g1_sx);

        const beta_g2_spx = curve.G2.fromObject([
            [
                Scalar.e("0x029251aed5163109667300035ce200b7195fc6e261581ba38776d87d7f0b1a7d"),
                Scalar.e("0x09d6847f1b945ccdc00418a807f4b0af67ec5c0030c4f203581eff9d4af4347f"),
            ],[
                Scalar.e("0x04b62ecdc94bf94fcefdf93f06ca4f63026a47a0d4138941b8ee45b9f7177e5c"),
                Scalar.e("0x1f0a6bff3945f207f407ff1c813b66a28b495f55a3788c3e200c74817e86f7ce"),
            ],[
                Scalar.e("1"),
                Scalar.e("0")
            ]
        ]);

        assert(curve.F12.eq(
            curve.pairing(beta_g1_sx, beta_g2_sp),
            curve.pairing(beta_g1_s, beta_g2_spx)));
    });
});

