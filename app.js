/* ==========================================================================
   SmartQR Core Logic & Interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // DOM Elements Selection
  // ==========================================
  
  // Navigation Tabs
  const tabGenerator = document.getElementById('tab-generator');
  const tabScanner = document.getElementById('tab-scanner');
  const tabHistory = document.getElementById('tab-history');
  const tabsSliderBg = document.querySelector('.tabs-slider-bg');
  
  const contentGenerator = document.getElementById('content-generator');
  const contentScanner = document.getElementById('content-scanner');
  const contentHistory = document.getElementById('content-history');

  // QR Generator
  const qrGenerationForm = document.getElementById('qr-generation-form');
  const qrInputField = document.getElementById('qr-input-field');
  const btnGenerate = document.getElementById('btn-generate');
  const generatorFlowContainer = document.getElementById('generator-flow-container');
  const qrResultBox = document.getElementById('qr-result-box');
  const qrCanvas = document.getElementById('qr-canvas');
  const btnReset = document.getElementById('btn-reset');
  const qrInnerFrame = document.querySelector('.qr-inner-frame');

  // QR Scanner
  const cameraPromptZone = document.getElementById('camera-prompt-zone');
  const btnStartCamera = document.getElementById('btn-start-camera');
  const cameraStreamBox = document.getElementById('camera-stream-box');
  const cameraDeviceSelect = document.getElementById('camera-device-select');
  const btnStopCamera = document.getElementById('btn-stop-camera');
  const scanResultModal = document.getElementById('scan-result-modal');
  
  // Scan Result Modal Elements (Updated with AI OCR)
  const ocrLoadingLayer = document.getElementById('ocr-loading-layer');
  const ocrProgressNum = document.getElementById('ocr-progress-num');
  const ocrProgressBar = document.getElementById('ocr-progress-bar');
  const ocrOutcomeBox = document.getElementById('ocr-outcome-box');
  const scanResultBarcodeData = document.getElementById('scan-result-barcode-data');
  const scanResultOcrData = document.getElementById('scan-result-ocr-data');
  const scanResultThumb = document.getElementById('scan-result-thumb');
  const scanMatchBadge = document.getElementById('scan-match-badge');
  
  const btnCopyResult = document.getElementById('btn-copy-result');
  const btnVisitUrl = document.getElementById('btn-visit-url');
  const btnScanAgain = document.getElementById('btn-scan-again');

  // Scanned History Elements
  const historyListContainer = document.getElementById('history-list-container');
  const historyEmptyState = document.getElementById('history-empty-state');
  const btnClearHistory = document.getElementById('btn-clear-history');
  
  // Photo Lightbox Modal Elements (Updated with AI OCR Grid)
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxExpandedImg = document.getElementById('lightbox-expanded-img');
  const lightboxMetaDate = document.getElementById('lightbox-meta-date');
  const lightboxMetaBadge = document.getElementById('lightbox-meta-badge');
  const lightboxMetaBarcode = document.getElementById('lightbox-meta-barcode');
  const lightboxMetaOcr = document.getElementById('lightbox-meta-ocr');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');

  // Generic Modals (Information Modal)
  const infoToggleBtn = document.getElementById('info-toggle-btn');
  const infoModal = document.getElementById('info-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // State Variables
  let html5Qrcode = null;
  let activeCameraId = null;
  let qrGeneratorInstance = null;
  let currentScanData = '';
  const STORAGE_KEY = 'smartqr_scan_history_logs_v2'; // Schema V2 supporting AI OCR

  // ==========================================
  // Utility: Premium Toast Notifications
  // ==========================================
  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add micro-icons to toast for rich visual styling
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, duration);
  }

  // Get current timestamp formatted cleanly (YYYY-MM-DD HH:MM:SS)
  function getFormattedDateTime() {
    const date = new Date();
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  }

  // Helper to validate and format URL
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      const pattern = new RegExp('^(https?:\\/\\/)?'+ 
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ 
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ 
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+*]*)*'+ 
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ 
        '(\\#[-a-z\\d_]*)?$','i'); 
      return !!pattern.test(string);
    }
  }

  function formatUrl(string) {
    if (isValidUrl(string)) {
      if (!/^https?:\/\//i.test(string)) {
        return 'https://' + string;
      }
      return string;
    }
    return null;
  }

  // ==========================================
  // Tab Switching Engine (Requirement 6 & History tab)
  // ==========================================
  function switchTab(target) {
    if (target === 'generator') {
      tabsSliderBg.style.transform = 'translateX(0)';
      
      tabGenerator.classList.add('active');
      tabScanner.classList.remove('active');
      tabHistory.classList.remove('active');
      
      stopScannerCamera().then(() => {
        contentGenerator.classList.add('active');
        contentScanner.classList.remove('active');
        contentHistory.classList.remove('active');
      });
      
    } else if (target === 'scanner') {
      tabsSliderBg.style.transform = 'translateX(100%)';
      
      tabScanner.classList.add('active');
      tabGenerator.classList.remove('active');
      tabHistory.classList.remove('active');
      
      contentGenerator.classList.remove('active');
      contentScanner.classList.add('active');
      contentHistory.classList.remove('active');
      
    } else if (target === 'history') {
      tabsSliderBg.style.transform = 'translateX(200%)';
      
      tabHistory.classList.add('active');
      tabGenerator.classList.remove('active');
      tabScanner.classList.remove('active');
      
      stopScannerCamera().then(() => {
        contentGenerator.classList.remove('active');
        contentScanner.classList.remove('active');
        contentHistory.classList.add('active');
        renderHistoryList();
      });
    }
  }

  tabGenerator.addEventListener('click', () => switchTab('generator'));
  tabScanner.addEventListener('click', () => switchTab('scanner'));
  tabHistory.addEventListener('click', () => switchTab('history'));

  // ==========================================
  // QR Generator Logic (Fixed stability)
  // ==========================================
  qrGenerationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = qrInputField.value.trim();

    if (!value) {
      showToast('텍스트 또는 URL 주소를 올바르게 입력해주세요.', 'error');
      return;
    }

    if (typeof QRious === 'undefined') {
      showToast('QR 인코더 라이브러리가 로드되지 못했습니다. 인터넷망을 점검해주세요.', 'error');
      console.error('QRious is undefined. CDN load failed.');
      return;
    }

    try {
      if (!qrGeneratorInstance) {
        qrGeneratorInstance = new QRious({
          element: qrCanvas,
          size: 600,
          level: 'H',
          background: '#ffffff',
          foreground: '#0f172a'
        });
      }

      qrGeneratorInstance.value = value;
      generatorFlowContainer.classList.add('has-qr');
      
      qrResultBox.classList.remove('hidden');
      setTimeout(() => {
        qrResultBox.classList.add('show');
      }, 50);

      showToast('QR코드가 안전하게 생성되었습니다!', 'success');
    } catch (err) {
      console.error('QRious render error:', err);
      showToast('QR코드 인스턴스 초기화 중 에러가 발생했습니다.', 'error');
    }
  });

  btnReset.addEventListener('click', () => {
    qrResultBox.classList.remove('show');
    generatorFlowContainer.classList.remove('has-qr');
    
    setTimeout(() => {
      qrResultBox.classList.add('hidden');
      qrInputField.value = '';
      qrInputField.focus();
    }, 500);
  });

  // ==========================================
  // QR Code Image JPG Downloader (Requirement 8)
  // ==========================================
  function downloadQRAsJPG() {
    try {
      const dataUrl = qrCanvas.toDataURL('image/jpeg', 1.0);
      const downloadLink = document.createElement('a');
      const date = new Date();
      const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
      
      downloadLink.download = `SmartQR_${timestamp}.jpg`;
      downloadLink.href = dataUrl;
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast('고화질 JPG 파일이 기기에 다운로드되었습니다.', 'success');
    } catch (error) {
      console.error('Download failure:', error);
      showToast('다운로드 도중 에러가 발생했습니다.', 'error');
    }
  }

  qrInnerFrame.addEventListener('click', downloadQRAsJPG);

  // ==========================================
  // LocalStorage Logs Manager (AI OCR Schema V2)
  // ==========================================
  function getHistoryRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  function saveHistoryRecord(record) {
    const records = getHistoryRecords();
    records.unshift(record); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function deleteHistoryRecord(id) {
    let records = getHistoryRecords();
    records = records.filter(rec => rec.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    showToast('기록이 정상적으로 제거되었습니다.', 'success');
    renderHistoryList();
  }

  function clearAllHistory() {
    const records = getHistoryRecords();
    if (records.length === 0) {
      showToast('삭제할 이력이 없습니다.', 'info');
      return;
    }

    if (confirm('스냅샷 사진과 AI OCR 판독 대조 기록을 영구 삭제하시겠습니까?')) {
      localStorage.removeItem(STORAGE_KEY);
      showToast('모든 촬영 기록이 정상 삭제되었습니다.', 'success');
      renderHistoryList();
    }
  }

  btnClearHistory.addEventListener('click', clearAllHistory);

  // Dynamic log card renderer
  function renderHistoryList() {
    const records = getHistoryRecords();
    historyListContainer.innerHTML = '';

    if (records.length === 0) {
      historyEmptyState.classList.remove('hidden');
      btnClearHistory.style.display = 'none';
      return;
    }

    historyEmptyState.classList.add('hidden');
    btnClearHistory.style.display = 'inline-flex';

    records.forEach((rec) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      
      const isUrl = formatUrl(rec.content);
      const isMatch = rec.matchStatus === '일치';
      const badgeClass = isMatch ? 'status-match' : 'status-mismatch';

      card.innerHTML = `
        <div class="history-thumb-frame" data-id="${rec.id}" title="사진 클릭하여 확대">
          <img src="${rec.photo}" alt="스냅샷 촬영본">
          <div class="thumb-overlay">
            <svg class="zoom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
        </div>
        <div class="history-details">
          <div class="history-header">
            <span class="history-date">${rec.timestamp}</span>
            <span class="match-badge match-badge-mini ${badgeClass}">${rec.matchStatus}</span>
          </div>
          <span class="history-text" title="스캔값: ${rec.content}">🔍 ${rec.content}</span>
          <span class="history-text" style="color: var(--accent-light); font-weight: 500; font-family: monospace; font-size: 0.8rem; text-shadow: none;" title="AI OCR: ${rec.ocrContent || '(미검출)'}">
            🧠 ${rec.ocrContent ? (rec.ocrContent.length > 25 ? rec.ocrContent.substring(0, 25) + '...' : rec.ocrContent) : '(미검출)'}
          </span>
          <div class="history-actions">
            <button class="btn-tiny copy" data-text="${rec.content}" title="결과값 복사">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            ${isUrl ? `
              <a href="${isUrl}" target="_blank" rel="noopener noreferrer" class="btn-tiny visit" title="사이트 접속">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            ` : ''}
            <button class="btn-tiny delete" data-id="${rec.id}" title="기록 제거">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Event Listeners for actions in each card
      // Thumbnail Click to Zoom
      card.querySelector('.history-thumb-frame').addEventListener('click', () => {
        openLightbox(rec.photo, rec.timestamp, rec.content, rec.ocrContent, rec.matchStatus);
      });

      // Copy click
      card.querySelector('.copy').addEventListener('click', () => {
        navigator.clipboard.writeText(rec.content).then(() => {
          showToast('내용이 클립보드에 복사되었습니다.', 'success');
        });
      });

      // Delete click
      card.querySelector('.delete').addEventListener('click', () => {
        deleteHistoryRecord(rec.id);
      });

      historyListContainer.appendChild(card);
    });
  }

  // ==========================================
  // Image Lightbox zoom overlay controller (Requirement 3 & AI OCR data display)
  // ==========================================
  function openLightbox(photoData, dateText, barcodeVal, ocrVal, matchStatus) {
    lightboxExpandedImg.src = photoData;
    lightboxMetaDate.textContent = dateText;
    lightboxMetaBarcode.textContent = barcodeVal;
    lightboxMetaOcr.textContent = ocrVal || '(텍스트 검출 없음)';
    
    // Setup matching badge inside lightbox metadata row
    const isMatch = matchStatus === '일치';
    lightboxMetaBadge.textContent = matchStatus;
    if (isMatch) {
      lightboxMetaBadge.className = 'match-badge status-match';
    } else {
      lightboxMetaBadge.className = 'match-badge status-mismatch';
    }
    
    lightboxModal.classList.remove('hidden');
    setTimeout(() => {
      lightboxModal.classList.add('show');
    }, 50);
  }

  function closeLightbox() {
    lightboxModal.classList.remove('show');
    setTimeout(() => {
      lightboxModal.classList.add('hidden');
      lightboxExpandedImg.src = ''; 
    }, 450);
  }

  btnCloseLightbox.addEventListener('click', closeLightbox);
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal || e.target.classList.contains('lightbox-wrapper') || e.target.classList.contains('lightbox-image-container')) {
      closeLightbox();
    }
  });

  // ==========================================
  // QR/Barcode Scanner Logic
  // ==========================================
  
  async function stopScannerCamera() {
    if (html5Qrcode && html5Qrcode.isScanning) {
      try {
        await html5Qrcode.stop();
        cameraStreamBox.classList.add('hidden');
        cameraPromptZone.classList.remove('hidden');
      } catch (err) {
        console.error('Camera shutdown error:', err);
      }
    }
  }

  btnStartCamera.addEventListener('click', async () => {
    if (!html5Qrcode) {
      html5Qrcode = new Html5Qrcode('scanner-reader');
    }

    showToast('카메라 장치를 초기화하고 있습니다...', 'info');

    try {
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        showToast('사용 가능한 카메라가 발견되지 않았습니다.', 'error');
        return;
      }

      cameraDeviceSelect.innerHTML = '';
      devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = device.label || `카메라 ${cameraDeviceSelect.childElementCount + 1}`;
        cameraDeviceSelect.appendChild(option);
      });

      let backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') || 
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('뒤')
      );
      
      let targetCameraId = backCamera ? backCamera.value : devices[0].id;
      cameraDeviceSelect.value = targetCameraId;
      activeCameraId = targetCameraId;

      await startCameraStreaming(targetCameraId);

    } catch (error) {
      console.error('Camera enumeration error:', error);
      showToast('카메라 권한 획득에 실패했거나 기기 접근이 불가능합니다.', 'error');
    }
  });

  async function startCameraStreaming(cameraId) {
    if (!html5Qrcode) return;

    if (html5Qrcode.isScanning) {
      await html5Qrcode.stop();
    }

    // High performance config - aspectRatio is removed to avoid OverconstrainedErrors on mobile/Safari
    const config = {
      fps: 15,
      qrbox: (width, height) => {
        if (!width || !height) return { width: 200, height: 200 };
        const smallerDimension = width < height ? width : height;
        const boxSize = Math.floor(smallerDimension * 0.65);
        const finalSize = boxSize < 160 ? 160 : (boxSize > 250 ? 250 : boxSize);
        return {
          width: finalSize,
          height: finalSize
        };
      }
    };

    try {
      // Try starting with selected device ID
      const targetDevice = cameraId ? cameraId : { facingMode: "environment" };
      await html5Qrcode.start(
        targetDevice,
        config,
        onQrCodeScannedSuccess,
        onQrCodeScanFailure
      );

      cameraPromptZone.classList.add('hidden');
      cameraStreamBox.classList.remove('hidden');
      showToast('스캐너가 활성화되었습니다.', 'success');

    } catch (err) {
      console.warn('Camera starting with selected ID failed. Trying standard environment fallback...', err);
      
      try {
        // Fallback logic: standard environment facingMode
        await html5Qrcode.start(
          { facingMode: "environment" },
          config,
          onQrCodeScannedSuccess,
          onQrCodeScanFailure
        );

        cameraPromptZone.classList.add('hidden');
        cameraStreamBox.classList.remove('hidden');
        showToast('스캐너가 활성화되었습니다. (폴백 모드)', 'success');

      } catch (fallbackErr) {
        console.error('Fallback Camera Webrtc starting failure:', fallbackErr);
        showToast('카메라 비디오 피드를 활성화하지 못했습니다. 카메라 권한 승인 및 HTTPS 보안 통신 환경 여부를 확인해주세요.', 'error');
      }
    }
  }

  cameraDeviceSelect.addEventListener('change', async (e) => {
    const selectedCameraId = e.target.value;
    if (selectedCameraId && selectedCameraId !== activeCameraId) {
      activeCameraId = selectedCameraId;
      showToast('카메라를 변경하고 있습니다...', 'info');
      
      // Stop currently active camera and wait 200ms for hardware ports closure
      await stopScannerCamera();
      setTimeout(async () => {
        await startCameraStreaming(selectedCameraId);
      }, 200);
    }
  });

  btnStopCamera.addEventListener('click', async () => {
    showToast('카메라 스트리밍을 종료합니다.', 'info');
    await stopScannerCamera();
  });

  // ==========================================
  // Whitespace-Free Fuzzy Match Checker (New function)
  // ==========================================
  function checkOcrBarcodeMatch(barcodeVal, ocrVal) {
    if (!barcodeVal || !ocrVal) return false;
    
    // Purify alphanumeric & korean letters to wipe out spacing, punctuation & newline differences
    const cleanBarcode = barcodeVal.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
    const cleanOcr = ocrVal.replace(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
    
    if (!cleanBarcode) return false;
    
    // True fuzzy partial containing check
    return cleanOcr.includes(cleanBarcode);
  }

  // ==========================================
  // Tesseract AI OCR Engine Controller (New workflows)
  // ==========================================
  function runOcrAnalysis(photoDataUrl, barcodeText) {
    // 1. Reset and reveal loading layout
    ocrLoadingLayer.classList.remove('hidden');
    ocrOutcomeBox.classList.add('hidden');
    ocrProgressNum.textContent = '0%';
    ocrProgressBar.style.width = '0%';

    // Reveal modal popups
    scanResultModal.classList.remove('hidden');
    setTimeout(() => {
      scanResultModal.classList.add('show');
    }, 50);

    // Safeguard library existence
    if (typeof Tesseract === 'undefined') {
      showToast('AI OCR 엔진 로드 실패. Tesseract.js가 차단되었습니다.', 'error');
      completeOcrProcess(photoDataUrl, barcodeText, '(AI OCR 라이브러리 누락)', false);
      return;
    }

    // 2. Fire up the browser Web Worker OCR
    Tesseract.recognize(
      photoDataUrl,
      'eng+kor', // Enable Korean and English parallel parsing
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.floor(m.progress * 100);
            ocrProgressNum.textContent = `${pct}%`;
            ocrProgressBar.style.width = `${pct}%`;
          }
        }
      }
    ).then(({ data: { text } }) => {
      const parsedOcrText = text ? text.trim() : '';
      const isMatch = checkOcrBarcodeMatch(barcodeText, parsedOcrText);
      
      completeOcrProcess(photoDataUrl, barcodeText, parsedOcrText, isMatch);
    }).catch(err => {
      console.error('Tesseract OCR failure:', err);
      showToast('이미지 활자 분석 연산 도중 에러가 발생했습니다.', 'error');
      completeOcrProcess(photoDataUrl, barcodeText, '(AI 판독 연산 오류)', false);
    });
  }

  function completeOcrProcess(photoUrl, barcodeText, ocrText, isMatch) {
    const statusText = isMatch ? '일치' : '불일치';

    // 1. Bind comparative data cards
    scanResultBarcodeData.textContent = barcodeText;
    scanResultOcrData.textContent = ocrText || '(해독 텍스트 없음)';
    scanResultThumb.src = photoUrl;

    // 2. Format result glowing neon badges
    scanMatchBadge.textContent = statusText;
    if (isMatch) {
      scanMatchBadge.className = 'match-badge status-match';
    } else {
      scanMatchBadge.className = 'match-badge status-mismatch';
    }

    // 3. Save logs with OCR schema to localStorage
    const scanLogRecord = {
      id: `smartqr_rec_${Date.now()}`,
      timestamp: getFormattedDateTime(),
      photo: photoUrl,
      content: barcodeText,
      ocrContent: ocrText,
      matchStatus: statusText
    };
    saveHistoryRecord(scanLogRecord);

    // 4. Reveal comparative results panel and close spinner loader
    ocrLoadingLayer.classList.add('hidden');
    ocrOutcomeBox.classList.remove('hidden');
    showToast(`AI 스캔 대조 완료: [${statusText}] 판정!`, 'success');
  }

  // ==========================================
  // Decoded QR Scan Handlers & Capture Snapshot
  // ==========================================
  
  function onQrCodeScannedSuccess(decodedText, decodedResult) {
    if (currentScanData === decodedText && scanResultModal.classList.contains('show')) return;
    
    currentScanData = decodedText;

    // 1. Snapshot Capture: Draw video context onto hidden canvas
    let capturedPhotoData = '';
    try {
      const videoElement = document.querySelector('#scanner-reader video');
      if (videoElement) {
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = videoElement.videoWidth || videoElement.clientWidth;
        captureCanvas.height = videoElement.videoHeight || videoElement.clientHeight;
        
        const ctx = captureCanvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
        capturedPhotoData = captureCanvas.toDataURL('image/jpeg', 0.85); 
      }
    } catch (capErr) {
      console.error('Video canvas frame capture error:', capErr);
    }

    // Fallback placeholder SVG
    if (!capturedPhotoData) {
      capturedPhotoData = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2338bdf8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/></svg>';
    }

    // 2. Shut down WebRTC camera streams to freeze view
    html5Qrcode.stop().then(() => {
      showToast('QR/바코드 감지 성공! AI 분석을 시작합니다.', 'success');
      
      // 3. Initiate parallel AI OCR analysis sequence (Requirement)
      runOcrAnalysis(capturedPhotoData, decodedText);
    }).catch(err => {
      console.error('Post-scan stop failure:', err);
      runOcrAnalysis(capturedPhotoData, decodedText); // Fail-safe
    });
  }

  function onQrCodeScanFailure(error) {
    // Suppress loops logs
  }

  // Dialog handling buttons
  btnScanAgain.addEventListener('click', () => {
    scanResultModal.classList.remove('show');
    setTimeout(async () => {
      scanResultModal.classList.add('hidden');
      currentScanData = '';
      
      if (activeCameraId) {
        showToast('스캐너를 다시 구동합니다...', 'info');
        // micro-delay to shield quick multiple switching locks
        setTimeout(async () => {
          await startCameraStreaming(activeCameraId);
        }, 200);
      }
    }, 400);
  });

  btnCopyResult.addEventListener('click', () => {
    if (!currentScanData) return;
    
    navigator.clipboard.writeText(currentScanData).then(() => {
      showToast('스캔 결과가 클립보드에 복사되었습니다.', 'success');
    }).catch(err => {
      console.error('Clipboard error:', err);
      showToast('복사에 실패했습니다.', 'error');
    });
  });

  // ==========================================
  // Generic Modal Control (Info Booklet Sheet)
  // ==========================================
  function openInfoModal() {
    infoModal.classList.remove('hidden');
    setTimeout(() => {
      infoModal.classList.add('show');
    }, 50);
  }

  function closeInfoModal() {
    infoModal.classList.remove('show');
    setTimeout(() => {
      infoModal.classList.add('hidden');
    }, 400);
  }

  infoToggleBtn.addEventListener('click', openInfoModal);
  btnCloseModal.addEventListener('click', closeInfoModal);
  
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) closeInfoModal();
  });

  // Accessibility keyboard shortcuts helper
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (infoModal.classList.contains('show')) closeInfoModal();
      if (lightboxModal.classList.contains('show')) closeLightbox();
    }
  });

});
