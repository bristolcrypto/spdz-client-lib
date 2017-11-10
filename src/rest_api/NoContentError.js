/**
 * @description Error to represent missing data when client is requesting data from a SPDZ Proxy.
 * 
 * @param {String} message text
 * 
 * @returns {function} extended from Error.prototype
 * 
 * @access public
 */
function NoContentError(message) {
  this.name = 'NoContentError'
  this.message = message || 'No content found.'
  this.stack = new Error().stack
}
NoContentError.prototype = Object.create(Error.prototype)
NoContentError.prototype.constructor = NoContentError

export default NoContentError
