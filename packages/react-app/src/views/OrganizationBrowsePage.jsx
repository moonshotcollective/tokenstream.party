import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import {
    Input,
    Button,
    Row,
    Col,
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
import { CachedValue } from "../helpers/CachedValue";
import { useDebounce } from "../hooks";
import { StreamFactoryABI } from "../contracts/external_ABI";

const { Meta } = Card;
const { Text } = Typography;
const { Search } = Input;

const ORGS_CACHE_TTL_MILLIS = Number.parseInt(process.env.REACT_APP_ORGS_CACHE_TTL_MILLIS) || 1500000; // 25m ttl by default
// the actual cache
const orgsCache = {};

async function resolveOrgDetails(organizationAddress, provider) {
    const cachedOrg = orgsCache[organizationAddress];
    if (cachedOrg && cachedOrg instanceof CachedValue && !cachedOrg.isStale()) {
        return cachedOrg.value;
    }
    // resolve org details
    try {
        var orgContract = new ethers.Contract(
            organizationAddress,
            StreamFactoryABI,
            provider
        );

        var data = {};
        await orgContract.orgInfo()
            .then(info => {
                data = {
                    name: info[0],
                    description: info[1],
                    githubURI: info[2],
                    twitterURI: info[3],
                    webURI: info[4],
                    discordURI: info[5],
                    logoURI: info[6],
                    streamsCount: info[7],
                    totalPaidOut: info[8]
                };
            });
        orgsCache[organizationAddress] = new CachedValue(data, ORGS_CACHE_TTL_MILLIS);
        return data;
    } catch (error) {
        console.error("Error getting org data", error);
        throw error;
    }
}

export default function OrganizationBrowsePage({ tx, writeContracts, provider, localProvider, readContracts, ...props }) {
    const [showWizard, setShowWizard] = useState(false);
    const [searchName, setSearchName] = useState("");
    const debouncedSearchName = useDebounce(searchName, 1000);
    const [organizations, setOrganizations] = useState(null);

    const onOrgDeployedHandler = async () => {
        setShowWizard(false);
        await fetchEvents();
    }

    const fetchEvents = async () => {
        const contract = readContracts.OrgFactoryDeployer;
        if (contract) {
            const eventFilter = contract.filters.OrganizationsDeployed();
            const events = await contract.queryFilter(eventFilter);
            const orgs = events.map(eventLog => ({ ...eventLog.args, info: {} }));
            for (const org of orgs) {
                org.info = await resolveOrgDetails(org.tokenAddress, provider);
            }
            const selectedOrgs = orgs.filter(
                org => org.organizationName.toLowerCase().includes(debouncedSearchName),
            );
            setOrganizations(selectedOrgs);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [readContracts, debouncedSearchName]);

    return (
        <>
            <div style={{ width: "80%", position: 'relative', margin: "auto" }}>
                <AddOrganizationWizard
                    tx={tx}
                    writeContracts={writeContracts}
                    showWizard={showWizard}
                    onCancelHandler={() => setShowWizard(false)}
                    onDeployHandler={onOrgDeployedHandler}
                />
                <Search placeholder="Search for your favourite DAOs!" size="large"
                    enterButton
                    onChange={e => setSearchName(e.target.value)}
                    value={searchName}
                    style={{ marginTop: "1.6em", marginBottom: "1em", width: "60%" }}
                />
                <Divider orientation="right">
                    <Button type="primary" onClick={() => setShowWizard(true)}>Launch DAO Streams</Button>
                </Divider>
            </div>
            {organizations &&
                <div style={{ width: "80%", position: 'relative', margin: "auto" }}>
                    <Row gutter={[8, 32]}>

                        {organizations.map(organization =>
                            <Col className="gutter-row" span={8}>
                                <Card style={{ width: 300, marginTop: 16, borderColor: "#6f3ff5" }}
                                    headStyle={{ paddingTop: 0 }}
                                    actions={[
                                        <a href={organization.info.githubURI}>
                                            <GithubOutlined />
                                        </a>,

                                        <a href={organization.info.twitterURI}>
                                            <TwitterOutlined />
                                        </a>,

                                        <a href={organization.info.discordURI}>
                                            <DiscordIcon />
                                        </a>,
                                        <Link to={`/organizations/${organization.tokenAddress}`}>
                                            <Button key="view" type="primary">View</Button>
                                        </Link>,
                                    ]}>
                                    <Space direction="vertical" size="small">
                                        <Meta
                                            avatar={<Avatar src={organization.info.logoURI} />}
                                            title={organization.info.name}
                                            description={organization.info.description}
                                        />

                                        <Row gutter={16}>
                                            <Col span={10}>
                                                <Statistic title="#Streams" value={organization.info.streamsCount} prefix={<TokenStreamLogo width="30" height="30" />} />
                                            </Col>
                                            <Col span={14}>
                                                <Statistic title="Total Paid Out" value={`${organization.info.totalPaidOut}`} prefix={<RightOutlined />} suffix={<Text style={{ fontSize: '0.4em' }} type="secondary">GTC</Text>} />
                                            </Col>
                                        </Row>
                                    </Space>
                                </Card>
                            </Col>)
                        }
                    </Row>
                </div>
            }
            {organizations && organizations.length === 0 && (
                <div >
                    <p>No streams deployed yet..</p>
                    <p>Click "Launch DAO Streams", and be the first!</p>
                </div>
            )}
            {!organizations && (
                <div>
                    <Spin />
                </div>
            )}
        </>
    );
}
