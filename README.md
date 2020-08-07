# Lien Token

ERC20 Token with dividend mechanism and vesting mechanism.

## Test

Recommended NodeJS version is v10.20.0 because some dependencies are not compatible with the newer versions.

```
yarn
yarn test
```

## Dividend

It accepts ether and ERC20 tokens as assets for profit, and distributes them to the token holders pro rata to their shares.

Total profit and dividends of each holders are settled regularly at the pre specified interval. Even after moving tokens, the holders keep the right to receive already settled dividends because this contract records states(the balances of accounts and the total supply of the token) at the moment of settlement.

There is a pre specified length of period for right to receive dividends. When the period expires, unreceived dividends are carried over to a new term and distributed to the holders on the new term.

![Dividend](documents/images/dividend.png?raw=true, "Dividend")

## Vesting

Lien Token also has token vesting mechanism.

When some tokens are deposited to a grant, the tokens are transferred from the depositor to the beneficiary.
Tokens deposited to a grant become gradually spendable along with the elapsed time.
The vesting of the grant is directly proportionally to the elapsed time since the start time.
The beneficiary of the grant can earn dividends for the granted tokens.

![Vesting](documents/images/vesting.png?raw=true, "Vesting")

