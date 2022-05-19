export function getRandomValue(higher = 10) {
    return Math.floor((Math.random() * higher) + 1);
}

export function getRandomArray() {
    let length = getRandomValue(30);
    let array = [];
    for (let i = 0; i < length; i++) {
        array[i] = i;
    }
    return array;
}