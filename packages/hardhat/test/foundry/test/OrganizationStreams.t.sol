//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "support/CheatCodes.sol";
import "forge-std/Vm.sol";
import "forge-std/Test.sol";
import "../../../contracts/GTC.sol";
import "../../../contracts/Stream.sol";

contract OrganizationStreamsTest is Test {
    CheatCodes cheats = CheatCodes(HEVM_ADDRESS);

    string _orgName = "GitcoinDAO";
    string _logoURI = "placeholder";
    string _orgDescription = "dem der public goods";

    address[] _managers = [0xa8B3478A436e8B909B5E9636090F2B15f9B311e7];
    address[] _addresses = [0xa8B3478A436e8B909B5E9636090F2B15f9B311e7];
    uint256[] _caps = [0.5 ether];
    uint256[] _freqs = [1296000];
    bool[] _startsF = [true];

    address payable me = payable(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7);

    MultiStream internal stream;
    GTC token;
    address deployer = HEVM_ADDRESS;

    Vm internal constant hevm = Vm(HEVM_ADDRESS);

    uint256 initAmount = 1000000000000000000000; // or 1000 tokens

    function setUp() public {
        cheats.warp(1641070800);

        token = new GTC(deployer);
        stream = new MultiStream(
            _orgName,
            _logoURI,
            _orgDescription,
            me,
            _addresses,
            _caps,
            _freqs,
            _startsF,
            address(token)
        );
        cheats.prank((address(deployer)));
        token.transfer(address(me), 1000 ether);
        cheats.prank((address(me)));
        token.approve(address(stream), 1000 ether);
    }

    function testManagerFunctions(uint256 amount) public {
        // Address "me" was included in constructer as "owner", so it can assign roles
        cheats.prank((address(me)));
        // Gives self manager role
        stream.addManager(me);

        // Call addStream() with recently granted manager role
        cheats.prank((address(me)));
        stream.addStream(
            address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01),
            0.5 ether,
            1296000,
            true
        );

        stream.streamDeposit(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01), "any reason 1", 0.5 ether);

        // Withdraw from newly created stream as it has "true" for startsFull
        cheats.prank(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01));
        stream.streamWithdraw(0.5 ether, "reason");
        assertEq(
            stream.streamBalance(0xb010ca9Be09C382A9f31b79493bb232bCC319f01),
            0
        );

        cheats.prank((address(me)));

        // We limit increases to under "1 ether" in contract to avoid int overflow in streamBalance
        cheats.assume(amount < 0.5 ether && amount > 0);
        stream.increaseCap(amount, 0xb010ca9Be09C382A9f31b79493bb232bCC319f01);

        // Warp two-weeks later, stream is full again.
        cheats.warp(1642366800);

        // Balance is updating correctly over time
        assertEq(
            stream.streamBalance(0xb010ca9Be09C382A9f31b79493bb232bCC319f01),
            0.5 ether + amount
        );

        cheats.prank(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01));
        stream.streamDeposit(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01), "any reason 2", 0.5 ether + amount);


        // Withdraw new balance accumulated after stream cap update
        stream.streamWithdraw(0.5 ether + amount, "reason");
    }

    function testStreamWithdraw(uint256 amount) public {
        // Acting as permitted stream user address 0xa8B3...11e7
        hevm.prank(address(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7));
        stream.streamDeposit(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01), "any reason wd", 0.5 ether);

        // Fuzz test all viable amounts, > would fail here..
        cheats.assume(amount < 0.5 ether);

        // Calls from 0xa8B3...11e7
        stream.streamWithdraw(amount, "reason");

        // Ensure contract balance is proper after withdraw from stream
        assertEq(token.balanceOf(address(stream)), initAmount - amount);

        /* try withdrawing again almost 2 weeks into the future, when stream should be full */
        hevm.prank(address(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7));
        cheats.warp(1642366800);
        stream.streamDeposit(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01), "any reason wd", 0.5 ether);
        stream.streamWithdraw(0.5 ether, "reason");
    }

    function testFailWithdrawFromDisabled() public {
        // Warp to where stream should be full but disable it next
        cheats.warp(1643662800);

        // Disable it here
        cheats.prank((address(me)));
        stream.disableStream(0xb010ca9Be09C382A9f31b79493bb232bCC319f01);

        // User tries withdrawing from disabled stream
        cheats.prank(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01));
        // Fails
        stream.streamWithdraw(0.5 ether, "reason");
    }

    function testReactivateStream() public {
        /* cheats.prank(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01));
        stream.streamWithdraw(0.5 ether, "reason"); */

        // Lines above would fail currently, so let's re-activate the stream..

        // Not exactly sure why we need to re-init manager role, but here we are..
        cheats.prank((address(me)));
        // Gives self manager role
        stream.addManager(me);

        cheats.prank((address(me)));
        stream.enableStream(
            address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01),
            0.5 ether,
            1296000,
            true
        );

        cheats.prank(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01));
        stream.streamDeposit(address(0xb010ca9Be09C382A9f31b79493bb232bCC319f01), "a reason", 0.5 ether);
        stream.streamWithdraw(0.5 ether, "reason");
        // Make sure balance is updating properly
        assertEq(
            stream.streamBalance(0xb010ca9Be09C382A9f31b79493bb232bCC319f01),
            0
        );
    }

    function testFailWithdrawTooMuchTooSoon() public {
        hevm.prank(address(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7));

        stream.streamWithdraw(0.5 ether, "reason");

        // just testing logging through ds-test
        /* emit log_address(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7); */

        // try withdrawing again *almost* 2 weeks into the future (fails)
        hevm.prank(address(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7));
        cheats.warp(1642366799);
        stream.streamWithdraw(0.5 ether, "reason");
    }

    function testFailWithdrawTooMuch(uint256 amount) public {
        hevm.prank(address(0xa8B3478A436e8B909B5E9636090F2B15f9B311e7));
        cheats.assume(amount > 0.5 ether);
        stream.streamWithdraw(amount, "reason");

        /* // try withdrawing again
        stream.streamWithdraw(0.5 ether, "reason"); */
    }

    // Will pass as 0x is not beneficiary
    function testFailStreamWithdraw2() public {
        hevm.prank(address(0));
        stream.streamWithdraw(0.5 ether, "reason");
    }
}