const LienToken = artifacts.require("LienToken.sol");

module.exports = async function (deployer, network, accounts) {
    if (network == "rinkeby") {
        console.log(`Using network '${network}'`);
        deployer.deploy(LienToken, 600, 6, '100000000000000');
    }
};
