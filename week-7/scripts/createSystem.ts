import { ethers } from "hardhat";

export async function createSystem() {
    const AuthorityFactory = await ethers.getContractFactory("Authority");
    const authority = await AuthorityFactory.deploy();
    await authority.deployed();

    const ACDMFactory = await ethers.getContractFactory("ACDM");
    const ACDMToken = await ACDMFactory.deploy(authority.address);
    await ACDMToken.deployed();

    const XXXFactory = await ethers.getContractFactory("XXXToken");
    const XToken = await XXXFactory.deploy(authority.address);
    await XToken.deployed();

    const setACDM = await authority.setACDM(ACDMToken.address);
    const setACDMx = await authority.setACDMx(XToken.address);

    await Promise.all([setACDM.wait(), setACDMx.wait()]);

    const DAOFactory = await ethers.getContractFactory("DAO");
    const minimumQuorum = 100;
    const debatingPeriod = 60 * 60 * 24 * 3;
    const dao = await DAOFactory.deploy(
        minimumQuorum,
        debatingPeriod,
        authority.address
    );
    await dao.deployed();

    const StakingFactory = await ethers.getContractFactory("Staking");
    const tick = 60 * 60 * 24 * 7;
    const rewardPercent = 3;
    const freezePeriod = tick;
    const staking = await StakingFactory.deploy(
        XToken.address,
        XToken.address,
        tick,
        rewardPercent,
        freezePeriod,
        authority.address
    );
    await staking.deployed();

    return {
        authority,
        ACDMToken,
        XToken,
        staking: {
            contract: staking,
            tick,
            rewardPercent,
            freezePeriod,
        },
        dao: {
            contract: dao,
            minimumQuorum,
            debatingPeriod,
        },
    };
}
