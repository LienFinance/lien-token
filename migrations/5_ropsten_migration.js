const LienToken = artifacts.require("LienToken.sol");

module.exports = async function (deployer, network, accounts) {
    if (network == "ropsten") {
        console.log(`Using network '${network}'`);
        const INITIAL_HOLDER = process.env.INITIAL_HOLDER;
        if (INITIAL_HOLDER === undefined) {
            console.error('INITIAL_HOLDER is not specified');
            return;
        }
        console.log(`Tokens will be minted to '${INITIAL_HOLDER}'`);

        //interval :2hour, expiration: 4hour
        await deployer.deploy(LienToken, 60 * 60 * 2, 2, '100000000000000');
        const lt = await LienToken.deployed();
        await lt.transfer(INITIAL_HOLDER, await lt.totalSupply());
    }
};