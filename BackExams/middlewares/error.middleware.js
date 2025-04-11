function logError(error, req, res, next) {
  console.log('This', error);
  next(error);
}

function errorMessage(error, req, res, next) {
  res.status(500).json({
    message: error.sqlMessage,
    code: error.code,
    sentence: error.sql,
  });
}

export {
  logError,
  errorMessage,
};
