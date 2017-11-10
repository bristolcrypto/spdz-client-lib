/**
 * Client side interface to a single SPDZ Proxy to bootstrap a SPDZ process.
 */
import Io from 'socket.io-client'
import logger from '../utility/logging'

let clientSocket

/**
 * @description Manage web socket connection to a SPDZ proxy for a specific SPDZ server. Designed for bootstrapping SPDZ processes.
 * 
 * @param {String} url - URL of the SPDZ Proxy.
 * @param {Object} userOptions socket.io config options to override defaults. 
 * 
 * @returns {Promise} which resolves with no params if connected OK or rejects with reason.
 * 
 * @example Connect to the SPDZ Proxy to allow SPDZ processes to be started:
 * 
 * const spdzBootStrap = require('spdz-client-lib/dist/bootstrap_api')
 * 
 * spdzBootStrap.bootstrapConnectSetup('http://spdzproxy1', {})
 * .then(() => {
 *   console.log('Connected successfully')
 * })
 * .catch(err => {
 *   logger.warn(`Unable to connect to SPDZ proxy. ${err.message}`)
 * })
 * @access public
 */
const bootstrapConnectSetup = (url, userOptions = {}) => {
  const connectOptions = Object.assign(
    {},
    {
      path: '/spdz/socket.io',
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 5000,
      timeout: 2000,
      autoConnect: true
    },
    userOptions
  )

  logger.debug(
    `About to request web socket for SPDZ bootstrap connection to ${url} with options ${JSON.stringify(
      connectOptions
    )}.`
  )
  const namespace = '/spdzstart'

  if (clientSocket !== undefined) {
    return Promise.resolve()
  } else {
    return new Promise((resolve, reject) => {
      const socket = Io(url + namespace, connectOptions)

      socket.on('connect', () => {
        clientSocket = socket
        logger.debug('SPDZ proxy bootstrap connection made.')
        resolve()
      })

      socket.on('connect_error', () => {
        clientSocket = undefined
        logger.debug('SPDZ proxy bootstrap connection error.')
        reject(
          new Error('Connection error, connecting to SPDZ proxy for bootstrap.')
        )
      })

      socket.on('connect_timeout', () => {
        clientSocket = undefined
        logger.debug('SPDZ proxy bootstrap connection timeout.')
        reject(
          new Error(
            'Connection timeout, connectiing to SPDZ proxy for bootstrap.'
          )
        )
      })

      socket.on('disconnect', () => {
        logger.debug('SPDZ proxy bootstrap disconnect.')
        clientSocket = undefined
      })
    })
  }
}

/**
 * @description Request a single SPDZ Proxy to start a SPDZ process running the requested program. 
 * Assumes that bootstrapConnectSetup has been run. 
 * 
 * @param {String} spdzProgram The SPDZ program to start.
 * @param {boolean} forceStart If already running then force stop the process.
 * 
 * @returns {Promise} resolves with no params if runs program or rejects with a reason.
 * 
 * @example Run a SPDZ program, stopping any already runnng program:
 * 
 * const spdzBootStrap = require('spdz-client-lib/dist/bootstrap_api')
 * 
 * spdzBootStrap.runSpdzProgram('monthly_trend', true)
 * .then(() => {
 *   console.log('Program monthly_trend started successfully')
 * })
 * .catch(err => {
 *   logger.warn(`Unable to start program monthly_trend. ${err.message}`)
 * })
 * @access public
 */
const runSpdzProgram = (spdzProgram, forceStart) => {
  if (clientSocket === undefined) {
    return Promise.reject(
      new Error('Unable to run SPDZ program, not connected to SPDZ Proxy.')
    )
  }

  return new Promise((resolve, reject) => {
    clientSocket.emit('startSpdz', spdzProgram, forceStart)

    clientSocket.on('startSpdz_result', response => {
      if (response.status === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `Unable to run SPDZ program ${spdzProgram}. ${response.err}`
          )
        )
      }
    })
  })
}

export { bootstrapConnectSetup, runSpdzProgram }
