import { Select } from "antd";
import { useState, useMemo, useContext, useEffect } from "react";
import { ethers } from "ethers";
import { loadERC20 } from "../helpers";

import { TokensContext } from "../context";

/**
 * Returns tokens matching the provided search term.
 * 
 * @param {string} term a search term
 * @param {Array} tokenList a list of tokens to search in
 * @returns 0 or more matching results
 */
const findMatchingTokens = (term, tokenList) => {
  const results = [];
  for (let i = 0; i < tokenList.length; ++i) {
    const token = tokenList[i];
    if (token.name.indexOf(term) !== -1 ||
      token.symbol.indexOf(term) !== -1 ||
      token.address.indexOf(term) !== -1) {
      results.push(token);
    }
  }
  return results;
};

/*
  Usage:
  <TokenSelect
    chainId={1}
    onChange={setToAddress}
    localProvider={localProvider}
    nativeToken={{ name: 'Native token', symbol: 'ETH' }}
  />
*/
export default function TokenSelect({onChange, chainId = 1, nativeToken = {}, localProvider, ...props }) {
  const [value, setValue] = useState(props.value);
  const { knownTokens } = useContext(TokensContext);
  const [searchResults, setSearchResults] = useState([]);

  const nativeTokenObj = {
    chainId: chainId,
    decimals: 18,
    name: "Default Token",
    symbol: "GTC",
    address: "0xdA5B7E522c39d40C32C656bc1b49D4fE4Cb5F328",
    logoURI: "https://assets.coingecko.com/coins/images/15810/thumb/gitcoin.png?1621992929",
    ...nativeToken,
  };

  const optionFragment = i => (
    <div style={{ display: "flex", alignItems: "center" }}>
      {i.logoURI && (
        <div style={{ marginRight: "5px" }}>
          <img src={i.logoURI} alt={`${i.name} (${i.symbol})`} />
        </div>
      )}
      {i.name} - {i.symbol} {i.address?.substr(0, 5) + "..." + i.address?.substr(-4)}{" "}
      {i.unlisted && <span style={{ fontStyle: "italic", fontSize: "12px", marginLeft: "3px" }}> (unlisted) </span>}
    </div>
  );

  const loadUnlistedToken = async (aTokenAddress) => {
    try {
      const checksumAddress = ethers.utils.getAddress(aTokenAddress);
      const tokenInfo = localProvider ? await loadERC20(checksumAddress, localProvider) : {};
      return {
        chainId: chainId,
        name: null,
        unlisted: true,
        symbol: null,
        address: checksumAddress,
        logoURI: "",
        ...tokenInfo,
      };
    } catch (error) {
      console.error("Could not resolve token details! " + error);
    }
  };

  const loadTokenDetails = async (aTokenAddress) => {
    if (!aTokenAddress || aTokenAddress === null || aTokenAddress === "") {
      return;
    }
    let tokenDetails = findMatchingTokens(aTokenAddress, knownTokens).filter(i => i.chainId === chainId)[0];
    if (!tokenDetails) {
      if (nativeTokenObj.address === aTokenAddress) {
        tokenDetails = nativeTokenObj;
      } else {
        tokenDetails = await loadUnlistedToken(aTokenAddress);
      }
    }

    setSearchResults([tokenDetails]);
    setValue({value: aTokenAddress, label: optionFragment(tokenDetails)});
  };

  useEffect(() => {
    loadTokenDetails(props.value)
      .catch(console.error);
  }, [props.value]);

  const children = useMemo(() => {
    if (searchResults.length < 1) {
      return [];
    }

    // use search result to format children
    return searchResults.map(i => (
      <Select.Option key={i.address} style={{ paddingTop: "5px", paddingBottom: "5px" }} value={i.address}>
        {optionFragment(i)}
      </Select.Option>
    ));
  }, [searchResults]);

  const handleSearch = async val => {
    let collectionResult = [];

    if (val.length > 0) {
      // TODO : Do all search & filtering here
      collectionResult = findMatchingTokens(val, knownTokens).filter(i => i.chainId === chainId);

      if (collectionResult.length < 1) {
        collectionResult.push(nativeTokenObj);
        const tokenDetails = await loadUnlistedToken(val);
        if (tokenDetails !== undefined) {
          collectionResult = [
            tokenDetails
          ];
        }
      }
    }

    setSearchResults(collectionResult);
  };

  const handleOnChange = async e => {
    setSearchResults([]);

    // TODO : check if it's an address that's not on list & Add as unlisted

    setValue(e);

    if (typeof onChange === "function") {
      onChange(e.value);
    }
  };

  return (
    <Select
      showSearch
      size="large"
      showArrow={false}
      defaultActiveFirstOption={false}
      onSearch={handleSearch}
      filterOption={false}
      labelInValue={true}
      id="0xERC20TokenSelect" // name it something other than address for auto fill doxxing
      name="0xERC20TokenSelect" // name it something other than address for auto fill doxxing
      placeholder={props.placeholder ? props.placeholder : "Token search... Eg: GTC"}
      value={value}
      onChange={handleOnChange}
      notFoundContent={null}
      style={{ width: "100%" }}
    >
      {children}
    </Select>
  );
}