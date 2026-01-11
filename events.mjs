import {
  generateFacebookEvent,
  generateTiktokEvent,
  corruptFacebookEvent,
  corruptTiktokEvent,
} from './events.mjs';

const listenerEndpoint = process.env.EVENT_ENDPOINT;
const MIN_EVENTS_PER_SECOND = 1000;
const MAX_EVENTS_PER_SECOND = 50000;

if (!listenerEndpoint) {
  throw new Error('EVENT_ENDPOINT is not set');
}

const eventsPerSecond = () =>
  Math.floor(
    Math.random() * (MAX_EVENTS_PER_SECOND - MIN_EVENTS_PER_SECOND + 1),
  ) + MIN_EVENTS_PER_SECOND;

const hamnoCase = () => Math.random() < 0.1;

const corruptEvent = (event) => {
  const r = Math.random();

  return r < 0.5 ? corruptFacebookEvent(event) : corruptTiktokEvent(event);
};

/**
 * Generates a random event.
 * @returns {Event}
 */
const generateEvent = () => {
  return Math.random() > 0.5 ? generateFacebookEvent() : generateTiktokEvent();
};

/**
 * Sends an array of events to the event endpoint.
 * @returns {Promise<void>}
 */
const sendEvents = async () => {
  const events = Array.from({ length: eventsPerSecond() }, generateEvent);

  if (hamnoCase()) {
    events.push(corruptEvent(generateEvent()));
  }

  try {
    const response = await fetch(listenerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      console.error(`Failed to send events: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(
      `Sent ${events.length} events successfully. Consumer response: ${responseText}`,
    );
  } catch (error) {
    console.error('Error sending events:', error.message);
  }
};

setInterval(sendEvents, 1000);
