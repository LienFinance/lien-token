const TestERC20RegularlyRecord = artifacts.require("TestERC20RegularlyRecord");
const {expectRevert} = require("openzeppelin-test-helpers");
const {increaseTime} = require("./utils.js");

contract("ERC20RegularlyRecord", (accounts) => {
    const interval = 60;
    const totalSupply = 1000;
    let er;
    let initialTime;
    beforeEach(async () => {
        er = await TestERC20RegularlyRecord.new(interval, totalSupply);
        initialTime = (await er.initialTime()).toNumber();
    });
    describe("#startOfTerm", () => {
        it("returns the start time of the term", async () => {
            for (let i = 1; i < 4; i++) {
                assert.equal(
                    await er.startOfTerm(i),
                    initialTime + interval * (i - 1)
                );
            }
        });
        describe("with a term of 0", () => {
            it("reverts", async () => {
                await expectRevert(
                    er.startOfTerm(0),
                    "0 is invalid value as term"
                );
            });
        });
    });
    describe("#endOfTerm", () => {
        it("returns the end time of the term", async () => {
            for (let i = 1; i < 4; i++) {
                assert.equal(
                    await er.endOfTerm(i),
                    initialTime + interval * i - 1
                );
            }
        });
        describe("with a term of 0", () => {
            it("reverts", async () => {
                await expectRevert(
                    er.endOfTerm(0),
                    "0 is invalid value as term"
                );
            });
        });
    });
    describe("#termOfTime", () => {
        it("returns the term of specified time", async () => {
            for (let i = 1; i < 4; i++) {
                assert.equal(
                    await er.termOfTime(initialTime + interval * (i - 1)),
                    i
                );
                assert.equal(
                    await er.termOfTime(initialTime + interval * (i - 0.5)),
                    i
                );
                assert.equal(
                    await er.termOfTime(initialTime + interval * i - 1),
                    i
                );
            }
        });
        describe("with a term before the initial time", () => {
            it("reverts", async () => {
                await expectRevert(
                    er.termOfTime(initialTime - 1),
                    "time is invalid"
                );
            });
        });
    });
    describe("#currentTerm", () => {
        it("returns the term of current block time", async () => {
            for (let i = 1; i <= 5; i++) {
                await increaseTime(interval - 5);
                assert.equal(await er.currentTerm(), i);
                await increaseTime(5);
                assert.equal(await er.currentTerm(), i + 1);
            }
        });
    });
    describe("#balanceOfAtTermEnd", () => {
        const sender = accounts[0];
        const receiver = accounts[1];
        const stranger = accounts[2];
        describe("with no transfers", () => {
            it("returns current balance", async () => {
                term = (await er.currentTerm()).toNumber();
                const senderBalance = await er.balanceOfAtTermEnd(
                    sender,
                    term
                );
                const receiverBalance = await er.balanceOfAtTermEnd(
                    receiver,
                    term
                );
                const strangerBalance = await er.balanceOfAtTermEnd(
                    stranger,
                    term
                );
                assert.equal(senderBalance, totalSupply);
                assert.equal(receiverBalance, 0);
                assert.equal(strangerBalance, 0);
            });
        });
        describe("with transfers", () => {
            const expectedReceiverBalance = 100;
            const expectedStrangerBalance = 300;
            const expectedSenderBalance =
                totalSupply -
                expectedReceiverBalance -
                expectedStrangerBalance;
            let term;
            const assertBalances = async (term) => {
                const senderBalance = await er.balanceOfAtTermEnd(
                    sender,
                    term
                );
                const receiverBalance = await er.balanceOfAtTermEnd(
                    receiver,
                    term
                );
                const strangerBalance = await er.balanceOfAtTermEnd(
                    stranger,
                    term
                );
                assert.equal(senderBalance, expectedSenderBalance);
                assert.equal(receiverBalance, expectedReceiverBalance);
                assert.equal(strangerBalance, expectedStrangerBalance);
            };
            beforeEach(async () => {
                await er.transfer(receiver, expectedReceiverBalance, {
                    from: sender
                });
                await er.transfer(stranger, expectedStrangerBalance, {
                    from: sender
                });
                term = (await er.currentTerm()).toNumber();
            });
            describe("before the term end", () => {
                it("returns current balance", async () => {
                    await assertBalances(term);
                });
            });
            describe("when a transfer occurs during the next term", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                    await er.transfer(receiver, 100);
                });
                it("returns balance at the end of term", async () => {
                    await assertBalances(term);
                });
            });
            describe("when transfers occur twice during the next term", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                    await er.transfer(receiver, 100);
                    await er.transfer(stranger, 100);
                });
                it("returns balance at the end of term", async () => {
                    await assertBalances(term);
                });
            });
            describe("when any transfers do not occur during the next term", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                    await increaseTime(interval);
                });
                it("returns balance at the end of term", async () => {
                    await assertBalances(term);
                });
            });
            describe("when transfer occurs during the term after the next term", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                    await increaseTime(interval);
                    await er.transfer(receiver, 100);
                });
                it("returns balance at the end of term", async () => {
                    await assertBalances(term);
                });
            });
        });
        describe("with mints", () => {
            const account = accounts[0];
            const mintAmount = 100;
            const assertBalances = async (term) => {
                const balance = await er.balanceOfAtTermEnd(account, term);
                assert.equal(balance, totalSupply + mintAmount);
            };
            beforeEach(async () => {
                await er.mint(account, mintAmount, {from: sender});
                term = (await er.currentTerm()).toNumber();
            });
            describe("before the term end", () => {
                it("returns current balance", async () => {
                    await assertBalances(term);
                });
            });
            describe("when mint occurs during the next term", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                    await er.mint(account, 100);
                });
                it("returns balance at the end of term", async () => {
                    await assertBalances(term);
                });
            });
        });
        describe("with burns", () => {
            const account = accounts[0];
            const burnAmount = 100;
            const assertBalances = async (term) => {
                const balance = await er.balanceOfAtTermEnd(account, term);
                assert.equal(balance, totalSupply - burnAmount);
            };
            beforeEach(async () => {
                await er.burn(account, burnAmount, {from: sender});
                term = (await er.currentTerm()).toNumber();
            });
            describe("before the term end", () => {
                it("returns current balance", async () => {
                    await assertBalances(term);
                });
            });
            describe("when burn occurs during the next term", () => {
                beforeEach(async () => {
                    await increaseTime(interval);
                    await er.burn(account, 100);
                });
                it("returns balance at the end of term", async () => {
                    await assertBalances(term);
                });
            });
        });
    });
});
