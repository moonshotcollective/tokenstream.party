//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./StreamFactory.sol";
import "./SimpleStream.sol";

contract OrgFactoryDeployer {

    /// @dev emitted when a new org is created.
    event OrganizationsDeployed(

        address indexed organization,
        address indexed organizationOwner,
        string organizationName,
        string organizationDescription,
        string organizationLogoURI
    );

    address[] public organizations;

    /// @dev deploys a stream factory contract for a specified organization.
    function deployOrganization(
        string memory _orgName,
        string memory _logoURI,
        string memory _orgDescription,
        address owner,
        address[] calldata admins

    ) public {
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
            msg.sender,
            string(_orgName),
            string(_orgDescription),
            string(_logoURI)
        );

    }

}