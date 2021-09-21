const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("GTCStream", function () {
  let myStreamFactory;
  let myGTC;
  const user = "0xbF7877303B90297E7489AA1C067106331DfF7288";

  describe("StreamFactory", function () {
    it("Should deploy StreamFactory", async function () {
      const StreamFactory = await ethers.getContractFactory("StreamFactory");
      const GTC = await ethers.getContractFactory("GTC");

      const [signer] = await ethers.getSigners();

      myStreamFactory = await StreamFactory.deploy(signer.address);
      myGTC = await GTC.deploy(signer.address);
    });

    describe("createStreamFor()", function () {
      it("Should be able to create a new stream for user", async function () {
        const req = await myStreamFactory.createStreamFor(
          user,
          ethers.utils.parseEther("50"),
          180,
          false,
          myGTC.address
        );

        const res = await req.wait(1);

        expect(res.status).to.equal(1);
      });
    });
  });
});
