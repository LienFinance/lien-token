const TestERC20Vestable = artifacts.require("TestERC20Vestable");
const {expectRevert} = require("openzeppelin-test-helpers");
const {increaseTime} = require("./utils.js");

contract("ERC20Vestable", (accounts) => {
    const totalSupply = 100000000;
    const deployer = accounts[0];
    let ev;
    beforeEach(async () => {
        ev = await TestERC20Vestable.new(totalSupply, {from: deployer});
    });
    describe("#createGrant", () => {
        describe("when called several times from a creator with a beneficiary", () => {
            const creator = deployer;
            const beneficiary = accounts[1];
            const durations = [10, 101, 1010];
            it("returns the id of created grant", async () => {
                for (
                    let expectedId = 1;
                    expectedId <= durations.length;
                    expectedId++
                ) {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    const endTime =
                        currentBlockTime + durations[expectedId - 1];
                    const id = await ev.createGrant.call(
                        beneficiary,
                        endTime,
                        {from: creator}
                    );
                    await ev.createGrant(beneficiary, endTime, {
                        from: creator
                    });
                    assert.equal(id, expectedId);
                }
            });
            it("emits a create grant event", async () => {
                for (
                    let expectedId = 1;
                    expectedId <= durations.length;
                    expectedId++
                ) {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    const endTime =
                        currentBlockTime + durations[expectedId - 1];
                    const {receipt} = await ev.createGrant(
                        beneficiary,
                        endTime,
                        {from: creator}
                    );
                    const event = receipt.logs[0];
                    assert.equal(event.event, "CreateGrant");
                    assert.equal(event.args.beneficiary, beneficiary);
                    assert.equal(event.args.creator, creator);
                    assert.equal(event.args.id, expectedId);
                    assert.equal(event.args.endTime, endTime);
                }
            });
            it("creates a grant", async () => {
                for (
                    let expectedId = 1;
                    expectedId <= durations.length;
                    expectedId++
                ) {
                    let currentBlockTime = (await web3.eth.getBlock("latest"))
                        .timestamp;
                    const endTime =
                        currentBlockTime + durations[expectedId - 1];
                    const id = await ev.createGrant.call(
                        beneficiary,
                        endTime,
                        {from: creator}
                    );
                    await ev.createGrant(beneficiary, endTime, {
                        from: creator
                    });
                    const startTime = (await web3.eth.getBlock("latest"))
                        .timestamp;
                    const grant = await ev.getGrant(beneficiary, id);
                    assert.equal(grant.amount, 0);
                    assert.equal(grant.claimed, 0);
                    assert.equal(grant.vested, 0);
                    assert.equal(grant.startTime, startTime);
                    assert.equal(grant.endTime, endTime);
                }
            });
        });
        describe("when called from a creator with two beneficiaries", () => {
            const creator = deployer;
            const beneficiaries = [accounts[1], accounts[2]];
            it("create grants separately", async () => {
                for (const beneficiary of beneficiaries) {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    const endTime = currentBlockTime + 100;
                    await ev.createGrant(beneficiary, endTime, {
                        from: creator
                    });
                    const startTime = (await web3.eth.getBlock("latest"))
                        .timestamp;
                    const grant = await ev.getGrant(beneficiary, 1);
                    assert.equal(grant.amount, 0);
                    assert.equal(grant.claimed, 0);
                    assert.equal(grant.vested, 0);
                    assert.equal(grant.startTime, startTime);
                    assert.equal(grant.endTime, endTime);
                }
            });
        });
        describe("with a end time before now", () => {
            const creator = deployer;
            const beneficiary = accounts[1];
            it("reverts", async () => {
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                const endTime = currentBlockTime - 1;
                expectRevert(
                    ev.createGrant(beneficiary, endTime, {from: creator}),
                    "endTime is before now"
                );
            });
        });
    });
    describe("#getLastGrantID", () => {
        describe("when account does not have any grants", () => {
            it("returns 0", async () => {
                const lastGrantID = await ev.getLastGrantID(accounts[0]);
                assert.equal(lastGrantID.toNumber(), 0);
            });
        });
        describe("when account has 1 grant", () => {
            it("returns 1", async () => {
                const duration = 1000;
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                const endTime = currentBlockTime + duration;
                await ev.createGrant(accounts[0], endTime);
                const lastGrantID = await ev.getLastGrantID(accounts[0]);
                assert.equal(lastGrantID.toNumber(), 1);
            });
        });
        describe("when account has 10 grant", () => {
            it("returns 10", async () => {
                const duration = 1000;
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                const endTime = currentBlockTime + duration;
                for (i = 0; i < 10; i++) {
                    await ev.createGrant(accounts[0], endTime);
                }
                const lastGrantID = await ev.getLastGrantID(accounts[0]);
                assert.equal(lastGrantID.toNumber(), 10);
            });
        });
    });
    describe("#getGrant", () => {
        describe("with an id of 0", () => {
            it("reverts", async () => {
                await expectRevert(
                    ev.getGrant(accounts[0], 0),
                    "0 is invalid as id"
                );
            });
        });
        describe("with a not existing grant", () => {
            it("reverts", async () => {
                await expectRevert(
                    ev.getGrant(accounts[0], 1),
                    "grant does not exist"
                );
            });
        });
        describe("after all amount of the grant claimed", () => {
            const creator = deployer;
            const depositor = deployer;
            const beneficiary = accounts[1];
            const duration = 100;
            const amount = 10;
            beforeEach(async () => {
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                const endTime = currentBlockTime + duration;
                await ev.createGrant(beneficiary, endTime, {
                    from: creator
                });
                await increaseTime(duration);
                ev.depositToGrant(beneficiary, 1, amount, {
                    from: depositor
                }),
                    await ev.claimVestedTokens(beneficiary, 1);
            });
            it("reverts", async () => {
                await expectRevert(
                    ev.getGrant(accounts[1], 1),
                    "cannot get grant which is already claimed entirely"
                );
            });
            describe("next grant", () => {
                let endTime;
                beforeEach(async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    endTime = currentBlockTime + duration;
                    await ev.createGrant(beneficiary, endTime, {
                        from: creator
                    });
                });
                it("id is next to deleted claim", async () => {
                    const grant = await ev.getGrant(accounts[1], 2);
                    assert.equal(grant.endTime, endTime);
                });
            });
        });
    });
    describe("#depositToGrant", () => {
        const duration = 300;
        const id = 1;
        const depositor = deployer;
        const amounts = [0, 10, 101, totalSupply];
        describe("when beneficiary is different from the depositor", () => {
            const beneficiary = accounts[1];
            for (const amount of amounts) {
                describe("case amount:" + amount, () => {
                    beforeEach(async () => {
                        const currentBlockTime = (
                            await web3.eth.getBlock("latest")
                        ).timestamp;
                        await ev.createGrant(
                            beneficiary,
                            currentBlockTime + duration
                        );
                    });
                    it("emits an deposit to grant event", async () => {
                        const {receipt} = await ev.depositToGrant(
                            beneficiary,
                            id,
                            amount,
                            {from: depositor}
                        );
                        const event = receipt.logs[1];
                        assert.equal(event.event, "DepositToGrant");
                        assert.equal(event.args.beneficiary, beneficiary);
                        assert.equal(event.args.id, id);
                        assert.equal(event.args.amount, amount);
                    });
                    it("transfers tokens from the depositor to the beneficiary", async () => {
                        const beforeBalanceOfDepositor = await ev.balanceOf(
                            depositor
                        );
                        const beforeBalanceOfRecipient = await ev.balanceOf(
                            beneficiary
                        );
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const afterBalanceOfDepositor = await ev.balanceOf(
                            depositor
                        );
                        const afterBalanceOfRecipient = await ev.balanceOf(
                            beneficiary
                        );

                        const decreaseOfDepositor = beforeBalanceOfDepositor.sub(
                            afterBalanceOfDepositor
                        );
                        const increaseOfRecipient = afterBalanceOfRecipient.sub(
                            beforeBalanceOfRecipient
                        );
                        assert.equal(decreaseOfDepositor, amount);
                        assert.equal(increaseOfRecipient, amount);
                    });
                    it("increases amount of the grant", async () => {
                        const beforeGrant = await ev.getGrant(beneficiary, id);
                        const beforeAmount = beforeGrant.amount;
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const afterGrant = await ev.getGrant(beneficiary, id);
                        const afterAmount = afterGrant.amount;
                        const increaseOfAmount = afterAmount.sub(beforeAmount);
                        assert.equal(increaseOfAmount, amount);
                    });
                    it("increases remaining grant of the beneficiary", async () => {
                        const before = await ev.remainingGrantOf(beneficiary);
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const after = await ev.remainingGrantOf(beneficiary);
                        const increase = after.sub(before);
                        assert.equal(increase, amount);
                    });
                    it("increases total remaining grant", async () => {
                        const before = await ev.totalRemainingGrants();
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const after = await ev.totalRemainingGrants();
                        const increase = after.sub(before);
                        assert.equal(increase, amount);
                    });
                });
            }
        });
        describe("when beneficiary is same as the depositor", () => {
            const beneficiary = deployer;
            for (const amount of amounts) {
                describe("case amount:" + amount, () => {
                    beforeEach(async () => {
                        const currentBlockTime = (
                            await web3.eth.getBlock("latest")
                        ).timestamp;
                        await ev.createGrant(
                            beneficiary,
                            currentBlockTime + duration
                        );
                    });
                    it("emits a grant token event", async () => {
                        const {receipt} = await ev.depositToGrant(
                            beneficiary,
                            id,
                            amount,
                            {from: depositor}
                        );
                        const event = receipt.logs[1];
                        assert.equal(event.event, "DepositToGrant");
                        assert.equal(event.args.beneficiary, beneficiary);
                        assert.equal(event.args.id, id);
                        assert.equal(event.args.depositor, depositor);
                        assert.equal(event.args.amount, amount);
                    });
                    it("does not transfers tokens", async () => {
                        const beforeBalanceOfDepositor = await ev.balanceOf(
                            depositor
                        );
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const afterBalanceOfDepositor = await ev.balanceOf(
                            depositor
                        );
                        const increaseOfDepositor = beforeBalanceOfDepositor.sub(
                            afterBalanceOfDepositor
                        );
                        assert.equal(increaseOfDepositor, 0);
                    });
                    it("increases amount of the grant", async () => {
                        const beforeGrant = await ev.getGrant(beneficiary, id);
                        const beforeAmount = beforeGrant.amount;
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const afterGrant = await ev.getGrant(beneficiary, id);
                        const afterAmount = afterGrant.amount;
                        const increaseOfAmount = afterAmount.sub(beforeAmount);
                        assert.equal(increaseOfAmount, amount);
                    });
                    it("increases remaining grant of the beneficiary", async () => {
                        const before = await ev.remainingGrantOf(beneficiary);
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const after = await ev.remainingGrantOf(beneficiary);
                        const increase = after.sub(before);
                        assert.equal(increase, amount);
                    });
                    it("increases total remaining grant", async () => {
                        const before = await ev.totalRemainingGrants();
                        await ev.depositToGrant(beneficiary, id, amount, {
                            from: depositor
                        });
                        const after = await ev.totalRemainingGrants();
                        const increase = after.sub(before);
                        assert.equal(increase, amount);
                    });
                });
            }
        });
        describe("when deposited to the same grant twice", () => {
            const amount1 = 10;
            const amount2 = 101;
            const sumOfAmount = amount1 + amount2;
            const id = 1;
            const beneficiary = accounts[1];
            beforeEach(async () => {
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                await ev.createGrant(beneficiary, currentBlockTime + duration);
                await ev.depositToGrant(beneficiary, id, amount1, {
                    from: depositor
                });
                await ev.depositToGrant(beneficiary, id, amount2, {
                    from: depositor
                });
            });
            it("amount of the grant is equal to the sum of deposits", async () => {
                const {amount} = await ev.getGrant(beneficiary, id);
                assert.equal(amount, sumOfAmount);
            });
            it("remaining grant of beneficiary is equal to sum of deposits", async () => {
                const grantAmount = await ev.remainingGrantOf(beneficiary);
                assert.equal(grantAmount, sumOfAmount);
            });
            it("total remaining grant is equal to sum of deposits", async () => {
                const total = await ev.totalRemainingGrants();
                assert.equal(total, sumOfAmount);
            });
        });
        describe("with a not existing grant", () => {
            it("reverts", async () => {
                await expectRevert(
                    ev.depositToGrant(accounts[1], 1, 100, {from: depositor}),
                    "grant does not exist"
                );
            });
        });
        describe("when deposited after a little since the last deposit", () => {
            const amount1 = 10;
            const amount2 = totalSupply - amount1;
            const duration = 300;
            describe("when beneficiary is different from the depositor", () => {
                const beneficiary = accounts[1];
                beforeEach(async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    await ev.createGrant(
                        beneficiary,
                        currentBlockTime + duration
                    );
                    await ev.depositToGrant(beneficiary, id, amount1, {
                        from: depositor
                    });
                    await increaseTime(duration / 3);
                    await ev.depositToGrant(beneficiary, id, amount2, {
                        from: depositor
                    });
                });
                it("increases the vested amount of the grant ", async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    const {vested, startTime} = await ev.getGrant(
                        beneficiary,
                        1
                    );
                    const elapsedTime = currentBlockTime - startTime;
                    const expectedVested = Math.floor(
                        ((amount1 + amount2) * elapsedTime) / duration
                    );
                    assert.equal(vested.toString(), expectedVested);
                });
            });
            describe("when beneficiary is same as the depositor", () => {
                const beneficiary = accounts[0];
                beforeEach(async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    await ev.createGrant(
                        beneficiary,
                        currentBlockTime + duration
                    );
                    await ev.depositToGrant(beneficiary, id, amount1, {
                        from: depositor
                    });
                    await increaseTime(duration / 3);
                    await ev.depositToGrant(beneficiary, id, amount2, {
                        from: depositor
                    });
                });
                it("increases the vested amount of the grant ", async () => {
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    const {vested, startTime} = await ev.getGrant(
                        beneficiary,
                        1
                    );
                    const elapsedTime = currentBlockTime - startTime;
                    const expectedVested = Math.floor(
                        ((amount1 + amount2) * elapsedTime) / duration
                    );
                    assert.equal(vested.toString(), expectedVested);
                });
            });
        });
        describe("after all amount of the grant claimed", () => {
            const creator = deployer;
            const beneficiary = accounts[1];
            const id = 1;
            const amount = 1000;
            beforeEach(async () => {
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                const endTime = currentBlockTime + duration;
                await ev.createGrant(beneficiary, endTime, {
                    from: creator
                });
                ev.depositToGrant(beneficiary, id, amount, {
                    from: depositor
                }),
                    await increaseTime(duration);
                await ev.claimVestedTokens(beneficiary, id);
            });
            it("reverts", async () => {
                await expectRevert(
                    ev.depositToGrant(beneficiary, id, amount, {
                        from: depositor
                    }),
                    "cannot get grant which is already claimed entirely"
                );
            });
        });
    });
    describe("#claimVestedTokens", () => {
        const depositor = deployer;
        const beneficiary = accounts[1];
        const initialDeposit = 1000;
        let startTime;
        let endTime;
        let duration;
        let event;
        let expectedClaimed;
        beforeEach(async () => {
            const blockTimeBeforeCreateGrant = (
                await web3.eth.getBlock("latest")
            ).timestamp;
            await ev.createGrant(
                beneficiary,
                blockTimeBeforeCreateGrant + 300
            );
            await ev.depositToGrant(beneficiary, 1, initialDeposit, {
                from: depositor
            });
            grant = await ev.getGrant(beneficiary, 1);
            startTime = grant.startTime;
            endTime = grant.endTime;
            duration = endTime - startTime;
        });
        describe("when called at the first time since the grant is created", () => {
            beforeEach(async () => {
                await increaseTime(100);
                const {receipt} = await ev.claimVestedTokens(beneficiary, 1);
                const blockTimeAfterClaim = (await web3.eth.getBlock("latest"))
                    .timestamp;
                const elapsedTime = blockTimeAfterClaim - startTime;
                event = receipt.logs[0];
                expectedClaimed = Math.floor(
                    (initialDeposit * elapsedTime) / duration
                );
            });
            it("emits an claim vested token event", async () => {
                assert.equal(event.event, "ClaimVestedTokens");
                assert.equal(event.args.beneficiary, beneficiary);
                assert.equal(event.args.id, 1);
                assert.equal(event.args.amount, expectedClaimed);
            });
            it("increases claimed of the grant", async () => {
                const {claimed} = await ev.getGrant(beneficiary, 1);
                assert.equal(claimed, expectedClaimed);
            });
            it("decreases remaining grant of beneficiary", async () => {
                const remaining = await ev.remainingGrantOf(beneficiary);
                assert.equal(
                    remaining.toNumber(),
                    initialDeposit - expectedClaimed
                );
            });
            it("decreases total remaining grant", async () => {
                const total = await ev.totalRemainingGrants();
                assert.equal(
                    total.toNumber(),
                    initialDeposit - expectedClaimed
                );
            });
            describe("when called at the 2nd time", () => {
                beforeEach(async () => {
                    await increaseTime(100);
                    const {receipt} = await ev.claimVestedTokens(
                        beneficiary,
                        1
                    );
                    const blockTimeAfterClaim = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    const elapsedTime = blockTimeAfterClaim - startTime;
                    event = receipt.logs[0];
                    expectedClaimed = Math.floor(
                        (initialDeposit * elapsedTime) / duration
                    );
                });
                it("increases claimed of the grant", async () => {
                    const {claimed} = await ev.getGrant(beneficiary, 1);
                    assert.equal(claimed.toNumber(), expectedClaimed);
                });
            });
        });
        describe("when called with a not existing", () => {
            it("reverts", async () => {
                await expectRevert(
                    ev.claimVestedTokens(beneficiary, 2),
                    "grant does not exist"
                );
            });
        });
        describe("with a grant which has ended", () => {
            describe("right after the end", () => {
                beforeEach(async () => {
                    await increaseTime(duration);
                    await ev.claimVestedTokens(beneficiary, 1);
                });
                it("remaining grant of the beneficiary is 0", async () => {
                    const remaining = await ev.remainingGrantOf(beneficiary);
                    assert.equal(remaining, 0);
                });
            });
            describe("a little after the end", () => {
                beforeEach(async () => {
                    await increaseTime(duration + 1000);
                    await ev.claimVestedTokens(beneficiary, 1);
                });
                it("remaining grant of the beneficiary is 0", async () => {
                    const remaining = await ev.remainingGrantOf(beneficiary);
                    assert.equal(remaining, 0);
                });
                describe("when claim twice", () => {
                    it("reverts", async () => {
                        await expectRevert(
                            ev.claimVestedTokens(beneficiary, 1),
                            "cannot get grant which is already claimed entirely"
                        );
                    });
                });
            });
        });
    });
    describe("#transfer", () => {
        const sender = deployer;
        const receiver = accounts[1];
        describe("when any tokens are not deposited for grants", () => {
            describe("transfer all", () => {
                it("can transfer", async () => {
                    await ev.transfer(receiver, totalSupply, {from: sender});
                    assert.equal(await ev.balanceOf(sender), 0);
                    assert.equal(await ev.balanceOf(receiver), totalSupply);
                });
            });
        });
        describe("when half of tokens are deposited for grants", () => {
            const grantAmount = Math.floor(totalSupply / 2);
            const notGrant = totalSupply - grantAmount;
            const duration = 300;
            beforeEach(async () => {
                const currentBlockTime = (await web3.eth.getBlock("latest"))
                    .timestamp;
                await ev.createGrant(sender, currentBlockTime + duration);
                await ev.depositToGrant(sender, 1, grantAmount);
                await increaseTime(duration / 2);
            });
            describe("if transfer amount includes deposited tokens", () => {
                it("reverts", async () => {
                    await expectRevert(
                        ev.transfer(receiver, totalSupply, {from: sender}),
                        "transfer amount exceeds spendable balance"
                    );
                });
            });
            describe("if transfer amount does not include the deposited tokens", () => {
                it("can transfer", async () => {
                    await ev.transfer(receiver, notGrant, {from: sender});
                    assert.equal(await ev.balanceOf(sender), grantAmount);
                    assert.equal(await ev.balanceOf(receiver), notGrant);
                });
            });
            describe("after claiming some vesting", () => {
                let transferable;
                beforeEach(async () => {
                    const {receipt} = await ev.claimVestedTokens(sender, 1);
                    const claimed = receipt.logs[0].args.amount;
                    transferable = notGrant + parseInt(claimed);
                });
                describe("if transfer amount includes deposited tokens", () => {
                    it("reverts", async () => {
                        await expectRevert(
                            ev.transfer(receiver, transferable + 10, {
                                from: sender
                            }),
                            "transfer amount exceeds spendable balance"
                        );
                    });
                });
                describe("if transfer amount includes the vesting", () => {
                    it("can transfer", async () => {
                        await ev.transfer(receiver, transferable, {
                            from: sender
                        });
                        assert.equal(
                            await ev.balanceOf(sender),
                            totalSupply - transferable
                        );
                        assert.equal(
                            await ev.balanceOf(receiver),
                            transferable
                        );
                    });
                });
            });
            describe("when claim some vested tokens and deposit them to another grant", () => {
                beforeEach(async () => {
                    const {receipt} = await ev.claimVestedTokens(sender, 1);
                    const claimed = receipt.logs[0].args.amount;
                    const currentBlockTime = (
                        await web3.eth.getBlock("latest")
                    ).timestamp;
                    await ev.createGrant(sender, currentBlockTime + duration);
                    await ev.depositToGrant(sender, 1, claimed);
                    await increaseTime(duration / 2);
                });
                describe("if transfer amount includes deposited tokens the another grant", () => {
                    it("reverts", async () => {
                        expectRevert(
                            ev.transfer(receiver, notGrant + 1, {
                                from: sender
                            }),
                            "transfer amount exceeds spendable balance"
                        );
                    });
                });
                describe("after claiming the vesting of the another grant", () => {
                    let transferable;
                    beforeEach(async () => {
                        const {receipt} = await ev.claimVestedTokens(
                            sender,
                            1
                        );
                        const claimed = receipt.logs[0].args.amount;
                        transferable = notGrant + parseInt(claimed);
                    });
                    describe("if transfer includes not vested tokens", () => {
                        it("reverts", async () => {
                            await expectRevert(
                                ev.transfer(receiver, transferable + 1, {
                                    from: sender
                                }),
                                "transfer amount exceeds spendable balance"
                            );
                        });
                    });
                    describe("if transfer includes vested tokens", () => {
                        it("can transfer", async () => {
                            await ev.transfer(receiver, transferable, {
                                from: sender
                            });
                            assert.equal(
                                await ev.balanceOf(sender),
                                totalSupply - transferable
                            );
                            assert.equal(
                                await ev.balanceOf(receiver),
                                transferable
                            );
                        });
                    });
                });
            });
        });
    });
});
