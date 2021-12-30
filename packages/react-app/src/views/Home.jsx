import { Contract } from "@ethersproject/contracts";
import { Button, InputNumber, List, Modal, notification, Radio } from "antd";
import { useContractReader } from "eth-hooks";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import { Address, AddressInput } from "../components";
import { SimpleStreamABI } from "../contracts/external_ABI";
import { useExternalContractLoader } from "../hooks";

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

  const genAddress = "0x0000000000000000000000000000000000000000";
  let stream;

  const [streamAddress, setStreamAddress] = useState(genAddress);
  useEffect(async () => {
    stream = readContracts.StreamFactory.getStreamForUser(props.address);
    setStreamAddress(stream);
    
    console.log("Stream Address", stream);
  }, [props.address]);

  const SimpleStream =
    useExternalContractLoader(props.provider, streamAddress, SimpleStreamABI) || {};

  const createNewStream = async () => {
    const capFormatted = ethers.utils.parseEther(`${amount || "1"}`);
    const frequencyFormatted = ethers.BigNumber.from(`${duration || 1}`).mul(
      "604800"
    );
    const _startFull = startFull === 1;
    const GTCContractAddress = readContracts && readContracts.GTC.address;

    const result = tx(
      writeContracts &&
        writeContracts.StreamFactory.createStreamFor(
          userAddress,
          capFormatted,
          frequencyFormatted,
          _startFull,
          GTCContractAddress
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

  const [streamBalance, setStreamBalance] = useState(0);
  useEffect(async () => {
    const streamBalance =
      (await SimpleStream) && SimpleStream.streamBalance();
    setStreamBalance(streamBalance);
  }, [streamBalance, props.address]);

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
          <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
            <div style={{ flex: 1, flexDirection: "column" }}>
              <div style={{ marginBottom: 5 }}>GTC Amount:</div>
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

      <div style={{ marginTop: 30 }}>
        <List
          bordered
          dataSource={streams}
          renderItem={(item) => (
            <List.Item key={item.user}>
              <div
                style={{
                  width: "100%",
                  position: "relative",
                  display: "flex",
                  flex: 1,
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Address
                  value={item.user}
                  ensProvider={mainnetProvider}
                  fontSize={18}
                  style={{ display: "flex", flex: 1, alignItems: "center" }}
                />
                Balance: {streamBalance} |
                <Link to={`/user/${item.user}`}>View Stream</Link>
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}
