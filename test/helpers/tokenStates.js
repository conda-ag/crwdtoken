import { BigNumber } from './customBN.js'

// this data structure must be kept in sync with States enum in the token's .sol
export const States = {
    Initial: new BigNumber("0"), // deployment time
    ValuationSet: new BigNumber("1"), // whitelist addresses, accept funds, update balances
    Ico: new BigNumber("2"), // whitelist addresses, accept funds, update balances
    Underfunded: new BigNumber("3"), // ICO time finished and minimal amount not raised
    Operational: new BigNumber("4"), // production phase
    Paused: new BigNumber("5") // for contract upgrades
}