//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "./../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./stream.sol";

contract StreamDeployer is Ownable {

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
        string calldata _orgName,
        address _owner,
        address[] calldata _addresses,
        uint256[] calldata _caps,
        uint256[] calldata _frequency,
        bool[] calldata _startsFull,
        address _tokenAddress
    ) public {
        MultiStream deployedOrganization = new MultiStream(
            _orgName,
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