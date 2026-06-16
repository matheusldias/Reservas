import { useEffect, useRef } from "react";

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch {}
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(name) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🔔 É a sua vez!", {
      body: `${name}, dirija-se à recepção agora.`,
      icon: "/favicon.png",
      requireInteraction: true,
    });
  }
}

export function useCalledNotification(entry) {
  const prevStatus = useRef(null);
  const originalTitle = useRef(document.title);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!entry) return;

    const wasCalled =
      prevStatus.current !== "chamado" && entry.status === "chamado";

    prevStatus.current = entry.status;

    if (!wasCalled) return;

    // Sound
    beep();

    // Vibration (mobile)
    if ("vibrate" in navigator) navigator.vibrate([400, 200, 400, 200, 800]);

    // Browser notification
    showBrowserNotification(entry.customer_name);

    // Flash page title
    let flashing = true;
    let visible = true;
    const interval = setInterval(() => {
      document.title = visible ? "🔔 É a sua vez!" : originalTitle.current;
      visible = !visible;
    }, 800);

    const stopFlash = () => {
      flashing = false;
      clearInterval(interval);
      document.title = originalTitle.current;
    };

    // Stop flashing when user focuses the tab or after 30s
    window.addEventListener("focus", stopFlash, { once: true });
    const timeout = setTimeout(stopFlash, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener("focus", stopFlash);
      document.title = originalTitle.current;
    };
  }, [entry?.status]);
}
