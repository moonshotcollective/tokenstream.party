import React, { useEffect, useState } from "react";
import { useExternalContractLoader, useEventListener } from "../hooks";
import { ExampleUI } from ".";
import { useParams } from "react-router-dom";
import { SimpleStreamABI } from "../contracts/external_ABI";
import { loadERC20 } from "../helpers";
import { Spin } from "antd";

function StreamHOC(props) {
  const { address: address } = useParams();
  const genAddress = "0x0000000000000000000000000000000000000000";

  return address !== genAddress ? (
    <UserStream stream={address} {...props} />
  ) : (
    <div style={{ marginTop: 60 }}>This user's stream does not exist. Please create Stream for user first.</div>
  );
}

function UserStream({ stream, provider, userSigner, localProvider, ...props }) {
  const [data, setData] = useState({});
  const [ready, setReady] = useState(false);
  const SimpleStream = useExternalContractLoader(provider, stream, SimpleStreamABI) || {};
  const [withdrawEvents, createWithdrawEvents] = useEventListener();
  const [depositEvents, createDepositEvents] = useEventListener();

  const loadStreamData = async () => {
    const streamBalance = await SimpleStream.streamBalance();
    const streamCap = await SimpleStream.cap();
    const streamfrequency = await SimpleStream.frequency();
    const streamToAddress = await SimpleStream.toAddress();
    const totalStreamBalance = await provider.getBalance(stream);
    const token = await SimpleStream.token();
    const tokenInfo = await loadERC20(token, userSigner);

    setData({ streamBalance, tokenInfo, streamCap, streamfrequency, streamToAddress, totalStreamBalance });
    if (tokenInfo.address) {
      setReady(true);
    }
  };

  useEffect(() => {
    if (SimpleStream.streamBalance) {
      loadStreamData();
      createWithdrawEvents({ SimpleStream }, "SimpleStream", "Withdraw", provider, 1);
      createDepositEvents({ SimpleStream }, "SimpleStream", "Deposit", provider, 1);
    }
  }, [SimpleStream.streamBalance]);

  return ready ? (
    <>
      <ExampleUI
        {...data}
        {...props}
        stream={stream}
        SimpleStream={SimpleStream}
        depositEvents={depositEvents}
        withdrawEvents={withdrawEvents}
      />
    </>
  ) : (
    <div style={{textAlign: 'center'}}>
      <Spin tip="Loading Stream..." />
    </div>
  );
}

export default StreamHOC;
