// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  let admin = "0x816a7DCCddB35F12207307d26424d31D2b674dFF";
  let GTC = { address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f" };

  // deploy dummy GTC on non-mainnet networks
  if (chainId !== "1") {
    admin = process.env.DEVELOPER;

    GTC = await deploy("GTC", {
      from: deployer,
      args: [admin],
      log: true,
    });
  }

  const streamFactory = await deploy("StreamFactory", {
    from: deployer,
    args: [admin],
    log: true,
  });

  console.log({
    GTC: GTC.address,
    streamFactory: streamFactory.address,
  });
};
module.exports.tags = ["GTC", "StreamFactory", "SimpleStream"];
