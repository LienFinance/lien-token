pragma solidity 0.6.5;

contract RevertOnReceiveEtherFunction {
    receive() external payable {
        revert("revert on receive function");
    }
}
