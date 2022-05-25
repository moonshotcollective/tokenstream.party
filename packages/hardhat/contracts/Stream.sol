//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NotYourStream();
error NotEnoughBalance();
error NotEnoughPledged();
error SendMore();
error IncreaseByMore();
error IncreasedByTooMuch();
error CantWithdrawToBurnAddress();
error CantDepositFromBurnAddress();
error StreamDisabled();
error StreamDoesNotExist();
error TransferFailed();
error DepositAmountTooSmall();
error DepositFailed();
error InvalidFrequency();
error InsufficientPrivileges();
error StreamAlreadyExists();

/// @title Organization Streams Contract
/// @author ghostffcode, jaxcoder, nowonder, qedk, supriyaamisshra
/// @notice the meat and potatoes of the stream
contract MultiStream is Ownable, AccessControl, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /// @dev Describe a stream 
    struct Stream {
        /// @dev stream owner
        address owner;
        /// @dev stream cap
        uint256 cap;
        /// @dev stream frequency
        uint256 frequency;
        /// @dev last withdraw
        uint256 last;
        /// @dev tokens pledged to this stream
        uint256 pledged;
        /// @dev stream name 
        string name;
        /// @dev stream enablement status
        bool disabled;
    }

    /// @dev Describe a stream for view purposes
    struct StreamView {
        /// @dev stream owner
        address owner;
        /// @dev stream cap
        uint256 cap;
        /// @dev stream frequency
        uint256 frequency;
        /// @dev last withdraw
        uint256 last;
        /// @dev stream balance
        uint256 balance;
        /// @dev pledged/eligible balance
        uint256 pledged;
        ///@dev stream name 
        string name;
        /// @dev whether the stream is disabled
        bool disabled;
    }

    /// @dev organization info
    struct OrgInfo {
        /// @dev org name
        string name;
        /// @dev logo URI
        string logoURI;
        /// @dev description
        string description;
        /// @dev track total stream count
        uint256 totalStreams;
        /// @dev track total payouts for UI
        uint256 totalPaid;
        /// @dev token
        IERC20 dToken;
    }

    OrgInfo public orgInfo;
    Stream[] streams;
    mapping(bytes32 => uint256) streamIndex;
    mapping(address => string[]) userStreams;
    mapping(bytes32 => bool) streamExistenceMap;

    event Withdraw(address indexed to, uint256 amount, string reason);
    event Deposit(address indexed stream, address indexed from, uint256 amount, string reason);
    /// @dev StreamAdded event to track the streams after creation
    event StreamAdded(address creator, address user, string name);

    modifier hasCorrectRole() {
        if (!hasRole(MANAGER_ROLE, _msgSender())) {
            if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
                revert InsufficientPrivileges();
            }
        }
        _;
    }

    constructor(
        string memory _orgName,
        string memory _orgLogoURI,
        string memory _orgDescription,
        address _owner,
        address[] memory _addresses,
        uint256[] memory _caps,
        uint256[] memory _frequency,
        bool[] memory _startsFull,
        string[] memory _name,
        address _tokenAddress
    ) {
        /* 
        @ note Init Org Details
        */
        orgInfo = OrgInfo(
            _orgName,
            _orgLogoURI,
            _orgDescription,
            _addresses.length,
            0,
            IERC20(_tokenAddress)
        );

        /* 
        @ note Init Streams
        */
        for (uint256 i = 0; i < _addresses.length; ++i) {
            uint256 last;
            if (_startsFull[i] == true) {
                last = block.timestamp - _frequency[i];
            } else {
                last = block.timestamp;
            }
            bytes32 nameHash = keccak256(abi.encodePacked(_name[i]));
            Stream memory stream = Stream(_addresses[i], _caps[i], _frequency[i], last, 0, _name[i], false);
            streams.push(stream);
            streamIndex[nameHash] = streams.length - 1;
            userStreams[_addresses[i]].push(_name[i]);
            streamExistenceMap[nameHash] = true;
            emit StreamAdded(_msgSender(), _addresses[i], _name[i]);
        }

        /* 
        @ note Init Roles
        */
        transferOwnership(_owner);
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    function addManager(address _manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
    }

    function removeManager(address _manager)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(MANAGER_ROLE, _manager);
    }

    /// @dev add a stream for user
    function addStream(
        address _beneficiary,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull,
        string calldata _name
    ) external hasCorrectRole {
        bytes32 nameHash = keccak256(abi.encodePacked(_name));
        if (streamExistenceMap[nameHash] == true) {
            revert StreamAlreadyExists();
        }
        uint256 last;
        if (_startsFull == true) {
            last = block.timestamp - _frequency;
        } else {
            last = block.timestamp;
        }

        Stream memory stream = Stream(_beneficiary, _cap, _frequency, last, 0, _name, false);
        streams.push(stream);
        streamIndex[nameHash] = streams.length - 1;
        userStreams[_beneficiary].push(_name);
        streamExistenceMap[nameHash] = true;
        orgInfo.totalStreams += 1;
        emit StreamAdded(_msgSender(), _beneficiary, _name);
    }

    /// @dev Transfers remaining balance and disables stream
    function disableStream(bytes32 _name, address _beneficiary) external hasCorrectRole {
        uint256 totalAmount = streamBalance(_name);

        uint256 cappedLast = block.timestamp - streams[streamIndex[_name]].frequency;
        if (streams[streamIndex[_name]].last < cappedLast) {
            streams[streamIndex[_name]].last = cappedLast;
        }
        streams[streamIndex[_name]].last =
            streams[streamIndex[_name]].last +
            (((block.timestamp - streams[streamIndex[_name]].last) * totalAmount) /
                totalAmount);

        if (!orgInfo.dToken.transfer(_beneficiary, totalAmount)) revert TransferFailed();

        streams[streamIndex[_name]].disabled = true;
        streams[streamIndex[_name]].cap = 0;
        orgInfo.totalStreams -= 1;
    }

    /// @dev Transfers remaining balance and deletes stream
    function deleteStream(bytes32 _name) external hasCorrectRole {
        uint256 totalAmount = streamBalance(_name);

        if(!orgInfo.dToken.transfer(msg.sender, totalAmount)) revert TransferFailed();

        orgInfo.totalStreams -= 1;
        // Trigger gas refunds
        uint256 userStreamLength = userStreams[streams[streamIndex[_name]].owner].length;
        for (uint256 i = userStreamLength - 1; i >= 0; --i) {
            if (keccak256(abi.encodePacked(_name)) == keccak256(abi.encodePacked(userStreams[streams[streamIndex[_name]].owner][i]))) {
                userStreams[streams[streamIndex[_name]].owner][i] = userStreams[streams[streamIndex[_name]].owner][userStreamLength - 1];
                userStreams[streams[streamIndex[_name]].owner].pop();
                break;
            }
        }

        streams[streamIndex[_name]] = streams[streams.length - 1];
        streamIndex[keccak256(abi.encodePacked(streams[streamIndex[_name]].name))] = streamIndex[_name];
        streams.pop();
        delete streamExistenceMap[_name];
        delete streamIndex[_name];
    }

    /// @dev Reactivates a stream for user
    function enableStream(
        bytes32 _name,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull
    ) external hasCorrectRole {

        streams[streamIndex[_name]].cap = _cap;
        streams[streamIndex[_name]].frequency = _frequency;

        if (_startsFull == true) {
            streams[streamIndex[_name]].last = block.timestamp - _frequency;
        } else {
            streams[streamIndex[_name]].last = block.timestamp;
        }

        streams[streamIndex[_name]].disabled = false;
        orgInfo.totalStreams += 1;
    }

    /// @dev Get the balance of a stream by its name
    /// @return balance of the stream
    function streamBalance(bytes32 _name) public view returns (uint256) {

        if (block.timestamp - streams[streamIndex[_name]].last > streams[streamIndex[_name]].frequency) {
            return streams[streamIndex[_name]].cap;
        }
        return
            (streams[streamIndex[_name]].cap * (block.timestamp - streams[streamIndex[_name]].last)) /
            streams[streamIndex[_name]].frequency;
    }

    /// @dev Withdraw from a stream
    /// @param _name stream name sha3 hash
    /// @param payoutAddress account to withdraw into
    /// @param amount amount of withdraw
    /// @param reason a reason
    function streamWithdraw(bytes32 _name, address payoutAddress, uint256 amount, string calldata reason)
        external
    {
        if (payoutAddress == address(0)) revert CantWithdrawToBurnAddress();
        if (streamExistenceMap[_name] == false) revert StreamDoesNotExist();
        if (streams[streamIndex[_name]].disabled == true) revert StreamDisabled();

        uint256 totalAmountCanWithdraw = streamBalance(_name);
        if (totalAmountCanWithdraw < amount) revert NotEnoughBalance();
        if (amount > streams[streamIndex[_name]].pledged) revert NotEnoughPledged();

        uint256 cappedLast = block.timestamp - streams[streamIndex[_name]].frequency;
        if (streams[streamIndex[_name]].last < cappedLast) {
            streams[streamIndex[_name]].last = cappedLast;
        }
        streams[streamIndex[_name]].last =
            streams[streamIndex[_name]].last +
            (((block.timestamp - streams[streamIndex[_name]].last) * amount) /
                totalAmountCanWithdraw);

        if (!orgInfo.dToken.transfer(payoutAddress, amount)) revert TransferFailed();

        orgInfo.totalPaid += amount;
        streams[streamIndex[_name]].pledged -= amount;
        emit Withdraw(payoutAddress, amount, reason);
    }

    /// @notice Deposits tokens into a specified stream
    /// @dev Deposit into stream
    /// @param _stream a user stream name sha3 hash
    /// @param reason reason for deposit
    /// @param  value the amount of the deposit
    function streamDeposit(bytes32 _stream, string calldata reason, uint256 value)
        external
        nonReentrant
    {
        if (_msgSender() == address(0)) revert CantDepositFromBurnAddress();
        if (streamExistenceMap[_stream] == false) revert StreamDoesNotExist();
        if (streams[streamIndex[_stream]].disabled == true) revert StreamDisabled();
        if (value < (streams[streamIndex[_stream]].cap / 10)) revert DepositAmountTooSmall();
        if (!orgInfo.dToken.transferFrom(_msgSender(), address(this), value)) revert DepositFailed();
        streams[streamIndex[_stream]].pledged += value;
        emit Deposit(streams[streamIndex[_stream]].owner, _msgSender(), value, reason);
    }

    /// @dev Increase the cap of the stream
    /// @param _increase how much to increase the cap
    /// @param _name stream name sha3 hash
    function increaseCap(uint256 _increase, bytes32 _name)
        external
        hasCorrectRole
    {
        if (_increase == 0) revert IncreaseByMore();
        if (streamExistenceMap[_name] == false) revert StreamDoesNotExist();

        if ((streams[streamIndex[_name]].cap + _increase) >= 1 ether)
            revert IncreasedByTooMuch();
        streams[streamIndex[_name]].cap = streams[streamIndex[_name]].cap + _increase;
    }

    /// @dev Update the frequency of a stream
    /// @param _frequency the new frequency
    /// @param _name stream name sha3 hash
    function updateFrequency(uint256 _frequency, bytes32 _name)
        external
        hasCorrectRole
    {
        if(_frequency < 0) revert InvalidFrequency();
        if (_frequency == 0) revert IncreaseByMore();
        if (streamExistenceMap[_name] == false) revert StreamDoesNotExist();
        streams[streamIndex[_name]].frequency = _frequency;
    }

    /// @dev checks whether org has an active stream for user
    /// @param _userAddress a users address
    function hasStream(address _userAddress)
        public
        view
        returns (bool)
    {
        return userStreams[_userAddress].length > 0;
    }

    /// @dev gets stream details
    /// @param _name stream name sha3 hash
    function getStreamView(bytes32 _name)
        public
        view
        returns (StreamView memory)
    {
        return StreamView(streams[streamIndex[_name]].owner, streams[streamIndex[_name]].cap,
                    streams[streamIndex[_name]].frequency, streams[streamIndex[_name]].last,
                    streamBalance(_name), streams[streamIndex[_name]].pledged, streams[streamIndex[_name]].name, streams[streamIndex[_name]].disabled);
    }

    /// @dev gets a page of streams
    /// @param _page a page number
    /// @param _resultsPerPage number of results per page
    function getStreams(
        uint256 _page,
        uint256 _resultsPerPage
    )
        public
        view
        returns (StreamView[] memory)
    {
        uint256 _streamsIndex = _resultsPerPage * _page - _resultsPerPage;

        if (
            streams.length == 0 ||
            _streamsIndex > streams.length - 1
        ) {
            return new StreamView[](0);
        }

        StreamView[] memory _streams = new StreamView[](_resultsPerPage);
        uint256 _returnCounter = 0;
        uint256 _skipped = 0;
        
        for (
            _streamsIndex;
            _streamsIndex < ((_resultsPerPage * _page) + _skipped);
            _streamsIndex++
        ) {
            if (_streamsIndex <= streams.length - 1) {
                if (streams[_streamsIndex].disabled == true) {
                    _skipped++;
                    continue;
                }
                _streams[_returnCounter] = StreamView(streams[_streamsIndex].owner, streams[_streamsIndex].cap,
                    streams[_streamsIndex].frequency, streams[_streamsIndex].last,
                    streamBalance(keccak256(abi.encodePacked(streams[_streamsIndex].name))), streams[_streamsIndex].pledged, streams[_streamsIndex].name,
                    streams[_streamsIndex].disabled);
            } else {
                _streams[_returnCounter] = StreamView(address(0), 0,0,0,0,0, "", false);
            }
            _returnCounter++;
        }
        return _streams;
    }
}
