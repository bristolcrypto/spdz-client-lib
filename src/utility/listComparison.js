/**
 * Utility to compare and validate list members. 
 * @param {Array} list 
 * @param {function(a,b)} compare function compares(a,b) and returns true or false 
 * @returns true or false
 */
const listComparison = (list, compare) => {
  if (list.length <= 1) {
    return true
  } else {
    return !!list.reduce((a, b, index) => {
      if (compare(a, b)) {
        // Avoid bug where comparison passes but last element is zero (== false).
        return index === list.length - 1 ? true : b
      } else {
        return NaN
      }
    })
  }
}

export default listComparison
