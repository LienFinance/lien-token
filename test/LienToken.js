const LienToken = artifacts.require("LienToken");
const TestERC20 = artifacts.require("TestERC20");
const {increaseTime} = require("./utils.js");
const {web3} = require("openzeppelin-test-helpers/src/setup");
const {tracker} = require("openzeppelin-test-helpers/src/balance");
const balance = require("openzeppelin-test-helpers/src/balance");

const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

var lt;

contract("LienToken", (accounts) => {
    const sender1 = accounts[0];
    const sender2 = accounts[1];
    const ltHolder1 = accounts[2];
    const ltHolder2 = accounts[3];
    const ltHolder3 = accounts[4];
    const holds1 = 333;
    const holds2 = 666;
    const holds3 = 1;
    const tokenTotalSupply = 1000;

    const interval = 60;
    const expiration = 5;
    const totalSupply = 1000;
    beforeEach(async () => {
        lt = await LienToken.new(interval, expiration, totalSupply);
        await lt.transfer(ltHolder1, holds1);
        await lt.transfer(ltHolder2, holds2);
        await lt.transfer(ltHolder3, holds3);
    });
    describe("#settleProfit", () => {
        const profit1 = 100;
        const profit2 = 200;
        const expectedProfit = profit1 + profit2;
        var token1;
        var token2;
        beforeEach(async () => {
            token1 = await TestERC20.new(sender1, tokenTotalSupply);
            token2 = await TestERC20.new(sender1, tokenTotalSupply);
            await token1.transfer(sender2, profit2, {from: sender1});
            await token2.transfer(sender2, profit2, {from: sender1});

            await token1.transfer(lt.address, profit1, {from: sender1});
            await token1.transfer(lt.address, profit2, {from: sender2});
            await token2.transfer(lt.address, profit1, {from: sender1});
            await token2.transfer(lt.address, profit2, {from: sender2});
            await web3.eth.sendTransaction({
                from: sender1,
                to: lt.address,
                value: profit1
            });
            await web3.eth.sendTransaction({
                from: sender2,
                to: lt.address,
                value: profit2
            });
        });
        it("emits a settle profit event", async () => {
            let receipt;
            let event;
            receipt = await lt.settleProfit(token1.address);
            event = receipt.logs[0];
            assert.equal(event.event, "SettleProfit");
            assert.equal(event.args.token, token1.address);
            assert.equal(event.args.term, 1);
            assert.equal(event.args.amount, expectedProfit);

            receipt = await lt.settleProfit(ETH_ADDRESS);
            event = receipt.logs[0];
            assert.equal(event.event, "SettleProfit");
            assert.equal(event.args.token, ETH_ADDRESS);
            assert.equal(event.args.term, 1);
            assert.equal(event.args.amount, expectedProfit);
        });
        describe("with multiple tokens and multiple senders", () => {
            beforeEach(async () => {
                await lt.settleProfit(token1.address);
                await lt.settleProfit(token2.address);
                await lt.settleProfit(ETH_ADDRESS);
            });
            it("updates profit at current term of each tokens", async () => {
                assert.equal(
                    await lt.profitAt(token1.address, 1),
                    expectedProfit
                );
                assert.equal(
                    await lt.profitAt(token2.address, 1),
                    expectedProfit
                );
                assert.equal(
                    await lt.profitAt(ETH_ADDRESS, 1),
                    expectedProfit
                );
            });
        });
        describe("when called twice", () => {
            beforeEach(async () => {
                await lt.settleProfit(token1.address);
                await lt.settleProfit(token1.address);
            });
            it("does not change amount of profit", async () => {
                assert.equal(
                    await lt.profitAt(token1.address, 1),
                    expectedProfit
                );
            });
        });
        describe("when called after the profit expires", () => {
            beforeEach(async () => {
                await lt.settleProfit(token1.address);
                await lt.settleProfit(token2.address);
                for (i = 0; i < expiration + 1; i++) {
                    await increaseTime(interval);
                }
                await lt.settleProfit(token1.address);
            });
            it("recognizes carried over profit", async () => {
                const currentTerm = await lt.currentTerm();
                assert.equal(
                    await lt.profitAt(token1.address, currentTerm),
                    expectedProfit
                );
                assert.equal(
                    await lt.profitAt(token2.address, currentTerm),
                    0
                );
            });
        });
    });
    describe("#unsettledProfit", () => {
        const profit = 100;
        describe("ERC20", () => {
            beforeEach(async () => {
                token = await TestERC20.new(sender1, tokenTotalSupply);
                await token.transfer(lt.address, profit, {from: sender1});
            });
            it("returns unsettled profit", async () => {
                const unsettledProfit = await lt.unsettledProfit(
                    token.address
                );
                assert.equal(unsettledProfit, profit);
            });
            describe("after profit is settled", () => {
                beforeEach(async () => {
                    await lt.settleProfit(token.address);
                });
                it("returns 0", async () => {
                    const unsettledProfit = await lt.unsettledProfit(
                        token.address
                    );
                    assert.equal(unsettledProfit, 0);
                });
                describe("after profit is carried over", () => {
                    beforeEach(async () => {
                        await increaseTime(interval * (expiration + 1));
                    });
                    it("returns expired profit", async () => {
                        const unsettledProfit = await lt.unsettledProfit(
                            token.address
                        );
                        assert.equal(unsettledProfit, profit);
                    });
                });
            });
            describe("after term changes", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                });
                it("returns same value", async () => {
                    const unsettledProfit = await lt.unsettledProfit(
                        token.address
                    );
                    assert.equal(unsettledProfit, profit);
                });
            });
        });
        describe("ETH", () => {
            beforeEach(async () => {
                await web3.eth.sendTransaction({
                    from: sender1,
                    to: lt.address,
                    value: profit
                });
            });
            it("returns unsettled profit", async () => {
                const unsettledProfit = await lt.unsettledProfit(ETH_ADDRESS);
                assert.equal(unsettledProfit, profit);
            });
            describe("after profit is settled", () => {
                beforeEach(async () => {
                    await lt.settleProfit(ETH_ADDRESS);
                });
                it("returns 0", async () => {
                    const unsettledProfit = await lt.unsettledProfit(
                        ETH_ADDRESS
                    );
                    assert.equal(unsettledProfit, 0);
                });
                describe("after profit is carried over", () => {
                    beforeEach(async () => {
                        await increaseTime(interval * (expiration + 1));
                    });
                    it("returns expired profit", async () => {
                        const unsettledProfit = await lt.unsettledProfit(
                            ETH_ADDRESS
                        );
                        assert.equal(unsettledProfit, profit);
                    });
                });
            });
            describe("after term changes", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                });
                it("returns same value", async () => {
                    const unsettledProfit = await lt.unsettledProfit(
                        ETH_ADDRESS
                    );
                    assert.equal(unsettledProfit, profit);
                });
            });
        });
    });
    describe("#profitAt", () => {
        let term;
        let token;
        const profit = 100;
        beforeEach(async () => {
            token = await TestERC20.new(sender1, tokenTotalSupply);
            await token.transfer(lt.address, profit, {from: sender1});
            await lt.settleProfit(token.address);
            term = await lt.currentTerm();
        });
        describe("before term ends", () => {
            it("returns profit at term", async () => {
                assert.equal(await lt.profitAt(token.address, term), profit);
            });
        });
        describe("after term ends", () => {
            beforeEach(async () => {
                await increaseTime(interval);
            });
            it("returns profit at term", async () => {
                assert.equal(await lt.profitAt(token.address, term), profit);
            });
        });
        describe("after receiving dividend", () => {
            beforeEach(async () => {
                await increaseTime(interval);
                await lt.receiveDividend(token.address, ltHolder1);
            });
            it("returns profit at term", async () => {
                assert.equal(await lt.profitAt(token.address, term), profit);
            });
        });
        describe("after the period to receive dividend is expired", () => {
            beforeEach(async () => {
                await increaseTime(interval * interval);
            });
            it("returns profit at term", async () => {
                assert.equal(await lt.profitAt(token.address, term), profit);
            });
        });
    });
    describe("#dividendAt", () => {
        let term;
        let token;
        const profit = 100;
        beforeEach(async () => {
            token = await TestERC20.new(sender1, tokenTotalSupply);
            await token.transfer(lt.address, profit, {from: sender1});
            await lt.settleProfit(token.address);
            term = await lt.currentTerm();
        });
        describe("before term ends", () => {
            it("returns (profit at term) * (balance of at term end) / (total supply of at term end)", async () => {
                assert.equal(
                    await lt.dividendAt(token.address, ltHolder1, term),
                    Math.floor((profit * holds1) / totalSupply)
                );
                assert.equal(
                    await lt.dividendAt(token.address, ltHolder2, term),
                    Math.floor((profit * holds2) / totalSupply)
                );
                assert.equal(
                    await lt.dividendAt(token.address, ltHolder3, term),
                    Math.floor((profit * holds3) / totalSupply)
                );
            });
        });
        describe("after term ends", () => {
            beforeEach(async () => {
                await increaseTime(interval);
            });
            it("returns (profit at term) * (balance of at term end) / (total supply of at term end)", async () => {
                assert.equal(
                    await lt.dividendAt(token.address, ltHolder1, term),
                    Math.floor((profit * holds1) / totalSupply)
                );
            });
        });
        describe("after receiving dividend", () => {
            beforeEach(async () => {
                await increaseTime(interval);
                await lt.receiveDividend(token.address, ltHolder1);
            });
            it("returns (profit at term) * (balance of at term end) / (total supply of at term end)", async () => {
                assert.equal(
                    await lt.dividendAt(token.address, ltHolder1, term),
                    Math.floor((profit * holds1) / totalSupply)
                );
            });
        });
        describe("after period to receive dividend expires", () => {
            beforeEach(async () => {
                await increaseTime(interval * interval);
            });
            it("returns (profit at term) * (balance of at term end) / (total supply of at term end)", async () => {
                assert.equal(
                    await lt.dividendAt(token.address, ltHolder1, term),
                    Math.floor((profit * holds1) / totalSupply)
                );
            });
        });
        describe("with grants", () => {
            const duration = 60;
            describe("with one grant", () => {
                beforeEach(async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    await lt.createGrant(
                        ltHolder1,
                        currentBlockTime + duration
                    );
                    await lt.depositToGrant(ltHolder1, 1, 100, {
                        from: ltHolder2
                    });
                });
                describe("called by the beneficiary", () => {
                    it("returns dividend of tokens of the grant", async () => {
                        assert.equal(
                            await lt.dividendAt(
                                token.address,
                                ltHolder1,
                                term
                            ),
                            Math.floor((profit * (holds1 + 100)) / totalSupply)
                        );
                    });
                });
                describe("called by the depositor", () => {
                    it("does not return dividend of tokens of the grant", async () => {
                        assert.equal(
                            await lt.dividendAt(
                                token.address,
                                ltHolder2,
                                term
                            ),
                            Math.floor((profit * (holds2 - 100)) / totalSupply)
                        );
                    });
                });
                describe("after claiming", () => {
                    beforeEach(async () => {
                        await increaseTime(duration);
                        await lt.claimVestedTokens(ltHolder1, 1);
                    });
                    describe("called by the beneficiary", () => {
                        it("returns dividend of tokens of the grant", async () => {
                            assert.equal(
                                await lt.dividendAt(
                                    token.address,
                                    ltHolder1,
                                    term
                                ),
                                Math.floor(
                                    (profit * (holds1 + 100)) / totalSupply
                                )
                            );
                        });
                    });
                    describe("called by the depositor", () => {
                        it("does not return dividend of tokens of the grant", async () => {
                            assert.equal(
                                await lt.dividendAt(
                                    token.address,
                                    ltHolder2,
                                    term
                                ),
                                Math.floor(
                                    (profit * (holds2 - 100)) / totalSupply
                                )
                            );
                        });
                    });
                });
            });
            describe("with two grants", () => {
                beforeEach(async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    await lt.createGrant(
                        ltHolder1,
                        currentBlockTime + duration
                    );
                    await lt.depositToGrant(ltHolder1, 1, 100, {
                        from: ltHolder2
                    });
                    await lt.createGrant(
                        ltHolder1,
                        currentBlockTime + duration
                    );
                    await lt.depositToGrant(ltHolder1, 1, 200, {
                        from: ltHolder2
                    });
                });
                describe("called by the beneficiary", () => {
                    it("returns dividend of tokens of the grant", async () => {
                        assert.equal(
                            await lt.dividendAt(
                                token.address,
                                ltHolder1,
                                term
                            ),
                            Math.floor(
                                (profit * (holds1 + 100 + 200)) / totalSupply
                            )
                        );
                    });
                });
                describe("called by the depositor", () => {
                    it("does not return dividend of tokens of the grant", async () => {
                        assert.equal(
                            await lt.dividendAt(
                                token.address,
                                ltHolder2,
                                term
                            ),
                            Math.floor(
                                (profit * (holds2 - 100 - 200)) / totalSupply
                            )
                        );
                    });
                });
            });
        });
    });
    describe("#receiveDividend", () => {
        let token;
        const profit = 100;
        describe("ERC20", () => {
            beforeEach(async () => {
                token = await TestERC20.new(sender1, tokenTotalSupply);
            });
            it("emits a receive dividend event", async () => {
                await token.transfer(lt.address, profit, {from: sender1});
                await lt.settleProfit(token.address);
                await increaseTime(interval);
                const {receipt} = await lt.receiveDividend(
                    token.address,
                    ltHolder1
                );
                const event = receipt.logs[0];
                assert.equal(event.event, "ReceiveDividend");
                assert.equal(event.args.token, token.address);
                assert.equal(event.args.recipient, ltHolder1);
                assert.equal(
                    event.args.amount,
                    Math.floor((profit * holds1) / totalSupply)
                );
            });
            describe("while settling profits on every term", () => {
                let term;
                beforeEach(async () => {
                    term = 1;
                });
                const increaseTerm = async () => {
                    const profit = term * 10;
                    await token.transfer(lt.address, profit, {from: sender1});
                    await lt.settleProfit(token.address);
                    await increaseTime(interval);
                    term++;
                };
                describe("at term1", () => {
                    beforeEach(async () => {
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it("receive no tokens", async () => {
                        assert.equal(await token.balanceOf(ltHolder1), 0);
                    });
                });
                describe("at term2", () => {
                    beforeEach(async () => {
                        await increaseTerm();
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it("receive dividend at term1", async () => {
                        assert.equal(await token.balanceOf(ltHolder1), 3);
                    });
                });
                describe("at term3", () => {
                    beforeEach(async () => {
                        await increaseTerm();
                        await increaseTerm();
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it("receive dividend at term1 and term2", async () => {
                        assert.equal(await token.balanceOf(ltHolder1), 3 + 6);
                    });
                });
                describe("at term2 and term3", () => {
                    beforeEach(async () => {
                        await increaseTerm();
                        await lt.receiveDividend(token.address, ltHolder1);
                        await increaseTerm();
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it("receive dividend at term1 and term2", async () => {
                        assert.equal(await token.balanceOf(ltHolder1), 3 + 6);
                    });
                });
                describe("at term6", () => {
                    beforeEach(async () => {
                        for (i = 0; i < expiration; i++) {
                            await increaseTerm();
                        }
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it(
                        "receive dividend at from term1 to term" + expiration,
                        async () => {
                            assert.equal(
                                await token.balanceOf(ltHolder1),
                                3 + 6 + 9 + 13 + 16
                            );
                        }
                    );
                });
                describe("at term7", () => {
                    beforeEach(async () => {
                        for (i = 0; i < expiration + 1; i++) {
                            await increaseTerm();
                        }
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it("receive dividend at from term2 to term6", async () => {
                        assert.equal(
                            await token.balanceOf(ltHolder1),
                            6 + 9 + 13 + 16 + 19
                        );
                    });
                });
                describe("at term 2 and term7", () => {
                    beforeEach(async () => {
                        await increaseTerm();
                        await lt.receiveDividend(token.address, ltHolder1);
                        for (i = 0; i < expiration; i++) {
                            await increaseTerm();
                        }
                        await lt.receiveDividend(token.address, ltHolder1);
                    });
                    it("receive dividend at from term1 to term6", async () => {
                        assert.equal(
                            await token.balanceOf(ltHolder1),
                            3 + 6 + 9 + 13 + 16 + 19
                        );
                    });
                });
            });
            describe("after period expires", () => {
                beforeEach(async () => {
                    await token.transfer(lt.address, profit, {from: sender1});
                    await lt.settleProfit(token.address);
                    await increaseTime(interval * (expiration + 1));
                    await lt.receiveDividend(token.address, ltHolder1);
                });
                it("receive no tokens", async () => {
                    assert.equal(await token.balanceOf(ltHolder1), 0);
                });
            });
            describe("after carry over some not withdrawn dividends", () => {
                beforeEach(async () => {
                    // settle profit
                    await token.transfer(lt.address, profit, {from: sender1});
                    await lt.settleProfit(token.address);
                    await increaseTime(interval);

                    // receive before carried over
                    await lt.receiveDividend(token.address, ltHolder1);

                    // increase time until profit carried over
                    await increaseTime(interval * expiration);

                    // settle carried over profit
                    await lt.settleProfit(token.address);
                    await increaseTime(interval);
                });
                it("receive carried over and redistributed dividend", async () => {
                    // calculate carried over profit
                    const withdrawn = await token.balanceOf(ltHolder1);
                    assert.equal(
                        withdrawn,
                        Math.floor((profit * holds1) / totalSupply)
                    );
                    const carriedOver = profit - withdrawn;

                    // receive redistributed dividend
                    await lt.receiveDividend(token.address, ltHolder2);
                    const dividendOfCarriedOver = Math.floor(
                        (carriedOver * holds2) / totalSupply
                    );
                    assert.equal(
                        await token.balanceOf(ltHolder2),
                        dividendOfCarriedOver
                    );
                });
            });
            describe("with grants", () => {
                const duration = 60;
                beforeEach(async () => {
                    token = await TestERC20.new(sender1, tokenTotalSupply);
                    await token.transfer(lt.address, profit, {from: sender1});
                    await lt.settleProfit(token.address);
                });
                describe("with one grant", () => {
                    beforeEach(async () => {
                        const currentBlockTime = (
                            await web3.eth.getBlock("latest")
                        ).timestamp;
                        await lt.createGrant(
                            ltHolder1,
                            currentBlockTime + duration
                        );
                        await lt.depositToGrant(ltHolder1, 1, 100, {
                            from: ltHolder2
                        });
                        await increaseTime(interval);
                        await lt.receiveDividend(token.address, ltHolder1);
                        await lt.receiveDividend(token.address, ltHolder2);
                    });
                    describe("called by the beneficiary", () => {
                        it("receives dividend of tokens of the grant", async () => {
                            await increaseTime(interval);
                            await lt.receiveDividend(token.address, ltHolder1);
                            await lt.receiveDividend(token.address, ltHolder2);
                            assert.equal(
                                await token.balanceOf(ltHolder1),
                                Math.floor(
                                    (profit * (holds1 + 100)) / totalSupply
                                )
                            );
                        });
                    });
                    describe("called by the depositor", () => {
                        it("does not receive dividend of tokens of the grant", async () => {
                            await increaseTime(interval);
                            await lt.receiveDividend(token.address, ltHolder1);
                            await lt.receiveDividend(token.address, ltHolder2);
                            assert.equal(
                                await token.balanceOf(ltHolder2),
                                Math.floor(
                                    (profit * (holds2 - 100)) / totalSupply
                                )
                            );
                        });
                    });
                    describe("after claiming", () => {
                        beforeEach(async () => {
                            await increaseTime(duration);
                            await lt.claimVestedTokens(ltHolder1, 1);
                        });
                        describe("called by the beneficiary", () => {
                            it("receives dividend of tokens of the grant", async () => {
                                await increaseTime(interval);
                                await lt.receiveDividend(
                                    token.address,
                                    ltHolder1
                                );
                                await lt.receiveDividend(
                                    token.address,
                                    ltHolder2
                                );
                                assert.equal(
                                    await token.balanceOf(ltHolder1),
                                    Math.floor(
                                        (profit * (holds1 + 100)) / totalSupply
                                    )
                                );
                            });
                        });
                        describe("called by the depositor", () => {
                            it("does not receive dividend of tokens of the grant", async () => {
                                await increaseTime(interval);
                                await lt.receiveDividend(
                                    token.address,
                                    ltHolder1
                                );
                                await lt.receiveDividend(
                                    token.address,
                                    ltHolder2
                                );
                                assert.equal(
                                    await token.balanceOf(ltHolder2),
                                    Math.floor(
                                        (profit * (holds2 - 100)) / totalSupply
                                    )
                                );
                            });
                        });
                    });
                });
                describe("with two grants", () => {
                    beforeEach(async () => {
                        const currentBlockTime = (
                            await web3.eth.getBlock("latest")
                        ).timestamp;
                        await lt.createGrant(
                            ltHolder1,
                            currentBlockTime + duration
                        );
                        await lt.depositToGrant(ltHolder1, 1, 100, {
                            from: ltHolder2
                        });
                        await lt.createGrant(
                            ltHolder1,
                            currentBlockTime + duration
                        );
                        await lt.depositToGrant(ltHolder1, 1, 200, {
                            from: ltHolder2
                        });
                        await increaseTime(interval);
                        await lt.receiveDividend(token.address, ltHolder1);
                        await lt.receiveDividend(token.address, ltHolder2);
                    });
                    describe("called by the beneficiary", () => {
                        it("receives dividend of tokens of the grants", async () => {
                            assert.equal(
                                await token.balanceOf(ltHolder1),
                                Math.floor(
                                    (profit * (holds1 + 100 + 200)) /
                                        totalSupply
                                )
                            );
                        });
                    });
                    describe("called by the depositor", () => {
                        it("does not receive dividend of tokens of the grants", async () => {
                            assert.equal(
                                await token.balanceOf(ltHolder2),
                                Math.floor(
                                    (profit * (holds2 - 100 - 200)) /
                                        totalSupply
                                )
                            );
                        });
                    });
                });
            });
        });
        describe("ETH", () => {
            let tracker;
            beforeEach(async () => {
                tracker = await balance.tracker(ltHolder1);
            });
            it("emits a receive dividend event", async () => {
                await web3.eth.sendTransaction({
                    from: sender1,
                    to: lt.address,
                    value: profit
                });
                await lt.settleProfit(ETH_ADDRESS);
                await increaseTime(interval);
                const {receipt} = await lt.receiveDividend(
                    ETH_ADDRESS,
                    ltHolder1
                );
                const event = receipt.logs[0];
                assert.equal(event.event, "ReceiveDividend");
                assert.equal(event.args.token, ETH_ADDRESS);
                assert.equal(event.args.recipient, ltHolder1);
                assert.equal(
                    event.args.amount,
                    Math.floor((profit * holds1) / totalSupply)
                );
            });
            describe("while settling profits on every term", () => {
                let term;
                beforeEach(async () => {
                    term = 1;
                });
                const increaseTerm = async () => {
                    const profit = term * 10;
                    await web3.eth.sendTransaction({
                        from: sender1,
                        to: lt.address,
                        value: profit
                    });
                    await lt.settleProfit(ETH_ADDRESS);
                    await increaseTime(interval);
                    term++;
                };
                describe("at term1", () => {
                    beforeEach(async () => {
                        tracker = await balance.tracker(ltHolder1);
                        await tracker.delta();
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it("receive no tokens", async () => {
                        assert.equal(await tracker.delta(), 0);
                    });
                });
                describe("at term2", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        await increaseTerm();
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it("receive dividend at term1", async () => {
                        assert.equal(await tracker.delta(), 3);
                    });
                });
                describe("at term3", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        await increaseTerm();
                        await increaseTerm();
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it("receive dividend at term1 and term2", async () => {
                        assert.equal(await tracker.delta(), 3 + 6);
                    });
                });
                describe("at term2 and term3", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        await increaseTerm();
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                        await increaseTerm();
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it("receive dividend at term1 and term2", async () => {
                        assert.equal(await tracker.delta(), 3 + 6);
                    });
                });
                describe("at term6", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        for (i = 0; i < expiration; i++) {
                            await increaseTerm();
                        }
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it(
                        "receive dividend at from term1 to term" + expiration,
                        async () => {
                            assert.equal(
                                await tracker.delta(),
                                3 + 6 + 9 + 13 + 16
                            );
                        }
                    );
                });
                describe("at term7", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        for (i = 0; i < expiration + 1; i++) {
                            await increaseTerm();
                        }
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it("receive dividend at from term2 to term6", async () => {
                        assert.equal(
                            await tracker.delta(),
                            6 + 9 + 13 + 16 + 19
                        );
                    });
                });
                describe("at term 2 and term7", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        await increaseTerm();
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                        for (i = 0; i < expiration; i++) {
                            await increaseTerm();
                        }
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                    });
                    it("receive dividend at from term1 to term6", async () => {
                        assert.equal(
                            await tracker.delta(),
                            3 + 6 + 9 + 13 + 16 + 19
                        );
                    });
                });
            });
            describe("after period expires", () => {
                beforeEach(async () => {
                    await web3.eth.sendTransaction({
                        from: sender1,
                        to: lt.address,
                        value: profit
                    });
                    await tracker.delta();
                    await lt.settleProfit(ETH_ADDRESS);
                    await increaseTime(interval * (expiration + 1));
                    await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                });
                it("receive no tokens", async () => {
                    await tracker.delta(), 0;
                });
            });
            describe("after carry over some not withdrawn dividends", () => {
                beforeEach(async () => {
                    // settle profit
                    await web3.eth.sendTransaction({
                        from: sender1,
                        to: lt.address,
                        value: profit
                    });
                    await tracker.delta();
                    await lt.settleProfit(ETH_ADDRESS);
                    await increaseTime(interval);

                    // receive before carried over
                    await lt.receiveDividend(ETH_ADDRESS, ltHolder1);

                    // increase time until profit carried over
                    await increaseTime(interval * expiration);

                    // settle carried over profit
                    await lt.settleProfit(ETH_ADDRESS);
                    await increaseTime(interval);
                });
                it("receive carried over and redistributed dividend", async () => {
                    // calculate carried over profit
                    const withdrawn = await tracker.delta();
                    assert.equal(
                        withdrawn,
                        Math.floor((profit * holds1) / totalSupply)
                    );
                    await tracker.delta();
                    const carriedOver = profit - withdrawn;

                    tracker = await balance.tracker(ltHolder2);
                    // receive redistributed dividend
                    await lt.receiveDividend(ETH_ADDRESS, ltHolder2);
                    const dividendOfCarriedOver = Math.floor(
                        (carriedOver * holds2) / totalSupply
                    );
                    assert.equal(await tracker.delta(), dividendOfCarriedOver);
                });
            });
            describe("with grants", () => {
                const duration = 60;
                const profit = 100;
                let tracker;
                beforeEach(async () => {
                    tracker = await balance.tracker(ltHolder1);
                    await web3.eth.sendTransaction({
                        from: sender1,
                        to: lt.address,
                        value: profit
                    });
                    await lt.settleProfit(ETH_ADDRESS);
                });
                describe("with one grant", () => {
                    beforeEach(async () => {
                        await tracker.delta();
                        const currentBlockTime = (
                            await web3.eth.getBlock("latest")
                        ).timestamp;
                        await lt.createGrant(
                            ltHolder1,
                            currentBlockTime + duration
                        );
                        await lt.depositToGrant(ltHolder1, 1, 100, {
                            from: ltHolder2
                        });
                    });
                    describe("called by the beneficiary", () => {
                        it("receives dividend of tokens of the grant", async () => {
                            await increaseTime(interval);
                            await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                            await lt.receiveDividend(ETH_ADDRESS, ltHolder2);
                            assert.equal(
                                await tracker.delta(),
                                Math.floor(
                                    (profit * (holds1 + 100)) / totalSupply
                                )
                            );
                        });
                    });
                    describe("called by the depositor", () => {
                        it("does not receive dividend of tokens of the grant", async () => {
                            tracker = await balance.tracker(ltHolder2);
                            await increaseTime(interval);
                            await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                            await lt.receiveDividend(ETH_ADDRESS, ltHolder2);
                            assert.equal(
                                await tracker.delta(),
                                Math.floor(
                                    (profit * (holds2 - 100)) / totalSupply
                                )
                            );
                        });
                    });
                    describe("after claiming", () => {
                        beforeEach(async () => {
                            await increaseTime(duration);
                            await lt.claimVestedTokens(ltHolder1, 1);
                        });
                        describe("called by the beneficiary", () => {
                            it("receives dividend of tokens of the grant", async () => {
                                await increaseTime(interval);
                                await lt.receiveDividend(
                                    ETH_ADDRESS,
                                    ltHolder1
                                );
                                await lt.receiveDividend(
                                    ETH_ADDRESS,
                                    ltHolder2
                                );
                                assert.equal(
                                    await tracker.delta(),
                                    Math.floor(
                                        (profit * (holds1 + 100)) / totalSupply
                                    )
                                );
                            });
                        });
                        describe("called by the depositor", () => {
                            it("does not receive dividend of tokens of the grant", async () => {
                                tracker = await balance.tracker(ltHolder2);
                                await increaseTime(interval);
                                await lt.receiveDividend(
                                    ETH_ADDRESS,
                                    ltHolder1
                                );
                                await lt.receiveDividend(
                                    ETH_ADDRESS,
                                    ltHolder2
                                );
                                assert.equal(
                                    await tracker.delta(),
                                    Math.floor(
                                        (profit * (holds2 - 100)) / totalSupply
                                    )
                                );
                            });
                        });
                    });
                });
                describe("with two grants", () => {
                    let tracker2;
                    beforeEach(async () => {
                        const currentBlockTime = (
                            await web3.eth.getBlock("latest")
                        ).timestamp;
                        await lt.createGrant(
                            ltHolder1,
                            currentBlockTime + duration
                        );
                        await lt.depositToGrant(ltHolder1, 1, 100, {
                            from: ltHolder2
                        });
                        await lt.createGrant(
                            ltHolder1,
                            currentBlockTime + duration
                        );
                        await lt.depositToGrant(ltHolder1, 1, 200, {
                            from: ltHolder2
                        });
                        tracker2 = await balance.tracker(ltHolder2);
                        await increaseTime(interval);
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder1);
                        await lt.receiveDividend(ETH_ADDRESS, ltHolder2);
                    });
                    describe("called by the beneficiary", () => {
                        it("receives dividend of tokens of the grants", async () => {
                            assert.equal(
                                await tracker.delta(),
                                Math.floor(
                                    (profit * (holds1 + 100 + 200)) /
                                        totalSupply
                                )
                            );
                        });
                    });
                    describe("called by the depositor", () => {
                        it("does not receive dividend of tokens of the grants", async () => {
                            assert.equal(
                                await tracker2.delta(),
                                Math.floor(
                                    (profit * (holds2 - 100 - 200)) /
                                        totalSupply
                                )
                            );
                        });
                    });
                });
            });
        });
    });
    describe("#unreceivedDividend", () => {
        let token;
        beforeEach(async () => {
            token = await TestERC20.new(sender1, tokenTotalSupply);
        });
        describe("while settling profit on every term", () => {
            let term;
            beforeEach(async () => {
                term = 1;
            });
            const increaseTerm = async () => {
                const profit = term * 10;
                await token.transfer(lt.address, profit, {from: sender1});
                await lt.settleProfit(token.address);
                await increaseTime(interval);
                term++;
            };
            describe("term1", () => {
                beforeEach(async () => {});
                it("returns 0", async () => {
                    assert.equal(
                        await lt.unreceivedDividend(token.address, ltHolder1),
                        0
                    );
                });
            });
            describe("term2", () => {
                beforeEach(async () => {
                    await increaseTerm();
                });
                it("returns dividend at term1", async () => {
                    assert.equal(
                        await lt.unreceivedDividend(token.address, ltHolder1),
                        3
                    );
                });
            });
            describe("term3", () => {
                beforeEach(async () => {
                    await increaseTerm();
                    await increaseTerm();
                });
                it("returns dividend at term1 and term2", async () => {
                    assert.equal(
                        await lt.unreceivedDividend(token.address, ltHolder1),
                        3 + 6
                    );
                });
            });
            describe("term3 after receiving dividend", () => {
                beforeEach(async () => {
                    await increaseTerm();
                    await increaseTerm();
                    await lt.receiveDividend(token.address, ltHolder1);
                });
                it("returns 0", async () => {
                    assert.equal(
                        await lt.unreceivedDividend(token.address, ltHolder1),
                        0
                    );
                });
            });
        });
    });
});
