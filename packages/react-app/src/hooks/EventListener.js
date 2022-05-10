import { useCallback, useState } from "react";

/*
  ~ What it does? ~

  Enables you to keep track of events

  ~ How can I use? ~

  const setPurposeEvents = useEventListener(readContracts, "YourContract", "SetPurpose", localProvider, 1);

  ~ Features ~

  - Provide readContracts by loading contracts (see more on ContractLoader.js)
  - Specify the name of the contract, in this case it is "YourContract"
  - Specify the name of the event in the contract, in this case we keep track of "SetPurpose" event
  - Specify the provider
*/

export default function useEventListener() {
  const [updates, setUpdates] = useState([]);

  const handleUpdates = useCallback((contracts, contractName, eventName, provider, startBlock, args) => {
    if (typeof provider !== "undefined" && typeof startBlock !== "undefined") {
      // if you want to read _all_ events from your contracts, set this to the block number it is deployed
      provider.resetEventsBlock(startBlock);
    }
    if (contracts && contractName && contracts[contractName]) {
      try {
        contracts[contractName].on(eventName, (...args) => {
          const blockNumber = args[args.length - 1].blockNumber;
          const getBlockData = async () => {
            const bd = await args[args.length - 1].getBlock();
            setUpdates(messages => [{ blockNumber, timestamp: bd.timestamp, ...args.pop().args }, ...messages]);
          };
          getBlockData();
        });
        return () => {
          contracts[contractName].removeListener(eventName);
        };
      } catch (e) {
        console.log(e);
      }
    }
  }, []);

  return [updates, handleUpdates];
}
