import Portis from "@portis/web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Layout, Alert, Button, Col, Row, Menu } from "antd";
import "antd/dist/antd.css";
import Authereum from "authereum";
import { useBalance, useContractLoader, useGasPrice } from "eth-hooks";
// import useEventListener from "./hooks/oldEventListener";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import Fortmatic from "fortmatic";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
//import Torus from "@toruslabs/torus-embed"
import WalletLink from "walletlink";
import { SafeAppWeb3Modal } from "@gnosis.pm/safe-apps-web3modal";
import "./App.css";
import { Account, Contract, Faucet, GitcoinDAOBadge, TokenStreamLogo, NetworkSwitch } from "./components";
import { INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import { useContractConfig, useUserSigner, useStaticJsonRPC } from "./hooks";
import { OrganizationHome, OrganizationBrowsePage } from "./views";
import { LandingPage } from "./views/LandingPage";
import { GithubOutlined } from "@ant-design/icons";


const { ethers } = require("ethers");
const { Header, Content, Footer } = Layout;

// 😬 Sorry for all the console logging
const DEBUG = false;
const NETWORKCHECK = true;

// 🛰 providers
if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

// 🛰 providers
const providers = [
  process.env.REACT_APP_MAINNET_RPC_ENDPOINT,
  "https://eth-mainnet.alchemyapi.io/v2/4eQGdKbc4zxHaDCEQG1wmi98KPRUht_t",
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
];

// Supported networks
const supportedNetworks = ["mainnet", "rinkeby"];
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  supportedNetworks.push("localhost");
}

const cachedNetwork = supportedNetworks.includes(window.localStorage.getItem("network"))
    ? window.localStorage.getItem("network")
    : "rinkeby";

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: "coinbase",
});

// WalletLink provider
const walletLinkProvider = walletLink.makeWeb3Provider(
  "https://eth-mainnet.alchemyapi.io/v2/4eQGdKbc4zxHaDCEQG1wmi98KPRUht_t",
  1,
);

// Portis ID: 6255fb2b-58c8-433b-a2c9-62098c05ddc9
/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new SafeAppWeb3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "light", // optional. Change to "dark" for a dark theme.
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        bridge: "https://polygon.bridge.walletconnect.org",
        infuraId: INFURA_ID,
        rpc: {
          1: "https://eth-mainnet.alchemyapi.io/v2/4eQGdKbc4zxHaDCEQG1wmi98KPRUht_t", // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          42: `https://kovan.infura.io/v3/${INFURA_ID}`,
          100: "https://dai.poa.network", // xDai
        },
      },
    },
    portis: {
      display: {
        logo: "https://user-images.githubusercontent.com/9419140/128913641-d025bc0c-e059-42de-a57b-422f196867ce.png",
        name: "Portis",
        description: "Connect to Portis App",
      },
      package: Portis,
      options: {
        id: "6255fb2b-58c8-433b-a2c9-62098c05ddc9",
      },
    },
    fortmatic: {
      package: Fortmatic, // required
      options: {
        key: "pk_live_5A7C91B2FC585A17", // required
      },
    },
    "custom-walletlink": {
      display: {
        logo: "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
        name: "Coinbase",
        description: "Connect to Coinbase Wallet (not Coinbase App)",
      },
      package: walletLinkProvider,
      connector: async (provider, _options) => {
        await provider.enable();
        return provider;
      },
    },
    authereum: {
      package: Authereum, // required
    },
  },
});

function App(props) {
  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState("0x0000000000000000000000000000000000000000");

  const [selectedNetwork, setSelectedNetwork] = useState(cachedNetwork || supportedNetworks[1]);
  if (DEBUG) console.log("📡 Connecting to New Cached Network: ", cachedNetwork);

  let targetNetwork = NETWORKS[selectedNetwork];

  if (DEBUG) console.log(`Connecting to ${selectedNetwork}`);
  if (DEBUG) console.log(`Network info: ${targetNetwork}`);

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  const localProvider = useStaticJsonRPC([
    targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userSigner = useUserSigner(injectedProvider, localProvider, true);
  // const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, false);

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  const contractConfig = useContractConfig();

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
  ]);

  let networkDisplay = "";
  if (NETWORKCHECK && localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <Button
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];
                    console.log("data", data);

                    let switchTx;
                    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
                    try {
                      switchTx = await ethereum.request({
                        method: "wallet_switchEthereumChain",
                        params: [{ chainId: data[0].chainId }],
                      });
                    } catch (switchError) {
                      // not checking specific error code, because maybe we're not using MetaMask
                      try {
                        switchTx = await ethereum.request({
                          method: "wallet_addEthereumChain",
                          params: data,
                        });
                      } catch (addError) {
                        // handle "add" error
                      }
                    }

                    if (switchTx) {
                      console.log(switchTx);
                    }
                  }}
                >
                  <b>{networkLocal && networkLocal.name}</b>
                </Button>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "fixed", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.requestProvider();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId === 31337 &&
    yourLocalBalance &&
    ethers.utils.formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            faucetTx({
              to: address,
              value: ethers.utils.parseEther("0.01"),
            });
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }

  const location = useLocation();

  return (
    <Layout className="layout">
      <div className="App">
        {/* ✏️ Edit the header and change the title to your project name */}
        <Header className="main-header">
          <a href="/" target="_blank" rel="noopener noreferrer" className="navbar-title">
          <div className="logo">
            <TokenStreamLogo width="120" height="40" />
          </div>
          <span className="logo-name">Tokenstream.Party</span>
          </a>
          {location.pathname === "/" && (
            <Menu
              theme="dark"
              mode="horizontal"
              className="main-menu"
            >
              <Menu.Item>
                <Link
                  onClick={() => {
                    setRoute("/app");
                  }}
                  to="/app"
                >
                  <Button size="large" type="primary" style={{
                    color: "#110440"
                  }}>
                    <strong>Launch App</strong>
                  </Button>
                </Link>
              </Menu.Item>
            </Menu>
          )}
          {(location.pathname !== "/") && 
            <div className="account-details">
            <Account
                address={address}
                localProvider={localProvider}
                userSigner={userSigner}
                mainnetProvider={mainnetProvider}
                price={price}
                web3Modal={web3Modal}
                loadWeb3Modal={loadWeb3Modal}
                logoutOfWeb3Modal={logoutOfWeb3Modal}
                blockExplorer={blockExplorer}
                isContract={false}
                networkSelect={
                  <NetworkSwitch
                    networkOptions={supportedNetworks}
                    selectedNetwork={selectedNetwork}
                    setSelectedNetwork={setSelectedNetwork}
                    NETWORKS={NETWORKS}
                    targetNetwork={targetNetwork}
                  />
                }
              />
              {faucetHint}
              </div>
          }
          {networkDisplay}
        </Header>
        <Content style={{ marginTop: '2em', padding: '0 50px' }}>
          <div className="site-layout-content">
          <Switch>
            <Route exact path="/">
              <LandingPage />
            </Route>
            <Route exact path={["/app", "/organizations"]}>
              <OrganizationBrowsePage
                  tx={tx}
                  userAddress={address}
                  writeContracts={writeContracts}
                  provider={injectedProvider || localProvider}
                  readContracts={readContracts}
                  chainId={selectedChainId}
                  mainnetProvider={mainnetProvider}
              />
            </Route>
            <Route path="/organizations/:orgaddress">
              <OrganizationHome
                mainnetProvider={mainnetProvider}
                provider={injectedProvider || localProvider}
                address={address}
                tx={tx}
                price={price}
                userSigner={userSigner}
                writeContracts={writeContracts}
                readContracts={readContracts}
                blockExplorer={blockExplorer}
              />
            </Route>
            <Route exact path="/debug">
              {/*
                  🎛 this scaffolding is full of commonly used components
                  this <Contract/> component will automatically parse your ABI
                  and give you a form to interact with it locally
              */}
              <Contract
                name="OrgFactoryDeployer"
                signer={userSigner}
                provider={localProvider}
                address={address}
                blockExplorer={blockExplorer}
                contractConfig={contractConfig}
              />

              {targetNetwork.name !== "mainnet" && (
                <>
                  <Contract
                    name="GTC"
                    signer={userSigner}
                    provider={localProvider}
                    address={address}
                    blockExplorer={blockExplorer}
                    contractConfig={contractConfig}
                  />
                  <Contract
                    name="SupCoin"
                    signer={userSigner}
                    provider={localProvider}
                    address={address}
                    blockExplorer={blockExplorer}
                    contractConfig={contractConfig}
                  />
                </>
              )}
            </Route>
          </Switch>
          </div>
        </Content>

        <Footer className="ts-footer">
          {location.pathname === "/" && (
          <a href="https://moonshotcollective.space/" target="_blank">
            Built with 💜 by the Gitcoin community | Moonshot Collective
          </a>
          )}
          {location.pathname !== "/" && (
            <Menu
              mode="horizontal"
              selectable={false}
              className="footer-menu"
            >
              <Menu.Item key="gc-dao">
                <a href="https://moonshotcollective.space/" target="_blank">
                  <GitcoinDAOBadge width={128} height={32} />
                </a>
              </Menu.Item>
              <Menu.Item key="gh-link">
                <a href="https://github.com/moonshotcollective/tokenstream.party" target="_blank">
                  <GithubOutlined />
                </a>
              </Menu.Item>
              <Menu.Item key="telegram-link">
                <a href="https://t.me/+KxW7py1dFPA0MWJh" target="_blank">
                  Join us on Telegram
                </a>
              </Menu.Item>
              <Menu.Item key="feedback-link">
                <a href="https://docs.google.com/forms/d/e/1FAIpQLScmjCzXSZZXIJAeqZOUB0f5dwhkwgbo5G5WiVakx8keNJ_Tpg/viewform?usp=sf_link" target="_blank">
                  Share Your Feedback
                </a>
              </Menu.Item>
            </Menu>
          )}
        </Footer>

        {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
        {(location.pathname !== "/" && targetNetwork.name.indexOf("mainnet") === -1) &&
        <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10, zIndex: 9999 }}>
          {/* <Row align="middle" gutter={[4, 4]}>
            <Col span={8}>
              <Ramp price={price} address={address} networks={NETWORKS} />
            </Col>

            <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
              <GasGauge gasPrice={gasPrice} />
            </Col>
            <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
              <Button
                onClick={() => {
                  window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
                }}
                size="large"
                shape="round"
              >
                <span style={{ marginRight: 8 }} role="img" aria-label="support">
                  💬
                </span>
                Support
              </Button>
            </Col>
          </Row> */}

          <Row align="middle" gutter={[4, 4]}>
            <Col span={24}>
              {
                /*  if the local provider has a signer, let's show the faucet:  */
                faucetAvailable ? (
                  <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
                ) : (
                  ""
                )
              }
            </Col>
          </Row>
        </div>
        }
      </div>
    </Layout>
  );
}

export default App;
