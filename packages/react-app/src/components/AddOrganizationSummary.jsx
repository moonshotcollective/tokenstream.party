import { Descriptions, Avatar, Space } from 'antd';
import Address from './Address';

export default function AddOrganizationSummary({organizationDetails, ...props}) {

    return (
        <>
            <Space direction="vertical">
                <Descriptions title="Review Details" layout="vertical" bordered>
                    <Descriptions.Item label="Organization">
                        <Avatar src={organizationDetails.orgLogoURI} crossOrigin='anonymous' />
                        {organizationDetails.orgName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">{organizationDetails.orgDescription}</Descriptions.Item>
                    <Descriptions.Item label="Owner"><Address value={organizationDetails.ownerAddress} fontSize="1em" /></Descriptions.Item>
                </Descriptions>

                <p>
                    Once you've reviewed the details described above,
                    click on "Launch!" to create your token stream!
                </p>
            </Space>
        </>
    );
}