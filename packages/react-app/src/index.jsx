import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import React from "react";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import { TokensContextProvider } from "./components";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";

const themes = {
  dark: `${process.env.PUBLIC_URL}/dark-theme.css`,
  light: `${process.env.PUBLIC_URL}/light-theme.css`,
};

const subgraphUri = process.env.REACT_APP_SUBGRAPH_ENDPOINT || "https://thegraph.com/hosted-service/subgraph/supriyaamisshra/tokenstream-mainnet";
//"http://localhost:8000/subgraphs/name/tokenstreams/org-factory";

const client = new ApolloClient({
  uri: subgraphUri,
  cache: new InMemoryCache(),
});

ReactDOM.render(
  <TokensContextProvider>
    <ApolloProvider client={client}>
      <ThemeSwitcherProvider themeMap={themes} defaultTheme={"dark"}>
        <BrowserRouter>
          <App subgraphUri={subgraphUri} />
        </BrowserRouter>
      </ThemeSwitcherProvider>
    </ApolloProvider>
  </TokensContextProvider>,
  document.getElementById("root"),
);
