import { Form, Input, Button, Select, Space } from 'antd';

const { Option } = Select;
const { TextArea } = Input;

const layout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
};

const tailLayout = {
    wrapperCol: { offset: 8, span: 16 },
};


export default function AddOrganizationForm({ values, onFinishCallback }) {
    const [form] = Form.useForm();

    const onReset = () => {
        form.resetFields();
    };

    return (
        <Form {...layout} form={form} initialValues={values} name="add-organization" onFinish={onFinishCallback} size="large">
            <Form.Item name="orgName" label="DAO Name" rules={[
                { required: true, message: 'Please enter the name of your DAO!' }
            ]}>
                <Input placeholder="DAO name" />
            </Form.Item>
            <Form.Item name="orgLogoURI" label="DAO Logo URI" rules={[
                { type: 'url', message: 'Please enter a valid URL!' },
                { required: true, message: 'Please enter a URL to your DAOs logo!' }
            ]}>
                <Input placeholder="DAO Logo URI" />
            </Form.Item>
            <Form.Item name="orgDescription" label="DAO Description" rules={[
                { required: true, message: 'Please enter a description' }
            ]}>
                <TextArea rows={2} placeholder="A brief description" />
            </Form.Item>
            <Form.Item name="ownerAddress" label="DAO Owner Address" rules={[
                { required: true, message: 'Please enter the DAO owner address!' }
            ]}>
                <Input placeholder="Address (0x000...)" />
            </Form.Item>

            <Form.Item {...tailLayout}>
                <Space direction="horizontal">
                    <Button type="primary" htmlType="submit">
                        Proceed
                    </Button>
                    <Button htmlType="button" onClick={onReset}>
                        Reset
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );
}