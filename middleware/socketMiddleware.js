/**
 * Socket.io Middleware
 * Attaches the socket.io instance to the request object
 * This allows controllers to emit socket events
 */

let ioInstance = null;

export const setSocketIO = (io) => {
  ioInstance = io;
};

export const getSocketIO = () => {
  return ioInstance;
};

export const socketMiddleware = (req, res, next) => {
  req.io = ioInstance;
  next();
};
