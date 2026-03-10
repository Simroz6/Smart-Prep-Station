const errorHandler = (err, req, res, next) => {
  console.log('!!! ERROR HANDLER TRIGGERED !!!');
  console.error(err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: err.stack,
    details: err.errors ? Object.values(err.errors).map(val => val.message) : undefined
  });
};

module.exports = errorHandler;
