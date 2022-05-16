// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Mainnet GTC
  let GTC = { address: "0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F" };
  // Custom token test
  let SupCoin = { address: "dummy" };

  const owner = process.env.DEVELOPER;
  // deploy dummy GTC on non-mainnet networks
  if (chainId !== "1") {
    GTC = await deploy("GTC", {
      from: deployer,
      args: [owner],
      log: true,
    });
    SupCoin = await deploy("SupCoin", {
      from: deployer,
      args: [owner],
      log: true,
    });
  }

  // deploy the Org
  const orgFactory = await deploy("StreamDeployer", {
    from: deployer,
    log: true,
    args: [owner],
  });

  // log the GTC and orgFactoryDeployer addresses
  console.log({
    GTC: GTC.address,
    SupCoin: SupCoin.address,
    StreamDeployer: orgFactory.address,
  });

  if (chainId !== "31337") {
    await run("verify:verify", {
      address: orgFactory.address,
      constructorArguments: [owner],
      contract: "contracts/StreamDeployer.sol:StreamDeployer",
    });
  }
};

module.exports.tags = ["GTC", "SupCoin", "StreamDeployer"];
