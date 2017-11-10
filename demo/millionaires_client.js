/**
 * Client connects to SPDZ running millionaires.mpc program via SPDZ Proxy Sockets interface.
 * No encryption.
 */
const spdzProxyClient = require('../dist/socket_api')

const { logger } = require('../dist/utility')
logger.level = 'info'

const spdzProxyList = [
  { url: 'http://localhost:3010' },
  { url: 'http://localhost:3011' }
]

if (process.argv.length !== 5) {
  logger.info(
    'Usage is millionaires_client <unique client id> <client worth> <all clients joined - 0 (no) 1 (yes)>'
  )
  process.exit(128)
}

const [clientId, worth, allJoined] = process.argv
  .slice(2, 5)
  .map(param => parseInt(param))

const finish = exitStatus =>
  spdzProxyClient
    .disconnectFromSpdzPartyPromise()
    .then(() => {
      logger.info(`Client ${clientId} - disconnected from SPDZ.`)
      process.exit(exitStatus)
    })
    .catch(err => {
      logger.info(
        `Client ${clientId} - Problem in disconnecting from SPDZ. ${err.message}`
      )
      process.exit(exitStatus)
    })

spdzProxyClient
  .connectToSpdzProxyPromise(spdzProxyList, {}, 3000)
  .then(streams => {
    logger.info(`Client ${clientId} - connected successfully to SPDZ proxies.`)
    const [connectedStatusStream, spdzResultStream, spdzErrorStream] = streams
    connectedStatusStream.onValue(status => {
      logger.debug(
        `Client ${clientId} - connection type ${status.eventType} ${status.status
          ? 'is connected'
          : 'is not connected'}.`
      )
    })
    spdzResultStream.onValue(valueList => {
      logger.info(
        `Client ${clientId} - winner is player with id: ${valueList[0]}.`
      )
      finish(0)
    })
    spdzErrorStream.onError(err => {
      logger.warn(`Client ${clientId} - error found ${err}.`)
    })
    return
  })
  .then(() => {
    return spdzProxyClient.connectToSpdzPartyPromise()
  })
  .then(() => {
    logger.info(`Client ${clientId} - proxies have connected to SPDZ Engines.`)
    return spdzProxyClient.sendSecretInputsPromise([clientId, worth, allJoined])
  })
  .then(() => {
    logger.info(
      `Client ${clientId} - has sent inputs to millionaires game, waiting for result.....`
    )
  })
  .catch(err => {
    logger.warn(`${err.message}`)
    finish(128)
  })
