import axios from "axios";
import { useState, useEffect } from 'react';
import { List, Row, Col, Avatar } from 'antd';
import Blockies from "react-blockies";
import Address from './Address';
import { RelativeTime } from './RelativeTime';
import { gql, useQuery } from "@apollo/client";
import { Balance, DepositIcon, WithdrawIcon } from "../components";

const GET_ORG_STREAMS_ACTIVITIES = gql`
  query GetActivitiesAcrossStreamsInOrg($orgAddress: String!) {
    
    organization(id: $orgAddress) {
        streamActivities(orderBy: createdAt, orderDirection: desc) {
        user
        amount
        eventType
        info
        createdAt
        }
    }
  }

`;

export function OrgStreamsActivityFeed({orgAddress, price, mainnetProvider}) {
    if (orgAddress === null || orgAddress === "") {
        return null;
    }

    const [quoteRate, setQuoteRate] = useState(0);
    useEffect(() => {
        axios
        .get(
            "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=gitcoin"
        )
        .then((response) => {
            if (response && response.data[0] && response.data[0].current_price) {
            setQuoteRate(response.data[0].current_price);
            console.log("quoteRate price", response.data[0].current_price, price);
            }
        });
    }, []);

    const { loading, error, data } = useQuery(GET_ORG_STREAMS_ACTIVITIES, {
        variables: { orgAddress: orgAddress.toLowerCase() },
        pollInterval: 120000,
    });

    if (loading) {
        return "Loading activity feed...";
    }

    if (error) {
        return `Error loading activity feed! ${error}`;
    }

    return (
        <>
        <List
            itemLayout="horizontal"
            dataSource={(data.organization || {streamActivities: []}).streamActivities}
            style={{textAlign: "left"}}
            renderItem={item => (
            <List.Item
                size="large"
            >
                 <Row>
                    <Col span={2}>
                        <Blockies seed={item.user.toLowerCase()} />
                    </Col>
                    <Col span={6}>
                        <div>
                            <Address value={item.user} hideBlockies={true} fontSize="1em" ensProvider={mainnetProvider} />
                        </div>
                        <RelativeTime iso8601DateTime={new Date(item.createdAt * 1000).toISOString()} />
                    </Col>
                    <Col span={14} style={{width:"500px"}}>
                        {item.info}
                    </Col>
                    <Col span={2} style={{textAlign: "center", float: "center"}}>
                        <Avatar src={item.eventType === "StreamDepositEvent" ? <DepositIcon /> : <WithdrawIcon />} />
                        
                        <Balance price={quoteRate} value={item.amount} size={18} />
                    </Col>
                </Row>
            </List.Item>
            )}
        />
        </>
    )
}