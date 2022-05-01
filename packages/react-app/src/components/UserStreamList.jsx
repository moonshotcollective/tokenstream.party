import React, { useState, useEffect } from 'react';
import { List, Skeleton, Divider, Row, Col, Spin, Progress } from 'antd';
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import InfiniteScroll from 'react-infinite-scroll-component';
import Address from './Address';

export const UserStreamList = ({orgStreamsContract, totalStreamCount, mainnetProvider}) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = ethers.BigNumber.from(10);

    const loadMoreData = async () => {
        if (loading) {
            return;
        }
        setLoading(true);
        await orgStreamsContract.getStreams(ethers.BigNumber.from(page), pageSize)
            .then(body => {
                const streams = body
                    .filter(e => e[0] != 0)
                    .map(e => {
                        return {
                            user: e[0],
                            cap: e[1],
                            frequency: e[2],
                            last: e[3],
                            balance: e[4],
                            percent: e[4].mul(100).div(e[1]).toNumber()
                        };
                    });
                setData([...data, ...streams]);
                setPage(page + 1);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error loading streams!", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadMoreData()
            .catch(console.error);
    });

    return (
        <div
            id="scrollableDiv"
            style={{
                height: 400,
                overflow: 'auto',
                padding: '0 16px',
                border: '1px solid rgba(140, 140, 140, 0.35)',
            }}
        >
            <InfiniteScroll
                dataLength={data.length}
                next={loadMoreData}
                hasMore={data.length < totalStreamCount}
                loader={<Skeleton avatar paragraph={{ rows: 3 }} active />}
                endMessage={<Divider plain>~</Divider>}
                scrollableTarget="scrollableDiv"
            >
                <List
                    loading={false}
                    dataSource={data}
                    rowKey={(item) => item.user}
                    renderItem={(item) => (
                        <Row key={`address-${item.user}`}>
                        <div
                            style={{
                            width: "110%",
                            position: "relative",
                            display: "flex",
                            flex: 1,
                            padding: 15,
                            justifyContent: "space-between",
                            alignItems: "center",
                            }}
                        >{"  "}
                            <Col span={10} >
                            <div
                                style={{
                                display: "flex",
                                }}
                            >
                                <Address
                                value={item.user}
                                ensProvider={mainnetProvider}
                                fontSize={18}
                                style={{ display: "flex", flex: 1, alignItems: "center" }}
                                />{"  "}
                            </div>
                            </Col>
                            <Col span={4}>
                            <Link to={`/organizations/${orgStreamsContract.address}/user/${item.user}`}>View Stream</Link>{"  "}
                            </Col>
                            <Col span={8}>
                            <Progress
                                style={{ alignItems: "right" }}
                                type="dashboard"
                                showInfo={true}
                                width={40}
                                fontSize={1}
                                percent={item.percent}
                                format={(percent) => `${percent.toFixed(0)}%`}
                            />
                            </Col>
                        </div>
                        </Row>
                    )}
                />
                
            </InfiniteScroll>
        </div>
    );
};
