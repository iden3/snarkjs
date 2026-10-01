function processFp(fp) {
    const hexStr = BigInt(fp).toString(16).padStart(128, '0');
    const part1 = '0x' + hexStr.slice(0, 64);
    const part2 = '0x' + hexStr.slice(64);
    return [part1, part2];
}

export default async function processVerificationKeyForSolidity(vKey) {
    const alpha = [...processFp(vKey.vk_alpha_1[0]), ...processFp(vKey.vk_alpha_1[1])];

    const beta = [
        [...processFp(vKey.vk_beta_2[0][0]), ...processFp(vKey.vk_beta_2[0][1])],
        [...processFp(vKey.vk_beta_2[1][0]), ...processFp(vKey.vk_beta_2[1][1])]
    ];

    const gamma = [
        [...processFp(vKey.vk_gamma_2[0][0]), ...processFp(vKey.vk_gamma_2[0][1])],
        [...processFp(vKey.vk_gamma_2[1][0]), ...processFp(vKey.vk_gamma_2[1][1])]
    ];

    const delta = [
        [...processFp(vKey.vk_delta_2[0][0]), ...processFp(vKey.vk_delta_2[0][1])],
        [...processFp(vKey.vk_delta_2[1][0]), ...processFp(vKey.vk_delta_2[1][1])]
    ];

    const ic = vKey.IC.map(x => [...processFp(x[0]), ...processFp(x[1])]);

    const result = {
        alpha,
        beta,
        gamma,
        delta,
        ic
    };

    return result;
}