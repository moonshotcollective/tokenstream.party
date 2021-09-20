// deploy/00_deploy_stream_factory_contract.js

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const admin = "0x816a7DCCddB35F12207307d26424d31D2b674dFF";

  // const GTC = await deploy("GTC", {
  //   from: deployer,
  //   args: [admin],
  //   log: true,
  // });

  const streamFactory = await deploy("StreamFactory", {
    from: deployer,
    args: [admin],
    log: true,
  });

  console.log({
    // GTC: GTC.address,
    streamFactory: streamFactory.address,
  });
};
module.exports.tags = ["GTC", "StreamFactory", "SimpleStream"];
