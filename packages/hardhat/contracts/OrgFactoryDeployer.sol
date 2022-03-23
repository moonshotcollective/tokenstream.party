//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StreamFactory.sol";
import "./SimpleStream.sol";

contract OrgFactoryDeployer is Ownable, AccessControl {

    /// @dev emitted when a new org is created.
    event OrganizationsDeployed(

        address indexed tokenAddress,
        address indexed ownerAddress,
        string organizationName
    );

    address[] public organizations;

    /// roles
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    constructor (address _owner) public {
        transferOwnership(_owner);
    }

    function addOperator(address _newOperator) public onlyOwner {
        grantRole(OPERATOR_ROLE, _newOperator);
    }

    function removeOperator(address _operator) public onlyOwner {
        revokeRole(OPERATOR_ROLE, _operator);
    }

    /// @dev deploys a stream factory contract for a specified organization.
    function deployOrganization(
        string memory _orgName,
        string memory _logoURI,
        string memory _orgDescription,
        address owner,
        address[] calldata admins
    ) public {
        require(hasRole(OPERATOR_ROLE, _msgSender()), "must be operator role");
        StreamFactory deployedOrganization = new StreamFactory(
            _orgName,
            _logoURI,
            _orgDescription,
            owner,
            admins
        );
        
        organizations.push(address(deployedOrganization));

        emit OrganizationsDeployed(
            address(deployedOrganization),
            _msgSender(),
            string(_orgName)
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