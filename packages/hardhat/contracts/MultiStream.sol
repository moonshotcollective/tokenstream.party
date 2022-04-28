//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NotYourStream();
error NotEnoughBalance();
error SendMore();
error IncreaseByMore();
error IncreasedByTooMuch();
error CantWithdrawToBurnAddress();
error StreamDisabled();

/// @title Multi Stream Contract
/// @author ghostffcode, jaxcoder, nowonder, supriyaamisshra
/// @notice the meat and potatoes of the stream
contract MultiStream is Ownable, AccessControl, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    event Withdraw(address indexed to, uint256 amount, string reason);
    event Deposit(address indexed from, uint256 amount);

    /// @dev Describe a stream 
    struct Stream {
        /// @dev stream cap
        uint256 cap;
        /// @dev stream frequency
        uint256 frequency;
        /// @dev last withdraw
        uint256 last;
    }

    mapping(address => Stream) streams;
    mapping(address => bool) disabled;

    string orgName;

    /// @dev track total payouts for UI
    uint256 public total_paid;

    /// @dev So we can return user params for UI
    address[] public users;

    IERC20 public dToken;

    constructor(
        string memory _orgName,
        address _owner,
        address[] memory _addresses,
        uint256[] memory _caps,
        uint256[] memory _frequency,
        bool[] memory _startsFull,
        address _tokenAddress
    ) {
        /* 
        @ note Init Org Details
        */
        orgName = _orgName;

        /* 
        @ note Init Roles
        */
        transferOwnership(_owner);
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);

        /* 
        @ note Init Streams
        */
        for (uint256 i = 0; i < _addresses.length; ++i) {
            users.push(_addresses[i]);
            uint256 last;
            if (_startsFull[i] == true) {
                last = block.timestamp - _frequency[i];
            } else {
                last = block.timestamp;
            }
            Stream memory stream = Stream(_caps[i], _frequency[i], last);
            streams[_addresses[i]] = stream;
        }
        dToken = IERC20(_tokenAddress);
    }

    function addManager(address _manager) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
    }

    function removeManager(address _manager)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(MANAGER_ROLE, _manager);
    }

    /// @dev add a stream for user
    function addStream(
        address _beneficiary,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull
    ) public onlyRole(MANAGER_ROLE) {

        users.push(_beneficiary);
        uint256 last;
        if (_startsFull == true) {
            last = block.timestamp - _frequency;
        } else {
            last = block.timestamp;
        }
        Stream memory stream = Stream(_cap, _frequency, last);
        streams[_beneficiary] = stream;
    }

    /// @dev Transfers remaining balance and disables stream
    function disableStream(address _beneficiary) public onlyRole(MANAGER_ROLE) {
        uint256 totalAmount = streamBalance(_beneficiary);

        uint256 cappedLast = block.timestamp - streams[_beneficiary].frequency;
        if (streams[_beneficiary].last < cappedLast) {
            streams[_beneficiary].last = cappedLast;
        }
        streams[_beneficiary].last =
            streams[_beneficiary].last +
            (((block.timestamp - streams[_beneficiary].last) * totalAmount) /
                totalAmount);

        require(dToken.transfer(_beneficiary, totalAmount), "Transfer failed");

        disabled[_beneficiary] = true;
        streams[_beneficiary].cap = 0;
    }

    /// @dev Reactivates a stream for user
    function enableStream(
        address _beneficiary,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull
    ) public onlyRole(MANAGER_ROLE) {

        streams[_beneficiary].cap = _cap;
        streams[_beneficiary].frequency = _frequency;

        if (_startsFull == true) {
            streams[_beneficiary].last = block.timestamp - _frequency;
        } else {
            streams[_beneficiary].last = block.timestamp;
        }

        disabled[_beneficiary] = false;
    }

    /// @dev Get the balance of a stream by address
    /// @return balance of the stream by address
    function streamBalance(address _beneficiary) public view returns (uint256) {

        if (block.timestamp - streams[_beneficiary].last > streams[_beneficiary].frequency) {
            return streams[_beneficiary].cap;
        }
        return
            (streams[_beneficiary].cap * (block.timestamp - streams[_beneficiary].last)) /
            streams[_beneficiary].frequency;
    }

    /// @dev Withdraw from a stream
    /// @param amount amount of withdraw
    function streamWithdraw(uint256 amount, string memory reason)
        external
        nonReentrant
    {
        if (msg.sender == address(0)) revert CantWithdrawToBurnAddress();
        if (disabled[msg.sender] == true) revert StreamDisabled();

        uint256 totalAmountCanWithdraw = streamBalance(msg.sender);
        if (totalAmountCanWithdraw < amount) revert NotEnoughBalance();

        uint256 cappedLast = block.timestamp - streams[msg.sender].frequency;
        if (streams[msg.sender].last < cappedLast) {
            streams[msg.sender].last = cappedLast;
        }
        streams[msg.sender].last =
            streams[msg.sender].last +
            (((block.timestamp - streams[msg.sender].last) * amount) /
                totalAmountCanWithdraw);
        emit Withdraw(msg.sender, amount, reason);
        require(dToken.transfer(msg.sender, amount), "Transfer failed");

        total_paid += amount;
    }

    /// @dev Increase the cap of the stream
    /// @param _increase how much to increase the cap
    function increaseCap(uint256 _increase, address beneficiary)
        public
        onlyRole(MANAGER_ROLE)
    {
        if (_increase == 0) revert IncreaseByMore();

        if ((streams[beneficiary].cap + _increase) >= 1 ether)
            revert IncreasedByTooMuch();
        streams[beneficiary].cap = streams[beneficiary].cap + _increase;
    }

    /// @dev Update the frequency of a stream
    /// @param _frequency the new frequency
    function updateFrequency(uint256 _frequency, address beneficiary)
        public
        onlyRole(MANAGER_ROLE)
    {
        require(_frequency > 0, "Must be greater than 0");
        if (_frequency == 0) revert IncreaseByMore();
        streams[beneficiary].frequency = _frequency;
    }
}
