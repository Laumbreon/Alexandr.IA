// Sinal interno sem identidade, cookie ou token. A demo não importa este módulo.
const expiredEvent = "alexandria:session-expired";

export function signalSessionExpired() {
  window.dispatchEvent(new window.Event(expiredEvent));
}

export function onSessionExpired(listener: () => void) {
  window.addEventListener(expiredEvent, listener);
  return () => window.removeEventListener(expiredEvent, listener);
}
