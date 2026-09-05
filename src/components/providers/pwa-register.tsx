"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Registered wherever the context is secure, not only in production builds:
    // push subscription needs a live worker, and localhost is a secure context, so
    // a production-only guard would make alerts impossible to test before deploying.
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The application remains fully usable online if registration fails.
      });
    }
  }, []);

  return null;
}
