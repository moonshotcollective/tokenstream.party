import { Card } from "antd";
import React, { useMemo, useState } from "react";
import { useContractExistsAtAddress, useContractLoader } from "eth-hooks";
import Account from "../Account";
import DisplayVariable from "./DisplayVariable";
import FunctionForm from "./FunctionForm";

const noContractDisplay = (
  <div>
    Loading...{" "}
  </div>
);

const isQueryable = fn => (fn.stateMutability === "view" || fn.stateMutability === "pure") && fn.inputs.length === 0;

export default function Contract({
  customContract,
  account,
  gasPrice,
  signer,
  provider,
  name,
  show,
  price,
  blockExplorer,
  chainId,
  contractConfig,
}) {
  const contracts = useContractLoader(provider, contractConfig, chainId);
  let contract;
  if (!customContract) {
    contract = contracts ? contracts[name] : "";
  } else {
    contract = customContract;
  }

  const address = contract ? contract.address : "";
  const contractIsDeployed = useContractExistsAtAddress(provider, address);

  const displayedContractFunctions = useMemo(() => {
    const results = contract
      ? Object.values(contract.interface.functions).filter(
          fn => fn.type === "function" && !(show && show.indexOf(fn.name) < 0),
        )
      : [];
    return results;
  }, [contract, show]);

  const [refreshRequired, triggerRefresh] = useState(false);
  const contractDisplay = displayedContractFunctions.map(contractFuncInfo => {
    const contractFunc =
      contractFuncInfo.stateMutability === "view" || contractFuncInfo.stateMutability === "pure"
        ? contract[contractFuncInfo.name]
        : contract.connect(signer)[contractFuncInfo.name];

    if (typeof contractFunc === "function") {
      if (isQueryable(contractFuncInfo)) {
        // If there are no inputs, just display return value
        return (
          <DisplayVariable
            key={contractFuncInfo.name}
            contractFunction={contractFunc}
            functionInfo={contractFuncInfo}
            refreshRequired={refreshRequired}
            triggerRefresh={triggerRefresh}
          />
        );
      }

      // If there are inputs, display a form to allow users to provide these
      return (
        <FunctionForm
          key={"FF" + contractFuncInfo.name}
          contractFunction={contractFunc}
          functionInfo={contractFuncInfo}
          provider={provider}
          gasPrice={gasPrice}
          triggerRefresh={triggerRefresh}
        />
      );
    }
    return null;
  });

  return (
    <div style={{ margin: "auto", width: "70vw" }}>
      <Card
        title={
          <div>
            {name}
            <div style={{ float: "right" }}>
              <Account
                address={address}
                localProvider={provider}
                injectedProvider={provider}
                mainnetProvider={provider}
                price={price}
                blockExplorer={blockExplorer}
              />
              {account}
            </div>
          </div>
        }
        size="large"
        style={{ marginTop: 25, width: "100%" }}
        loading={contractDisplay && contractDisplay.length <= 0}
      >
        {contractIsDeployed ? contractDisplay : noContractDisplay}
      </Card>
    </div>
  );
}
