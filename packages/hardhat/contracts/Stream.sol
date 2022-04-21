//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "./../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import "./../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

error NotYourStream();
error NotEnoughBalance();
error SendMore();
error IncreaseByMore();
error IncreasedByTooMuch();
error CantWithdrawToBurnAddress();
error StreamDisabled();

/// @title Simple Stream Contract
/// @author ghostffcode, jaxcoder, nowonder
/// @notice the meat and potatoes of the stream
contract MultiStream is Ownable, AccessControl, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    event Withdraw(address indexed to, uint256 amount, string reason);
    event Deposit(address indexed from, uint256 amount);

    mapping(address => uint256) caps;
    mapping(address => uint256) frequencies;
    mapping(address => uint256) last;
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
            caps[_addresses[i]] = _caps[i];
            frequencies[_addresses[i]] = _frequency[i];
            users.push(_addresses[i]);

            if (_startsFull[i] == true) {
                last[_addresses[i]] = block.timestamp - _frequency[i];
            } else {
                last[_addresses[i]] = block.timestamp;
            }
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
        caps[_beneficiary] = _cap;
        frequencies[_beneficiary] = _frequency;
        users.push(_beneficiary);

        if (_startsFull == true) {
            last[_beneficiary] = block.timestamp - _frequency;
        } else {
            last[_beneficiary] = block.timestamp;
        }
    }

    /// @dev Transfers remaining balance and disables stream
    function disableStream(address _beneficiary) public onlyRole(MANAGER_ROLE) {
        uint256 totalAmount = streamBalance(_beneficiary);

        uint256 cappedLast = block.timestamp - frequencies[_beneficiary];
        if (last[_beneficiary] < cappedLast) {
            last[_beneficiary] = cappedLast;
        }
        last[_beneficiary] =
            last[_beneficiary] +
            (((block.timestamp - last[_beneficiary]) * totalAmount) /
                totalAmount);

        require(dToken.transfer(_beneficiary, totalAmount), "Transfer failed");

        disabled[_beneficiary] == true;
        caps[_beneficiary] == 0;
    }

    /// @dev Reactivates a stream for user
    function enableStream(
        address _beneficiary,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull
    ) public onlyRole(MANAGER_ROLE) {
        caps[_beneficiary] = _cap;
        frequencies[_beneficiary] = _frequency;

        if (_startsFull == true) {
            last[_beneficiary] = block.timestamp - _frequency;
        } else {
            last[_beneficiary] = block.timestamp;
        }

        disabled[_beneficiary] == false;
    }

    /// @dev Get the balance of a stream by address
    /// @return balance of the stream by address
    function streamBalance(address _beneficiary) public view returns (uint256) {
        if (block.timestamp - last[_beneficiary] > frequencies[_beneficiary]) {
            return caps[_beneficiary];
        }
        return
            (caps[_beneficiary] * (block.timestamp - last[_beneficiary])) /
            frequencies[_beneficiary];
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

        uint256 cappedLast = block.timestamp - frequencies[msg.sender];
        if (last[msg.sender] < cappedLast) {
            last[msg.sender] = cappedLast;
        }
        last[msg.sender] =
            last[msg.sender] +
            (((block.timestamp - last[msg.sender]) * amount) /
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
        if ((caps[beneficiary] + _increase) >= 1 ether)
            revert IncreasedByTooMuch();
        caps[beneficiary] = caps[beneficiary] + _increase;
    }

    /// @dev Update the frequency of a stream
    /// @param _frequency the new frequency
    function updateFrequency(uint256 _frequency, address beneficiary)
        public
        onlyRole(MANAGER_ROLE)
    {
        require(_frequency > 0, "Must be greater than 0");
        if (_frequency == 0) revert IncreaseByMore();
        frequencies[beneficiary] = _frequency;
    }
}