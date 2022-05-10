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
    Divider,
} from "antd";
import { RightOutlined } from "@ant-design/icons";
import { TokenStreamLogo } from "../components/TokenStreamLogo";
import AddOrganizationWizard from "../components/AddOrganizationWizard";
import { CachedValue, loadERC20 } from "../helpers";
import { useDebounce } from "../hooks";
import { OrganizationStreamsABI } from "../contracts/external_ABI";

const { Meta } = Card;
const { Text } = Typography;
const { Search } = Input;

const createRoleHash = (roleName) => {
    return ethers.utils.solidityKeccak256(["string"], [roleName]);
}

const NUMBER_FORMATTER = Intl.NumberFormat('en', { notation: 'compact' });

const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MANAGER_ROLE = createRoleHash("MANAGER_ROLE");

const ORGS_CACHE_TTL_MILLIS = Number.parseInt(process.env.REACT_APP_ORGS_CACHE_TTL_MILLIS) || 1500000; // 25m ttl by default
// the actual cache
const caches = {
    orgsCache: {},
    orgMembershipCache: {},
};

const getOrgContract = (organizationAddress, provider) => {
    return new ethers.Contract(
        organizationAddress,
        OrganizationStreamsABI,
        provider
    );
};

async function resolveOrgMembership(organizationAddress, userAddress, provider) {
    const key = `${organizationAddress}.${userAddress}`;
    const cachedValue = caches.orgMembershipCache[key];
    if (cachedValue && cachedValue instanceof CachedValue && !cachedValue.isStale()) {
        return cachedValue.value;
    }
    // resolve details
    const orgContract = getOrgContract(organizationAddress, provider);
    const calls = [orgContract.hasStream(userAddress), orgContract.hasRole(MANAGER_ROLE, userAddress), orgContract.hasRole(ADMIN_ROLE, userAddress)];
    const canView = (await Promise.all(calls.map(call => call.catch(() => false))))
        .reduce((previousValue, currentValue) => previousValue || currentValue, false);
    caches.orgMembershipCache[key] = new CachedValue(canView, ORGS_CACHE_TTL_MILLIS);
    return canView;
}

async function resolveOrgDetails(organizationAddress, provider) {
    const cachedOrg = caches.orgsCache[organizationAddress];
    if (cachedOrg && cachedOrg instanceof CachedValue && !cachedOrg.isStale()) {
        return cachedOrg.value;
    }
    // resolve org details
    try {
        var orgContract = getOrgContract(organizationAddress, provider);

        var data = {};
        await orgContract.orgInfo()
            .then(info => {
                data = {
                    name: info[0],
                    logoURI: info[1],
                    description: info[2],
                    streamsCount: info[3],
                    totalPaidOut: info[4],
                    tokenAddress: info[5],
                };
            });
        await loadERC20(data.tokenAddress, provider)
            .then(tokenInfo => {
                data = { ...data, tokenSymbol: tokenInfo.symbol, tokenName: tokenInfo.name };
            });
        caches.orgsCache[organizationAddress] = new CachedValue(data, ORGS_CACHE_TTL_MILLIS);
        return data;
    } catch (error) {
        console.error("Error getting org data", error);
        throw error;
    }
}

export default function OrganizationBrowsePage({ tx, userAddress, writeContracts, provider, localProvider, readContracts, chainId, mainnetProvider, ...props }) {
    const [showWizard, setShowWizard] = useState(false);
    const [searchName, setSearchName] = useState("");
    const debouncedSearchName = useDebounce(searchName, 1000);
    const [organizations, setOrganizations] = useState(null);

    const onOrgDeployedHandler = async () => {
        setShowWizard(false);
        await fetchEvents();
    }

    const fetchEvents = async () => {
        setOrganizations(null);
        const contract = readContracts.OrganizationStreamsDeployer;
        if (contract) {
            const eventFilter = contract.filters.OrganizationsDeployed();
            const events = await contract.queryFilter(eventFilter);
            const orgs = events.map(eventLog => ({ ...eventLog.args, info: {} }));
            for (const org of orgs) {
                org.info = await resolveOrgDetails(org.orgAddress, provider);
                org.canView = await resolveOrgMembership(org.orgAddress, userAddress, provider);
            }
            const selectedOrgs = orgs.filter(
                org => org.canView && org.info.name.toLowerCase().includes(debouncedSearchName),
            );
            setOrganizations(selectedOrgs);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [readContracts, userAddress, debouncedSearchName]);

    const getFormattedAmount = (amount) => {
        return NUMBER_FORMATTER.format(ethers.utils.formatEther(amount));
    }

    return (
        <>
            <div style={{ width: '80%', position: 'relative', margin: "auto" }}>
                <AddOrganizationWizard
                    tx={tx}
                    writeContracts={writeContracts}
                    showWizard={showWizard}
                    onCancelHandler={() => setShowWizard(false)}
                    onDeployHandler={onOrgDeployedHandler}
                    chainId={chainId}
                    provider={provider}
                    mainnetProvider={mainnetProvider}
                />
                <Search placeholder="Search for your favourite DAOs!" size="large"
                    enterButton
                    onChange={e => setSearchName(e.target.value)}
                    value={searchName}
                    style={{ marginTop: "1.6em", marginBottom: "1em", width: '80%'}}
                />
                <Divider orientation="right">
                    <Button type="primary" onClick={() => setShowWizard(true)}>Launch DAO Streams</Button>
                </Divider>
            </div>
            {organizations &&
                <div style={{ width: "80%", position: 'relative', margin: "auto" }}>
                    <Row gutter={[{ xs: 8, sm: 16, md: 24, lg: 32 }, 32]}>

                        {organizations.map(organization =>
                            <Col key={`col-${organization.orgAddress}`} className="gutter-row"
                                xs={{ span: 24 }}
                                sm={{ span: 24 }}
                                md={{ span: 12 }}
                                lg={{ span: 8 }}
                                xl={{ span: 8 }}
                                xxl={{ span: 6 }}
                            >
                                <Card key={organization.orgAddress} className="org-card"
                                    headStyle={{ paddingTop: 0 }}
                                    actions={[
                                        <Link to={`/organizations/${organization.orgAddress}`}>
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
                                                <Statistic title="Total Paid Out" value={`${getFormattedAmount(organization.info.totalPaidOut)}`}
                                                    prefix={<RightOutlined />}
                                                    />
                                                <Text style={{ fontSize: '1em', textAlign: 'right' }} type="secondary">
                                                    {organization.info.tokenSymbol}
                                                </Text>
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
