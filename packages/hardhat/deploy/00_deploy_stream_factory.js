const { ethers } = require("hardhat");

// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Mainnet GTC
  let GTC = { address: "0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F" };
  const owner = process.env.DEVELOPER;
  if (chainId !== "1") {
    GTC = await deploy("GTC", {
      from: deployer,
      log: true,
      args: [owner],
    });
  }
 
  // deploy the Org
  const orgFactory = await deploy("StreamDeployer", {
    from: deployer,
    log: true,
    args: [owner],
  });

  const OrgContract = await ethers.getContract("StreamDeployer", deployer);

  // log the GTC and orgFactoryDeployer addresses
  // 0x40fb0Ac11d00a30092E188683F5291b467D13517
  console.log({
    GTC: GTC.address,
    StreamDeployer: OrgContract.address,
  });

  try {
    if (chainId !== "31337") {
      await run("verify:verify", {
        address: OrgContract.address,
        constructorArguments: [owner],
        contract: "contracts/StreamDeployer.sol:StreamDeployer",
      });
    }
  } catch (error) {
    console.error(error);
  }
};

module.exports.tags = ["StreamDeployer"];
