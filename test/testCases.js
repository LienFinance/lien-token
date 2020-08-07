const testCases = [
    {
        title: "general case",
        initialBalances: [50, 40, 9, 1],
        terms: [
            // term1
            {
                senderActions: [
                    {
                        tokenTransfer: [10, 20],
                        ethTransfer: 0
                    },
                    {
                        tokenTransfer: [5, 20],
                        ethTransfer: 0
                    }
                ],
                settleTokens: [true, true],
                settleEth: false,
                holderActions: [
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 10
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    }
                ],
                results: {
                    profitOfTokens: [15, 40],
                    dividendOfTokens: [
                        [7, 6, 1, 0],
                        [20, 16, 3, 0]
                    ],
                    profitOfEth: 0,
                    dividendOfEth: [0, 0, 0, 0],
                    balanceOfTokens: [
                        [0, 0, 0, 0],
                        [0, 0, 0, 0]
                    ],
                    increaseOfEth: [0, 0, 0, 0]
                }
            },
            // term2
            {
                senderActions: [
                    {
                        tokenTransfer: [10, 20],
                        ethTransfer: 10
                    },
                    {
                        tokenTransfer: [30, 1],
                        ethTransfer: 30
                    }
                ],
                settleTokens: [true, true],
                settleEth: true,
                holderActions: [
                    {
                        receiveDividend: [1, 2],
                        receiveEth: false,
                        transferLT: [
                            {
                                to: 2,
                                value: 30
                            }
                        ],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [
                            {
                                to: 1,
                                value: 10
                            }
                        ],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    }
                ],
                results: {
                    profitOfTokens: [40, 21],
                    dividendOfTokens: [
                        [12, 24, 3, 0],
                        [6, 12, 1, 0]
                    ],
                    profitOfEth: 40,
                    dividendOfEth: [12, 24, 3, 0],
                    balanceOfTokens: [
                        [7, 0, 0, 0],
                        [20, 0, 0, 0]
                    ],
                    increaseOfEth: [0, 0, 0, 0]
                }
            },
            // term3
            {
                senderActions: [
                    {
                        tokenTransfer: [1, 1],
                        ethTransfer: 1
                    },
                    {
                        tokenTransfer: [30, 10],
                        ethTransfer: 30
                    }
                ],
                settleTokens: [true, true],
                settleEth: true,
                holderActions: [
                    {
                        receiveDividend: [1],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [2],
                        receiveEth: true,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: true,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    }
                ],
                results: {
                    profitOfTokens: [31, 11],
                    dividendOfTokens: [
                        [9, 18, 2, 0],
                        [3, 6, 0, 0]
                    ],
                    profitOfEth: 31,
                    dividendOfEth: [9, 18, 2, 0],
                    balanceOfTokens: [
                        [19, 0, 0, 0],
                        [20, 28, 0, 0]
                    ],
                    increaseOfEth: [0, 24, 3, 0]
                }
            },
            // term4
            {
                senderActions: [
                    {
                        tokenTransfer: [10, 10],
                        ethTransfer: 10
                    },
                    {
                        tokenTransfer: [10, 10],
                        ethTransfer: 10
                    }
                ],
                settleTokens: [true, true],
                settleEth: true,
                holderActions: [
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 10
                    },
                    {
                        receiveDividend: [1],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    },
                    {
                        receiveDividend: [],
                        receiveEth: false,
                        transferLT: [],
                        lockToken: 0
                    }
                ],
                results: {
                    profitOfTokens: [28, 24],
                    dividendOfTokens: [
                        [8, 16, 2, 0],
                        [7, 14, 2, 0]
                    ],
                    profitOfEth: 20,
                    dividendOfEth: [6, 12, 1, 0],
                    balanceOfTokens: [
                        [19, 0, 5, 0],
                        [20, 28, 0, 0]
                    ],
                    increaseOfEth: [0, 0, 0, 0]
                }
            }
        ]
    }
];

exports.testCases = testCases;
