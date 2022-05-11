import { Row, Col, Typography, Button } from 'antd';
import { GitcoinDAOBadge } from '../components/GitcoinDAOBadge';

const { Title, Paragraph } = Typography;

export function LandingPage() {
    return (
        <Row gutter={[16, 72]} style={{marginLeft: '0', marginRight: '0'}}>
            <Col span={8} offset={8}>
                <Title style={{fontSize: "3.6em"}}>REGULAR PAYMENTS FOR YOUR WEB3 ORG</Title>
            </Col>
            <Col span={4} offset={10}>
                <Paragraph style={{color: "rgba(252, 214, 100, 0.85)", fontSize: "1.2em"}}>
                    Tokenstream is the tool for
                    automated regular payments
                    from your wallet to your
                    contributors
                </Paragraph>
            </Col>
            <Col span={4} offset={10}>
                <Button type="primary" size="large" ghost>
                    Learn More!
                </Button>
            </Col>
            <Col span={4} offset={10}>
                <GitcoinDAOBadge />
            </Col>
        </Row>
    )
}