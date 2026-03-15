// scan.js — Camera scanning & image QR decode

let scanStream = null;
let scanTimer = null;
let facingMode = 'environment';

function startScan() {
  stopScan();
  navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
  }).then(stream => {
    scanStream = stream;
    const video = document.getElementById('scanVideo');
    video.srcObject = stream;
    video.play().catch(() => {});

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let scanning = true;

    function tick() {
      if (!scanning || !scanStream) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            scanning = false;
            onScanResult(code.data);
            return;
          }
        } catch (e) {}
      }
      requestAnimationFrame(tick);
    }

    // Store cleanup ref
    scanTimer = { stop: () => { scanning = false; } };

    // Wait for video to be ready, then start scanning
    video.onloadeddata = () => requestAnimationFrame(tick);
    // In case it's already ready
    if (video.readyState >= 2) requestAnimationFrame(tick);

  }).catch(e => {
    console.error('Camera error:', e);
    toast('无法访问摄像头');
  });
}

function stopScan() {
  if (scanTimer) { scanTimer.stop(); scanTimer = null; }
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
  const video = document.getElementById('scanVideo');
  if (video) video.srcObject = null;
}

function flipCamera() {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startScan();
}

function decodeImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  toast('识别中...');

  const img = new Image();
  img.onload = () => {
    // Limit size for performance
    let w = img.width, h = img.height;
    const MAX = 1500;
    if (w > MAX || h > MAX) {
      const scale = MAX / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    URL.revokeObjectURL(img.src);

    if (code && code.data) {
      document.getElementById('qrInput').value = code.data;
      generateQR();
      switchTab('qr');
      toast('识别成功');
    } else {
      toast('未识别到QR码');
    }
  };
  img.onerror = () => toast('图片加载失败');
  img.src = URL.createObjectURL(file);
}

function onScanResult(text) {
  stopScan();
  document.getElementById('qrInput').value = text;
  generateQR();
  switchTab('qr');
  toast('扫码成功');
}
