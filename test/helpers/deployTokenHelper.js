const TokenContract = artifacts.require("./CrwdToken.sol");

export const deployTokenJustLikeInMigrations = async (accounts) => {
    const doNotUse = accounts[0];
    const stateControl = accounts[1];
    const whitelistControl = accounts[2];
    const withdrawControl = accounts[3];
    const tokenAssignmentControl = accounts[4];
    const notLocked = accounts[5];
    const lockedTeam = accounts[6];
    const lockedDev = accounts[7];
    const lockedCountry = accounts[8];

    const token = await TokenContract.new(
        stateControl,
        whitelistControl,
        withdrawControl,
        tokenAssignmentControl,
        notLocked,
        lockedTeam,
        lockedDev,
        lockedCountry);

    return token;
}