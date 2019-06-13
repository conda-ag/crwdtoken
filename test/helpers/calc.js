const { ether } = require("./currency.js");

const WAD = ether("1");
const HALF_WAD = WAD.div(new web3.utils.BN("2"));

//like wmul https://github.com/dapphub/ds-math/blob/master/src/math.sol
const wmul = (x, y) => {
  //x and y is a wad
  return x
    .mul(y)
    .add(HALF_WAD)
    .div(WAD);
};

//like wdiv https://github.com/dapphub/ds-math/blob/master/src/math.sol
const wdiv = (x, y) => {
  return x
    .mul(WAD)
    .add(y.div(new web3.utils.BN("2")))
    .div(y);
};

//returns percent of total
const getPercent = (total, percent) => {
  const multiplyBy = ether(
    (percent / 100) /*use pure math here*/
      .toString()
  );
  const calc = wmul(total, multiplyBy);
  return calc;
};

module.exports = {
  getPercent: getPercent,
  wmul: wmul,
  wdiv: wdiv
};
