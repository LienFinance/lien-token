const LienToken = artifacts.require("LienToken.sol");

module.exports = async function (deployer, network, accounts) {
    if (network == "mainnet") {
        console.log(`Using network '${network}'`);
        //interval : 60 * 60 * 24 * 28 seconds, expiration: 12
        await deployer.deploy(LienToken, 2419200, 12, "100000000000000");
    }
};
