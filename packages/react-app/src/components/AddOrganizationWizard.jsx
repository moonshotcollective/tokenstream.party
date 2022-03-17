import { Steps, Modal, Row, Col, Button } from 'antd';
import { useState } from 'react';
import AddOrganizationForm from './AddOrganizationForm';
import AddOrganizationSummary from './AddOrganizationSummary';

const { Step } = Steps;

export default function AddOrganizationWizard({ showWizard, onCancelHandler, ...props }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [organizationDetails, setOrganizationDetails] = useState({});

    const CurrentStepView = (viewProps) => {
        if (viewProps.currentStep == 0) {
            return <AddOrganizationForm values={organizationDetails} onFinishCallback={values => {
                setOrganizationDetails(values);
                setCurrentStep(1);
            }} />;
        } else if (viewProps.currentStep == 1) {
            return <AddOrganizationSummary organizationDetails={organizationDetails} />
        }
    }

    const goBack = () => {
        setCurrentStep(currentStep - 1);
    }

    const isLastStep = () => {
        return currentStep == 1;
    }

    const launchOrgStreams = () => {
        console.log("Launching!");
    }

    return (
        <>
            <Modal
                title="Launch token streams for your DAO"
                visible={showWizard}
                footer={null}
                onCancel={onCancelHandler}
                width="45%"
            >
                <Row gutter={[8, 24]}>
                    <Col span={24}>
                        <Steps progressDot current={currentStep}>
                            <Step title="DAO Details" description="" />
                            <Step title="Review &amp; Launch" description="" />
                        </Steps>
                    </Col>

                    <Col span={24} style={{marginTop:"1em"}}>
                        {CurrentStepView({ currentStep })}
                    </Col>

                    { currentStep > 0 &&
                    <>
                        <Col span={2}>
                            <Button onClick={goBack}>Back</Button>
                        </Col>
                        {isLastStep() &&
                        <Col offset={18} span={2}>
                            <Button type="primary" onClick={launchOrgStreams}>Launch!</Button>
                        </Col>}
                    </>
                    }
                </Row>
            </Modal>
        </>
    )
}