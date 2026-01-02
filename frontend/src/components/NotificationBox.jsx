// src/components/NotificationBox.jsx
import React from "react";
import "./NotificationBox.css"; // optional: styles for notification

const NotificationBox = ({ message }) => {
  if (!message) return null;

  return <div className="notification-box">{message}</div>;
};

export default NotificationBox;
