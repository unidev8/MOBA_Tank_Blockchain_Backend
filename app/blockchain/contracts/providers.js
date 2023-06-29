// by Logan <https://github.com/loganworld>
// at 19/08/2022

require("dotenv").config();
const { ethers } = require("ethers");

const supportChainId = process.env.CHAINID || 250;

const RPCS = {
    // 1: "http://13.59.118.124/eth",
    250: "https://rpc.ftm.tools/",
    4002: "https://rpc.testnet.fantom.network",
    9000: "https://eth.bd.evmos.dev:8545",
    9001: "https://eth.bd.evmos.org:8545",
    // 1337: "http://localhost:7545",
    // 31337: "http://localhost:8545/",
};

const providers = {
    // 1: new ethers.providers.JsonRpcProvider(RPCS[1]),
    250: new ethers.providers.JsonRpcProvider(RPCS[250]),
    // 4002: new ethers.providers.JsonRpcProvider(RPCS[4002]),
    // 1337: new ethers.providers.JsonRpcProvider(RPCS[1337]),
    // 31337: new ethers.providers.JsonRpcProvider(RPCS[31337]),
    // 9000: new ethers.providers.JsonRpcProvider(RPCS[9000]),
    // 9001: new ethers.providers.JsonRpcProvider(RPCS[9001]),
};

const provider = providers[supportChainId];

module.exports = { supportChainId, provider };
