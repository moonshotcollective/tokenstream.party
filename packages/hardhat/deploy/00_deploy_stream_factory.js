// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Mainnet GTC
  let GTC = { address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f" };
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

  // deploy the Org Factory
  const orgFactory = await deploy("OrgFactoryDeployer", {
    from: deployer,
    log: true,
    args: [owner],
  });

  // log the GTC and orgFactoryDeployer addresses
  console.log({
    GTC: GTC.address,
    SupCoin: SupCoin.address,
    orgFactory: orgFactory.address,
  });

  if (chainId !== "31337") {
    await run("verify:verify", {
      address: orgFactory.address,
      constructorArguments: [owner],
      contract: "contracts/OrgFactoryDeployer.sol:OrgFactoryDeployer",
    });
  }
};

module.exports.tags = ["GTC", "SupCoin", "OrgFactoryDeployer"];
