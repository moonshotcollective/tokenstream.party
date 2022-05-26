import { useHistory } from "react-router";
import { useParams } from "react-router-dom";
import { Col, Row, Button, Space, Divider, Spin, Timeline, notification, Tooltip, Skeleton } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import { gql, useQuery } from "@apollo/client";
import { Blockie, Address, Balance, WithdrawIcon, DepositIcon, StreamDepositModal, StreamWithdrawModal } from "../components";
import { useEffect, useState, useContext } from "react";
import axios from "axios";
import pretty from "pretty-time";
import { ethers } from "ethers";
import { TokensContext } from "../context";
import StreamProgress from "../components/StreamProgress";
import Title from "antd/lib/skeleton/Title";

const GET_USER_STREAMS_ACTIVITIES = gql`
  query GetActivitiesForStream($streamAddress: String!, $orgAddress: String!) {
    
    streamActivities(where: {organization_in: [$orgAddress], stream_in: [$streamAddress]}, orderBy: createdAt, orderDirection: desc) {
        actor
        amount
        eventType
        info
        createdAt
    }
  }

`;

export default function UserStream({
    orgStreamsReadContract,
    orgStreamsWriteContract,
    mainnetProvider,
    tx,
    account,
    tokenInfo
}) {

    const history = useHistory();
    const { orgaddress: organizationAddress, name: streamName } = useParams();
    const [info, setInfo] = useState({});
    const [quoteRate, setQuoteRate] = useState(0);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    const [ expectedEventCount, setExpectedEventCount ] = useState();
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);
    const { listedTokens } = useContext(TokensContext);

    useEffect(() => {
        const tokenId = (listedTokens.filter(token => token.name === tokenInfo.name).map(token => token.id)[0]) || 'unknown';
        axios
            .get(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${tokenId}`
            )
            .then((response) => {
                if (response && response.data[0] && response.data[0].current_price) {
                    setQuoteRate(response.data[0].current_price);
                }
            });
    });

    const streamActivityResult = useQuery(GET_USER_STREAMS_ACTIVITIES, {
        variables: {
            streamAddress: organizationAddress.toLowerCase() + streamName,
            orgAddress: organizationAddress.toLowerCase()
        },
        onCompleted: (data) => {
            if (data?.streamActivities) {
                setExpectedEventCount(data.streamActivities?.length);
            }
        }
    });

    const refreshStreamActivity = () => {
        setExpectedEventCount(expectedEventCount + 1);
        streamActivityResult.startPolling(150);
        setTimeout(streamActivityResult.stopPolling, 30000);
    };

    const getStreamBalanceAndInfo = async () => {
        if (!orgStreamsReadContract) {
            return;
        }
        const infoResult = await orgStreamsReadContract.getStreamView(streamName);
        setInfo({
            address: infoResult[0],
            cap: infoResult[1],
            frequency: infoResult[2],
            last: infoResult[3],
            balance: infoResult[4],
            pledged: infoResult[5],
            name: infoResult[6],
            disabled: infoResult[7],
        });
        if (infoResult[7]) {
            setError("User stream has been disabled or does not exist!");
        } else {
            setReady(true);
        }
    };

    useEffect(() => {
        if (!error) {
            getStreamBalanceAndInfo()
                .catch(console.error);
        }
    }, [error]);

    const reloadStream = () => {
        getStreamBalanceAndInfo()
            .catch(console.error);
        refreshStreamActivity();
    };

    const displayStreamDetails = ready && !error;

    const tokenSymbol = `${tokenInfo.symbol ? tokenInfo.symbol : ''}`;
    const WithdrawDot = (wprops) => <div>
        <div><WithdrawIcon width={12} height={12} /></div>
        <Balance value={wprops.value} price={quoteRate} breakLine={true} tokenSymbol={tokenSymbol} size="1.1em" padding={4} />
    </div>;

    const DepositDot = (wprops) => <div>
        <div><DepositIcon width={12} height={12} /></div>
        <Balance value={wprops.value} price={quoteRate} breakLine={true} tokenSymbol={tokenSymbol} size="1.1em" padding={4} />
    </div>;

    const loadingStreamActivity = streamActivityResult.loading;
    const errorStreamActivity = streamActivityResult.error;

    const getTimelineEvents = () => {
        const streamEvents = streamActivityResult.data?.streamActivities;
        const events = !streamEvents ? [] : streamEvents.map(item => {
            return {
                type: item.eventType === 'StreamWithdrawEvent' ? 'withdraw' : 'deposit',
                key: `${item.eventType === 'StreamWithdrawEvent' ? 'w' : 'd'}-${item.createdAt}-${item.stream}`,
                timestamp: item.createdAt,
                from: item.actor,
                amount: item.amount,
                reason: item.info
            }
        });
        if (expectedEventCount && expectedEventCount != events.length) {
            events.splice(0, 0, {type: "loading"});
        }
        return events;
    };

    const isOwnStream = () => {
        return info.address === account;
    };

    const handleStreamWithMessage = (notif, cb) => async (update) => {
        console.log("📡 Transaction Update:", update);
        if (update && (update.status === "confirmed" || update.status === 1)) {
            console.log(" 🍾 Transaction " + update.hash + " finished!");
            console.log(
                " ⛽️ " +
                update.gasUsed +
                "/" +
                (update.gasLimit || update.gas) +
                " @ " +
                parseFloat(update.gasPrice) / 1000000000 +
                " gwei"
            );
            notification.success({
                placement: "topRight",
                ...notif,
            });
            cb && cb();
        }
    };

    const toggleDepositFormModal = () => {
        setShowDepositForm(!showDepositForm);
    };

    const toggleWithdrawFormModal = () => {
        setShowWithdrawForm(!showWithdrawForm);
    };

    const instantToDeltaNsFromNow = (instant) => {
        // diff timestamps in ms, convert into nanos
        return (Date.now() - (instant * 1000)) * 1000000;
    };

    const isBalanceUnavailable = () => {
        return info.pledged.lte(ethers.constants.Zero);
    }

    return (
        <>
            {!ready && <Spin tip="Loading stream details..." />}
            {displayStreamDetails && <>
                <Row key="user-stream-info" gutter={[8, 16]} style={{ marginTop: "1em" }}>
                    <Col key="user-stream-name" span={24}>
                        <h2>{info.name}</h2>
                    </Col>
                </Row>
                <Row key="user-stream-navigation" gutter={[8, 16]}>
                    <Col key="user-stream-go-back" span={4}>
                        <Button type="text" icon={<LeftOutlined />} onClick={history.goBack}>Back</Button>
                    </Col>
                    <Col key="stream-actions" span={12} offset={8} style={{textAlign: "right"}}>
                        {isOwnStream() && 
                            <Tooltip title={isBalanceUnavailable() ? `No tokens available: deposit required!`: `Withdraw tokens`}>
                                <Button disabled={isBalanceUnavailable()} type="primary" onClick={toggleWithdrawFormModal} style={{marginRight: "2em"}}>Withdraw</Button>
                            </Tooltip>
                        }
                        <Button type="primary" onClick={toggleDepositFormModal}>Deposit</Button>
                    </Col>
                </Row>
                <Row key="user-stream-view" gutter={[24, 16]} style={{ marginTop: "1em", border: "solid 1px rgba(254,254,254,0.2)", padding: "2em 0" }}>
                    <Col key="user-stream-summary-section" span={6}>
                        <div>
                            <Blockie scale={5} size={24} address={info.address} />
                        </div>
                        <Space direction="vertical" />
                        <Address value={info.address} fontSize="1.3em" hideBlockies={true} ensProvider={mainnetProvider} />
                        <Divider className="user-stream-divider" />
                        <h5>Earned Balance</h5>
                        <div>
                            <Balance value={info.balance} price={quoteRate} size="1em" tokenSymbol={tokenSymbol} /> / <Balance value={info.cap} price={quoteRate} size="1em" tokenSymbol={tokenSymbol} />
                        </div>
                        <Divider className="user-stream-divider" />
                        <h5>Current Progress</h5>
                        <StreamProgress balance={info.balance} cap={info.cap} frequency={info.frequency} />
                        <Divider className="user-stream-divider" />
                        <h5>Stream Rate</h5>
                        <div>
                            <Balance value={info.cap} price={quoteRate} size="1em" tokenSymbol={tokenSymbol} /> every {pretty(info.frequency.toNumber() * 1000000000)}
                        </div>
                        {isOwnStream() && <>
                            <Divider className="user-stream-divider" />
                            <h5>Avaialble to Withdraw</h5>
                            <div>
                                <Balance value={info.pledged} price={quoteRate} size="1em" tokenSymbol={tokenSymbol} />
                            </div>
                        </>}
                    </Col>
                    <Col key="timeline-section" span={18}>
                        <Timeline className="user-stream-timeline">
                        {loadingStreamActivity && <Spin tip="Loading stream events..." />}
                        {errorStreamActivity && <p>Error loading stream events!</p>}
                        {!loadingStreamActivity && !errorStreamActivity && getTimelineEvents().map(event => {
                            if (event.type === "loading") {
                                return (<Timeline.Item color="gray">
                                    <p>
                                        Loading...
                                    </p>
                                </Timeline.Item>);
                            } else if (event.type === "withdraw") {
                                return (<Timeline.Item key={event.key} dot={<WithdrawDot value={event.amount} />} color="yellow">
                                            <div className="event-prefix">
                                                <small>pay out {pretty(instantToDeltaNsFromNow(event.timestamp))} ago to:</small>
                                            </div>
                                            <div className="event-prefix">
                                                <Address value={event.from} fontSize="1em" blockiesSize={4} ensProvider={mainnetProvider} />
                                            </div>
                                            <p className="reason">
                                                {event.reason}
                                            </p>
                                        </Timeline.Item>);
                            } else {
                                return (<Timeline.Item key={event.key} dot={<DepositDot value={event.amount} />} color="green">
                                            <div className="event-prefix">
                                                <small>deposited {pretty(instantToDeltaNsFromNow(event.timestamp))} ago</small>
                                            </div>
                                            <div className="event-prefix">
                                                <Address value={event.from} fontSize="1em" blockiesSize={4} ensProvider={mainnetProvider} /> says:
                                            </div>
                                            <p className="reason">
                                                {event.reason}
                                            </p>
                                        </Timeline.Item>);
                            }
                        })}
                        </Timeline>
                    </Col>
                </Row>
                <StreamDepositModal
                    key="user-stream-deposit-modal"
                    show={showDepositForm}
                    quoteRate={quoteRate}
                    tokenSymbol={tokenSymbol}
                    tokenInfo={tokenInfo}
                    orgAddress={organizationAddress}
                    stream={streamName}
                    tx={tx}
                    callerAddress={account}
                    orgStreamsWriteContract={orgStreamsWriteContract}
                    handleStreamWithMessage={handleStreamWithMessage}
                    onSuccess={() => {
                        toggleDepositFormModal();
                        reloadStream();
                    }}
                />
                <StreamWithdrawModal
                    key="user-stream-withdraw-modal"
                    show={showWithdrawForm}
                    quoteRate={quoteRate}
                    tokenSymbol={tokenSymbol}
                    tx={tx}
                    stream={streamName}
                    mainnetProvider={mainnetProvider}
                    orgStreamsWriteContract={orgStreamsWriteContract}
                    handleStreamWithMessage={handleStreamWithMessage}
                    onSuccess={() => {
                        toggleWithdrawFormModal();
                        reloadStream();
                    }}
                />
            </>}
            {error &&
                <p>{error}</p>}
        </>
    );
}
