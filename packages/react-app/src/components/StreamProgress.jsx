import { Progress } from "antd";
import pretty from "pretty-time";

export default function StreamProgress({ balance, cap, frequency }) {
    const totalProgress = [];
    const netPercentSeconds = balance.mul(100).div(cap);
    const numberOfTimesFull = Math.floor(netPercentSeconds.div(100));
    const netPercent = netPercentSeconds.mod(100);
    const widthOfStacks = numberOfTimesFull > 6 ? 32 : 64;
    const totalSeconds = netPercentSeconds.mul(frequency);

    for (let c = 0; c < numberOfTimesFull; c++) {
        totalProgress.push(
            <Progress
                key={`prog-${c}`}
                percent={100}
                showInfo={false}
                style={{ width: widthOfStacks, padding: 4 }}
            />
        );
    }

    if (netPercent.toNumber() > 0) {
        totalProgress.push(
            <Progress
                key="net-prog"
                percent={netPercent && netPercent.toNumber()}
                showInfo={false}
                status="active"
                style={{ width: widthOfStacks, padding: 4 }}
            />
        );
    }

    return (<>
        {totalProgress} ({pretty(totalSeconds.toNumber() * 10000000)})
    </>);
}