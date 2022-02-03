import React, { useEffect, useState } from "react";
import { Button, notification } from "antd";
import { ethers } from "ethers";

const loadingStatus = [0, 2, 4];
const disabledStatus = [...loadingStatus, 5];

export default function PayButton({
  tx,
  token,
  amount = "0",
  appName,
  spender,
  style = {},
  callerAddress,
  maxApproval = "115792089237316195423570985008687907853269984665640564039457584007913129639935",
  readContracts,
  writeContracts,
  yourLocalBalance = ethers.BigNumber.from(0),
  tokenListHandler,
  ethPayHandler,
  tokenPayHandler,
}) {
  const [tokenInfo, setTokenInfo] = useState({});
  const [status, setStatus] = useState(0); // loading | lowAllowance | approving | ready | distributing | noBalance

  const refreshETH = () => {
    setStatus(yourLocalBalance.gte(ethers.utils.parseEther(amount || "0")) ? 3 : 5);
  };

  const refreshTokenDetails = async () => {
    console.log(`Your token is: `, readContracts[token]);

    const decimals = await readContracts[token].decimals();
    const allowance = await readContracts[token].allowance(callerAddress, spender);
    const balance = await readContracts[token].balanceOf(callerAddress);
    const address = readContracts[token].address;

    const adjustedAmount = ethers.utils.parseUnits(amount || "0", decimals);
    const hasEnoughAllowance = allowance.lt(adjustedAmount);

    setTokenInfo({ ...tokenInfo, [token]: { decimals, allowance, address, balance } });

    if (balance.isZero()) {
      setStatus(5);
    } else {
      if (allowance.isZero() || hasEnoughAllowance) {
        setStatus(1);
      } else {
        setStatus(3);
      }
    }
  };

  const approveTokenAllowance = async () => {
    setStatus(2);
    const approvalAmount = maxApproval;
    const approvalToken = token;
    const newAllowance = ethers.utils.parseUnits(maxApproval, tokenInfo[token].decimals);

    await tx(writeContracts[token].approve(spender, newAllowance), async update => {
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
          message: "Token approval successful",
          description: `${approvalAmount} ${approvalToken} was approved for GTCStream.`,
          placement: "topRight",
        });
        await refreshTokenDetails();
      }
    });
  };

  const isETH = () => {
    return token.toUpperCase() === "ETH";
  };

  const handlePay = async () => {
    const payParams = { token, ...tokenInfo[token] };
    if (isETH()) {
      setStatus(4);
      await ethPayHandler();
      setStatus(3);
    } else {
      if (status === 1) {
        await approveTokenAllowance();
      } else {
        setStatus(4);
        await tokenPayHandler(payParams);
        await refreshTokenDetails();
      }
    }
  };

  useEffect(() => {
    if (isETH()) {
      refreshETH();
    } else if (tokenInfo[token]) {
      const adjustedAmount = ethers.utils.parseUnits(amount || "0", tokenInfo[token].decimals);
      const hasEnoughAllowance = tokenInfo[token].allowance.lt(adjustedAmount);
      const hasEnoughBalance = tokenInfo[token].balance.gte(adjustedAmount);
      setStatus(hasEnoughBalance ? (hasEnoughAllowance ? 1 : 3) : 5);
    }
  }, [amount]);

  useEffect(() => {
    if (!isETH()) {
      setStatus(0);
      refreshTokenDetails();
    } else {
      refreshETH();
    }
  }, [token, callerAddress]);

  useEffect(() => {
    const erc20List = Object.keys(readContracts).reduce((acc, contract) => {
      if (typeof readContracts[contract].decimals !== "undefined") {
        acc.push(contract);
      }

      return acc;
    }, []);

    if (tokenListHandler && (typeof tokenListHandler).toLowerCase() === "function") {
      tokenListHandler(erc20List);
    }
  }, [readContracts]);

  const renderButtonText = () => {
    let text = "Loading...";

    switch (status) {
      case 1:
        text = `Approve ${appName} to transfer ${token}`;
        break;
      case 2:
        text = `Approving ${token}...`;
        break;
      case 3:
        text = `Deposit ${token}`;
        break;
      case 4:
        text = `Depositing ${token}...`;
        break;
      case 5:
        text = `Not enough ${token}`;
        break;
      default:
        text = "Loading...";
        break;
    }

    return text;
  };

  return (
    <Button
      disabled={disabledStatus.indexOf(status) >= 0 || !(amount > 0)}
      loading={loadingStatus.indexOf(status) >= 0}
      style={style}
      onClick={handlePay}
    >
      {renderButtonText()}
    </Button>
  );
}
