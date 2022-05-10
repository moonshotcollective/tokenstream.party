import { useState, useEffect } from "react";
import { loadERC20 } from "../helpers";
import Address from "./Address";

const fetchTokenInfo = async (tokenAddress, provider, onLoad) => {
    await loadERC20(tokenAddress, provider)
        .then(data => {
            onLoad(data);
        })
};

export default function TokenDisplay({tokenAddress, provider}) {
    const [info, setInfo] = useState({});

    useEffect(() => {
        fetchTokenInfo(tokenAddress, provider, setInfo)
            .catch(console.error);
    }, [tokenAddress])
    return (
        <span>
            <Address address={tokenAddress} fontSize="1em" />
            &nbsp;
            {info.name} (<small><strong>{info.symbol}</strong></small>)
        </span>
    )
}