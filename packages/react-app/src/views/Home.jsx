import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
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
  Popover,
} from "antd";
import { AddressInput, Address, Balance, TokenSelect } from "../components";
import { InfoCircleOutlined } from "@ant-design/icons";
import { SimpleStreamABI } from "../contracts/external_ABI";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Home({
  mainnetProvider,
  tx,
  writeContracts,
  readContracts,
  streams,
  ...props
}) {
  const history = useHistory();
  const [amount, setAmount] = useState(1);
  const [userAddress, setUserAddress] = useState("");
  const [duration, setDuration] = useState(4);
  const [startFull, setStartFull] = useState(0);
  const [newStreamModal, setNewStreamModal] = useState(false);
  const [ready, setReady] = useState(false);

  const [sData, setData] = useState([]);

  const [tokenAddress, setTokenAddress] = useState("0xde30da39c46104798bb5aa3fe8b9e0e1f348163f");
  const [tokenPrice, setTokenPrice] = useState(0);

  let copy = JSON.parse(JSON.stringify(streams));

  const getTokenPrice = async (address) => {
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${address}&vs_currencies=usd`);
    const price = res.data[address]['usd'];
    setTokenPrice(price);
  }

  useEffect(async () => {
    // Get an instance for each Stream contract
    getTokenPrice(tokenAddress);
    for (let b in streams) {
      if (streams)
        var contract = new ethers.Contract(
          streams[b].stream,
          SimpleStreamABI,
          mainnetProvider
        );

      // Call it's cap function
      const cap = await contract
        .cap()
        .then((result) =>
          copy[b].push(Number(result._hex) * 0.000000000000000001)
        );

      // Call it's Balance function, calculate the current percentage
      const balance = await contract
        .streamBalance()
        .then(
          (result) =>
            (copy[b].percent =
              ((Number(result._hex) * 0.000000000000000001) / copy[b][3]) * 100)
        );
    }
    setData(copy);

    // Wait until list is almost fully loaded to render
    if (copy.length >= 18) setReady(true);
  }, [streams]);

  const createNewStream = async () => {
    const capFormatted = ethers.utils.parseEther(`${amount || "1"}`);
    const frequencyFormatted = ethers.BigNumber.from(`${duration || 1}`).mul(
      "604800"
    );
    const _startFull = startFull === 1;
    const result = tx(
      writeContracts &&
        writeContracts.StreamFactory.createStreamFor(
          userAddress,
          capFormatted,
          frequencyFormatted,
          _startFull,
          tokenAddress
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
            message: "New GTC Stream created",
            description: `Stream is now available for ${userAddress}`,
            placement: "topRight",
          });
        }
      }
    );
    console.log("awaiting metamask/web3 confirm result...", result);
    console.log(await result);
  };

  const setToAddress = (address) => {
    setTokenAddress(address);
    getTokenPrice(address);
  }

  const minimumAmount = () => {
    // Minimum 10 USD for a stream
    return parseFloat(10/tokenPrice).toFixed(2);
  }

  const content = (<p>Default Token: GTC</p>);

  return (
    <div
      style={{
        width: 600,
        margin: "20px auto",
        padding: 20,
        paddingBottom: 50,
      }}
    >
      <Button
        style={{ marginTop: 20 }}
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
            <div style={{ marginBottom: 5 }}>
              Token: 
              <Popover placement="bottomLeft" content={content} arrowPointAtCenter>
                <InfoCircleOutlined style={{ marginLeft: 5 }} />
              </Popover>
            </div>
            <TokenSelect
              chainId={1}
              onChange={setToAddress}
              localProvider={mainnetProvider}
              nativeToken={{ name: 'Native token', symbol: 'ETH' }}
            />
            <div style={{ marginBottom: 25 }} />
          <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
            <div style={{ flex: 1, flexDirection: "column" }}>
              <div style={{ marginBottom: 5 }}>Amount:</div>
              <InputNumber
                placeholder="Amount"
                min={minimumAmount()}
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
              <Row>
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
                    <Link to={`/user/${item[1]}`}>View Stream</Link>{"  "}
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
  );
}
