pragma solidity 0.6.5;

import "../ERC20Vestable.sol";

contract TestERC20Vestable is ERC20Vestable {
    constructor(uint256 mintAmount) public ERC20("", "") {
        _mint(msg.sender, mintAmount);
    }
}
