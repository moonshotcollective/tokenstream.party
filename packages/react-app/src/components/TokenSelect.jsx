import { Select } from "antd";
import { useState, useMemo, useContext } from "react";
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
export default function TokenSelect({ defaultValue, onChange, chainId = 1, nativeToken = {}, localProvider, ...props }) {
  const [value, setValue] = useState(defaultValue || null);
  const { knownTokens } = useContext(TokensContext);
  const [searchResults, setSearchResults] = useState([]);

  const children = useMemo(() => {
    if (searchResults.length < 1) {
      return [];
    }

    // use search result to format children
    return searchResults.map(i => (
      <Select.Option key={i.address} style={{ paddingTop: "5px", paddingBottom: "5px" }} value={i.address}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {i.logoURI && (
            <div style={{ marginRight: "5px" }}>
              <img src={i.logoURI} alt={`${i.name} (${i.symbol})`} />
            </div>
          )}
          {i.name} - {i.symbol} {i.address?.substr(0, 5) + "..." + i.address?.substr(-4)}{" "}
          {i.unlisted && <span style={{ fontStyle: "italic", fontSize: "12px", marginLeft: "3px" }}> (unlisted) </span>}
        </div>
      </Select.Option>
    ));
  }, [searchResults]);

  const handleSearch = async val => {
    let collectionResult = [];

    if (val.length > 0) {
      // TODO : Do all search & filtering here
      collectionResult = findMatchingTokens(val, knownTokens).filter(i => i.chainId === chainId);

      if (collectionResult.length < 1) {
        const nativeTokenObj = {
          chainId: chainId,
          decimals: 18,
          name: "Default Token",
          symbol: "GTC",
          address: "0xdA5B7E522c39d40C32C656bc1b49D4fE4Cb5F328",
          logoURI: "https://assets.coingecko.com/coins/images/15810/thumb/gitcoin.png?1621992929",
          ...nativeToken,
        };

        collectionResult.push(nativeTokenObj);

        try {
          const checksumAddress = ethers.utils.getAddress(val);
          // load contract and try to get name and symbol if there's a provider given
          const tokenInfo = localProvider ? await loadERC20(checksumAddress, localProvider) : {};
          collectionResult = [
            {
              chainId: chainId,
              name: null,
              unlisted: true,
              symbol: null,
              address: checksumAddress,
              logoURI: "",
              ...tokenInfo,
            },
          ];
        } catch (error) {
          console.log(`Could not identify this token`);
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