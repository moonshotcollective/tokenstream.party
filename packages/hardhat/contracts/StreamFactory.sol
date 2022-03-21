//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SimpleStream.sol";

/// @title Stream Factory Contract
/// @author ghostffcode, jaxcoder
/// @notice Creates instances of SimpleStream for users
contract StreamFactory is AccessControl, Ownable {
    /// @dev user address to stream address mapping
    mapping(address => address) public userStreams;

    /// @dev keep track if user has a stream or not
    mapping(address => User) public users;

    mapping(address => OrgInfo) public orgs;

    struct User {
        bool hasStream;
    }

    struct OrgInfo {
        /// @dev name of organization
        string orgName;
        /// @dev discription of the organization
        string orgDescription;
        /// @dev github URI of organization
        string orgGithubURI;
        /// @dev twitter URI of the organization
        string orgTwitterURI;
        /// @dev the website URI of organization
        string orgWebURI;
        /// @dev discord URI organization
        string orgDiscordURI;
        /// @dev URI to the logo of organization
        string logoURI;
        /// @dev total streams in organization
        uint256 streamsCount;
        /// @dev total amount paid out by organization
        uint256 totalPaidOut;
    }

    OrgInfo public orgInfo;

    /// @dev StreamAdded event to track the streams after creation
    event StreamAdded(address creator, address user, address stream);

    bytes32 public constant OPERATOR = keccak256("OPERATOR");

    /// @dev modifier for the factory manager role
    modifier isPermittedFactoryManager() {
        require(
            hasRole(OPERATOR, msg.sender),
            "Not an approved factory manager"
        );
        _;
    }

    constructor(
        string memory _orgName,
        string memory _logoURI,
        string memory _orgDescription,
        address owner,
        address[] memory admins
    ) {
        for (uint256 i = 0; i < admins.length; i++) {
            _setupRole(DEFAULT_ADMIN_ROLE, admins[i]);
            _setupRole(OPERATOR, admins[i]);
        }
        orgInfo = OrgInfo(
            _orgName,
            _orgDescription,
            '', // github URI
            '', // twitter URI
            '', // website URI
            '', // discord URI
            _logoURI,
            0, // streams count
            0  // total paid out
        );
        // map the org the the owner so we can update later
        orgs[owner] = orgInfo;

        transferOwnership(owner);
    }

    /// @dev update organization profile info
    function updateOrgProfile(string[] memory props) public onlyOwner {
        OrgInfo storage org = orgs[msg.sender];
        org.orgName = props[0];
        org.orgDescription = props[1];
        org.orgGithubURI = props[2];
        org.orgTwitterURI = props[3];
        org.orgWebURI = props[4];
        org.orgDiscordURI = props[5];
        org.logoURI = props[6];
    }

    /// @notice Creates a new stream
    /// @param _toAddress the address of the payee
    /// @param _cap the stream max balance for the period of time
    /// @param _frequency the frequency of the stream
    /// @param _startsFull does the stream start full?
    /// @param _gtc the GTC token address
    function createStreamFor(
        address payable _toAddress,
        uint256 _cap,
        uint256 _frequency,
        bool _startsFull,
        IERC20 _gtc
    )
        public
        isPermittedFactoryManager
        returns (address streamAddress) 
    {
        User storage user = users[_toAddress];
        require(user.hasStream == false, "User already has a stream!");
        user.hasStream = true;
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

        orgInfo.streamsCount++;
        emit StreamAdded(msg.sender, _toAddress, streamAddress);
    }

    /// @notice Add a existing stream to the factory
    /// @param stream the stream contract address
    function addStreamForUser(SimpleStream stream)
        public
        isPermittedFactoryManager
    {
        User storage user = users[stream.toAddress()];
        require(user.hasStream == false, "User already has a stream!");
        address payable _toAddress = stream.toAddress();
        address streamAddress = address(stream);

        userStreams[_toAddress] = streamAddress;

        emit StreamAdded(msg.sender, _toAddress, streamAddress);
    }

    /// @notice returns a stream for a specified user
    /// @param user the user to get a stream for
    function getStreamForUser(address payable user)
        public
        view
        returns (address streamAddress)
    {
        streamAddress = userStreams[user];
    }

    /// @notice Adds a new Factory Manager
    /// @param _newFactoryManager the address of the person you are adding
    function addFactoryManager(address _newFactoryManager) public onlyOwner {
        grantRole(OPERATOR, _newFactoryManager);
    }

    function updateStreamCap(address user, uint256 newCap)
        public
        isPermittedFactoryManager
    {
        SimpleStream(userStreams[user]).increaseCap(newCap);
    }

    function updateFrequency(address user, uint256 newTime) public {
        SimpleStream(userStreams[user]).updateFrequency(newTime);
    }

    function releaseUserStream(address user) public isPermittedFactoryManager {

        SimpleStream(userStreams[user]).transferOwnership(user);
        orgInfo.streamsCount--;
    }
}
