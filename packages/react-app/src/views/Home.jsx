import React, { useState } from "react";
import { ethers } from "ethers";
import { Modal, Button, notification, Radio, InputNumber } from "antd";
import { AddressInput, EtherInput } from "../components";

export default function Home({ mainnetProvider, tx, writeContracts, readContracts, ...props }) {
  const [amount, setAmount] = useState(1);
  const [userAddress, updateUserAddress] = useState("");
  const [duration, setDuration] = useState(4);
  const [startFull, setStartFull] = useState(0);
  const [newStreamModal, setNewStreamModal] = useState(false);

  const createNewStream = async () => {
    const capFormatted = ethers.utils.parseEther(`${amount || "1"}`);
    const frequencyFormatted = ethers.BigNumber.from(`${duration || 1}`).mul("604800");
    const _startFull = startFull === 1;
    const GTCContractAddress = readContracts && readContracts.GTC.address;

    const result = tx(
      writeContracts &&
        writeContracts.StreamFactory.createStreamFor(
          userAddress,
          capFormatted,
          frequencyFormatted,
          _startFull,
          GTCContractAddress,
        ),
      async update => {
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
              " gwei",
          );
          notification.success({
            message: "New GTC Stream created",
            description: `Stream is now available for ${userAddress}`,
            placement: "topRight",
          });
        }
      },
    );
    console.log("awaiting metamask/web3 confirm result...", result);
    console.log(await result);
  };

  return (
    <div style={{ marginTop: 60 }}>
      <Button type="primary" onClick={() => setNewStreamModal(true)}>
        Create New Stream
      </Button>
      <Modal
        centered
        title="Create new stream"
        visible={newStreamModal}
        onOk={createNewStream}
        onCancel={() => setNewStreamModal(false)}
      >
        <div style={{ marginBottom: 5 }}>Recipient:</div>
        <AddressInput ensProvider={mainnetProvider} onChange={a => updateUserAddress(a)} />
        <div style={{ marginBottom: 25 }} />
        <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>
          <div style={{ flex: 1, flexDirection: "column" }}>
            <div style={{ marginBottom: 5 }}>GTC Amount:</div>
            <InputNumber
              placeholder="Amount"
              min={1}
              value={amount}
              onChange={v => setAmount(v)}
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
              onChange={d => setDuration(d)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginLeft: 10, marginRight: 10 }} />
          <div style={{ flex: 1, flexDirection: "column" }}>
            <div style={{ marginBottom: 5 }}>Start full:</div>
            <Radio.Group onChange={e => setStartFull(e.target.value)} value={startFull}>
              <Radio value={1}>Yes</Radio>
              <Radio value={0}>No</Radio>
            </Radio.Group>
          </div>
        </div>
      </Modal>
    </div>
  );
}
