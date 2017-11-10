/**
 * Verify that all requiredKeys appear in each entry of listObjects.
 * @param {Array<Objects>} listObjects 
 * @param {String} requiredKeys list of required keys
 * @returns true or false
 */
const verifyRequiredKeys = (listObjects, ...requiredKeys) => {
  if (listObjects.constructor !== Array) {
    return false
  }

  if (listObjects.length === 0) {
    return false
  }

  return listObjects.every(obj => {
    return requiredKeys.every(key => obj.hasOwnProperty(key))
  })
}

export default verifyRequiredKeys
