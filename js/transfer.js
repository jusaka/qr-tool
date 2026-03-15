// transfer.js — Encrypted text transfer via Cloudflare Worker

const API_BASE = 'https://qr-relay.jusaka2012.workers.dev';
let derivedKey = null;

async function deriveKey() {
  const password = document.getElementById('tfKey').value;
  const hash = document.getElementById('tfKeyHash');
  if (!password) { derivedKey = null; hash.textContent = ''; return; }

  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  const salt = new TextEncoder().encode('qr-tool-salt-2026');
  derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const rawHash = await crypto.subtle.digest('SHA-256', enc);
  const hex = Array.from(new Uint8Array(rawHash)).map(b => b.toString(16).padStart(2, '0')).join('');
  hash.textContent = '密钥指纹: ' + hex.slice(0, 16) + '...';
}

async function getStoreKey() {
  const password = document.getElementById('tfKey').value;
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('store:' + password));
  return Array.from(new Uint8Array(raw)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function setStatus(msg, cls) {
  const el = document.getElementById('tfStatus');
  el.textContent = msg;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

async function encSend() {
  const text = document.getElementById('tfText').value.trim();
  if (!derivedKey) return setStatus('请先输入传输密钥', 'err');
  if (!text) return setStatus('请输入要发送的文本', 'err');
  if (text.length > 5000) return setStatus('文本过长（最大5000字符）', 'err');

  setStatus('加密中...');
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, new TextEncoder().encode(text));
    const packed = new Uint8Array(12 + encrypted.byteLength);
    packed.set(iv);
    packed.set(new Uint8Array(encrypted), 12);
    const b64 = btoa(String.fromCharCode(...packed));

    const storeKey = await getStoreKey();
    setStatus('上传中...');
    const res = await fetch(API_BASE + '/up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k: storeKey, v: b64 })
    });
    if (!res.ok) throw new Error(await res.text());
    setStatus('✅ 已发送！对方使用相同密钥即可接收（10分钟有效，阅后即焚）', 'ok');
  } catch (e) {
    setStatus('发送失败: ' + e.message, 'err');
  }
}

async function encRecv() {
  if (!derivedKey) return setStatus('请先输入传输密钥', 'err');

  setStatus('获取中...');
  try {
    const storeKey = await getStoreKey();
    const res = await fetch(API_BASE + '/dn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k: storeKey })
    });
    if (!res.ok) throw new Error('请求失败');
    const b64 = await res.text();
    if (!b64) return setStatus('没有待接收的消息', 'err');

    const packed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, ciphertext);
    const text = new TextDecoder().decode(decrypted);

    document.getElementById('tfText').value = text;
    setStatus('✅ 解密成功！（消息已从服务器删除）', 'ok');
  } catch (e) {
    if (e.name === 'OperationError') setStatus('解密失败：密钥不匹配', 'err');
    else setStatus('接收失败: ' + e.message, 'err');
  }
}
