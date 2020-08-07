const increaseTime = async (seconds) => {
    await web3.currentProvider.send(
        {
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [seconds],
            id: Number(Math.random() * 1000).toFixed(0)
        },
        () => {}
    );
    await web3.currentProvider.send(
        {
            jsonrpc: "2.0",
            method: "evm_mine",
            id: Number(Math.random() * 1000).toFixed(0)
        },
        () => {}
    );
};
exports.increaseTime = increaseTime;
