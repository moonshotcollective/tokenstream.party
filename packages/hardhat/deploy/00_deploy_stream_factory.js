// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const admins = [];
  let GTC = { address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f" };

  // deploy dummy GTC on non-mainnet networks
  if (chainId !== "1") {
    admins[0] = process.env.MANAGER1;
    admins[1] = process.env.MANAGER2;

    GTC = await deploy("GTC", {
      from: deployer,
      args: [admins[0]],
      log: true,
    });
  }

  // deploy the stream factory
  const streamFactory = await deploy("StreamFactory", {
    from: deployer,
    args: [admins[0], admins],
    log: true,
  });

  // log the GTC and StreamFactory addresses
  console.log({
    GTC: GTC.address,
    streamFactory: streamFactory.address,
  });

  if (chainId !== "31337") {
    await run("verify:verify", {
      address: streamFactory.address,
      contract: "contracts/StreamFactory.sol:StreamFactory",
      constructorArguments: [admins[0], admins],
    });
  }
};

module.exports.tags = ["GTC", "StreamFactory", "SimpleStream"];
