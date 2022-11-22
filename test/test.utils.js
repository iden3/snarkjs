export function getRandomValue(higher = 10) {
    return Math.floor((Math.random() * higher) + 1);
}

export function getRandomBuffer(length, Fr) {
    let buffer = new Uint8Array(length * Fr.n8);
    for (let i = 0; i < length; i++) {
        buffer.set(Fr.random(), i * Fr.n8);
    }
    return buffer;
}

export function getRandomArray(length, Fr) {
    let buffer = [];
    for (let i = 0; i < length; i++) {
        buffer[i] = Fr.random();
    }
    return buffer;
}

