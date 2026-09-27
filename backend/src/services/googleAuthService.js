const { OAuth2Client } = require("google-auth-library");

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

let client;
function getClient() {
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
}

/**
 * Verifies a Google ID token sent from the frontend (Google Identity Services)
 * and returns the trusted profile fields. Throws if the token is invalid,
 * expired, or was not issued for this app's GOOGLE_CLIENT_ID.
 */
async function verifyGoogleIdToken(idToken) {
  if (!googleConfigured()) {
    const error = new Error("Google login is not configured on the server");
    error.statusCode = 500;
    throw error;
  }
  if (!idToken) {
    const error = new Error("Google ID token is required");
    error.statusCode = 400;
    throw error;
  }

  let ticket;
  try {
    ticket = await getClient().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
  } catch (err) {
    const error = new Error("Invalid or expired Google token");
    error.statusCode = 401;
    throw error;
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    const error = new Error("Google token did not contain an email address");
    error.statusCode = 401;
    throw error;
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture
  };
}

module.exports = { verifyGoogleIdToken, googleConfigured };
