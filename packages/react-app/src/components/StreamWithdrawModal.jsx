import { Button, Form, Input, Modal } from "antd";
import { ethers } from "ethers";

const { TextArea } = Input;

export default function StreamWithdrawModal({
    tx,
    show,
    orgStreamsWriteContract,
    onSuccess,
    quoteRate,
    tokenSymbol,
    handleStreamWithMessage,
}) {

    const withdrawFromStream = async (values) => {
        const { reason, amount } = values;
        if (!reason || reason.length < 6) {
            message.error("Please provide a longer reason / work / length");
        } else {
            tx(
                orgStreamsWriteContract.streamWithdraw(ethers.utils.parseEther("" + amount), reason),
                handleStreamWithMessage(
                    {
                        message: "Withdrawal successful",
                        description: "Your withdrawal from this stream has been processed.",
                    },
                    () => {
                        onSuccess();
                    }
                )
            );
        }
    };

    return (
        <Modal title="Withdraw" visible={show} footer={null} onCancel={onSuccess} destroyOnClose={true}>
            <Form
                name="withdraw-form"
                autoComplete="off"
                onFinish={withdrawFromStream}
            >
                <Form.Item
                    label="Reason"
                    name="reason"
                    rules={[{ required: true, message: 'Please add a reason!' }]}
                >
                    <TextArea rows={4} placeholder="reason / guidance / north star" />
                </Form.Item>
                <Form.Item
                    label="Amount"
                    name="amount"
                    rules={[{ required: true, message: 'Please add an amount' }]}
                >
                    <Input
                        price={quoteRate}
                        placeholder="Withdraw amount"
                        addonAfter={tokenSymbol}
                    />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 4, span: 16 }}>
                    <Button type="primary" htmlType="submit">
                    Withdraw
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}