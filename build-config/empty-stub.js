// Empty stub for Node built-ins that are unreachable in the browser prove path
// (fs/os/readline/crypto/...). getRandomBytes/getSHA256 in src/misc.js fall back
// to globalThis.crypto in the browser, so an empty module is safe here.
export default {};
