export default async function exportCalldata(proof, pub, funcs, logger) {
    return funcs[proof.protocol](proof, pub, logger);
}
