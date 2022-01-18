const BlackListedStreams = new Set([
  '0xA4c021089Ff1f8450dB7d49a8EF48AF030A513eD' // jklm.eth
])

/**
 * Some addresses are not to be displayed on the front end
 * so this adds the ability to filter them out
 *
 * Can be passed straight into .filter() on map of streams
 *
 * @param streamAddress
 */
export const filterStreamsThatAreHidden = (streamAddress) => BlackListedStreams.has(streamAddress)
