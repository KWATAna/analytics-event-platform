export class MessagingUnavailableError extends Error {
  constructor(message = 'Messaging unavailable') {
    super(message);
    this.name = 'MessagingUnavailableError';
  }
}

export class MessagingPayloadTooLargeException extends Error {
  constructor(message = 'Messaging payload exceeds limit') {
    super(message);
    this.name = 'MessagingPayloadTooLargeException';
  }
}
