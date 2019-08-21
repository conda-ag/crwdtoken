pushd "./custom-truffle-flattener"
node ./index.js "../contracts/CrwdToken.sol" > "../build/CrwdToken_flat.sol"