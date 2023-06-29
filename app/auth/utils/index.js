// by Logan <https://github.com/loganworld>
// at 19/08/2022

const sha256 = require("sha256");
const getHash = (param1, param2) => {
    return sha256.x2(param1 + param2);
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
module.exports = {
    getHash,
    delay
};
