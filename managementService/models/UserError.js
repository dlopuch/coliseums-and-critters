module.exports = class UserError extends Error {
  constructor(message) {
    super(message);
    this.userError = true;
    this.status = 400; // default user errors are probably 400's.  Can be changed manually.
  }
};