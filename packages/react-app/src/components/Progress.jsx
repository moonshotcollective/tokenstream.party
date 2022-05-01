import { formatEther, parseEther } from "@ethersproject/units";
import {
  Button,
  Divider,
  Input,
  List,
  message,
  notification,
  Progress,
} from "antd";
import axios from "axios";
import { useContractReader } from "eth-hooks";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import {
  Address,
  AddressInput,
  Balance,
  PayButton,
  QRPunkBlockie,
} from "../components";

export default function ProgressComponent({
  SimpleStream,
  streamToAddress,
  streamfrequency,
  streamCap,
  depositEvents,
  withdrawEvents,
  streamBalance,
  address,
  mainnetProvider,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const genAddress = "0x0000000000000000000000000000000000000000";
  // const [stream, setStream] = useState();
  const stream =
    useContractReader(
      props.readContracts,
      "StreamFactory",
      "getStreamForUser",
      [address]
    ) || genAddress;
  const [amount, setAmount] = useState();
  const [reason, setReason] = useState();
  const [toAddress, setToAddress] = useState();

  const [depositAmount, setDepositAmount] = useState();
  const [depositReason, setDepositReason] = useState();

  console.log("streamCap", streamCap);
  console.log("streamBalance", streamBalance);
  const percent =
    streamCap &&
    streamBalance &&
    streamBalance.mul(100).div(streamCap).toNumber();

  const myMainnetGTCBalance = useContractReader(
    readContracts,
    "GTC",
    "balanceOf",
    [stream]
  );

  if (myMainnetGTCBalance)
    console.log("my mainnet gtc balance", formatEther(myMainnetGTCBalance));

  const streamNetPercentSeconds =
    myMainnetGTCBalance &&
    streamCap &&
    myMainnetGTCBalance.mul(100).div(streamCap);

  console.log(
    "streamNetPercentSeconds",
    streamNetPercentSeconds,
    streamNetPercentSeconds && streamNetPercentSeconds.toNumber()
  );

  const totalSeconds =
    streamNetPercentSeconds &&
    streamfrequency &&
    streamNetPercentSeconds.mul(streamfrequency);
  console.log("totalSeconds", totalSeconds);

  console.log("numberOfTimesFull", streamNetPercentSeconds);
  const numberOfTimesFull =
    streamNetPercentSeconds && Math.floor(streamNetPercentSeconds.div(100));

  const streamNetPercent =
    streamNetPercentSeconds && streamNetPercentSeconds.mod(100);
  console.log(
    "streamNetPercent",
    streamNetPercent,
    streamNetPercent && streamNetPercent.toNumber()
  );

  const remainder = streamNetPercent && streamNetPercent.mod(1);
  console.log("remainder", remainder, remainder && remainder.toNumber());

  const [quoteRate, setQuoteRate] = useState(0);

  useEffect(() => {
    axios
      .get(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=gitcoin"
      )
      .then((response) => {
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
    totalProgress.push(
      <Progress
        percent={100}
        showInfo={false}
        style={{ width: widthOfStacks, padding: 4 }}
      />
    );
  }
  if (streamNetPercent && streamNetPercent.toNumber() > 0) {
    totalProgress.push(
      <Progress
        percent={streamNetPercent && streamNetPercent.toNumber()}
        showInfo={false}
        status="active"
        style={{ width: widthOfStacks, padding: 4 }}
      />
    );
  }

  const handleStreamWithMessage = (notif, cb) => async (update) => {
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
      tx(
        SimpleStream.streamWithdraw(parseEther("" + amount), reason, toAddress),
        handleStreamWithMessage(
          {
            message: "Withdrawal successful",
            description: "Your withdrawal from this stream has been processed.",
          },
          () => {
            setReason();
            setAmount();
          }
        )
      );
    }
  };

  const tokenPayHandler = async (tokenInfo) => {
    // deposit amount and reason to stream after transfer confirmations
    const formattedAmount = ethers.utils.parseUnits(
      depositAmount,
      tokenInfo.decimals
    );
    await tx(
      SimpleStream.streamDeposit(depositReason, formattedAmount),
      handleStreamWithMessage(
        {
          message: "Deposit successful",
          description: `${depositAmount} ${tokenInfo.token} was deposited to this stream.`,
        },
        null
      )
    );

    setDepositReason();
    setDepositAmount();
  };

  return (
    <div style={{ paddingBotton: "25px" }}>
      <Progress
        strokeLinecap="square"
        type="dashboard"
        percent={percent}
        format={() => {
          return <Balance price={quoteRate} value={streamBalance} size={18} />;
        }}
      />
    </div>
  );
}
