import { formatEther, parseEther } from "@ethersproject/units";
import { Button, Divider, Input, List, message, notification, Progress } from "antd";
import axios from "axios";
import { useContractReader } from "eth-hooks";
import { ethers } from "ethers";
import pretty from "pretty-time";
import React, { useEffect, useState } from "react";
import { Address, AddressInput, Balance, PayButton, QRPunkBlockie } from "../components";

export default function ExampleUI({
  SimpleStream,
  streamToAddress,
  streamfrequency,
  streamCap,
  depositEvents,
  withdrawEvents,
  streamBalance,
  address,
  stream,
  mainnetProvider,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const [amount, setAmount] = useState();
  const [reason, setReason] = useState();
  const [toAddress, setToAddress] = useState("");
  const [fromAddress, setFromAddress] = useState("");

  const [depositAmount, setDepositAmount] = useState();
  const [depositReason, setDepositReason] = useState();

  console.log("streamCap", streamCap);
  console.log("streamBalance", streamBalance);
  const percent = streamCap && streamBalance && streamBalance.mul(100).div(streamCap).toNumber();

  const myMainnetGTCBalance = useContractReader(readContracts, "GTC", "balanceOf", [stream]);

  if (myMainnetGTCBalance) console.log("my mainnet gtc balance", formatEther(myMainnetGTCBalance));

  const streamNetPercentSeconds = myMainnetGTCBalance && streamCap && myMainnetGTCBalance.mul(100).div(streamCap);

  console.log(
    "streamNetPercentSeconds",
    streamNetPercentSeconds,
    streamNetPercentSeconds && streamNetPercentSeconds.toNumber(),
  );

  const totalSeconds = streamNetPercentSeconds && streamfrequency && streamNetPercentSeconds.mul(streamfrequency);
  console.log("totalSeconds", totalSeconds);

  console.log("numberOfTimesFull", streamNetPercentSeconds);
  const numberOfTimesFull = streamNetPercentSeconds && Math.floor(streamNetPercentSeconds.div(100));

  const streamNetPercent = streamNetPercentSeconds && streamNetPercentSeconds.mod(100);
  console.log("streamNetPercent", streamNetPercent, streamNetPercent && streamNetPercent.toNumber());

  const remainder = streamNetPercent && streamNetPercent.mod(1);
  console.log("remainder", remainder, remainder && remainder.toNumber());

  const [quoteRate, setQuoteRate] = useState(0);

  useEffect(() => {
    axios.get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=gitcoin").then(response => {
      if (response && response.data[0] && response.data[0].current_price) {
        setQuoteRate(response.data[0].current_price);
        console.log("quoteRate price", response.data[0].current_price, price);
      }
    });
  }, []);

  // console.log("WWUOTE", formatEther(streamBalance).toString())
  // const quote = quoteRate * formatEther(streamBalance)
  // const unclaimedPercent = totalStreamBalance && totalUnclaimable && totalUnclaimable.mul(100).div(totalStreamBalance)
  // console.log("unclaimedPercent",unclaimedPercent,unclaimedPercent&&unclaimedPercent.toNumber())

  const WIDTH = "calc(min(77vw,620px))";
  const totalProgress = [];
  const widthOfStacks = numberOfTimesFull > 6 ? 32 : 64;

  for (let c = 0; c < numberOfTimesFull; c++) {
    totalProgress.push(<Progress percent={100} showInfo={false} style={{ width: widthOfStacks, padding: 4 }} />);
  }
  if (streamNetPercent && streamNetPercent.toNumber() > 0) {
    totalProgress.push(
      <Progress
        percent={streamNetPercent && streamNetPercent.toNumber()}
        showInfo={false}
        status="active"
        style={{ width: widthOfStacks, padding: 4 }}
      />,
    );
  }

  const handleStreamWithMessage = (notif, cb) => async update => {
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
        placement: "topRight",
        ...notif,
      });
      cb && cb();
    }
  };

  const withdrawFromStream = async () => {
    if (!reason || reason.length < 6) {
      message.error("Please provide a longer reason / work / length");
    } else {
      let handler = "streamWithdraw";
      const params = [parseEther("" + amount), reason];
      // set the beneficiary
      params.push(toAddress.length > 0 ? toAddress : address);
      // if a funder was specified, use as wallet address
      if (fromAddress.length > 0) {
        handler = "streamWithdrawFrom";
        params.push(fromAddress);
      }

      console.log({ params, f: SimpleStream.streamWithdraw, handler });

      tx(
        SimpleStream[handler](...params),
        handleStreamWithMessage(
          { message: "Withdrawal successful", description: "Your withdrawal from this stream has been processed." },
          () => {
            setReason();
            setAmount();
          },
        ),
      );
    }
  };

  const tokenPayHandler = async tokenInfo => {
    // deposit amount and reason to stream after transfer confirmations
    const formattedAmount = ethers.utils.parseUnits(depositAmount, tokenInfo.decimals);
    await tx(
      SimpleStream.streamDeposit(depositReason, formattedAmount),
      handleStreamWithMessage(
        {
          message: "Deposit successful",
          description: `${depositAmount} ${tokenInfo.token} was deposited to this stream.`,
        },
        null,
      ),
    );

    setDepositReason();
    setDepositAmount();
  };

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
          //<QRBlockie scale={0.6} withQr={true} address={readContracts && readContracts.SimpleStream.address} />
      */}

      <div style={{ padding: 16, width: WIDTH, margin: "auto" }}>
        <div style={{ padding: 32 }}>
          <div style={{ padding: 32 }}>
            <Balance value={myMainnetGTCBalance} price={quoteRate} />
            <span style={{ opacity: 0.5 }}>
              {" "}
              @ <Balance value={streamCap} price={quoteRate} /> /{" "}
              {streamfrequency && pretty(streamfrequency.toNumber() * 1000000000)}
            </span>
          </div>
          <div>
            {totalProgress} ({totalSeconds && pretty(totalSeconds.toNumber() * 10000000)})
          </div>
        </div>
      </div>

      <div style={{ marginTop: -32 }}>
        <Address value={stream} />
      </div>

      <div style={{ width: 400, margin: "auto", marginTop: 32, position: "relative" }}>
        <div style={{ padding: 16, marginBottom: 64 }}>
          <span style={{ opacity: 0.5 }}>Streaming To:</span>
        </div>
        <div style={{ position: "absolute", top: -50 }}>
          <QRPunkBlockie withQr={false} address={streamToAddress} scale={0.7} />
        </div>
        <Address value={streamToAddress} ensProvider={mainnetProvider} />
      </div>

      <div style={{ border: "1px solid #cccccc", padding: 16, width: WIDTH, margin: "auto", marginTop: 64 }}>
        {/* <h4>stream balance: {streamBalance && formatEther(streamBalance)}</h4> */}

        <Progress
          strokeLinecap="square"
          type="dashboard"
          percent={percent}
          format={() => {
            return <Balance price={quoteRate} value={streamBalance} size={18} />;
          }}
        />

        <Divider />

        <div style={{ margin: 8 }}>
          <Input
            style={{ marginBottom: 8 }}
            value={reason}
            placeholder="reason / work / link"
            onChange={e => {
              setReason(e.target.value);
            }}
          />
          <Input
            style={{ marginBottom: 8 }}
            autofocus
            price={quoteRate}
            value={amount}
            placeholder="Withdraw Amount"
            addonAfter="GTC"
            onChange={e => setAmount(e.target.value)}
          />
          <AddressInput
            style={{ marginBottom: 8 }}
            ensProvider={mainnetProvider}
            placeholder="Enter Beneficiary Address (optional)"
            value={toAddress}
            onChange={setToAddress}
          />
          <AddressInput
            ensProvider={mainnetProvider}
            placeholder="Enter Funder Wallet Address (optional)"
            value={fromAddress}
            onChange={setFromAddress}
          />
          <Button style={{ marginTop: 8 }} onClick={withdrawFromStream}>
            Withdraw
          </Button>
        </div>
      </div>

      {/*
        📑 Maybe display a list of events?
          (uncomment the event and emit line in YourContract.sol! )
      */}
      <div style={{ width: WIDTH, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
        <h2>Work log:</h2>
        <List
          bordered
          dataSource={withdrawEvents}
          renderItem={item => {
            return (
              <List.Item key={item.blockNumber + "_" + item.to}>
                <Balance value={item.amount} price={quoteRate} />
                <span style={{ fontSize: 14 }}>
                  <span style={{ padding: 4 }}>{item.reason}</span>
                  <Address minimized address={item.to} />
                </span>
              </List.Item>
            );
          }}
        />
      </div>

      <div style={{ width: WIDTH, margin: "auto", marginTop: 32 }}>
        <h2>Deposits:</h2>
        <List
          bordered
          dataSource={depositEvents}
          renderItem={item => {
            return (
              <List.Item key={item.blockNumber + "_" + item.from}>
                <Balance value={item.amount} price={quoteRate} />
                <span style={{ fontSize: 14 }}>
                  <span style={{ padding: 4 }}>{item.reason}</span>
                  <Address minimized address={item.from} />
                </span>
              </List.Item>
            );
          }}
        />
        <hr style={{ opacity: 0.3333 }} />
        <Input
          style={{ marginBottom: 8 }}
          value={depositReason}
          placeholder="reason / guidance / north star"
          onChange={e => {
            setDepositReason(e.target.value);
          }}
        />
        <Input
          autoFocus
          price={quoteRate}
          value={depositAmount}
          placeholder="Deposit amount"
          addonAfter="GTC"
          onChange={e => setDepositAmount(e.target.value)}
        />

        {readContracts.GTC && (
          <PayButton
            tx={tx}
            style={{ marginTop: 8 }}
            token="GTC"
            appName="GTCStream"
            callerAddress={address}
            maxApproval={depositAmount}
            amount={depositAmount}
            spender={SimpleStream.address}
            readContracts={readContracts}
            writeContracts={writeContracts}
            tokenPayHandler={tokenPayHandler}
          />
        )}
      </div>

      <div style={{ paddingBottom: 256 }} />
    </div>
  );
}
