import webpush from 'web-push';
import NotificationSubscription from '../models/NotificationSubscription.js'; // Added .js extension for safety in ESM

/**
 * Sends a native browser push notification to all active devices of a user
 * @param {String} userId - The target user database ID string
 * @param {Object} payload - Notification payload options containing title, body, icon, and action url
 */
const sendPushNotification = async (userId, payload) => {
  try {
    // Find all browser endpoints registered to this student
    const subscriptions = await NotificationSubscription.find({ user: userId });

    if (!subscriptions || subscriptions.length === 0) return;

    const stringifiedPayload = JSON.stringify({
      title: payload.title || 'Benedex Digital Hub Alert',
      body: payload.body || 'You have a new update waiting in your portal.',
      icon: payload.icon || '/logo192.png', // Fallback path to a public image asset
      data: {
        url: payload.url || '/student/dashboard' // Redirect action route target when clicked
      }
    });

    const sendPromises = subscriptions.map(sub => {
      return webpush.sendNotification(sub, stringifiedPayload)
        .catch(async (err) => {
          // If the endpoint has expired or the user revoked browser access (Status 410 Gone / 404), clean it out
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Cleaning up expired subscription node endpoint: ${sub._id}`);
            await NotificationSubscription.deleteOne({ _id: sub._id });
          } else {
            console.error(`Error delivering push payload to sub node ${sub._id}:`, err);
          }
        });
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Global notification dispatch system failure:', error);
  }
};

// Export using ES Modules default export
export default sendPushNotification;