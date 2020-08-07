const fs = require('fs');
const LienToken = artifacts.require("LienToken.sol");

module.exports = async function (deployer, network, accounts) {
    if (network == "private") {
        console.log(`Using network '${network}'`);

        await deployer.deploy(LienToken, 60, 5, '100000000000000');
        const deployedContract = await LienToken.deployed();

        const inputFile = process.env.INPUT || `dump.json`;
        const data = JSON.parse(
            fs.readFileSync(inputFile, 'utf8')
        );
        const output = {
            ...data,
            lienToken: deployedContract.address,
        };
        const outputFile = process.env.DUMP || 'dump.json';
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    }
};