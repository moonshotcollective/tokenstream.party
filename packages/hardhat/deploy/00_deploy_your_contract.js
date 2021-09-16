// deploy/00_deploy_your_contract.js

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const GTC = await deploy("GTC", {
    from: deployer,
    args: ["0xbF7877303B90297E7489AA1C067106331DfF7288"],
    log: true,
  });

  const streamFactory = await deploy("StreamFactory", {
    from: deployer,
    log: true,
  });

  console.log({
    GTC: GTC.address,
    streamFactory: streamFactory.address,
  });
};
module.exports.tags = ["GTC", "StreamFactory", "SimpleStream"];
