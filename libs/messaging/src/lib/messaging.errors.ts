export class MessagingUnavailableError extends Error {
  constructor(message = 'Messaging unavailable') {
    super(message);
    this.name = 'MessagingUnavailableError';
  }
}
