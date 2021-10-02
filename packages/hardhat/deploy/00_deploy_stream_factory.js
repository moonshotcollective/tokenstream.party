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
    admins[0] = process.env.DEVELOPER;

    GTC = await deploy("GTC", {
      from: deployer,
      args: [admins[0]],
      log: true,
    });
  }

  const streamFactory = await deploy("StreamFactory", {
    from: deployer,
    args: [admins[0], admins],
    log: true,
  });

  console.log({
    GTC: GTC.address,
    streamFactory: streamFactory.address,
  });
};
module.exports.tags = ["GTC", "StreamFactory", "SimpleStream"];
