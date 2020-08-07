const LienToken = artifacts.require("LienToken");
const TestERC20 = artifacts.require("TestERC20");
const {testCases} = require("./testCases.js");
const {increaseTime} = require("./utils.js");
const BN = require("bn.js");

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

contract("LienToken", (accounts) => {
    describe("scenario test", () => {
        const interval = 60;
        const expiration = 2;
        const totalSupply = 100;
        const tokenTotalSupply = 1000;

        const holders = [accounts[1], accounts[2], accounts[3], accounts[4]];
        const senders = [accounts[5], accounts[6]];
        var tokens = [];
        var lt;
        beforeEach(async () => {
            lt = await LienToken.new(interval, expiration, totalSupply);
            for (i = 0; i < 2; i++) {
                tokens[i] = await TestERC20.new(senders[0], tokenTotalSupply);
                await tokens[i].transfer(senders[1], tokenTotalSupply / 2, {
                    from: senders[0]
                });
            }
        });
        testCases.forEach((testCase, index) => {
            it("case " + (index + 1), async () => {
                console.group("case", index + 1, ": ", testCase.title);
                // balance initialize
                const initialBalances = testCase.initialBalances;
                for (i = 0; i < initialBalances.length; i++) {
                    await lt.transfer(holders[i], initialBalances[i]);
                }

                const terms = testCase.terms;
                for (i = 0; i < terms.length; i++) {
                    console.group("term", i + 1);
                    var increaseOfEth = [];

                    console.log("sender action");
                    // sender action
                    const senderActions = terms[i].senderActions;
                    for (j = 0; j < 2; j++) {
                        const tokenTransfer = senderActions[j].tokenTransfer;
                        for (k = 0; k < 2; k++) {
                            await tokens[k].transfer(
                                lt.address,
                                tokenTransfer[k],
                                {from: senders[j]}
                            );
                        }
                        const ethTransfer = senderActions[j].ethTransfer;
                        await web3.eth.sendTransaction({
                            from: senders[j],
                            to: lt.address,
                            value: ethTransfer
                        });
                    }

                    // token collect
                    console.log("settle profit");
                    const settleTokens = terms[i].settleTokens;
                    for (j = 0; j < 2; j++) {
                        if (settleTokens[j])
                            await lt.settleProfit(tokens[j].address);
                    }
                    if (terms[i].settleEth) await lt.settleProfit(ETH_ADDRESS);

                    // holder action
                    console.log("holder action");
                    const holderActions = terms[i].holderActions;
                    for (j = 0; j < 4; j++) {
                        const receiveDividend =
                            holderActions[j].receiveDividend;
                        for (k = 0; k < receiveDividend.length; k++) {
                            const rd = receiveDividend[k];
                            await lt.receiveDividend(
                                tokens[rd - 1].address,
                                holders[j]
                            );
                        }
                        beforeReceiveEthBalances = new BN(
                            await web3.eth.getBalance(holders[j])
                        );
                        if (holderActions[j].receiveEth) {
                            await lt.receiveDividend(ETH_ADDRESS, holders[j]);
                        }
                        increaseOfEth[j] = new BN(
                            await web3.eth.getBalance(holders[j])
                        ).sub(beforeReceiveEthBalances);
                        const transferLTs = holderActions[j].transferLT;
                        for (k = 0; k < transferLTs.length; k++) {
                            await lt.transfer(
                                holders[transferLTs[k].to - 1],
                                transferLTs[k].value,
                                {from: holders[j]}
                            );
                        }
                        if (holderActions[j].lockToken != 0) {
                            const currentBlockTime = (
                                await web3.eth.getBlock("latest")
                            ).timestamp;
                            const {receipt} = await lt.createGrant(
                                holders[j],
                                currentBlockTime + 100
                            );
                            const id = receipt.logs[0].args.id;
                            await lt.depositToGrant(
                                holders[j],
                                id,
                                holderActions[j].lockToken,
                                {from: holders[j]}
                            );
                        }
                    }

                    // result assertion
                    // share of tokens
                    console.log("result assertion");
                    const profitOfTokens = terms[i].results.profitOfTokens;
                    const dividendOfTokens = terms[i].results.dividendOfTokens;
                    const balanceOfTokens = terms[i].results.balanceOfTokens;
                    for (j = 0; j < 2; j++) {
                        assert.equal(
                            await lt.profitAt(tokens[j].address, i + 1),
                            profitOfTokens[j],
                            "profit of token" + (j + 1)
                        );
                        for (k = 0; k < 4; k++) {
                            assert.equal(
                                await lt.dividendAt(
                                    tokens[j].address,
                                    holders[k],
                                    i + 1
                                ),
                                dividendOfTokens[j][k],
                                "dividend of token" +
                                    (j + 1) +
                                    " for holder" +
                                    (k + 1)
                            );
                            assert.equal(
                                await tokens[j].balanceOf(holders[k]),
                                balanceOfTokens[j][k],
                                "balance of token" +
                                    (j + 1) +
                                    " for holder" +
                                    (k + 1)
                            );
                        }
                    }
                    const profitOfEth = terms[i].results.profitOfEth;
                    assert.equal(
                        await lt.profitAt(ETH_ADDRESS, i + 1),
                        profitOfEth,
                        "profit of eth"
                    );
                    const dividendOfEth = terms[i].results.dividendOfEth;
                    for (j = 0; j < 4; j++) {
                        assert.equal(
                            await lt.dividendAt(
                                ETH_ADDRESS,
                                holders[j],
                                i + 1
                            ),
                            dividendOfEth[j],
                            "dividend of eth for holder" + (j + 1)
                        );
                    }
                    for (j = 0; j < 4; j++) {
                        assert.equal(
                            increaseOfEth[j],
                            terms[i].results.increaseOfEth[j],
                            "increase of eth of holder" + (j + 1)
                        );
                    }
                    await increaseTime(interval);
                    console.groupEnd();
                }
                console.groupEnd();
            });
        });
    });
});
