// this data structure must be kept in sync with States enum in the token's .sol
export const States = {
    Initial: 0, // deployment time
    ValuationSet: 1, // whitelist addresses, accept funds, update balances
    Ico: 2, // whitelist addresses, accept funds, update balances
    Underfunded: 3, // ICO time finished and minimal amount not raised
    Operational: 4, // production phase
    Paused: 5         // for contract upgrades
}