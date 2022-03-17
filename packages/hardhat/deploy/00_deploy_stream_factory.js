// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const GTC = { address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f" };

  //const owner = process.env.STREAM_FACTORY_OWNER;
  // // deploy dummy GTC on non-mainnet networks
  // if (chainId !== "1") {
  //   GTC = await deploy("GTC", {
  //     from: deployer,
  //     args: [owner],
  //     log: true,
  //   });
  // }

  // deploy the Org Factory 
  const orgFactory = await deploy("OrgFactoryDeployer", {
    from: deployer,
    log: true,
  });

  // log the GTC and orgFactoryDeployer addresses
  console.log({
    GTC: GTC.address,
    orgFactory: orgFactory.address,
  });

  if (chainId !== "31337") {
    await run("verify:verify", {
      address: orgFactory.address,
      contract: "contracts/OrgFactoryDeployer.sol:OrgFactoryDeployer",
    });
  }
};

module.exports.tags = ["GTC", "OrgFactoryDeployer"];
