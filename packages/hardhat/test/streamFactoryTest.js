const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("My Dapp", function () {
  let myStreamFactory;
  let myGTC;
  const user = "0xbF7877303B90297E7489AA1C067106331DfF7288";

  describe("StreamFactory", function () {
    it("Should deploy StreamFactory", async function () {
      const StreamFactory = await ethers.getContractFactory("StreamFactory");
      const GTC = await ethers.getContractFactory("GTC");

      myStreamFactory = await StreamFactory.deploy(user);
      myGTC = await GTC.deploy(user);
    });

    describe("createStreamFor()", function () {
      it("Should be able to create a new stream for user", async function () {
        const createNew = await myStreamFactory.createStreamFor(
          user,
          ethers.utils.parseEther("50"),
          180,
          false,
          myGTC.address
        );

        // expect(createNew).to.be.properAddress;
      });
    });
  });
});
