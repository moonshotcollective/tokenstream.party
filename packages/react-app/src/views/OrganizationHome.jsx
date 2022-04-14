import React, { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import {
  Menu,
  Modal,
  Button,
  notification,
  Radio,
  InputNumber,
  List,
  Row,
  Col,
  Progress,
  Spin,
  Typography,
  Avatar,
} from "antd";
import { AddressInput, Address, Contract, OrgStreamsActivityFeed } from "../components";
import { SimpleStreamABI, StreamFactoryABI } from "../contracts/external_ABI";
import { useHistory } from "react-router";
import { Link, useParams } from "react-router-dom";
import { CachedValue, loadERC20 } from "../helpers";
import { LeftOutlined } from "@ant-design/icons";

const { Title } = Typography;

const createRoleHash = (roleName) => {
  const roleHash = ethers.utils.solidityKeccak256(["string"], [roleName]);
  return roleHash;
}

const OPERATOR_ROLE = createRoleHash("OPERATOR");

const LOADING_STREAMS_COUNT = Number.parseInt(process.env.REACT_APP_LOADING_STREAMS_COUNT) || 18;
const STREAMS_CACHE_TTL_MILLIS = Number.parseInt(process.env.REACT_APP_STREAMS_CACHE_TTL_MILLIS) || 43200000; // 12h ttl by default
// the actual cache
const streamsCache = {};

async function resolveStreamSummary(streamAddress, mainnetProvider) {
  const cachedStream = streamsCache[streamAddress];
  if (cachedStream && cachedStream instanceof CachedValue && !cachedStream.isStale()) {
    return cachedStream.value;
  }

  var contract = new ethers.Contract(
    streamAddress,
    SimpleStreamABI,
    mainnetProvider
  );

  var data = {};

  // Call it's cap function
  await contract
    .cap()
    .then((result) =>
      data.cap = Number(result._hex) * 0.000000000000000001
    );

  // Call it's Balance function, calculate the current percentage
  await contract
    .streamBalance()
    .then(
      (result) =>
      (data.percent =
        ((Number(result._hex) * 0.000000000000000001) / data.cap) * 100)
    );

  streamsCache[streamAddress] = new CachedValue(data, STREAMS_CACHE_TTL_MILLIS);
  return data;
}

export default function OrganizationHome({
  provider,
  mainnetProvider,
  userSigner,
  tx,
  writeContracts,
  readContracts,
  blockExplorer,
  ...props
}) {
  const history = useHistory();
  const { orgaddress: organizationAddress } = useParams();
  const [amount, setAmount] = useState(1);
  const [userAddress, setUserAddress] = useState("");
  const [duration, setDuration] = useState(4);
  const [startFull, setStartFull] = useState(0);
  const [newStreamModal, setNewStreamModal] = useState(false);
  const [ready, setReady] = useState(false);
  const [streams, setStreams] = useState([]);
  const [sData, setData] = useState([]);
  const [orgInfo, setOrgInfo] = useState({});
  const [currentView, setCurrentView] = useState("streams");
  const [account, setAccount] = useState("");

  const orgStreamFactoryReadContract = useMemo(() => {
    if (!organizationAddress) {
      return;
    }
    return new ethers.Contract(
      organizationAddress,
      StreamFactoryABI,
      provider
    );
  }, [organizationAddress, provider]);

  const orgStreamFactoryWriteContract = useMemo(() => {
    if (!organizationAddress) {
      return;
    }
    return new ethers.Contract(
      organizationAddress,
      StreamFactoryABI,
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

    const isOperator = await orgStreamFactoryReadContract.hasRole(OPERATOR_ROLE, addr);
    console.log(["SHITZU", addr, isOperator]);
    await orgStreamFactoryReadContract.orgInfo()
      .then(info => {
        setOrgInfo({
          name: info[0],
          description: info[1],
          githubURI: info[2],
          twitterURI: info[3],
          webURI: info[4],
          discordURI: info[5],
          logoURI: info[6],
          streamsCount: info[7],
          totalPaidOut: info[8],
          token: info[9],
          isOperator: isOperator
        });
      });
  };

  const fetchOrgStreamFactoryStreams = async () => {
    if (!orgStreamFactoryReadContract) {
      return;
    }
    const eventFilter = orgStreamFactoryReadContract.filters.StreamAdded();
    const events = await orgStreamFactoryReadContract.queryFilter(eventFilter);
    const streamData = events.map(s => s.decode(s.data));
    setStreams(streamData);
  };

  const fetchTokenInfo = async (token) => {
    const info = await loadERC20(token, provider);
    setTokenInfo(info);
  }

  useEffect(() => {
    fetchOrgInfo()
      .catch(console.error);
    fetchOrgStreamFactoryStreams()
      .catch(console.error);
  }, [orgStreamFactoryReadContract]);

  useEffect(() => {
    if (orgInfo && orgInfo.token !== undefined) {
      fetchTokenInfo(orgInfo.token)
        .catch(console.error);
    }
  }, [orgInfo]);

  useEffect(() => {
    let shouldCancel = false;
    const fetchStreams = async () => {
      // parallely load all available streams data
      Promise.all(
        streams.map(async (stream) => {
          const summary = await resolveStreamSummary(stream.stream, provider);
          return { ...stream, 3: summary.cap, percent: summary.percent };
        })
      ).then(results => {
        // process promised streams only when this effect call is not cancelled.
        if (!shouldCancel) {
          setData(results);

          // Wait until list is almost fully loaded to render
          if (results.length >= LOADING_STREAMS_COUNT) {
            setReady(true);
          }
        }
      });
    }

    fetchStreams()
      .catch(console.error);

    // cleanup callback
    return () => shouldCancel = true;
  }, [streams]);

  const createNewStream = async () => {
    const capFormatted = ethers.utils.parseEther(`${amount || "1"}`);
    const frequencyFormatted = ethers.BigNumber.from(`${duration || 1}`).mul(
      "604800"
    );
    const _startFull = startFull === 1;
    const result = tx(
      orgStreamFactoryWriteContract &&
      orgStreamFactoryWriteContract.createStreamFor(
        userAddress,
        capFormatted,
        frequencyFormatted,
        _startFull
      ),
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

          await fetchOrgStreamFactoryStreams();
        }
      }
    );
    console.log("awaiting metamask/web3 confirm result...", result);
    console.log(await result);
  };

  return (
    <>
      <Row gutter={[8, 16]} style={{marginTop:"1em"}}>
        <Col span={12} offset={6}>
          <Avatar size="large" src={`${orgInfo.logoURI}`} />
          <Title>{orgInfo.name}</Title>
          <p>{orgInfo.description}</p>
        </Col>
        <Col span={12} offset={6}>
          <Menu
            mode="horizontal"
            selectedKeys={[currentView]}
            onSelect={item => setCurrentView(item.key)}
            style={{ textAlign: "center", border: "none", backgroundColor: "transparent" }}>
              <Menu.Item key="back" onClick={history.goBack}>
                <LeftOutlined />
                Back
              </Menu.Item>
              <Menu.Item key="streams">Streams</Menu.Item>
              <Menu.Item key="feed">Activity Feed</Menu.Item>
              {orgInfo.isOperator && (
                <Menu.Item key="admin">Admin</Menu.Item>
              )}
          </Menu>
        </Col>
      </Row>
      {currentView === "streams" &&
        <div
        style={{
          width: 600,
          margin: "0px auto",
          padding: 20,
          paddingBottom: 50,
        }}
      >
        
        <Button
          type="primary"
          onClick={() => setNewStreamModal(true)}
        >
          Create New Stream
        </Button>
        {newStreamModal && (
          <Modal
            centered
            title="Create new stream"
            visible={newStreamModal}
            onOk={createNewStream}
            onCancel={() => setNewStreamModal(false)}
          >
            <div style={{ marginBottom: 5 }}>Recipient:</div>
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

        {ready ? (
          <div style={{ marginTop: 30 }}>
            <List
              bordered
              dataSource={sData}
              renderItem={(item) => (
                <Row key={`address-${item[1]}`}>
                  <div
                    style={{
                      width: "110%",
                      position: "relative",
                      display: "flex",
                      flex: 1,
                      padding: 15,
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >{"  "}
                    <Col span={10} >
                      <div
                        style={{
                          display: "flex",
                        }}
                      >
                        <Address
                          value={item[1]}
                          ensProvider={mainnetProvider}
                          fontSize={18}
                          style={{ display: "flex", flex: 1, alignItems: "center" }}
                        />{"  "}
                      </div>
                    </Col>
                    <Col span={4}>
                      <Link to={`/user/${item[2]}`}>View Stream</Link>{"  "}
                    </Col>
                    <Col span={5}>
                      <Address
                        value={item[2]}
                        ensProvider={mainnetProvider}
                        fontSize={10}
                        style={{
                          paddingLeft: 30,
                          paddingRight: 30,
                          flex: 0.3,
                          alignItems: "center",
                        }}
                      />{"  "}
                    </Col>
                    <Col span={3}>
                      <Progress
                        style={{ alignItems: "right" }}
                        type="dashboard"
                        showInfo={true}
                        width={40}
                        fontSize={1}
                        percent={item.percent}
                        format={(percent) => `${percent.toFixed(0)}%`}
                      />
                    </Col>
                  </div>
                </Row>
              )}
            />
          </div>
        ) : (
          <div style={{ marginTop: 30 }}>
            <Spin tip="Loading Streams... (This may take a moment)" />
          </div>
        )}
      </div>
      }
      {currentView === "feed" &&
      <div
        style={{
          width: 600,
          margin: "0px auto",
          padding: 20,
          paddingBottom: 50,
        }}
      >
        <OrgStreamsActivityFeed orgAddress={organizationAddress} price={props.price} mainnetProvider={mainnetProvider} />
      </div>
      }
      {currentView === "admin" &&
        <Contract
          name="Organization Administration"
          signer={userSigner}
          provider={provider}
          address={account}
          blockExplorer={blockExplorer}
          customContract={orgStreamFactoryWriteContract}
        />
      }
    </>
  );
}
