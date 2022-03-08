# TokenStream.Party

dApp for streaming payments for developers completing work based on a trustless system. Anyone is able to fund an individual developer or fund the Moonshot Collective as a whole.

# 🏄‍♂️ Quick Start

Prerequisites: [Node](https://nodejs.org/en/download/) plus [Yarn](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork tokenstream.party:

```bash
git clone https://github.com/MoonshotCollective/gtc-streams.git tokenstream
```

> install and start your 👷‍ Hardhat chain:

```bash
cd tokenstream
yarn install
yarn chain
```

> Make a copy of `.sample.env` and rename to `.env` in `packages/react-app`. Don't forget to fill in the variables.
<table>
    <thead>
        <th>Variable</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>
            <td><code>REACT_APP_NETWORK</code></td>
            <td>The ethereum network to run on, by default "mainnet"</td>
        </tr>
        <tr>
            <td><code>REACT_APP_INFURA_ID</code></td>
            <td>Your Infura project ID.</td>
        </tr>
        <tr>
            <td><code>REACT_APP_ETHERSCAN_ID</code></td>
            <td>Your Etherscan API key token.</td>
        </tr>
        <tr>
            <td><code>REACT_APP_PROVIDER</code></td>
            <td>Provider endpoint, typically Infura endpoint.</td>
        </tr>
        <tr>
            <td><code>REACT_APP_MAINNET_RPC_ENDPOINT</code></td>
            <td>Can be used to override the mainnet RPC provider endpoint (typically Alchemy endpoint).</td>
        </tr>
    </tbody>
</table>
> in a second terminal window, start your 📱 frontend:

```bash
cd tokenstream
yarn start
```

> Make a copy of `.sample.env` and rename to `.env` in `packages/hardhat`. Don't forget to fill in the variables.
<table>
    <thead>
        <th>Variable</th>
        <th>Description</th>
    </thead>
    <tbody>
        <tr>
            <td><code>STREAM_FACTORY_OWNER</code></td>
            <td>Owner address of the stream factory contract <code>packages/hardhat/contracts/StreamFactory.sol</code></td>
        </tr>
        <tr>
            <td><code>STREAM_FACTORY_ADMINS</code></td>
            <td>Admin addresses of the stream factory contract constructor arg <code>packages/hardhat/contracts/StreamFactory.sol</code></td>
        </tr>
        <tr>
            <td><code>DEPLOY_ENDPOINT_RINKEBY</code></td>
            <td>Your Infura / Alchemy endpoint for tokenstream on Rinkeby network</td>
        </tr>
        <tr>
            <td><code>DEPLOY_ACCOUNT_RINKEBY</code></td>
            <td>Your wallet account. For metamask, the private key can be extracted by clicking on the three dots button next to the account icon, then on "Account Details" and then on "Export private key".</td>
        </tr>
    </tbody>
</table>
> in a third terminal window, 🛰 deploy your contract:

```bash
cd tokenstream
yarn deploy
```
