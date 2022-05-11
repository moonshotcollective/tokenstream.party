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
  yourLocalBalance = ethers.BigNumber.from(0),
  ethPayHandler,
  tokenPayHandler,
}) {
  const [tokenInfo, setTokenInfo] = useState({});
  const [status, setStatus] = useState(0); // loading | lowAllowance | approving | ready | distributing | noBalance

  const refreshETH = () => {
    try {
      setStatus(yourLocalBalance.gte(ethers.utils.parseEther(amount || "0")) ? 3 : 5);
    } catch (err) {
      console.err(err);
    }
  };

  const tokenContract = token.tokenContract;

  const refreshTokenDetails = async () => {
    console.log(`Your token is: `, tokenContract);

    const decimals = await tokenContract.decimals();
    const allowance = await tokenContract.allowance(callerAddress, spender);
    const balance = await tokenContract.balanceOf(callerAddress);
    const address = tokenContract.address;

    const adjustedAmount = ethers.utils.parseUnits(amount || "0", decimals);
    const hasEnoughAllowance = allowance.lt(adjustedAmount);

    const data = { ...tokenInfo, [token.symbol]: { decimals, allowance, address, balance } };
    setTokenInfo(data);

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

  const genericErrorHandler = (err) => {
    console.error(err);
    notification.error({
      message: "Token approval unsuccessful",
      description: `Please retry!`,
      placement: "topRight",
    });
  };

  const approveTokenAllowance = async () => {
    setStatus(2);
    const approvalAmount = maxApproval;
    const approvalToken = token.symbol;
    const newAllowance = ethers.utils.parseUnits(maxApproval, tokenInfo[token.symbol].decimals);

    try {
      await tx(tokenContract.approve(spender, newAllowance).catch(genericErrorHandler), async update => {
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
            description: `${approvalAmount} ${approvalToken} was approved for TokenStream.`,
            placement: "topRight",
          });
          await refreshTokenDetails();
        } else {
          setStatus(1);
        }
      });
    } catch (err) {
      genericErrorHandler(err);
    }
  };

  const isETH = () => {
    if (token.symbol === undefined) {
      return false;
    }
    return token.symbol.toUpperCase() === "ETH";
  };

  const handlePay = async () => {
    const payParams = { token: token.symbol, ...tokenInfo[token.symbol] };
    if (isETH()) {
      setStatus(4);
      await ethPayHandler();
      setStatus(3);
    } else {
      if (status === 1) {
        await approveTokenAllowance();
      } else {
        setStatus(4);
        await tokenPayHandler(payParams)
          .then(_ => {
            refreshTokenDetails();
          })
          .catch(err => {
            genericErrorHandler(err);
            setStatus(3);
          });
      }
    }
  };

  useEffect(() => {
    if (isETH()) {
      refreshETH();
    } else if (token.symbol && tokenInfo[token.symbol]) {
      try {
        const adjustedAmount = ethers.utils.parseUnits(amount || "0", tokenInfo[token.symbol].decimals);
        const hasEnoughAllowance = tokenInfo[token.symbol].allowance.lt(adjustedAmount);
        const hasEnoughBalance = tokenInfo[token.symbol].balance.gte(adjustedAmount);
        setStatus(hasEnoughBalance ? (hasEnoughAllowance ? 1 : 3) : 5);
      } catch (err) {
        console.error(err);
      }
    }
  }, [amount]);

  useEffect(() => {
    if (!isETH()) {
      setStatus(0);
      refreshTokenDetails();
    } else {
      refreshETH();
    }
  }, [callerAddress]);

  const renderButtonText = () => {
    let text;

    switch (status) {
      case 1:
        text = `Approve ${appName} to transfer ${token.symbol}`;
        break;
      case 2:
        text = `Approving ${token.symbol}...`;
        break;
      case 3:
        text = `Deposit ${token.symbol}`;
        break;
      case 4:
        text = `Depositing ${token.symbol}...`;
        break;
      case 5:
        text = `Not enough ${token.symbol}`;
        break;
      default:
        text = "Loading...";
        break;
    }

    return text;
  };

  return (
    <Button
      disabled={disabledStatus.indexOf(status) >= 0 || amount <= 0}
      loading={loadingStatus.indexOf(status) >= 0}
      style={style}
      onClick={handlePay}
    >
      {renderButtonText()}
    </Button>
  );
}
