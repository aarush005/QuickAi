// A normal Error that also carries an HTTP status code.
// We throw this when we WANT the user to see a specific message
// (e.g. "Only PDF files are allowed") with a specific status (e.g. 400).
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
