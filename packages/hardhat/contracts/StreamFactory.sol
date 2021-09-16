pragma solidity >=0.8.0;

//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SimpleStream.sol";

contract StreamFactory {
    mapping(address => address) public userStreams;

    event streamAdded(address creator, address user, address stream);

    function createStreamFor(
        address payable _toAddress,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull,
        IERC20 _gtc
    ) public returns (address streamAddress) {
        // deploy a new stream contract
        SimpleStream newStream = new SimpleStream(
            _toAddress,
            _cap,
            _frequency,
            _startsFull,
            _gtc
        );

        streamAddress = address(newStream);

        // map user to new stream
        userStreams[_toAddress] = streamAddress;

        emit streamAdded(msg.sender, _toAddress, streamAddress);
    }

    function addStreamForUser(SimpleStream stream) public {
        address payable _toAddress = stream.toAddress();
        address streamAddress = address(stream);

        userStreams[_toAddress] = streamAddress;

        emit streamAdded(msg.sender, _toAddress, streamAddress);
    }

    function getStreamForUser(address user) public view returns (address) {
        return userStreams[user];
    }
}
