// qr.js — QR code generation

let qrCanvas = null;

function generateQR() {
  const text = document.getElementById('qrInput').value.trim();
  const preview = document.getElementById('qrPreview');
  if (!text) {
    preview.innerHTML = '<div class="empty">⬜</div>';
    qrCanvas = null;
    return;
  }
  try {
    const typeNum = text.length < 50 ? 4 : text.length < 150 ? 8 : text.length < 500 ? 15 : 25;
    const qr = qrcode(typeNum, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const size = Math.min(350, window.innerWidth - 60);
    const cell = Math.floor(size / count);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = cell * count + 20;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++)
        if (qr.isDark(r, c)) ctx.fillRect(c * cell + 10, r * cell + 10, cell, cell);
    preview.innerHTML = '';
    preview.appendChild(canvas);
    qrCanvas = canvas;
  } catch (e) {
    preview.innerHTML = '<div style="color:var(--danger);font-size:13px">文本太长，无法生成QR码</div>';
    qrCanvas = null;
  }
}

function pasteText() {
  navigator.clipboard.readText()
    .then(t => { document.getElementById('qrInput').value = t; generateQR(); toast('已粘贴'); })
    .catch(() => toast('无法读取剪贴板'));
}

function copyText() {
  const t = document.getElementById('qrInput').value;
  if (!t) return toast('没有内容');
  navigator.clipboard.writeText(t).then(() => toast('已复制'));
}
