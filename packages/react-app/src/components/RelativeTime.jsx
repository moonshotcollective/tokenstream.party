import relativeDateTime from '../helpers/relativeDateTime';

export function RelativeTime({iso8601DateTime}) {
    const relativeTime = relativeDateTime(iso8601DateTime);
    return (
        <>
        <small>{relativeTime}</small>
        </>
    );
}