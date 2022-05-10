import { Form, Input, Modal } from "antd";
import { useState } from "react";
import PayButton from "./PayButton";
import { ethers } from "ethers";

const { TextArea } = Input;

export default function StreamDepositModal({
    tx,
    tokenInfo,
    callerAddress,
    orgAddress,
    stream,
    show,
    quoteRate,
    tokenSymbol,
    orgStreamsWriteContract,
    handleStreamWithMessage,
    onSuccess,
}) {
    const [reason, setReason] = useState();
    const [amount, setAmount] = useState();

    const onAmountChange = (e) => {
        const newAmount = parseInt(e.target.value || '0', 10);
        if (Number.isNaN(newAmount)) {
            return;
        }
        setAmount(e.target.value);
    };

    const onReasonChange = (newReason) => {
        setReason(newReason.target.value);
    };

    const tokenPayHandler = async (payParams) => {
        // deposit amount and reason to stream after transfer confirmations
        const formattedAmount = ethers.utils.parseUnits(
            amount,
            payParams.decimals
        );
        await tx(
            orgStreamsWriteContract.streamDeposit(stream, reason, formattedAmount),
            handleStreamWithMessage(
                {
                    message: "Deposit successful",
                    description: `${amount} ${payParams.token} was deposited to this stream.`,
                },
                null
            )
        );
        setAmount();
        setReason();
        onSuccess();
    };

    return (
        <Modal title="Deposit" visible={show} footer={null} onCancel={onSuccess} destroyOnClose={true}>
            <Form
                name="deposit-form"
                autoComplete="off"
            >
                <Form.Item
                    label="Reason"
                    name="reason"
                    rules={[{ required: true, message: 'Please add a reason!' }]}
                >
                    <TextArea rows={4} value={reason} onInput={onReasonChange} placeholder="reason / guidance / north star" />
                </Form.Item>

                <Form.Item
                    label="Amount"
                    name="amount"
                    rules={[{ required: true, message: 'Please add an amount' }, {pattern: new RegExp(/^\d+(?:\.\d+)?$/), required: true, message: "Amount must be a number!"}]}
                >
                    <Input
                        price={quoteRate}
                        placeholder="Deposit amount"
                        addonAfter={tokenSymbol}
                        value={amount}
                        onChange={onAmountChange}
                    />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 4, span: 6 }}>
                    <PayButton
                        tx={tx}
                        token={tokenInfo}
                        appName="Tokenstream"
                        callerAddress={callerAddress}
                        maxApproval={amount}
                        amount={amount}
                        spender={orgAddress}
                        tokenPayHandler={tokenPayHandler}
                    />
                </Form.Item>
            </Form>
        </Modal>
    )
}