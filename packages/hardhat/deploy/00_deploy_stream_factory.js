// deploy/00_deploy_stream_factory_contract.js
require("dotenv").config();

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const GTC = { address: "0xde30da39c46104798bb5aa3fe8b9e0e1f348163f" };

  const owner = process.env.STREAM_FACTORY_OWNER;
  const admins = JSON.parse(process.env.STREAM_FACTORY_ADMINS);
  admins.push(owner); // the owner is also an admin

  // // deploy dummy GTC on non-mainnet networks
  // if (chainId !== "1") {
  //   GTC = await deploy("GTC", {
  //     from: deployer,
  //     args: [owner],
  //     log: true,
  //   });
  // }

  // deploy the stream factory
  const streamFactory = await deploy("StreamFactory", {
    from: deployer,
    args: [owner, admins],
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
      constructorArguments: [owner, admins],
    });
  }
};

module.exports.tags = ["GTC", "StreamFactory", "SimpleStream"];
