/**
 * URL to client id lookup for current round of REST transactions.
 * Key is URL of proxy connecting to, value is client id.
 * Hijack by different browser session should not be a problem as long 
 * as using encrypted transfers.
 * Abstracting out helps with testing.
 */

let clientIds = {}

const resetClientIds = () => (clientIds = {})
const storeClientId = (url, generatedClientId) =>
  (clientIds[url] = generatedClientId)
const clientIdExists = url => clientIds.hasOwnProperty(url)
const removeClientId = url => delete clientIds[url]
const getClientId = url => clientIds[url]

export {
  clientIdExists,
  getClientId,
  removeClientId,
  resetClientIds,
  storeClientId
}
