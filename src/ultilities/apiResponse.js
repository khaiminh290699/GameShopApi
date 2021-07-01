const apiResponse = (status, message, data, error) => {
  return {
    status, message, data, error
  }
}
module.exports = apiResponse;