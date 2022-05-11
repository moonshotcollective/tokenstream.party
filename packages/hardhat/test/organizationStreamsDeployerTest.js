const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("GTCStream", function () {
  let myOrganizationStreamsDeployer;
  let myGTC;
  const user = "0xbF7877303B90297E7489AA1C067106331DfF7288";

  describe("StreamDeployer", function () {
    it("Should deploy StreamDeployer", async function () {
      const StreamDeployer = await ethers.getContractFactory("StreamDeployer");
      const GTC = await ethers.getContractFactory("GTC");

      const [signer] = await ethers.getSigners();

      myOrganizationStreamsDeployer = await StreamDeployer.deploy(signer.address);
      myGTC = await GTC.deploy(signer.address);
    });

    describe("deployOrganization()", function () {
      it("Should be able to create a new organization", async function () {
        const req = await myOrganizationStreamsDeployer.deployOrganization(
          "myDAO",
          "http://some.logo.com",
          "My DAO description",
          user,
          [],[],[], [],
          myGTC.address
        );

        const res = await req.wait(1);

        expect(res.status).to.equal(1);
      });
    });
  });
});
