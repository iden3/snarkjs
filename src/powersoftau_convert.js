import * as binFileUtils from "@iden3/binfileutils";
import * as utils from "./powersoftau_utils.js";
import * as fastFile from "fastfile";
import {BigBuffer} from "ffjavascript";

export default async function convert(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await binFileUtils.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdOld, sections);

    const fdNew = await binFileUtils.createBinFile(newPTauFilename, "ptau", 1, 11);
    await utils.writePTauHeader(fdNew, curve, power);

    // const fdTmp = await fastFile.createOverride(newPTauFilename+ ".tmp");

    await binFileUtils.copySection(fdOld, sections, fdNew, 2);
    await binFileUtils.copySection(fdOld, sections, fdNew, 3);
    await binFileUtils.copySection(fdOld, sections, fdNew, 4);
    await binFileUtils.copySection(fdOld, sections, fdNew, 5);
    await binFileUtils.copySection(fdOld, sections, fdNew, 6);
    await binFileUtils.copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1", "tauG1" );
    await binFileUtils.copySection(fdOld, sections, fdNew, 13);
    await binFileUtils.copySection(fdOld, sections, fdNew, 14);
    await binFileUtils.copySection(fdOld, sections, fdNew, 15);

    await fdOld.close();
    await fdNew.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        if (logger) logger.debug("Starting section: "+sectionName);

        await binFileUtils.startWriteSection(fdNew, newSectionId);

        const size = sections[newSectionId][0].size;
        const chunkSize = fdOld.pageSize;
        await binFileUtils.startReadUniqueSection(fdOld, sections, newSectionId);
        for (let p=0; p<size; p+=chunkSize) {
            const l = Math.min(size -p, chunkSize);
            const buff = await fdOld.read(l);
            await fdNew.write(buff);
        }
        await binFileUtils.endReadSection(fdOld);

        if (oldSectionId == 2) {
            await processSectionPower(power+1);
        }

        await binFileUtils.endWriteSection(fdNew);

        async function processSectionPower(p) {
            const nPoints = 2 ** p;
            const G = curve[Gstr];
            const sGin = G.F.n8*2;

            let buff;
            buff = new BigBuffer(nPoints*sGin);

            await binFileUtils.startReadUniqueSection(fdOld, sections, oldSectionId);
            if ((oldSectionId == 2)&&(p==power+1)) {
                await fdOld.readToBuffer(buff, 0,(nPoints-1)*sGin );
                buff.set(curve.G1.zeroAffine, (nPoints-1)*sGin );
            } else {
                await fdOld.readToBuffer(buff, 0,nPoints*sGin );
            }
            await binFileUtils.endReadSection(fdOld, true);

            buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
            await fdNew.write(buff);

/*
            if (p <= curve.Fr.s) {
                buff = await G.ifft(buff, "affine", "affine", logger, sectionName);
                await fdNew.write(buff);
            } else if (p == curve.Fr.s+1) {
                const smallM = 1<<curve.Fr.s;
                let t0 = new BigBuffer( smallM * sGmid );
                let t1 = new BigBuffer( smallM * sGmid );

                const shift_to_small_m = Fr.exp(Fr.shift, smallM);
                const one_over_denom = Fr.inv(Fr.sub(shift_to_small_m, Fr.one));

                let sInvAcc = Fr.one;
                for (let i=0; i<smallM; i++) {
                    if (i%10000) logger.debug(`sectionName prepare L calc: ${sectionName}, ${i}/${smallM}`);
                    const ti =  buff.slice(i*sGin, (i+1)*sGin);
                    const tmi = buff.slice((i+smallM)*sGin, (i+smallM+1)*sGin);

                    t0.set(
                        G.timesFr(
                            G.sub(
                                G.timesFr(ti , shift_to_small_m),
                                tmi
                            ),
                            one_over_denom
                        ),
                        i*sGmid
                    );
                    t1.set(
                        G.timesFr(
                            G.sub( tmi, ti),
                            Fr.mul(sInvAcc, one_over_denom)
                        ),
                        i*sGmid
                    );


                    sInvAcc = Fr.mul(sInvAcc, Fr.shiftInv);
                }
                t0 = await G.ifft(t0, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t0);
                t0 = null;
                t1 = await G.ifft(t1, "jacobian", "affine", logger, sectionName + " t1");
                await fdNew.write(t1);

            } else {
                if (logger) logger.error("Power too big");
                throw new Error("Power to big");
            }
*/
        }


    }
}

