function ether(n) {
  return new web3.utils.BN(web3.utils.toWei(n, "ether"));
}

module.exports = {
  ether: ether
};
