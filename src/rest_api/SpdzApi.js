/**
 * Calls to the SPDZ Proxy REST API.
 * A fetch polyfill is expected to have been included, see README.
 */

/* Supress eslint warnings with following: */

/* global fetch */
import HttpStatus from 'http-status-codes'
import NoContentError from './NoContentError'

const isJson = headers => {
  return (
    headers.has('Content-Type') &&
    headers.get('Content-Type').startsWith('application/json')
  )
}

/**
 * Extract out body into a json object if it is JSON. 
 * Unsure because errors return a JSON body with (status, message, stack (in dev)).
 * Return json and response.
 */
const parseIfJson = response => {
  if (isJson(response.headers)) {
    return response.json().then(json => {
      return {
        response: response,
        jsonData: json
      }
    })
  } else {
    return Promise.resolve({
      response: response,
      jsonData: undefined
    })
  }
}

const safeReasonMsg = result =>
  result.jsonData !== undefined
    ? result.jsonData.message
    : 'No SPDZ API reason message.'

/**
 * Connect to a running SPDZ process via the SPDZ Proxy.
 * The clientId is generated by the Proxy if not supplied.
 * @param {String} url Url of proxy server
 * @param {String} apiRoot Root of path e.g. /spdzapi
 * @param {String} clientId optional client Id.
 * @param {String} clientPublicKey optional 64 byte hex string, if set encrypt traffic.
 * @returns Promise resolve(clientId), or reject(err).
 */
const connectProxyToEngine = (
  url,
  apiRoot,
  clientId = undefined,
  clientPublicKey = undefined
) => {
  const bodyData = {}
  if (clientId !== undefined) {
    bodyData.clientId = clientId
  }
  if (clientPublicKey !== undefined) {
    bodyData.clientPublicKey = clientPublicKey
  }

  return fetch(`${url}${apiRoot}/connect-to-spdz`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(bodyData),
    mode: 'cors'
  })
    .then(response => parseIfJson(response))
    .then(result => {
      if (result.response.status === HttpStatus.CREATED) {
        const location = result.response.headers.get('Location')
        const matches =
          location === null ? null : location.match(/.+\/(.+)\/spdz-connection/)
        if (matches === null || matches.length < 2) {
          let error = new Error(
            `Unable to make SPDZ proxy engine connection. Status: ${result
              .response
              .status}. Reason: Unable to extract clientId from location header ${location}.`
          )
          error.reason = {}
          return Promise.reject(error)
        } else {
          return Promise.resolve(matches[1])
        }
      } else {
        let error = new Error(
          `Unable to make SPDZ proxy engine connection. Status: ${result
            .response.status}. Reason: ${safeReasonMsg(result)}`
        )
        error.reason = result.jsonData
        return Promise.reject(error)
      }
    })
}

/**
 * Check to see if there is a SPDZ proxy to SPDZ engine connection for this client id.
 */
const checkEngineConnection = (host, apiRoot, clientId) => {
  return fetch(`${host}${apiRoot}/${clientId}/spdz-connection`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    mode: 'cors'
  })
    .then(response => parseIfJson(response))
    .then(result => {
      if (result.response.status === HttpStatus.OK) {
        return Promise.resolve()
      } else {
        let error = new Error(
          `SPDZ proxy not connected to SPDZ engine. Status: ${result.response
            .status}. Reason: ${safeReasonMsg(result)}`
        )
        error.reason = result.jsonData
        return Promise.reject(error)
      }
    })
}

/**
 * Success here is a new connection created or already connected.
 */
const disconnectProxyFromEngine = (host, apiRoot, clientId) => {
  return fetch(`${host}${apiRoot}/${clientId}/spdz-connection`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json'
    },
    mode: 'cors'
  })
    .then(parseIfJson)
    .then(result => {
      if (result.response.status === HttpStatus.OK) {
        return Promise.resolve(result)
      } else {
        let error = new Error(
          `Unable to disconnect from SPDZ proxy engine. Status: ${result
            .response.status}. Reason: ${safeReasonMsg(result)}`
        )
        error.reason = result.jsonData
        return Promise.reject(error)
      }
    })
}

const consumeDataFromProxy = (host, apiRoot, clientId, waitTimeoutMs = 0) => {
  return fetch(
    `${host}${apiRoot}/${clientId}/consume-data?waitMs=${waitTimeoutMs}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/octet-stream, application/json'
      },
      mode: 'cors'
    }
  )
    .then(parseIfJson)
    .then(result => {
      if (result.response.status === HttpStatus.OK) {
        // Browsers have arrayBuffer, returns promise which resolves with ArrayBuffer
        // Node polyfill has buffer.
        if (result.response.arrayBuffer) {
          return result.response.arrayBuffer()
        } else {
          return result.response.buffer()
        }
      } else if (result.response.status === HttpStatus.NO_CONTENT) {
        let error = new NoContentError(
          `No data is available to consume from the SPDZ proxy. Status: ${result
            .response.status}.`
        )
        return Promise.reject(error)
      } else {
        let error = new Error(
          `Unable to consume data from SPDZ proxy. Status: ${result.response
            .status}. Reason: ${safeReasonMsg(result)}`
        )
        error.reason = result.jsonData
        return Promise.reject(error)
      }
    })
    .then(buffer => {
      return Promise.resolve(new Uint8Array(buffer))
    })
}

/**
 * @param {host} Hostname of spdz proxy
 * @param {apiRoot} api path
 * @param {clientId} used to distinguish which client connection to used
 * @param {payload} JSON array of base64 encoded 16 byte integers
 */
const sendDataToProxy = (host, apiRoot, clientId, payload) => {
  return fetch(`${host}${apiRoot}/${clientId}/send-data`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: payload,
    mode: 'cors'
  })
    .then(parseIfJson)
    .then(result => {
      if (result.response.status === HttpStatus.OK) {
        return Promise.resolve()
      } else {
        let error = new Error(
          `Unable to send data to SPDZ proxy. Status: ${result.response
            .status}. Reason: ${safeReasonMsg(result)}`
        )
        error.reason = result.jsonData
        return Promise.reject(error)
      }
    })
}

export {
  connectProxyToEngine,
  checkEngineConnection,
  disconnectProxyFromEngine,
  consumeDataFromProxy,
  sendDataToProxy
}
