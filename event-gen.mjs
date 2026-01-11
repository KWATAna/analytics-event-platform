import { faker } from '@faker-js/faker';

export const generateFacebookEvent = () => {
  const funnelStage = faker.helpers.arrayElement(['top', 'bottom']);
  const eventType =
    funnelStage === 'top'
      ? faker.helpers.arrayElement([
          'ad.view',
          'page.like',
          'comment',
          'video.view',
        ])
      : faker.helpers.arrayElement([
          'ad.click',
          'form.submission',
          'checkout.complete',
        ]);

  return {
    eventId: `fb-${faker.string.uuid()}`,
    timestamp: new Date().toISOString(),
    source: 'facebook',
    funnelStage,
    eventType,
    data: {
      user: {
        userId: faker.string.uuid(),
        name: faker.person.fullName(),
        age: faker.number.int({ min: 18, max: 65 }),
        gender: faker.helpers.arrayElement(['male', 'female', 'non-binary']),
        location: {
          country: faker.location.country(),
          city: faker.location.city(),
        },
      },
      engagement:
        funnelStage === 'top'
          ? {
              actionTime: new Date().toISOString(),
              referrer: faker.helpers.arrayElement([
                'newsfeed',
                'marketplace',
                'groups',
              ]),
              videoId:
                eventType === 'video.view'
                  ? `vid-${faker.string.alphanumeric(8)}`
                  : null,
            }
          : {
              adId: `ad-${faker.string.alphanumeric(8)}`,
              campaignId: `camp-${faker.string.alphanumeric(5)}`,
              clickPosition: faker.helpers.arrayElement([
                'top_left',
                'bottom_right',
                'center',
              ]),
              device: faker.helpers.arrayElement(['mobile', 'desktop']),
              browser: faker.helpers.arrayElement([
                'Chrome',
                'Firefox',
                'Safari',
              ]),
              purchaseAmount:
                eventType === 'checkout.complete'
                  ? faker.commerce.price({ min: 10, max: 1000 })
                  : null,
            },
    },
  };
};

export const generateTiktokEvent = () => {
  const funnelStage = faker.helpers.arrayElement(['top', 'bottom']);
  const eventType =
    funnelStage === 'top'
      ? faker.helpers.arrayElement(['video.view', 'like', 'share', 'comment'])
      : faker.helpers.arrayElement(['profile.visit', 'purchase', 'follow']);

  return {
    eventId: `ttk-${faker.string.uuid()}`,
    timestamp: new Date().toISOString(),
    source: 'tiktok',
    funnelStage,
    eventType,
    data: {
      user: {
        userId: faker.string.uuid(),
        username: faker.internet.username(),
        followers: faker.number.int({ min: 0, max: 1000000 }),
      },
      engagement:
        funnelStage === 'top'
          ? {
              watchTime: faker.number.int({ min: 1, max: 300 }),
              percentageWatched: faker.number.int({ min: 0, max: 100 }),
              device: faker.helpers.arrayElement(['Android', 'iOS', 'Desktop']),
              country: faker.location.country(),
              videoId: `vid-${faker.string.alphanumeric(8)}`,
            }
          : {
              actionTime: new Date().toISOString(),
              profileId:
                eventType === 'profile.visit'
                  ? `profile-${faker.string.alphanumeric(6)}`
                  : null,
              purchasedItem:
                eventType === 'purchase' ? faker.commerce.productName() : null,
              purchaseAmount:
                eventType === 'purchase'
                  ? faker.commerce.price({ min: 5, max: 500 })
                  : null,
            },
    },
  };
};

/**
 * Randomly corrupts a valid Facebook event by setting invalid data on some fields.
 *
 * @param {ReturnType<typeof generateFacebookEvent>} event - A valid Facebook event object.
 * @returns The corrupted Facebook event object.
 */
export const corruptFacebookEvent = (event) => {
  // Create a deep clone to avoid mutating the original event.
  const corrupted = JSON.parse(JSON.stringify(event));

  // Generate a random value to decide which corruption to apply.
  const r = Math.random();

  if (r < 0.125) {
    // Corrupt timestamp: set it to an invalid timestamp string.
    corrupted.timestamp = 'invalid-timestamp';
  } else if (r < 0.25) {
    // Corrupt eventId: set it to a non-string value.
    delete corrupted.eventId;
  } else if (r < 0.375) {
    // Remove user's name from the event.
    delete corrupted.data.user.name;
  } else if (r < 0.5) {
    // Remove the entire user object.
    delete corrupted.data.user;
  } else if (r < 0.625) {
    // Set funnelStage to an invalid value.
    corrupted.funnelStage = 'invalid-stage';
  } else if (r < 0.75) {
    // Corrupt eventType by setting it to an array.
    corrupted.eventType = ['unknown', 'event'];
  } else if (r < 0.875) {
    // Corrupt engagement data.
    if (corrupted.funnelStage === 'top') {
      // For top-funnel events, set actionTime to a negative number.
      corrupted.data.engagement.actionTime = -1;
    } else {
      // For bottom-funnel events, remove the adId field if present.
      if (corrupted.data.engagement && corrupted.data.engagement.adId) {
        delete corrupted.data.engagement.adId;
      }
    }
  } else {
    // Change user gender to an invalid value.
    if (corrupted.data.user) {
      corrupted.data.user.gender = 'alien';
    }
  }

  return corrupted;
};

/**
 * Randomly corrupts a valid TikTok event by setting invalid data on some fields.
 *
 * @param {ReturnType<typeof generateTiktokEvent>} event - A valid TikTok event object.
 * @returns The corrupted TikTok event object.
 */
export const corruptTiktokEvent = (event) => {
  // Create a deep clone to avoid mutating the original event.
  const corrupted = JSON.parse(JSON.stringify(event));

  // Generate a random value to decide which corruption to apply.
  const r = Math.random();

  if (r < 0.125) {
    // Corrupt timestamp: set it to an invalid timestamp string.
    corrupted.timestamp = 'invalid-timestamp';
  } else if (r < 0.25) {
    // Corrupt eventId: delete the eventId property.
    delete corrupted.eventId;
  } else if (r < 0.375) {
    // Remove user's username from the event.
    delete corrupted.data.user.username;
  } else if (r < 0.5) {
    // Remove the entire user object.
    delete corrupted.data.user;
  } else if (r < 0.625) {
    // Set funnelStage to an invalid value.
    corrupted.funnelStage = 'invalid-stage';
  } else if (r < 0.75) {
    // Corrupt eventType by setting it to an array.
    corrupted.eventType = ['unknown', 'event'];
  } else if (r < 0.875) {
    // Corrupt engagement data.
    if (corrupted.funnelStage === 'top') {
      // For top-funnel events, set watchTime to a negative number.
      corrupted.data.engagement.watchTime = -1;
    } else {
      // For bottom-funnel events, remove the purchasedItem field if present.
      if (
        corrupted.data.engagement &&
        corrupted.data.engagement.purchasedItem
      ) {
        delete corrupted.data.engagement.purchasedItem;
      }
    }
  } else {
    // Change followers to an invalid value.
    if (corrupted.data.user) {
      corrupted.data.user.followers = 'not-a-number';
    }
  }

  return corrupted;
};
