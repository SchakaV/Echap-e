// net.js — client WebSocket pour le mode multijoueur en ligne.

export class NetClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = {};
  }

  on(type, fn) {
    this.handlers[type] = fn;
  }

  connect() {
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws;
      try {
        ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }
      this.ws = ws;
      const timeout = setTimeout(() => {
        if (!settled) { settled = true; reject(new Error('Délai de connexion dépassé.')); }
      }, 6000);

      ws.addEventListener('open', () => {
        clearTimeout(timeout);
        if (!settled) { settled = true; resolve(); }
      });
      ws.addEventListener('error', () => {
        clearTimeout(timeout);
        if (!settled) { settled = true; reject(new Error('Connexion impossible à ce serveur.')); }
      });
      ws.addEventListener('message', (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        const fn = this.handlers[msg.type];
        if (fn) fn(msg);
      });
      ws.addEventListener('close', () => {
        if (this.handlers.close) this.handlers.close();
      });
    });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    if (this.ws) this.ws.close();
  }
}
