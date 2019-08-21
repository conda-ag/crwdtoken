pushd "./custom-truffle-flattener"
node ./index.js "../contracts/CrwdToken.sol" > "../build/CrwdToken_flat.sol"
node ./index.js "../contracts/TestnetFaucet.sol" > "../build/TestnetFaucet_flat.sol"