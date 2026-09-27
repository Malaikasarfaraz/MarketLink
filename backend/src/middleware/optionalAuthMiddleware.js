const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Optional authentication for public endpoints.
 *
 * If a valid Bearer token is present, req.user is populated.
 * If there is no token or the token is invalid/expired, the request
 * continues as a public/guest request instead of returning 401.
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Public product browsing must continue even when an optional token
    // is missing, expired, or invalid.
  }

  next();
}

module.exports = optionalAuth;
