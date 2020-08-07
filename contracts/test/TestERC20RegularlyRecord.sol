pragma solidity 0.6.5;

import "../ERC20RegularlyRecord.sol";

contract TestERC20RegularlyRecord is ERC20RegularlyRecord {
    constructor(uint256 _interval, uint256 mintAmount)
        public
        ERC20RegularlyRecord(_interval)
        ERC20("", "")
    {
        ERC20._mint(msg.sender, mintAmount);
    }

    function mint(address account, uint256 value) public {
        _mint(account, value);
    }

    function burn(address account, uint256 value) public {
        _burn(account, value);
    }
}
