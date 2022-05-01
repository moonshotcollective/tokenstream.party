//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./OrganizationStreams.sol";

/// @title Organization Streams Deployer
/// @author ghostffcode, jaxcoder, nowonder, supriyaamisshra
contract OrganizationStreamsDeployer is Ownable {

    /// @dev emitted when a new org is created.
    event OrganizationsDeployed(
        address indexed orgAddress,
        address _tokenAddress
    );

    address[] public organizations;

    constructor (address _owner) {
        transferOwnership(_owner);
    }

    /// @dev deploys a stream factory contract for a specified organization.
    function deployOrganization(
        string memory _orgName,
        string memory _orgLogoURI,
        string memory _orgDescription,
        address _owner,
        address[] memory _addresses,
        uint256[] memory _caps,
        uint256[] memory _frequency,
        bool[] memory _startsFull,
        address _tokenAddress
    ) public {
        OrganizationStreams deployedOrganization = new OrganizationStreams(
            _orgName,
            _orgLogoURI,
            _orgDescription,
            _owner,
            _addresses,
            _caps,
            _frequency,
            _startsFull,
            _tokenAddress
        );
        
          organizations.push(address(deployedOrganization));

         emit OrganizationsDeployed(
            address(deployedOrganization),
            _tokenAddress
        );

    }

    /// @dev gets a page of organizations
    function getOrganizations(
        uint256 _page,
        uint256 _resultsPerPage
    )
        external
        view
        returns (address[] memory)
    {
        uint256 _orgIndex = _resultsPerPage * _page - _resultsPerPage;

        if (
            organizations.length == 0 ||
            _orgIndex > organizations.length - 1
        ) {
            return new address[](0);
        }

        address[] memory _orgs = new address[](_resultsPerPage);
        uint256 _returnCounter = 0;
        
        for (
            _orgIndex;
            _orgIndex < _resultsPerPage * _page;
            _orgIndex++
        ) {
            if (_orgIndex <= organizations.length - 1) {
                _orgs[_returnCounter] = organizations[_orgIndex];
            } else {
                _orgs[_returnCounter] = address(0);
            }
            _returnCounter++;
        }
        return _orgs;
    }

}