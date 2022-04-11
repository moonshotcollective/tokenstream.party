import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

import { TokensContext } from "../context";

export default function TokensContextProvider({ children }) {

    const mountedRef = useRef(true);

    const [tokensData, setTokensData] = useState([]);
    const [listedTokensData, setListedTokensData] = useState([]);

    const loadKnownTokens = async () => {
        const res = await axios.get("https://tokens.coingecko.com/uniswap/all.json");
        const { tokens } = res.data;
        if (!mountedRef.current) return null;
        setTokensData(tokens);
    };

    const loadCoingeckoTokenList = async () => {
        // this returns the same data as https://api.coingecko.com/api/v3/coins/list
        const res = await axios.get("/known-tokens.json");
        if (!mountedRef.current) return null;
        setListedTokensData(res.data);
    }

    useEffect(() => {
        loadKnownTokens()
            .catch(console.error);
        return () => {
            mountedRef.current = false
        };
    }, []);

    useEffect(() => {
        loadCoingeckoTokenList()
            .catch(console.error);
        return () => {
            mountedRef.current = false
        };
    }, []);

    return (
        <TokensContext.Provider value={{ knownTokens: tokensData, listedTokens: listedTokensData }}>
            {children}
        </TokensContext.Provider>
    );
}