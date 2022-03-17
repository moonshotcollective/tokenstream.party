import React, { useState } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import {
    Modal,
    Input,
    Button,
    notification,
    Radio,
    InputNumber,
    List,
    Row,
    Col,
    Progress,
    Spin,
    Space,
    Card,
    Avatar,
    Statistic,
    Typography,
    Divider
} from "antd";
import { GithubOutlined, RightOutlined, TwitterOutlined } from "@ant-design/icons";
import { TokenStreamLogo } from "../components/TokenStreamLogo";
import { DiscordIcon } from "../components/DiscordIcon";
import AddOrganizationWizard from "../components/AddOrganizationWizard";

const { Meta } = Card;
const { Text } = Typography;
const { Search } = Input;

export default function OrganizationBrowsePage({ provider, localProvider, readContracts, ...props }) {
    const [showWizard, setShowWizard] = useState(false);
    const [organizations, setOrganizations] = useState([
        {
            address: "0x00000000000000000000",
            name: "GitCoin",
            description: "Build & fund the open web, together!",
            logoURI: "https://cloudflare-ipfs.com/ipfs/QmbAcetpNof7LMCAKCZfzKfKS1UDJwhGZgA8mZR7aW1Xzi",
            orgGithubURI: "",
            orgTwitterURI: "",
            orgWebURI: "",
            orgDiscordURI: "",
            streamsCount: 21,
            totalPaidOut: 10000,
        },

        {
            address: "0x00000000000000000000",
            name: "GitCoin",
            description: "Build & fund the open web, together!",
            logoURI: "https://cloudflare-ipfs.com/ipfs/QmbAcetpNof7LMCAKCZfzKfKS1UDJwhGZgA8mZR7aW1Xzi",
            orgGithubURI: "",
            orgTwitterURI: "",
            orgWebURI: "",
            orgDiscordURI: "",
            streamsCount: 21,
            totalPaidOut: 10000,
        },
        {
            address: "0x00000000000000000000",
            name: "GitCoin",
            description: "Build & fund the open web, together!",
            logoURI: "https://cloudflare-ipfs.com/ipfs/QmbAcetpNof7LMCAKCZfzKfKS1UDJwhGZgA8mZR7aW1Xzi",
            orgGithubURI: "",
            orgTwitterURI: "",
            orgWebURI: "",
            orgDiscordURI: "",
            streamsCount: 21,
            totalPaidOut: 10000,
        },
        {
            address: "0x00000000000000000000",
            name: "GitCoin",
            description: "Build & fund the open web, together!",
            logoURI: "https://cloudflare-ipfs.com/ipfs/QmbAcetpNof7LMCAKCZfzKfKS1UDJwhGZgA8mZR7aW1Xzi",
            orgGithubURI: "",
            orgTwitterURI: "",
            orgWebURI: "",
            orgDiscordURI: "",
            streamsCount: 21,
            totalPaidOut: 10000,
        },
        {
            address: "0x00000000000000000000",
            name: "GitCoin",
            description: "Build & fund the open web, together!",
            logoURI: "https://cloudflare-ipfs.com/ipfs/QmbAcetpNof7LMCAKCZfzKfKS1UDJwhGZgA8mZR7aW1Xzi",
            orgGithubURI: "",
            orgTwitterURI: "",
            orgWebURI: "",
            orgDiscordURI: "",
            streamsCount: 21,
            totalPaidOut: 10000,
        },

    ]);

    return (
        <div style={{ width: "80%", position: 'relative', margin: "auto" }}>
            <AddOrganizationWizard showWizard={showWizard} onCancelHandler={() => setShowWizard(false)} />
            <Search placeholder="Search for your favourite DAOs!" size="large" enterButton style={{marginTop:"1.6em", marginBottom:"1em", width: "60%"}} />
            <Divider orientation="right">
                <Button type="primary" onClick={() => setShowWizard(true)}>Launch DAO Streams</Button>
            </Divider>
            <Row gutter={[8, 32]}>

                {organizations.map(organization =>
                    <Col className="gutter-row" span={8}>
                        <Card style={{ width: 300, marginTop: 16, borderColor: "#6f3ff5" }}
                            headStyle={{paddingTop:0}}
                            actions={[
                                <a href={organization.orgGithubURI}>
                                    <GithubOutlined />
                                </a>,

                                <a href={organization.orgTwitterURI}>
                                    <TwitterOutlined />
                                </a>,

                                <a href={organization.orgDiscordURI}>
                                    <DiscordIcon />
                                </a>,
                                <Link to={`/organizations/${organization.address}`}>
                                    <Button key="view" type="primary">View</Button>
                                </Link>,
                            ]}>
                            <Space direction="vertical" size="small">
                                <Meta
                                    avatar={<Avatar src={organization.logoURI} />}
                                    title={organization.name}
                                    description={organization.description}
                                />

                                <Row gutter={16}>
                                    <Col span={10}>
                                        <Statistic title="#Streams" value={organization.streamsCount} prefix={<TokenStreamLogo width="30" height="30" />} />
                                    </Col>
                                    <Col span={14}>
                                        <Statistic title="Total Paid Out" value={`${organization.totalPaidOut}`} prefix={<RightOutlined />} suffix={<Text style={{ fontSize: '0.4em' }} type="secondary">GTC</Text>} />
                                    </Col>
                                </Row>
                            </Space>
                        </Card>
                    </Col>)
                }
            </Row>
        </div>
    );
}
