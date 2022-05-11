//SPDX-License-Identifier: MIT
// solhint-disable not-rely-on-time
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

error NotYourStream();
error NotEnoughBalance();
error SendMore();
error IncreaseByMore();
error CantWithdrawToBurnAddress();
error StreamDisabled();
error StreamDoesNotExist();
error TransferFailed();

/// @title Simple Stream Contract
/// @author ghostffcode, jaxcoder, nowonder, qedk
/// @notice the meat and potatoes of the stream
contract MultiStream is Ownable, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");

    /// @dev track total payouts for UI
    uint256 public totalPaid;

    /// @dev the deposit token
    IERC20 public dToken;

    string public orgName;

    /// @dev So we can return user params for UI
    address[] public users;

    mapping(address => uint256) public caps;
    mapping(address => uint256) public frequencies;
    mapping(address => uint256) public last;
    mapping(address => bool) public disabled;

    event Withdraw(address indexed to, uint256 indexed amount, string reason);
    event Deposit(address indexed from, uint256 indexed amount);

    constructor(
        string memory _orgName,
        address _owner,
        address[] memory _addresses,
        uint256[] memory _caps,
        uint256[] memory _frequency,
        bool[] memory _startsFull,
        IERC20 _dToken
    ) {
        /* 
        @ note Init Org Details
        */
        orgName = _orgName;

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
        dToken = _dToken;
        /*
        @ note Init Roles
        */
        transferOwnership(_owner);
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    /// @dev adds the manager role for an address
    /// @param _manager the address to be given the role
    function addManager(address _manager)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(MANAGER_ROLE, _manager);
    }

    /// @dev adds the operator role for an address
    /// @param _operator the address to be given the role
    function addOperator(address _operator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(OPERATOR_ROLE, _operator);
    }

    /// @dev revokes role for an address
    /// @param _manager the address to revoke
    function removeManager(address _manager)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(MANAGER_ROLE, _manager);
    }

    /// @dev revokes role for an address
    /// @param _operator the address to revoke
    function removeOperator(address _operator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(OPERATOR_ROLE, _operator);
    }

    /// @dev add a stream for user/project/entity/address
    /// @param _beneficiary the receiver of the tokens
    /// @param _cap the max stream cap
    /// @param _frequency how often the stream should be filled/drip rate
    /// @param _startsFull wether to start the stream fully unlocked
    function addStream(
        address _beneficiary,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull
    )   
        external
        onlyRole(MANAGER_ROLE)
    {
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
    /// @param _beneficiary the stream owner
    function disableStream(address _beneficiary)
        external
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 totalAmount = streamBalance(_beneficiary);

        uint256 cappedLast = block.timestamp - frequencies[_beneficiary];
        if (last[_beneficiary] < cappedLast) {
            last[_beneficiary] = cappedLast;
        }
        last[_beneficiary] =
            last[_beneficiary] +
            (((block.timestamp - last[_beneficiary]) * totalAmount) /
                totalAmount);

        disabled[_beneficiary] = true;
        caps[_beneficiary] = 0;

        if(!dToken.transfer(msg.sender, totalAmount)) revert TransferFailed();
    }

    /// @dev Transfers remaining balance and deletes stream
    /// @param _beneficiary the stream owner
    function deleteStream(address _beneficiary)
        external
        onlyRole(MANAGER_ROLE)
    {
        uint256 totalAmount = streamBalance(_beneficiary);

        // Trigger gas refunds
        delete disabled[_beneficiary];
        delete caps[_beneficiary];
        delete last[_beneficiary];
        delete disabled[_beneficiary];

        for (uint256 i = 0; i < users.length - 1; i++) { // iterate till second last index
            if (users[i] == _beneficiary) {
                users[i] = users[users.length - 1]; // copy last to current
                break;
            }
            // if user at last index, we just delete it
        }
        delete users[users.length - 1]; // delete last index

        if(!dToken.transfer(msg.sender, totalAmount)) revert TransferFailed();
    }

    /// @dev Reactivates a stream for entity/user/project
    /// @param _beneficiary the receiver of the tokens
    /// @param _cap the max stream cap
    /// @param _frequency how often the stream should be filled/drip rate
    /// @param _startsFull wether to start the stream fully unlocked
    function enableStream(
        address _beneficiary,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull
    ) external onlyRole(MANAGER_ROLE) {
        caps[_beneficiary] = _cap;
        frequencies[_beneficiary] = _frequency;

        if (_startsFull == true) {
            last[_beneficiary] = block.timestamp - _frequency;
        } else {
            last[_beneficiary] = block.timestamp;
        }

        disabled[_beneficiary] = false;
    }

    /// @dev Get the balance of a stream by address
    /// @param _beneficiary stream owner address
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
    /// @param reason the reason for the withdraw
    function streamWithdraw(uint256 amount, string calldata reason)
        external
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
        totalPaid += amount;

        if(!dToken.transfer(msg.sender, amount)) revert TransferFailed();

        emit Withdraw(msg.sender, amount, reason);
    }

    /// @dev Update the cap of the stream
    /// @param _newCap new cap of the stream
    /// @param _beneficiary the owner of the stream
    function updateCap(uint256 _newCap, address _beneficiary)
        external
        onlyRole(MANAGER_ROLE)
    {
        caps[_beneficiary] = _newCap;
    }

    /// @dev Increase the cap of the stream
    /// @param _increase how much to increase the cap
    /// @param _beneficiary the owner of the stream
    function increaseCap(uint256 _increase, address _beneficiary)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (_increase == 0) revert IncreaseByMore();
        caps[_beneficiary] += _increase;
    }

    /// @dev Update the frequency of a stream
    /// @param _frequency the new frequency
    /// @param _beneficiary the owner of the stream
    function updateFrequency(uint256 _frequency, address _beneficiary)
        external
        onlyRole(MANAGER_ROLE)
    {
        if (_frequency == 0) revert IncreaseByMore();
        frequencies[_beneficiary] = _frequency;
    }
}
