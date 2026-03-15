// app.js — Tab switching & event binding

let currentTab = 'qr';

function switchTab(tab) {
  if (currentTab === 'scan' && tab !== 'scan') stopScan();
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'p-' + tab));
  if (tab === 'scan') startScan();
}

// Bind events
document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // QR
  document.getElementById('qrInput').addEventListener('input', generateQR);
  document.getElementById('btnPaste').addEventListener('click', pasteText);
  document.getElementById('btnCopy').addEventListener('click', copyText);

  // Scan
  document.getElementById('btnFlip').addEventListener('click', flipCamera);
  document.getElementById('btnUpload').addEventListener('click', () => document.getElementById('imgInput').click());
  document.getElementById('imgInput').addEventListener('change', decodeImage);

  // Transfer
  document.getElementById('tfKey').addEventListener('input', deriveKey);
  document.getElementById('btnSend').addEventListener('click', encSend);
  document.getElementById('btnRecv').addEventListener('click', encRecv);

  // PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
