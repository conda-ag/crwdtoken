function ether(n) {
  return web3.toWei(n, "ether");
}

module.exports = {
  ether: ether
};
