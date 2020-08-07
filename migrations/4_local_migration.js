
const fs = require('fs');
const LienToken = artifacts.require("LienToken.sol");

module.exports = async function (deployer, network, accounts) {
    if (network == "local") {
        console.log(`Using network '${network}'`);
        await deployer.deploy(LienToken, 60, 5, '100000000000000');
    }
};