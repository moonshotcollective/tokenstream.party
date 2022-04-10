import { Steps, Modal, Row, Col, Button, notification } from 'antd';
import { useState } from 'react';
import AddOrganizationForm from './AddOrganizationForm';
import AddOrganizationSummary from './AddOrganizationSummary';

const { Step } = Steps;

export default function AddOrganizationWizard({ tx, writeContracts, showWizard, onCancelHandler, onDeployHandler, chainId, provider }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [organizationDetails, setOrganizationDetails] = useState({});
    const [isDeploying, setIsDeploying] = useState(false);

    const CurrentStepView = (viewProps) => {
        if (viewProps.currentStep === 0) {
            return <AddOrganizationForm values={organizationDetails} onFinishCallback={values => {
                setOrganizationDetails(values);
                setCurrentStep(1);
            }} chainId={viewProps.chainId} provider={viewProps.provider} />;
        } else if (viewProps.currentStep === 1) {
            return <AddOrganizationSummary
                        organizationDetails={organizationDetails}
                        provider={viewProps.provider} />
        }
    }

    const goBack = () => {
        setCurrentStep(currentStep - 1);
    }

    const isLastStep = () => {
        return currentStep == 1;
    }

    const launchOrgStreams = async () => {
        if (isDeploying) {
            console.warn("Already deploying...");
            return;
        }
        console.log("Launching!");
        const { orgName, orgLogoURI, orgDescription, ownerAddress, token } = organizationDetails;
        let calldata = [orgName, orgLogoURI, orgDescription, token, ownerAddress, [ownerAddress]];

        try {
            const result = tx(writeContracts.OrgFactoryDeployer.deployOrganization(...calldata), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                    onDeployHandler();
                    console.log(" 🍾 Transaction " + update.hash + " finished!");
                    console.log(
                        " ⛽️ " +
                        update.gasUsed +
                        "/" +
                        (update.gasLimit || update.gas) +
                        " @ " +
                        parseFloat(update.gasPrice) / 1000000000 +
                        " gwei",
                    );
                    setIsDeploying(false);
                    notification.success({
                        message: "Launched DAO successfully!",
                        description: `Tokenstreams are now configured for ${orgName}`,
                        placement: "topRight",
                    });
                }
            });
            console.log("awaiting metamask/web3 confirm result...", result);
            console.log(await result);
        } catch (error) {
            console.error("Error deploying org streams contract!", error);
            setIsDeploying(false);
        }
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

                    <Col span={24} style={{ marginTop: "1em" }}>
                        {CurrentStepView({ currentStep, chainId, provider })}
                    </Col>

                    {currentStep > 0 &&
                        <>
                            <Col span={2}>
                                <Button onClick={goBack} disabled={isDeploying}>Back</Button>
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