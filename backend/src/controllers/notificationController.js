const Notification = require("../models/Notification");

async function listNotifications(req, res) {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, notifications });
}

async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, notification });
}

module.exports = { listNotifications, markRead };
