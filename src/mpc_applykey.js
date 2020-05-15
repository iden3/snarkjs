
const buildTaskManager = require("./taskmanager");

/*
    This function creates a new section in the fdTo file with id idSection.
    It multiplies the pooints in fdFrom by first, first*inc, first*inc^2, ....
    nPoint Times.
    It also updates the newChallangeHasher with the new points
*/

async function applyKey(params) {
    const {
        fdFrom,
        sections,
        curve,
        fdTo,
        sectionId,
        NPoints,
        G:Gs,
        first,
        inc,
        newChallangeHasher,
        responseHasher,
        returnPoints,
        sectionName,
        verbose
    } = params;
    const G = curve[Gs];
    const MAX_CHUNK_SIZE = 1024;

    let res = [];
    const sG = G.F.n8*2;
    const buffU = new ArrayBuffer(sG);
    const buffUv = new Uint8Array(buffU);
    const scG = G.F.n8;
    const buffC = new ArrayBuffer(scG);
    const buffCv = new Uint8Array(buffC);

    const taskManager = await buildTaskManager(contributeThread, {
        ffjavascript: "ffjavascript"
    },{
        curve: curve.name
    });

    fdFrom.pos = sections[sectionId][0].p;
    await fdTo.writeULE32(sectionId); // tauG1
    const pSection = fdTo.pos;
    await fdTo.writeULE64(0); // Temporally set to 0 length
    let t = first;
    let writePointer = fdTo.pos;
    let beginWritePointer = fdTo.pos;
    for (let i=0; i< NPoints; i+=MAX_CHUNK_SIZE) {
        if ((verbose)&&i) console.log(`${sectionName}: ` + i);
        const n = Math.min(NPoints - i, MAX_CHUNK_SIZE);
        const buff = await fdFrom.read(n*sG);
        await taskManager.addTask({
            cmd: "MUL",
            G: Gs,
            first: t,
            inc: inc.toString(),
            buff: buff.slice(),
            n: n,
            writePos: writePointer
        }, async function(r) {
            return await fdTo.write(r.buff, r.writePos);
        });
        t = curve.Fr.mul(t, curve.Fr.pow(inc, n));
        writePointer += n*sG;
    }

    await taskManager.finish();

    const sSize  = fdTo.pos - pSection -8;
    const lastPos = fdTo.pos;
    await fdTo.writeULE64(sSize, pSection);
    fdTo.pos = lastPos;

    fdTo.pos = beginWritePointer;
    for (let i=0; i<NPoints; i++) {
        const buff = await fdTo.read(sG);
        const P = G.fromRprLEM(buff, 0);
        G.toRprBE(buffU, 0, P);
        newChallangeHasher.update(buffUv);
        G.toRprCompressed(buffC, 0, P);
        responseHasher.update(buffCv);
        const idx = returnPoints.indexOf(i);
        if (idx>=0) res[idx] =  P;
    }

    return res;
}


function contributeThread(ctx, task) {
    if (task.cmd == "INIT") {
        ctx.assert = ctx.modules.assert;
        if (task.curve == "bn128") {
            ctx.curve = ctx.modules.ffjavascript.bn128;
        } else {
            ctx.assert(false, "curve not defined");
        }
        return {};
    } else if (task.cmd == "MUL") {
        const G = ctx.curve[task.G];
        const sG = G.F.n64*8*2;
        const buffDest = new ArrayBuffer(sG*task.n);
        let t = ctx.curve.Fr.e(task.first);
        let inc = ctx.curve.Fr.e(task.inc);
        for (let i=0; i<task.n; i++) {
            const P = G.fromRprLEM(task.buff, i*sG);
            const R = G.mulScalar(P, t);
            G.toRprLEM(buffDest, i*sG, R);   // Main thread will convert it to Montgomery
            t = ctx.curve.Fr.mul(t, inc);
        }
        return {
            buff: buffDest,
            writePos: task.writePos
        };
    } else {
        ctx.assert(false, "Op not implemented");
    }
}


module.exports = applyKey;
