'use strict';

class MockAdapter {
  constructor(opts = {}) {
    this.id = 'mock';
    this.opts = opts;
  }

  async sendText(text, meta = {}) {
    await sleep(100);
    console.log(`[mock bt] sendText to ${meta.target || 'default'}:`, text.slice(0, 80));
  }

  async sendFile(filePath, meta = {}) {
    await sleep(150);
    console.log(`[mock bt] sendFile to ${meta.target || 'default'}:`, filePath);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { MockAdapter };
