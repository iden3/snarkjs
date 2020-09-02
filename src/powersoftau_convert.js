import * as binFileUtils from "./binfileutils.js";
import * as utils from "./powersoftau_utils.js";
import * as fastFile from "fastfile";
import { bitReverse } from "./misc.js";

export default async function convert(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await binFileUtils.readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await utils.readPTauHeader(fdOld, sections);

    const fdNew = await binFileUtils.createBinFile(newPTauFilename, "ptau", 1, 11);
    await utils.writePTauHeader(fdNew, curve, power);

    // const fdTmp = await fastFile.createOverride(newPTauFilename+ ".tmp");
    const fdTmp = await fastFile.createOverride({type: "bigMem"});

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
    await fdTmp.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        const CHUNKPOW = 16;
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
            const chunkPower = p > CHUNKPOW ? CHUNKPOW : p;
            const pointsPerChunk = 1<<chunkPower;
            const nPoints = 1 << p;
            const nChunks = nPoints / pointsPerChunk;

            const G = curve[Gstr];
            const Fr = curve.Fr;
            const sGin = G.F.n8*2;
            const sGmid = G.F.n8*3;

            await binFileUtils.startReadUniqueSection(fdOld, sections, oldSectionId);
            // Build the initial tmp Buff
            fdTmp.pos =0;
            for (let i=0; i<nChunks; i++) {
                let buff;
                if (logger) logger.debug(`${sectionName} Prepare ${i+1}/${nChunks}`);
                if ((oldSectionId == 2)&&(p==power+1)) {
                    buff = new Uint8Array(pointsPerChunk*sGin);
                    await fdOld.readToBuffer(buff, 0,(pointsPerChunk-1)*sGin );
                    buff.set(curve.G1.zeroAffine, (pointsPerChunk-1)*sGin );
                } else {
                    buff = await fdOld.read(pointsPerChunk*sGin);
                }
                buff = await G.batchToJacobian(buff);
                for (let j=0; j<pointsPerChunk; j++) {
                    fdTmp.pos = bitReverse(i*pointsPerChunk+j, p)*sGmid;
                    await fdTmp.write(buff.slice(j*sGmid, (j+1)*sGmid ));
                }
            }
            await binFileUtils.endReadSection(fdOld, true);

            for (let j=0; j<nChunks; j++) {
                if (logger) logger.debug(`${sectionName} ${p} FFTMix ${j+1}/${nChunks}`);
                let buff;
                fdTmp.pos = (j*pointsPerChunk)*sGmid;
                buff = await fdTmp.read(pointsPerChunk*sGmid);
                buff = await G.fftMix(buff);
                fdTmp.pos = (j*pointsPerChunk)*sGmid;
                await fdTmp.write(buff);
            }
            for (let i=chunkPower+1; i<= p; i++) {
                const nGroups = 1 << (p - i);
                const nChunksPerGroup = nChunks / nGroups;
                for (let j=0; j<nGroups; j++) {
                    for (let k=0; k <nChunksPerGroup/2; k++) {
                        if (logger) logger.debug(`${sectionName} ${i}/${p} FFTJoin ${j+1}/${nGroups} ${k+1}/${nChunksPerGroup/2}`);
                        const first = Fr.exp( Fr.w[i], k*pointsPerChunk);
                        const inc = Fr.w[i];
                        const o1 = j*nChunksPerGroup + k;
                        const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                        let buff1, buff2;
                        fdTmp.pos = o1*pointsPerChunk*sGmid;
                        buff1 = await fdTmp.read(pointsPerChunk * sGmid);
                        fdTmp.pos = o2*pointsPerChunk*sGmid;
                        buff2 = await fdTmp.read(pointsPerChunk * sGmid);

                        [buff1, buff2] = await G.fftJoin(buff1, buff2, first, inc);

                        fdTmp.pos = o1*pointsPerChunk*sGmid;
                        await fdTmp.write(buff1);
                        fdTmp.pos = o2*pointsPerChunk*sGmid;
                        await fdTmp.write(buff2);
                    }
                }
            }
            await finalInverse(p);
        }
        async function finalInverse(p) {
            const G = curve[Gstr];
            const Fr = curve.Fr;
            const sGmid = G.F.n8*3;
            const sGout = G.F.n8*2;

            const chunkPower = p > CHUNKPOW ? CHUNKPOW : p;
            const pointsPerChunk = 1<<chunkPower;
            const nPoints = 1 << p;
            const nChunks = nPoints / pointsPerChunk;

            const o = fdNew.pos;
            fdTmp.pos = 0;
            const factor = Fr.inv( Fr.e( 1<< p));
            for (let i=0; i<nChunks; i++) {
                if (logger) logger.debug(`${sectionName} ${p} FFTFinal ${i+1}/${nChunks}`);
                let buff;
                buff = await fdTmp.read(pointsPerChunk * sGmid);
                buff = await G.fftFinal(buff, factor);

                if ( i == 0) {
                    fdNew.pos = o;
                    await fdNew.write(buff.slice((pointsPerChunk-1)*sGout));
                    fdNew.pos = o + ((nChunks - 1)*pointsPerChunk + 1) * sGout;
                    await fdNew.write(buff.slice(0, (pointsPerChunk-1)*sGout));
                } else {
                    fdNew.pos = o + ((nChunks - 1 - i)*pointsPerChunk + 1) * sGout;
                    await fdNew.write(buff);
                }
            }
            fdNew.pos = o + nChunks * pointsPerChunk * sGout;
        }
    }
}

