import { useState, useEffect } from "react";
import { loadAppContracts } from "../helpers/loadAppContracts";

export const useContractConfig = () => {
  const [contractsConfig, setContractsConfig] = useState({});

  const loadFunc = async () => {
    const result = await loadAppContracts();
    setContractsConfig(result);
  };
  useEffect(() => {
    loadFunc()
      .catch(console.error);
  }, []);
  return contractsConfig;
};
