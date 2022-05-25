import React, { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import {
  Menu,
  Modal,
  Button,
  notification,
  Radio,
  InputNumber,
  Row,
  Col,
  Spin,
  Typography,
  Avatar,
  Tabs,
  Input,
} from "antd";
import { AddressInput, Contract, OrgStreamsActivityFeed, UserStreamList } from "../components";
import { OrganizationStreamsABI, OrganizationStreamsAdminABI, OrganizationStreamsManagerABI } from "../contracts/external_ABI";
import { useHistory } from "react-router";
import { useParams, Switch, Route } from "react-router-dom";
import { loadERC20 } from "../helpers";
import { LeftOutlined } from "@ant-design/icons";
import UserStream from "./UserStream";

const { Title } = Typography;
const { TabPane } = Tabs;

const createRoleHash = (roleName) => {
  return ethers.utils.solidityKeccak256(["string"], [roleName]);
}

const MANAGER_ROLE = createRoleHash("MANAGER_ROLE");
const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";


export default function OrganizationHome({
  provider,
  mainnetProvider,
  userSigner,
  tx,
  blockExplorer,
  ...props
}) {
  const history = useHistory();
  const { orgaddress: organizationAddress } = useParams();
  const [amount, setAmount] = useState(1);
  const [userAddress, setUserAddress] = useState("");
  const [streamName, setStreamName] = useState("");
  const [duration, setDuration] = useState(4);
  const [startFull, setStartFull] = useState(0);
  const [newStreamModal, setNewStreamModal] = useState(false);
  const [orgInfo, setOrgInfo] = useState({});
  const [account, setAccount] = useState("");
  const [ready, setReady] = useState(false);
  const [streamListKey, setStreamListKey] = useState(`stream-list-0`);

  const orgStreamFactoryReadContract = useMemo(() => {
    if (!organizationAddress) {
      return;
    }
    return new ethers.Contract(
      organizationAddress,
      OrganizationStreamsABI,
      provider
    );
  }, [organizationAddress, provider]);

  const orgStreamFactoryWriteContract = useMemo(() => {
    if (!organizationAddress) {
      return;
    }
    return new ethers.Contract(
      organizationAddress,
      OrganizationStreamsABI,
      userSigner
    );
  }, [organizationAddress, userSigner]);

  const orgStreamFactoryAdminContract = useMemo(() => {
    if (!organizationAddress) {
      return;
    }
    return new ethers.Contract(
      organizationAddress,
      OrganizationStreamsAdminABI,
      userSigner
    );
  }, [organizationAddress, userSigner]);

  const orgStreamFactoryOperatorContract = useMemo(() => {
    if (!organizationAddress) {
      return;
    }
    return new ethers.Contract(
      organizationAddress,
      OrganizationStreamsManagerABI,
      userSigner
    );
  }, [organizationAddress, userSigner]);

  const [tokenInfo, setTokenInfo] = useState({});

  const fetchOrgInfo = async () => {
    if (!orgStreamFactoryReadContract || !userSigner) {
      return;
    }

    const addr = await userSigner.getAddress();
    setAccount(addr);

    const isOperator = await orgStreamFactoryReadContract.hasRole(MANAGER_ROLE, addr);
    const isAdmin = await orgStreamFactoryReadContract.hasRole(ADMIN_ROLE, addr);

    await orgStreamFactoryReadContract.orgInfo()
      .then(info => {
        setOrgInfo({
          name: info[0],
          description: info[2],
          logoURI: info[1],
          streamsCount: info[3],
          totalPaidOut: info[4],
          token: info[5],
          isOperator: isOperator,
          isAdmin: isAdmin
        });
        setStreamListKey(`stream-list-${info[3]}`);
      });
  };

  const fetchTokenInfo = async (token) => {
    const info = await loadERC20(token, userSigner);
    setTokenInfo(info);
  }

  useEffect(() => {
    if (ready) {
      setReady(false);
    }

    fetchOrgInfo()
      .catch(console.error);
  }, [orgStreamFactoryReadContract]);

  useEffect(() => {
    if (orgInfo && orgInfo.token !== undefined) {
      fetchTokenInfo(orgInfo.token)
        .then(_ => setReady(true))
        .catch(console.error);
    }
  }, [orgInfo]);

  const createNewStream = async () => {
    const capFormatted = ethers.utils.parseEther(`${amount || "1"}`);
    const frequencyFormatted = ethers.BigNumber.from(`${duration || 1}`).mul(
      "604800"
    );
    const _startFull = startFull === 1;
    const calldata = [
      userAddress,
      capFormatted,
      frequencyFormatted,
      _startFull,
      streamName
    ];
    const result = tx(
      orgStreamFactoryWriteContract &&
      orgStreamFactoryWriteContract.addStream(...calldata),
      async (update) => {
        console.log("📡 Transaction Update:", update);
        if (update && (update.status === "confirmed" || update.status === 1)) {
          console.log(" 🍾 Transaction " + update.hash + " finished!");
          console.log(
            " ⛽️ " +
            update.gasUsed +
            "/" +
            (update.gasLimit || update.gas) +
            " @ " +
            parseFloat(update.gasPrice) / 1000000000 +
            " gwei"
          );
          // reset form to default values
          setUserAddress("");
          setStreamName("");
          setAmount(1);
          setDuration(4);
          setStartFull(0);

          // close stream modal
          setNewStreamModal(false);

          // send notification of stream creation
          notification.success({
            message: "New Token Stream created!",
            description: `Stream is now available for ${userAddress}`,
            placement: "topRight",
          });
          await fetchOrgInfo();
        }
      }
    );
    console.log("awaiting metamask/web3 confirm result...", result);
    console.log(await result);
  };

  const canAdminister = (orgInfo.isOperator || orgInfo.isAdmin);
  const adminTabContract = orgInfo.isAdmin ? orgStreamFactoryAdminContract : orgStreamFactoryOperatorContract;

  const OrganizationHomeView = (<Tabs
    defaultActiveKey="streams"
    tabBarExtraContent={
      {
        left: <Button type="text" icon={<LeftOutlined />} onClick={history.goBack}>Back</Button>,
        right: canAdminister && (<Button
          type="primary"
          onClick={() => setNewStreamModal(true)}
        >
          Create New Stream
        </Button>)
      }
    }
    className="org-tabs"
    centered
  >
    <TabPane tab="Streams" key="streams">
      <UserStreamList key={streamListKey} orgStreamsContract={orgStreamFactoryWriteContract} totalStreamCount={orgInfo.streamsCount} mainnetProvider={mainnetProvider} />
    </TabPane>
    <TabPane tab="Activity Feed" key="feed">
      <OrgStreamsActivityFeed orgAddress={organizationAddress} price={props.price} mainnetProvider={mainnetProvider} />
    </TabPane>
    {canAdminister && (
      <TabPane tab="Admin" key="admin">
        <Contract
          name="Organization Administration"
          signer={userSigner}
          provider={provider}
          address={account}
          blockExplorer={blockExplorer}
          customContract={adminTabContract}
        />
      </TabPane>
    )}
  </Tabs>);

  return ready ? (
    <>
      <Row style={{width: '100%', marginTop: '2em'}} gutter={[{ xs: 2, sm: 4, md: 6, lg: 8 }, 16]}>
        <Col
          xs={{ span: 24, offset: 0 }}
          sm={{ span: 24, offset: 0 }}
          md={{ span: 20, offset: 2 }}
          lg={{ span: 16, offset: 4 }}
          xl={{ span: 16, offset: 4 }}
          xxl={{ span: 16, offset: 4 }}
        >
          <Avatar size="large" src={`${orgInfo.logoURI}`} />
          <Title>{orgInfo.name}</Title>
          <p>{orgInfo.description}</p>
        </Col>
        <Col
          xs={{ span: 24, offset: 0 }}
          sm={{ span: 24, offset: 0 }}
          md={{ span: 20, offset: 2 }}
          lg={{ span: 16, offset: 4 }}
          xl={{ span: 16, offset: 4 }}
          xxl={{ span: 16, offset: 4 }}
        >
          <Switch>
            <Route exact path="/organizations/:orgaddress/streams/:name">
                <UserStream
                  orgInfo={orgInfo}
                  tokenInfo={tokenInfo}
                  provider={provider}
                  userSigner={userSigner}
                  mainnetProvider={mainnetProvider}
                  orgStreamsReadContract={orgStreamFactoryReadContract}
                  orgStreamsWriteContract={orgStreamFactoryWriteContract}
                  tx={tx}
                  account={account}
                />
              </Route>
              <Route exact path="/organizations/:orgaddress">
                {OrganizationHomeView}
              </Route>
          </Switch>
        </Col>
      </Row>
      {newStreamModal && (
        <Modal
          centered
          title="Create new stream"
          visible={newStreamModal}
          onOk={createNewStream}
          onCancel={() => setNewStreamModal(false)}
        >
          <div style={{ marginBottom: 5 }}>Name:</div>
          <Input
            value={streamName}
            onChange={(e) => setStreamName(e.target.value)}
            placeholder="Name of the stream"
          />
          <div style={{ marginBottom: 25 }} />

          <div style={{ marginBottom: 5 }}>Owner:</div>
          <AddressInput
            ensProvider={mainnetProvider}
            value={userAddress}
            onChange={(a) => setUserAddress(a)}
          />
          <div style={{ marginBottom: 25 }} />
          <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
            <div style={{ flex: 1, flexDirection: "column" }}>
              <div style={{ marginBottom: 5 }}>{tokenInfo.symbol} Amount:</div>
              <InputNumber
                placeholder="Amount"
                min={1}
                value={amount}
                onChange={(v) => setAmount(v)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginLeft: 10, marginRight: 10 }} />
            <div style={{ flex: 1, flexDirection: "column" }}>
              <div style={{ marginBottom: 5 }}>Frequency in weeks:</div>
              <InputNumber
                placeholder="Duration"
                min={1}
                value={duration}
                onChange={(d) => setDuration(d)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginLeft: 10, marginRight: 10 }} />
            <div style={{ flex: 1, flexDirection: "column" }}>
              <div style={{ marginBottom: 5 }}>Start full:</div>
              <Radio.Group
                onChange={(e) => setStartFull(e.target.value)}
                value={startFull}
              >
                <Radio value={1}>Yes</Radio>
                <Radio value={0}>No</Radio>
              </Radio.Group>
            </div>
          </div>
        </Modal>
      )}
    </>
  ) : (
    <div style={{textAlign: 'center', width:'60%', margin: '2em auto 0'}}>
      <Spin tip="Loading DAO..." />
    </div>
  );
}
