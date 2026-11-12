const hudContainer = document.getElementById('hudContainer');
const dragHeader = document.getElementById('dragHeader');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const btnAdmin = document.getElementById('btnAdmin');
const btnDock = document.getElementById('btnDock');
const scanLaser = document.getElementById('scanLaser');
const btnSizeSmall = document.getElementById('btnSizeSmall');
const btnSizeMedium = document.getElementById('btnSizeMedium');
const btnSizeLarge = document.getElementById('btnSizeLarge');

const btnSeeScreen = document.getElementById('btnSeeScreen');
const btnUploadImages = document.getElementById('btnUploadImages');
const imageInput = document.getElementById('imageInput');
const btnAppWindow = document.getElementById('btnAppWindow');
const windowPickerDrawer = document.getElementById('windowPickerDrawer');
const windowPickerList = document.getElementById('windowPickerList');
const btnCloseWindowPicker = document.getElementById('btnCloseWindowPicker');
const btnMic = document.getElementById('btnMic');
const micLabel = document.getElementById('micLabel');
const micDeviceSelect = document.getElementById('micDeviceSelect');
const micLiveDot = document.getElementById('micLiveDot');
const micStatusIconWrapper = document.getElementById('micStatusIconWrapper');
const voicePersonaSelect = document.getElementById('voicePersonaSelect');
const btnPreviewVoice = document.getElementById('btnPreviewVoice');
let currentVoiceName = 'en-US-AriaNeural';
let voiceTexturesList = [];

const hudTextInput = document.getElementById('hudTextInput');
const btnSendText = document.getElementById('btnSendText');

const attachmentsDrawer = document.getElementById('attachmentsDrawer');
const attachmentsLabel = document.getElementById('attachmentsLabel');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const btnClearImages = document.getElementById('btnClearImages');

const transcriptBubble = document.getElementById('transcriptBubble');
const bubbleScroll = document.getElementById('bubbleScroll');
const userQueryContainer = document.getElementById('userQueryContainer');
const userQueryLine = document.getElementById('userQueryLine');
const btnEditQuery = document.getElementById('btnEditQuery');
const queryEditPanel = document.getElementById('queryEditPanel');
const inputEditQuery = document.getElementById('inputEditQuery');
const btnResubmitQuery = document.getElementById('btnResubmitQuery');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnCloseApp = document.getElementById('btnCloseApp');
const btnHistory = document.getElementById('btnHistory');
const memoryDrawer = document.getElementById('memoryDrawer');
const btnCloseMemory = document.getElementById('btnCloseMemory');
const btnClearMemory = document.getElementById('btnClearMemory');
const memoryList = document.getElementById('memoryList');
const tabStudyPacks = document.getElementById('tabStudyPacks');
const tabHistory = document.getElementById('tabHistory');
const btnReviseLatest = document.getElementById('btnReviseLatest');
let activeMemoryTab = 'study'; // 'study' or 'history'
const airaResponseLine = document.getElementById('airaResponseLine');

// Dedicated Full-View Code Explanation Drawer elements
const codeExplanationDrawer = document.getElementById('codeExplanationDrawer');
const codeExpPartsBadge = document.getElementById('codeExpPartsBadge');
const codeExplanationBody = document.getElementById('codeExplanationBody');
const btnCopyFullExplanation = document.getElementById('btnCopyFullExplanation');
const btnCloseCodeExp = document.getElementById('btnCloseCodeExp');
let lastCodeExplanationMarkdown = '';
const sourcesPill = document.getElementById('sourcesPill');
let lastRawUserQuery = '';

const btnPauseResume = document.getElementById('btnPauseResume');
const pauseIcon = document.getElementById('pauseIcon');
const playIcon = document.getElementById('playIcon');
const pauseLabel = document.getElementById('pauseLabel');
const btnStop = document.getElementById('btnStop');
const btnReadAgain = document.getElementById('btnReadAgain');

// Hands-Free & Live Screen Vision Elements
const btnToggleHandsFree = document.getElementById('btnToggleHandsFree');
const handsFreeLabel = document.getElementById('handsFreeLabel');
const btnToggleLiveScreen = document.getElementById('btnToggleLiveScreen');
const liveScreenLabel = document.getElementById('liveScreenLabel');
const btnToggleScreenPreview = document.getElementById('btnToggleScreenPreview');
const liveScreenViewfinder = document.getElementById('liveScreenViewfinder');
const btnCloseViewfinder = document.getElementById('btnCloseViewfinder');
const liveScreenImg = document.getElementById('liveScreenImg');
const liveScreenBadge = document.getElementById('liveScreenBadge');
const btnToggleScrollMode = document.getElementById('btnToggleScrollMode');
const scrollModeLabel = document.getElementById('scrollModeLabel');
const scrollInspectorPanel = document.getElementById('scrollInspectorPanel');
const inspectorPartsCountBadge = document.getElementById('inspectorPartsCountBadge');
const btnInspectorSolve = document.getElementById('btnInspectorSolve');
const btnInspectorClear = document.getElementById('btnInspectorClear');
const btnCloseInspector = document.getElementById('btnCloseInspector');
const inspectorGuidance = document.getElementById('inspectorGuidance');
const inspectorPartsStrip = document.getElementById('inspectorPartsStrip');

// State
let attachedScreen = null; // Base64 Data URL
let attachedImages = [];   // Array of Base64 Data URLs
let isRecording = false;
let recorder = null;
let silenceTimeout = null;
let speechDetected = false;
let currentMicrophones = [];
let activeDeviceId = 'auto';
let isHandsFreeMode = true;        // Hands-Free Auto-Listening (Default ON)
let isLiveScreenVision = false;    // Live Screen Vision (Default OFF for best performance)
let isProcessingSpeech = false;
let isEditingQuery = false;        // True while user has opened question editor
let activeQuerySequence = 0;       // Monotonic sequence ID to immediately abort in-flight responses
let pendingQueryTimer = null;      // Grace window timer for question review
let liveScreenFeedTimer = null;
let wakeWords = ['hi aira', 'hey aira', 'wake up aira', 'hello aira', 'aira'];
let sleepWords = ['bye aira', 'goodbye aira', 'close aira', 'sleep aira'];

// --- MCQ Continuous Auto-Answer Mode ---
let isMcqContinuousMode = false;
let mcqPollTimer = null;
let mcqLastScreenHash = '';        // Hash of previous screen capture for change detection
let mcqLastAnsweredHash = '';      // Hash of the screen we last answered (avoid re-answering same question)
let mcqPollIntervalMs = 2500;      // How often to check for screen changes (2.5 seconds)
let mcqIsProcessing = false;       // Guard against overlapping MCQ answers
let mcqConsecutiveNoChangeCount = 0; // Track idle polls for adaptive interval
let mcqAnswerStyle = 'FULL_EXPLANATION'; // 'FULL_EXPLANATION' or 'OPTION_ONLY'

// --- Lengthy Question / Scroll Accumulation Mode & Persistent Memory ---
let isScrollQuestionMode = false;
let scrollCapturedParts = [];          // Current session array of { dataUrl, hash, length, timestamp, partNum }
let scrollImagesMemory = [];           // Persistent working memory of each and every scroll image captured!
let scrollWatchTimer = null;           // Fast interval checking for screen scroll movement
let scrollLastFrameHash = null;        // Hash of most recent scroll frame
let scrollAutoSolveTimer = null;       // Timer after scrolling pauses to auto-solve (4s)
let scrollAutoSolveDelayMs = 4000;     // 4 seconds stillness after scrolling triggers auto-solve
let wasMcqActiveBeforeScroll = false;  // Keep track of whether MCQ mode was on

// --- Window Dragging Implementation ---
let isDragging = false;
let startX, startY;

dragHeader.addEventListener('mousedown', (e) => {
  if (e.target.closest('.header-actions')) return;
  isDragging = true;
  startX = e.screenX;
  startY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.screenX - startX;
  const deltaY = e.screenY - startY;
  startX = e.screenX;
  startY = e.screenY;
  if (window.electronAPI) {
    window.electronAPI.moveBallWindow(deltaX, deltaY);
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// --- Adjustable Size Handler (Small, Medium, Large) ---
const SIZE_CONFIGS = {
  small: { width: 400, height: 560 },
  medium: { width: 460, height: 670 },
  large: { width: 570, height: 800 }
};

let currentAppSize = localStorage.getItem('aira_widget_size') || 'medium';

async function setAppSize(sizeName) {
  if (!SIZE_CONFIGS[sizeName]) sizeName = 'medium';
  currentAppSize = sizeName;
  localStorage.setItem('aira_widget_size', sizeName);

  // Update container CSS classes
  if (hudContainer) {
    hudContainer.classList.remove('size-small', 'size-medium', 'size-large');
    hudContainer.classList.add(`size-${sizeName}`);
  }

  // Update button active state
  [btnSizeSmall, btnSizeMedium, btnSizeLarge].forEach(btn => {
    if (btn) {
      if (btn.getAttribute('data-size') === sizeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  // Resize Electron BrowserWindow
  if (window.electronAPI && window.electronAPI.setBallSize) {
    const targetDim = SIZE_CONFIGS[sizeName];
    try {
      await window.electronAPI.setBallSize({
        width: targetDim.width,
        height: targetDim.height
      });
    } catch (e) {
      console.warn('[HUD] setBallSize error:', e);
    }
  }

  // Notify 3D orb canvas to handle resize
  if (window.airaOrb && window.airaOrb.onResize) {
    setTimeout(() => {
      window.airaOrb.onResize();
    }, 100);
  }
}

if (btnSizeSmall) {
  btnSizeSmall.addEventListener('click', (e) => {
    e.stopPropagation();
    setAppSize('small');
  });
}
if (btnSizeMedium) {
  btnSizeMedium.addEventListener('click', (e) => {
    e.stopPropagation();
    setAppSize('medium');
  });
}
if (btnSizeLarge) {
  btnSizeLarge.addEventListener('click', (e) => {
    e.stopPropagation();
    setAppSize('large');
  });
}

// Initialize saved size on launch
setTimeout(() => {
  setAppSize(currentAppSize);
}, 150);

// --- UI Status Updater ---
function setAppStatus(state, message) {
  statusText.textContent = message;
  if (window.airaOrb) {
    window.airaOrb.setState(state);
  }

  const colorMap = {
    IDLE: '#00f0ff',
    LISTENING: '#10b981',
    THINKING: '#f59e0b',
    SPEAKING: '#ec4899',
    SCANNING: '#38bdf8'
  };
  const c = colorMap[state] || '#00f0ff';
  statusDot.style.background = c;
  statusDot.style.boxShadow = `0 0 10px ${c}`;
  statusText.style.color = c;
}

// --- Markdown & Code Block Formatter for Floating HUD Widget ---
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extracts a smooth, natural conversational text for Text-to-Speech (TTS),
 * replacing code blocks with a friendly verbal notification so AIRA doesn't read
 * out long lines of code verbatim.
 */
function extractSpokenText(rawMarkdown) {
  if (!rawMarkdown) return '';
  // Replace triple-backtick code blocks
  let speech = rawMarkdown.replace(/```[a-zA-Z0-9_-]*\s*[\s\S]*?```/g, (match) => {
    return ' Here is the code. ';
  });
  // Replace inline backtick code snippets
  speech = speech.replace(/`([^`]+)`/g, '$1');
  // Remove markdown bold/italic asterisks, underscores, hashes, and strikethroughs
  speech = speech.replace(/[*_#~]+/g, '');
  // Clean up repeated spaces or newlines
  speech = speech.replace(/\s+/g, ' ').trim();
  return speech || 'Here is the code you requested.';
}

/**
 * Renders response into container with separate, styled code blocks, 1-click Copy buttons,
 * and structured line badges.
 */
function renderFormattedResponse(container, markdownText) {
  if (!container) return;
  container.innerHTML = '';

  if (!markdownText) {
    container.textContent = '';
    return;
  }

  // If this response is from code explanation and container is the main HUD response line,
  // insert a prominent button at the top to pop open the full code explanation reader!
  if (container === airaResponseLine && lastCodeExplanationMarkdown) {
    const btnOpenExp = document.createElement('button');
    btnOpenExp.className = 'btn-open-code-exp';
    btnOpenExp.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>📖 Open Full Line-by-Line Breakdown</span>
    `;
    btnOpenExp.addEventListener('click', (e) => {
      e.stopPropagation();
      openCodeExplanationDrawer();
    });
    container.appendChild(btnOpenExp);
  }

  // Regex matching fenced code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\s*([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(markdownText)) !== null) {
    const textBefore = markdownText.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      appendFormattedText(container, textBefore);
    }

    const lang = (match[1] || 'CODE').toUpperCase();
    const code = match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, '');

    // Build the standalone Code Card
    const codeCard = document.createElement('div');
    codeCard.className = 'code-card';

    // Header bar with Language tag and Copy Button
    const cardHeader = document.createElement('div');
    cardHeader.className = 'code-card-header';

    const langLabel = document.createElement('span');
    langLabel.className = 'code-lang-label';
    langLabel.textContent = lang;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-code';
    copyBtn.title = 'Copy code to clipboard';
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
        <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
      <span>Copy</span>
    `;

    // Click to copy handler with feedback
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            <span>Copy</span>
          `;
        }, 2200);
      } catch (copyErr) {
        console.warn('[HUD] Clipboard copy failed:', copyErr);
      }
    });

    cardHeader.appendChild(langLabel);
    cardHeader.appendChild(copyBtn);

    // Code pre & content
    const pre = document.createElement('pre');
    pre.className = 'code-pre';
    const codeElem = document.createElement('code');
    codeElem.className = 'code-content';
    codeElem.textContent = code;
    pre.appendChild(codeElem);

    codeCard.appendChild(cardHeader);
    codeCard.appendChild(pre);

    container.appendChild(codeCard);

    lastIndex = match.index + match[0].length;
  }

  // Append remaining text after the last code block
  const remainingText = markdownText.substring(lastIndex);
  if (remainingText.trim()) {
    appendFormattedText(container, remainingText);
  }
}

/**
 * Appends normal explanation paragraphs with rich markdown support:
 * - Bold: **text**
 * - Headers: ###, ##, #
 * - Inline code: `code`
 * - Line badges: Line 1:, Line 2-4:, etc.
 * - Complexity summaries
 */
function appendFormattedText(container, rawText) {
  const paragraphs = rawText.split(/\n{2,}/);
  paragraphs.forEach(pText => {
    const trimmed = pText.trim();
    if (!trimmed) return;

    // Heading match: ### Heading
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const h = document.createElement('div');
      h.className = 'code-exp-section-title';
      h.textContent = headingMatch[2].replace(/\*\*/g, '');
      container.appendChild(h);
      return;
    }

    // Line breakdown card match: e.g. "**Line 1:**", "Line 2-4:", "Lines 1-5:"
    const lineBadgeMatch = trimmed.match(/^(\*{0,2}(Line\s+[\d\-\s,]+|Lines\s+[\d\-\s,]+)\*{0,2}:?)\s*([\s\S]*)$/i);
    if (lineBadgeMatch) {
      const lineItem = document.createElement('div');
      lineItem.className = 'code-exp-line-item';

      const badge = document.createElement('span');
      badge.className = 'code-exp-line-badge';
      badge.textContent = lineBadgeMatch[2].replace(/\*\*/g, '').trim();
      lineItem.appendChild(badge);

      const contentSpan = document.createElement('span');
      renderInlineMarkdown(contentSpan, lineBadgeMatch[3]);
      lineItem.appendChild(contentSpan);

      container.appendChild(lineItem);
      return;
    }

    // Complexity card
    if (/^(time|space)\s+complexity/i.test(trimmed) || (/complexity/i.test(trimmed) && trimmed.length < 140)) {
      const cCard = document.createElement('div');
      cCard.className = 'code-exp-complexity-card';
      renderInlineMarkdown(cCard, trimmed);
      container.appendChild(cCard);
      return;
    }

    const p = document.createElement('div');
    p.className = 'response-text-p';

    const lines = trimmed.split('\n');
    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) p.appendChild(document.createElement('br'));
      renderInlineMarkdown(p, line);
    });

    container.appendChild(p);
  });
}

function renderInlineMarkdown(element, text) {
  if (!text) return;

  // Split by inline code: `code`
  const codeParts = text.split(/`([^`]+)`/g);
  for (let i = 0; i < codeParts.length; i++) {
    if (i % 2 === 1) {
      const codePill = document.createElement('code');
      codePill.className = 'inline-code-pill';
      codePill.textContent = codeParts[i];
      element.appendChild(codePill);
    } else if (codeParts[i]) {
      // Split by bold: **bold**
      const boldParts = codeParts[i].split(/\*\*([^*]+)\*\*/g);
      for (let j = 0; j < boldParts.length; j++) {
        if (j % 2 === 1) {
          const strong = document.createElement('strong');
          strong.style.color = '#38bdf8';
          strong.textContent = boldParts[j];
          element.appendChild(strong);
        } else if (boldParts[j]) {
          element.appendChild(document.createTextNode(boldParts[j]));
        }
      }
    }
  }
}

// --- User Query Display & Manual Edit Controls ---
function displayUserQuery(text) {
  lastRawUserQuery = text;
  if (userQueryContainer) userQueryContainer.style.display = 'flex';
  if (userQueryLine) {
    userQueryLine.style.display = 'block';
    userQueryLine.textContent = `"${text}"`;
  }
  if (btnEditQuery) btnEditQuery.style.display = 'inline-flex';
  if (queryEditPanel) queryEditPanel.style.display = 'none';
  if (inputEditQuery) inputEditQuery.value = text;
  if (hudTextInput) hudTextInput.value = text;
}

function displayUserStatus(message) {
  if (userQueryContainer) userQueryContainer.style.display = 'flex';
  if (userQueryLine) {
    userQueryLine.style.display = 'block';
    userQueryLine.textContent = message;
  }
  if (btnEditQuery) btnEditQuery.style.display = 'none';
  if (queryEditPanel) queryEditPanel.style.display = 'none';
}

function openQueryEditor() {
  if (!lastRawUserQuery) return;

  // 1. Mark editing mode and bump sequence to immediately abort any active or pending query
  isEditingQuery = true;
  isProcessingSpeech = false;
  activeQuerySequence++;

  if (pendingQueryTimer) {
    clearTimeout(pendingQueryTimer);
    pendingQueryTimer = null;
  }

  // 2. Immediately silence any active response speech
  if (window.audioManager) {
    window.audioManager.stop();
  }

  // 3. Pause hands-free microphone listening so typing keystrokes/sounds aren't captured
  if (isHandsFreeMode && recorder) {
    recorder.pause();
  }

  // 4. Update status so user knows AIRA is paused and waiting for them
  setAppStatus('IDLE', 'EDITING QUESTION...');
  airaResponseLine.textContent = "Waiting for you to edit your question. Type your edits, then click 'Ask' or press Enter.";
  updateMicButtonUI('MANUAL_READY');

  if (userQueryLine) userQueryLine.style.display = 'none';
  if (btnEditQuery) btnEditQuery.style.display = 'none';
  if (queryEditPanel) queryEditPanel.style.display = 'flex';
  if (inputEditQuery) {
    inputEditQuery.value = lastRawUserQuery;
    inputEditQuery.focus();
    inputEditQuery.select();
  }
  if (hudTextInput) {
    hudTextInput.value = lastRawUserQuery;
  }
}

function cancelQueryEditor() {
  isEditingQuery = false;
  if (queryEditPanel) queryEditPanel.style.display = 'none';
  if (userQueryLine) userQueryLine.style.display = 'block';
  if (btnEditQuery && lastRawUserQuery) btnEditQuery.style.display = 'inline-flex';
  setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
  updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
  if (isHandsFreeMode && recorder && (!window.audioManager || !window.audioManager.isPlaying)) {
    recorder.resume();
  }
}

function submitEditedQuery() {
  const correctedText = (inputEditQuery ? inputEditQuery.value : '').trim();
  if (!correctedText) return;

  isEditingQuery = false;

  if (isExitCommand(correctedText)) {
    cancelQueryEditor();
    handleCloseAira();
    return;
  }

  cancelQueryEditor();
  displayUserQuery(correctedText);
  isProcessingSpeech = true;
  const newSeq = ++activeQuerySequence;
  processUserQuery(correctedText, newSeq);
}

// Event Listeners for Question Editing
if (btnEditQuery) {
  btnEditQuery.addEventListener('click', (e) => {
    e.stopPropagation();
    openQueryEditor();
  });
}

if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelQueryEditor();
  });
}

if (btnResubmitQuery) {
  btnResubmitQuery.addEventListener('click', (e) => {
    e.stopPropagation();
    submitEditedQuery();
  });
}

if (inputEditQuery) {
  inputEditQuery.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitEditedQuery();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelQueryEditor();
    }
  });
}

if (btnCloseApp) {
  btnCloseApp.addEventListener('click', () => {
    handleCloseAira();
  });
}

// --- Persistent Question Memory & Study Revision Drawer Implementation ---
async function loadQuestionMemory() {
  if (!memoryList || !window.electronAPI) return;

  if (activeMemoryTab === 'study') {
    await renderStudyPacksTab();
  } else {
    await renderHistoryTab();
  }
}

async function renderStudyPacksTab() {
  try {
    memoryList.innerHTML = '<div class="memory-empty">Loading study question sets...</div>';
    const packs = await window.electronAPI.getStudyPacks();

    if (!Array.isArray(packs) || packs.length === 0) {
      memoryList.innerHTML = `
        <div class="memory-empty">
          <p style="font-size: 13px; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">📚 No Study Sets Saved Yet</p>
          <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
            Show AIRA any list of questions on your screen, upload a questions document/image, or ask:
            <br><em style="color:#e2e8f0;">"Answer the questions on my screen"</em>.
            <br>AIRA will answer them, automatically store them in memory, and help you revise anytime!
          </p>
        </div>`;
      if (btnReviseLatest) btnReviseLatest.style.display = 'none';
      return;
    }

    if (btnReviseLatest) btnReviseLatest.style.display = 'inline-flex';
    memoryList.innerHTML = '';

    packs.forEach(pack => {
      const card = document.createElement('div');
      card.className = 'studypack-card';

      const timeStr = pack.timestamp
        ? new Date(pack.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      const itemCount = Array.isArray(pack.items) ? pack.items.length : 0;

      // Header row
      const header = document.createElement('div');
      header.className = 'studypack-header';

      const titleCol = document.createElement('div');
      titleCol.className = 'studypack-title-col';
      titleCol.innerHTML = `
        <span class="studypack-title">${escapeHtml(pack.title || 'Question Set')}</span>
        <span class="studypack-meta">${timeStr} • ${itemCount} Question${itemCount === 1 ? '' : 's'}</span>
      `;

      const actions = document.createElement('div');
      actions.className = 'studypack-actions';

      const btnRevise = document.createElement('button');
      btnRevise.className = 'btn-revise-pack';
      btnRevise.title = 'Revise this question set with AIRA';
      btnRevise.innerHTML = '🎯 Revise';
      btnRevise.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerRevisionFlow(pack);
      });

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-delete-pack';
      btnDelete.title = 'Delete this question set';
      btnDelete.innerHTML = '×';
      btnDelete.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.electronAPI.deleteStudyPack(pack.id);
        await renderStudyPacksTab();
      });

      actions.appendChild(btnRevise);
      actions.appendChild(btnDelete);
      header.appendChild(titleCol);
      header.appendChild(actions);
      card.appendChild(header);

      // Question items preview list
      if (Array.isArray(pack.items) && pack.items.length > 0) {
        const qList = document.createElement('div');
        qList.className = 'studypack-questions-list';

        pack.items.forEach((it, idx) => {
          const itemEl = document.createElement('div');
          itemEl.className = 'studypack-qa-item';
          itemEl.title = 'Click to ask AIRA to explain this question';
          itemEl.innerHTML = `
            <div class="studypack-q-text">
              <span class="studypack-q-badge">Q${it.number || (idx + 1)}</span>
              <span>${escapeHtml(it.question)}</span>
            </div>
            <div class="studypack-a-text">${escapeHtml(it.answer)}</div>
          `;
          itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMemoryDrawer();
            submitRevisionPrompt(`Explain question ${it.number || (idx + 1)} from my study set: "${it.question}"`);
          });
          qList.appendChild(itemEl);
        });
        card.appendChild(qList);
      }

      memoryList.appendChild(card);
    });
  } catch (err) {
    console.error('[HUD] Failed to load study packs:', err);
    memoryList.innerHTML = '<div class="memory-empty">Failed to load study sets.</div>';
  }
}

async function renderHistoryTab() {
  try {
    memoryList.innerHTML = '<div class="memory-empty">Loading questions...</div>';
    const history = await window.electronAPI.getHistory();
    if (!Array.isArray(history) || history.length === 0) {
      memoryList.innerHTML = '<div class="memory-empty">No past questions recorded yet.<br>Ask any question to build memory!</div>';
      return;
    }

    memoryList.innerHTML = '';
    history.slice(0, 60).forEach(item => {
      const card = document.createElement('div');
      card.className = 'memory-item';
      card.title = 'Click to populate question into input';

      const timeStr = item.timestamp
        ? new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      const timeDiv = document.createElement('div');
      timeDiv.className = 'memory-item-time';
      timeDiv.textContent = timeStr;

      const promptDiv = document.createElement('div');
      promptDiv.className = 'memory-item-prompt';
      promptDiv.textContent = `Q: ${item.prompt || ''}`;

      const responseDiv = document.createElement('div');
      responseDiv.className = 'memory-item-response';
      responseDiv.textContent = item.response || '';

      card.appendChild(timeDiv);
      card.appendChild(promptDiv);
      card.appendChild(responseDiv);

      card.addEventListener('click', () => {
        if (hudTextInput) {
          hudTextInput.value = item.prompt || '';
          hudTextInput.focus();
        }
        closeMemoryDrawer();
      });

      memoryList.appendChild(card);
    });
  } catch (err) {
    console.error('[HUD] Failed to load history:', err);
    memoryList.innerHTML = '<div class="memory-empty">Failed to load memory</div>';
  }
}

function triggerRevisionFlow(pack = null) {
  closeMemoryDrawer();
  const title = pack?.title || 'my saved question set';
  const prompt = `Let's revise ${title}. Please quiz me on the questions we stored in memory, one question at a time! Tell me the question, wait for my answer, or ask if I want the answer.`;
  submitRevisionPrompt(prompt);
}

function submitRevisionPrompt(promptText) {
  displayUserQuery(promptText);
  isProcessingSpeech = true;
  const newSeq = ++activeQuerySequence;
  processUserQuery(promptText, newSeq);
}

function openMemoryDrawer() {
  if (!memoryDrawer) return;
  memoryDrawer.style.display = 'flex';
  loadQuestionMemory();
}

function closeMemoryDrawer() {
  if (!memoryDrawer) return;
  memoryDrawer.style.display = 'none';
}

if (tabStudyPacks) {
  tabStudyPacks.addEventListener('click', () => {
    activeMemoryTab = 'study';
    tabStudyPacks.classList.add('active');
    if (tabHistory) tabHistory.classList.remove('active');
    loadQuestionMemory();
  });
}

if (tabHistory) {
  tabHistory.addEventListener('click', () => {
    activeMemoryTab = 'history';
    tabHistory.classList.add('active');
    if (tabStudyPacks) tabStudyPacks.classList.remove('active');
    loadQuestionMemory();
  });
}

if (btnReviseLatest) {
  btnReviseLatest.addEventListener('click', async (e) => {
    e.stopPropagation();
    const latest = await window.electronAPI.getLatestStudyPack();
    triggerRevisionFlow(latest);
  });
}

if (btnHistory) {
  btnHistory.addEventListener('click', (e) => {
    e.stopPropagation();
    if (memoryDrawer && (memoryDrawer.style.display === 'none' || !memoryDrawer.style.display)) {
      openMemoryDrawer();
    } else {
      closeMemoryDrawer();
    }
  });
}

if (btnCloseMemory) {
  btnCloseMemory.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMemoryDrawer();
  });
}

if (btnClearMemory) {
  btnClearMemory.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (window.electronAPI) {
      if (activeMemoryTab === 'study') {
        await window.electronAPI.clearStudyPacks();
      } else {
        await window.electronAPI.clearHistory();
      }
      await loadQuestionMemory();
    }
  });
}

// --- Dedicated Full-View Code & Line-by-Line Explanation Drawer ---
function openCodeExplanationDrawer() {
  if (codeExplanationDrawer) {
    if (memoryDrawer) memoryDrawer.style.display = 'none';
    if (windowPickerDrawer) windowPickerDrawer.style.display = 'none';
    codeExplanationDrawer.style.display = 'flex';
  }
}

function closeCodeExplanationDrawer() {
  if (codeExplanationDrawer) {
    codeExplanationDrawer.style.display = 'none';
  }
}

if (btnCloseCodeExp) {
  btnCloseCodeExp.addEventListener('click', (e) => {
    e.stopPropagation();
    closeCodeExplanationDrawer();
  });
}

if (btnCopyFullExplanation) {
  btnCopyFullExplanation.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!lastCodeExplanationMarkdown) return;
    try {
      await navigator.clipboard.writeText(lastCodeExplanationMarkdown);
      btnCopyFullExplanation.classList.add('copied');
      btnCopyFullExplanation.innerHTML = `<span>✓ Copied!</span>`;
      setTimeout(() => {
        btnCopyFullExplanation.classList.remove('copied');
        btnCopyFullExplanation.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span>Copy All</span>
        `;
      }, 2000);
    } catch (e) {}
  });
}

function renderCodeExplanationDrawer(markdownText, partsCount) {
  if (!codeExplanationDrawer || !codeExplanationBody) return;

  if (codeExpPartsBadge) {
    codeExpPartsBadge.textContent = `${partsCount || scrollImagesMemory.length || 1} Scrolled Parts`;
  }

  codeExplanationBody.innerHTML = '';
  renderFormattedResponse(codeExplanationBody, markdownText);
  codeExplanationBody.scrollTop = 0;
}

// Robust Exit Command Detector (handles "bye", "by", "buy", "goodbye", "close aira", "close", "quit", sleepWords, etc.)
function isExitCommand(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.toLowerCase().trim();
  const clean = raw.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return false;

  // 1. Direct one-word / homophone matches
  const singleWordExits = ['bye', 'by', 'buy', 'goodbye', 'byebye', 'exit', 'quit', 'close', 'shutdown'];
  if (singleWordExits.includes(clean)) {
    return true;
  }

  // 2. Direct multi-word matches
  const multiWordExits = [
    'bye bye', 'good bye', 'bye aira', 'by aira', 'buy aira',
    'goodbye aira', 'good bye aira', 'close aira', 'close app',
    'close the app', 'exit app', 'quit app', 'shut down',
    'sleep aira', 'ok bye', 'okay bye', 'alright bye', 'bye now',
    'bye for now', 'see you later'
  ];
  if (multiWordExits.includes(clean)) {
    return true;
  }

  // 3. User configured sleep words from settings
  if (Array.isArray(sleepWords)) {
    for (const sw of sleepWords) {
      const cleanSw = sw.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanSw && (clean === cleanSw || clean.startsWith(cleanSw + ' ') || clean.endsWith(' ' + cleanSw))) {
        return true;
      }
    }
  }

  // 4. Token-based matching for short commands (<= 5 words)
  const tokens = clean.split(' ');
  if (tokens.length <= 5) {
    if (tokens.includes('bye') || tokens.includes('goodbye')) {
      return true;
    }
    if ((tokens.includes('by') || tokens.includes('buy')) && 
        (tokens.includes('aira') || tokens.includes('app') || tokens.includes('ok') || tokens.includes('okay') || tokens.includes('now') || tokens.length === 1)) {
      return true;
    }
    if (tokens.includes('close') || tokens.includes('quit') || tokens.includes('exit')) {
      if (tokens.includes('aira') || tokens.includes('app') || tokens.includes('application') || tokens.includes('window') || tokens.length <= 2) {
        return true;
      }
    }
  }

  return false;
}

// --- Attachments UI Management ---
function updateAttachmentsUI() {
  thumbnailsContainer.innerHTML = '';
  const totalCount = (attachedScreen ? 1 : 0) + attachedImages.length;

  if (totalCount === 0) {
    attachmentsDrawer.style.display = 'none';
    return;
  }

  attachmentsDrawer.style.display = 'flex';
  attachmentsLabel.textContent = `Attached Context (${totalCount})`;

  // Screen thumbnail
  if (attachedScreen) {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    item.innerHTML = `
      <img src="${attachedScreen}" alt="Screen">
      <div class="screen-badge">SCREEN</div>
      <button class="thumb-del" title="Remove Screen">×</button>
    `;
    item.querySelector('.thumb-del').addEventListener('click', (e) => {
      e.stopPropagation();
      attachedScreen = null;
      updateAttachmentsUI();
    });
    thumbnailsContainer.appendChild(item);
  }

  // Uploaded images and documents
  attachedImages.forEach((item, idx) => {
    const dataUrl = typeof item === 'string' ? item : item.dataUrl;
    const name = typeof item === 'object' && item.name ? item.name : `File ${idx + 1}`;
    const isPdf = (dataUrl && dataUrl.startsWith('data:application/pdf')) || (item.type === 'pdf') || name.toLowerCase().endsWith('.pdf');
    const isLog = (dataUrl && dataUrl.startsWith('data:text/')) || name.toLowerCase().endsWith('.log') || name.toLowerCase().endsWith('.txt');

    const div = document.createElement('div');
    if (isPdf) {
      div.className = 'thumb-item thumb-doc';
      div.title = name;
      div.innerHTML = `
        <div class="thumb-doc-icon">📄</div>
        <div class="thumb-doc-name">${escapeHtml(name)}</div>
        <button class="thumb-del" title="Remove">×</button>
      `;
    } else if (isLog) {
      div.className = 'thumb-item thumb-doc';
      div.title = name;
      div.innerHTML = `
        <div class="thumb-doc-icon">📋</div>
        <div class="thumb-doc-name">${escapeHtml(name)}</div>
        <button class="thumb-del" title="Remove">×</button>
      `;
    } else {
      div.className = 'thumb-item';
      div.title = name;
      div.innerHTML = `
        <img src="${dataUrl}" alt="${escapeHtml(name)}">
        <button class="thumb-del" title="Remove">×</button>
      `;
    }

    div.querySelector('.thumb-del').addEventListener('click', (e) => {
      e.stopPropagation();
      attachedImages.splice(idx, 1);
      updateAttachmentsUI();
    });
    thumbnailsContainer.appendChild(div);
  });
}

btnClearImages.addEventListener('click', () => {
  attachedScreen = null;
  attachedImages = [];
  updateAttachmentsUI();
});

// --- Screen Capture ("See My Screen") ---
btnSeeScreen.addEventListener('click', async () => {
  try {
    setAppStatus('SCANNING', 'CAPTURING SCREEN...');
    scanLaser.classList.add('active');

    // Small delay for visual sweep
    await new Promise(r => setTimeout(r, 400));
    const screenData = await window.electronAPI.captureScreen(0);
    attachedScreen = screenData;
    updateAttachmentsUI();

    scanLaser.classList.remove('active');
    setAppStatus('IDLE', 'SCREEN CAPTURED');

    userQueryLine.style.display = 'block';
  } catch (err) {
    scanLaser.classList.remove('active');
    setAppStatus('IDLE', 'CAPTURE FAILED');
    console.error('Screen capture error:', err);
  }
});

// --- Specific Desktop App Window Capture ---
if (btnAppWindow) {
  btnAppWindow.addEventListener('click', async () => {
    if (windowPickerDrawer.style.display === 'flex') {
      windowPickerDrawer.style.display = 'none';
      return;
    }
    await openAppWindowPicker();
  });
}

if (btnCloseWindowPicker) {
  btnCloseWindowPicker.addEventListener('click', () => {
    if (windowPickerDrawer) windowPickerDrawer.style.display = 'none';
  });
}

async function openAppWindowPicker() {
  if (!windowPickerDrawer || !windowPickerList || !window.electronAPI) return;
  windowPickerDrawer.style.display = 'flex';
  windowPickerList.innerHTML = '<div style="color:#64748b; font-size:11px; padding:10px;">Scanning open desktop applications...</div>';

  try {
    const windows = await window.electronAPI.getWindows();
    if (!windows || windows.length === 0) {
      windowPickerList.innerHTML = '<div style="color:#64748b; font-size:11px; padding:10px;">No external application windows detected.</div>';
      return;
    }

    windowPickerList.innerHTML = '';
    windows.forEach(w => {
      const item = document.createElement('div');
      item.className = 'window-picker-item';
      item.title = `Capture and analyze "${w.name}"`;

      item.innerHTML = `
        <img class="window-picker-thumb" src="${w.thumbnail || ''}" alt="Window">
        <span class="window-picker-name">${escapeHtml(w.name)}</span>
      `;

      item.addEventListener('click', async () => {
        windowPickerDrawer.style.display = 'none';
        setAppStatus('SCANNING', `PARSING "${w.name.substring(0, 15)}..."`);
        try {
          const cap = await window.electronAPI.captureWindow(w.id);
          attachedScreen = cap;
          updateAttachmentsUI();
          setAppStatus('IDLE', 'APP WINDOW ATTACHED');
          userQueryLine.style.display = 'block';
          userQueryLine.textContent = `🎯 App attached: "${w.name}". Ask: "Find errors", "Parse tables", or click Speak!`;
        } catch (e) {
          console.error('[HUD] App window capture error:', e);
          setAppStatus('IDLE', 'APP CAPTURE ERROR');
        }
      });

      windowPickerList.appendChild(item);
    });
  } catch (err) {
    console.warn('[HUD] Failed to load windows:', err);
    windowPickerList.innerHTML = '<div style="color:#f43f5e; font-size:11px; padding:10px;">Could not list windows.</div>';
  }
}

// --- Multiple Images, PDFs, and Logs Upload ---
imageInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  for (const file of files) {
    const dataUrl = await readFileAsDataURL(file);
    attachedImages.push({
      dataUrl,
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : (file.type.includes('image') ? 'image' : 'log')
    });
  }
  imageInput.value = '';
  updateAttachmentsUI();
  setAppStatus('IDLE', `${files.length} ATTACHMENT(S) ADDED`);
});

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Drag & Drop images or PDFs onto window
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer && e.dataTransfer.files) {
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const dataUrl = await readFileAsDataURL(file);
      attachedImages.push({
        dataUrl,
        name: file.name,
        type: file.type.includes('pdf') ? 'pdf' : (file.type.includes('image') ? 'image' : 'log')
      });
    }
    updateAttachmentsUI();
    setAppStatus('IDLE', `${files.length} ATTACHMENT(S) DROPPED`);
  }
});

// --- Microphone & Audio Input Management ---
async function initMicrophoneDevices() {
  if (!window.AudioRecorder) return;
  try {
    currentMicrophones = await window.AudioRecorder.getAudioInputDevices();
    renderMicrophoneOptions();

    // Listen for device changes (e.g. Bluetooth earbuds connected or disconnected)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        console.log('[HUD] Audio device change detected, refreshing microphones...');
        currentMicrophones = await window.AudioRecorder.getAudioInputDevices();
        renderMicrophoneOptions();
      });
    }
  } catch (e) {
    console.warn('[HUD] Failed to initialize microphone devices:', e);
  }
}

function renderMicrophoneOptions() {
  if (!micDeviceSelect) return;
  micDeviceSelect.innerHTML = '';

  const autoOpt = document.createElement('option');
  autoOpt.value = 'auto';
  autoOpt.textContent = '⚡ Auto-Detect Earbuds / Best Mic';
  micDeviceSelect.appendChild(autoOpt);

  let hasEarbuds = false;
  currentMicrophones.forEach(dev => {
    const opt = document.createElement('option');
    opt.value = dev.deviceId;
    if (dev.isEarbuds) {
      opt.textContent = `🎧 ${dev.label} [Earbuds]`;
      hasEarbuds = true;
    } else if (dev.isLaptopMic) {
      opt.textContent = `💻 ${dev.label} [Laptop Mic]`;
    } else {
      opt.textContent = `🎙️ ${dev.label}`;
    }
    micDeviceSelect.appendChild(opt);
  });

  // Select according to saved config or preferred device
  if (activeDeviceId && activeDeviceId !== 'auto') {
    const match = currentMicrophones.find(d => d.deviceId === activeDeviceId);
    if (match) {
      micDeviceSelect.value = activeDeviceId;
    } else {
      micDeviceSelect.value = 'auto';
    }
  } else {
    micDeviceSelect.value = 'auto';
  }

  updateMicIconDisplay(micDeviceSelect.value);
}

function updateMicIconDisplay(devId) {
  if (!micStatusIconWrapper) return;
  const dev = currentMicrophones.find(d => d.deviceId === devId);
  const isEarbud = devId === 'auto'
    ? currentMicrophones.some(d => d.isEarbuds)
    : (dev?.isEarbuds || false);
  const isLaptop = devId === 'auto'
    ? (!isEarbud && currentMicrophones.some(d => d.isLaptopMic))
    : (dev?.isLaptopMic || false);

  if (isEarbud) {
    micStatusIconWrapper.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="#10b981" d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2a7 7 0 0 1 14 0v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z"/></svg>`;
    micDeviceSelect.style.color = '#34d399';
  } else if (isLaptop) {
    micStatusIconWrapper.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="#38bdf8" d="M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2h-4zM4 5h16v11H4V5z"/></svg>`;
    micDeviceSelect.style.color = '#38bdf8';
  } else {
    micStatusIconWrapper.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="#cbd5e1" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`;
    micDeviceSelect.style.color = '#cbd5e1';
  }
}

if (micDeviceSelect) {
  micDeviceSelect.addEventListener('change', async (e) => {
    activeDeviceId = e.target.value;
    updateMicIconDisplay(activeDeviceId);
    if (recorder) {
      recorder.setDeviceId(activeDeviceId);
    }
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ audioInputDeviceId: activeDeviceId });
    }
  });
}

// --- Voice Texture Persona Management on Main App ---
async function initVoicePersonaOptions() {
  if (!voicePersonaSelect || !window.electronAPI) return;
  try {
    voiceTexturesList = await window.electronAPI.getVoiceTextures();
    voicePersonaSelect.innerHTML = '';
    voiceTexturesList.forEach(vt => {
      const opt = document.createElement('option');
      opt.value = vt.id;
      opt.textContent = `✨ ${vt.name} - ${vt.texture}`;
      if (vt.id === currentVoiceName) {
        opt.selected = true;
      }
      voicePersonaSelect.appendChild(opt);
    });
  } catch (err) {
    console.warn('[HUD] Failed to load voice textures on main app:', err);
  }
}

if (voicePersonaSelect) {
  voicePersonaSelect.addEventListener('change', async (e) => {
    currentVoiceName = e.target.value;
    const selectedVoice = voiceTexturesList.find(v => v.id === currentVoiceName);
    const voiceLabel = selectedVoice ? selectedVoice.name : 'Selected Voice';

    if (window.electronAPI) {
      await window.electronAPI.saveConfig({
        voice: {
          provider: 'edge-tts',
          voiceName: currentVoiceName,
          pitch: '+0Hz',
          rate: '+0%',
          volume: '+0%'
        },
        voiceName: currentVoiceName
      });
    }

    userQueryLine.style.display = 'block';
    userQueryLine.textContent = `🎭 Voice switched to ${voiceLabel}`;

    // Play immediate voice sample preview
    previewCurrentVoice(`Voice texture set to ${voiceLabel}.`);
  });
}

if (btnPreviewVoice) {
  btnPreviewVoice.addEventListener('click', async () => {
    const selectedVoice = voiceTexturesList.find(v => v.id === currentVoiceName);
    const voiceLabel = selectedVoice ? selectedVoice.name : 'Aira';
    previewCurrentVoice(`Greetings! This is the ${voiceLabel} voice texture.`);
  });
}

async function previewCurrentVoice(sampleText) {
  try {
    setAppStatus('SPEAKING', 'PREVIEWING VOICE...');
    const synthRes = await window.electronAPI.synthesizeSpeech({
      text: sampleText,
      voiceConfig: { voiceName: currentVoiceName, pitch: '+0Hz', rate: '+0%', volume: '+0%' }
    });
    if (synthRes && synthRes.success) {
      await window.audioManager.playAudioData(synthRes.audioDataUrl, sampleText);
    } else {
      window.audioManager.speakFallback(sampleText);
    }
  } catch (e) {
    console.warn('[HUD] Voice preview error:', e);
  }
}

// --- Hands-Free Auto-Listening & Live Screen Vision Pipeline ---

// --- Dynamic Mic / Speak Button State Updater ---
function updateMicButtonUI(state) {
  if (!btnMic || !micLabel) return;
  btnMic.classList.remove('listening', 'auto-ready');

  switch (state) {
    case 'RECORDING':
      btnMic.classList.add('listening');
      micLabel.textContent = 'Listening...';
      btnMic.title = 'Listening to your voice... Speaks automatically when you finish.';
      break;
    case 'AUTO_READY':
      btnMic.classList.add('auto-ready');
      micLabel.textContent = 'Auto-Listen';
      btnMic.title = 'Auto-listening active: Speak anytime, or click here to speak manually.';
      break;
    case 'MANUAL_READY':
      micLabel.textContent = 'Speak';
      btnMic.title = 'Click to speak';
      break;
    case 'PROCESSING':
      micLabel.textContent = 'Thinking...';
      btnMic.title = 'Thinking and processing your answer...';
      break;
    default:
      if (isHandsFreeMode) {
        btnMic.classList.add('auto-ready');
        micLabel.textContent = 'Auto-Listen';
      } else {
        micLabel.textContent = 'Speak';
      }
      break;
  }
}

function toggleHandsFree(enable) {
  isHandsFreeMode = enable;
  if (btnToggleHandsFree) {
    if (isHandsFreeMode) {
      btnToggleHandsFree.classList.add('active');
      handsFreeLabel.textContent = 'Auto-Listen: ON';
      userQueryLine.style.display = 'block';
      userQueryLine.textContent = '🎙️ Auto-listening active. Speak anytime into your earbuds (or click Speak).';
      updateMicButtonUI('AUTO_READY');
      startHandsFreeListening();
    } else {
      btnToggleHandsFree.classList.remove('active');
      handsFreeLabel.textContent = 'Auto-Listen: OFF';
      userQueryLine.textContent = 'Auto-listen OFF. Click "Speak" button whenever you want to talk.';
      updateMicButtonUI('MANUAL_READY');
      if (recorder) recorder.pause();
    }
  }
  if (window.electronAPI) {
    window.electronAPI.saveConfig({ handsFreeMode: isHandsFreeMode });
  }
}

function toggleLiveScreenVision(enable) {
  isLiveScreenVision = enable;
  if (btnToggleLiveScreen) {
    if (isLiveScreenVision) {
      btnToggleLiveScreen.classList.add('active');
      liveScreenLabel.textContent = 'Live Screen: ON';
      if (liveScreenBadge) liveScreenBadge.style.display = 'flex';
      if (window.airaOrb && window.airaOrb.setLiveVisionActive) {
        window.airaOrb.setLiveVisionActive(true);
      }
      startLiveScreenVisionFeed();
    } else {
      btnToggleLiveScreen.classList.remove('active');
      liveScreenLabel.textContent = 'Live Screen: OFF';
      if (liveScreenBadge) liveScreenBadge.style.display = 'none';
      if (liveScreenViewfinder) liveScreenViewfinder.style.display = 'none';
      if (window.airaOrb && window.airaOrb.setLiveVisionActive) {
        window.airaOrb.setLiveVisionActive(false);
      }
      if (liveScreenFeedTimer) {
        clearInterval(liveScreenFeedTimer);
        liveScreenFeedTimer = null;
      }
      attachedScreen = null;
    }
  }
  if (window.electronAPI) {
    window.electronAPI.saveConfig({ liveScreenVision: isLiveScreenVision });
  }
}

// Live Screen Realtime Feed
function startLiveScreenVisionFeed() {
  if (liveScreenFeedTimer) clearInterval(liveScreenFeedTimer);
  updateRealtimeScreenFeed();
  liveScreenFeedTimer = setInterval(updateRealtimeScreenFeed, 2200);
}

async function updateRealtimeScreenFeed() {
  if (!isLiveScreenVision || document.hidden) return;
  try {
    const feedData = await window.electronAPI.captureScreen(0, { width: 480, height: 270, quality: 60 });
    if (feedData && feedData.length > 50) {
      if (liveScreenImg) liveScreenImg.src = feedData;
      if (window.airaOrb && window.airaOrb.updateLiveScreen) {
        window.airaOrb.updateLiveScreen(feedData);
      }
    }
  } catch (e) {}
}

// Viewfinder toggle and close buttons
if (btnToggleScreenPreview) {
  btnToggleScreenPreview.addEventListener('click', () => {
    if (liveScreenViewfinder) {
      const isVisible = liveScreenViewfinder.style.display === 'flex';
      liveScreenViewfinder.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) updateRealtimeScreenFeed();
    }
  });
}

if (btnCloseViewfinder) {
  btnCloseViewfinder.addEventListener('click', () => {
    if (liveScreenViewfinder) liveScreenViewfinder.style.display = 'none';
  });
}

if (btnToggleHandsFree) {
  btnToggleHandsFree.addEventListener('click', () => {
    toggleHandsFree(!isHandsFreeMode);
  });
}

if (btnToggleLiveScreen) {
  btnToggleLiveScreen.addEventListener('click', () => {
    toggleLiveScreenVision(!isLiveScreenVision);
  });
}

if (btnToggleScrollMode) {
  btnToggleScrollMode.addEventListener('click', () => {
    if (isScrollQuestionMode) {
      cancelScrollQuestionCapture();
    } else {
      startScrollQuestionCapture();
    }
  });
}

if (btnInspectorSolve) {
  btnInspectorSolve.addEventListener('click', (e) => {
    e.stopPropagation();
    finishScrollQuestionCapture();
  });
}

if (btnInspectorClear) {
  btnInspectorClear.addEventListener('click', (e) => {
    e.stopPropagation();
    scrollCapturedParts = [];
    if (inspectorPartsStrip) inspectorPartsStrip.innerHTML = '';
    if (inspectorPartsCountBadge) inspectorPartsCountBadge.textContent = '0 Parts';
    if (inspectorGuidance) inspectorGuidance.innerHTML = '<span>↺ Cleared! Scroll down to record fresh question parts...</span>';
    startScrollQuestionCapture();
  });
}

if (btnCloseInspector) {
  btnCloseInspector.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelScrollQuestionCapture();
  });
}

// Continuous Hands-Free VAD listening
async function startHandsFreeListening() {
  if (!isHandsFreeMode || isProcessingSpeech) return;
  if (window.audioManager && window.audioManager.isPlaying) return;

  try {
    if (!recorder) {
      recorder = new window.AudioRecorder();
    }

    const targetDevId = micDeviceSelect ? micDeviceSelect.value : (activeDeviceId || 'auto');
    recorder.setDeviceId(targetDevId);

    if (recorder.isRecording) {
      await recorder.resume();
      setAppStatus('IDLE', 'AIRA READY - SPEAK ANYTIME');
      updateMicButtonUI('AUTO_READY');
      return;
    }

    await recorder.startContinuous({
      deviceId: targetDevId,
      onVolume: (vol) => {
        if (window.airaOrb) window.airaOrb.setAudioLevel(vol);
        if (micLiveDot) {
          if (vol > 0.02) micLiveDot.classList.add('active');
          else micLiveDot.classList.remove('active');
        }
      },
      onSpeechStart: () => {
        if (isProcessingSpeech || (window.audioManager && window.audioManager.isPlaying)) return;
        setAppStatus('LISTENING', 'AIRA IS LISTENING');
        displayUserStatus('🎙️ Listening... Speak naturally, answers automatically when you finish.');
        updateMicButtonUI('RECORDING');
      },
      onSpeechEnd: async (wavBase64) => {
        updateMicButtonUI('PROCESSING');
        await handleHandsFreeSpeech(wavBase64);
      },
      onNoSpeech: () => {
        setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
      }
    });

    isRecording = true;
    setAppStatus('IDLE', 'AIRA READY - SPEAK ANYTIME');
    updateMicButtonUI('AUTO_READY');
    const activeOpt = micDeviceSelect?.selectedOptions?.[0]?.textContent || 'earbuds';
    displayUserStatus(`🎙️ Auto-listening active via ${activeOpt}... Speak anytime or click Speak.`);
  } catch (err) {
    console.error('Hands-free listen error:', err);
    setAppStatus('IDLE', 'MIC ACCESS ERROR');
    displayUserStatus(`⚠️ Mic error: ${err.message}.`);
    updateMicButtonUI('MANUAL_READY');
  }
}

// Handle speech recorded automatically or manually
async function handleHandsFreeSpeech(wavBase64) {
  if (isProcessingSpeech) return;
  isProcessingSpeech = true;
  if (recorder) recorder.pause();

  updateMicButtonUI('PROCESSING');

  if (!wavBase64 || wavBase64.length < 500) {
    isProcessingSpeech = false;
    setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
    updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
    if (isHandsFreeMode && recorder) recorder.resume();
    return;
  }

  setAppStatus('THINKING', 'UNDERSTANDING SPEECH...');
  displayUserStatus('⚡ Transcribing your voice...');

  try {
    const sttResult = await window.electronAPI.transcribeAudio(wavBase64);

    if (sttResult && sttResult.success && sttResult.text) {
      let spokenText = sttResult.text.trim();

      // Clean out any noise markers or bracketed tags
      spokenText = spokenText.replace(/(\<noise\>|\[noise\]|\*noise\*|\(noise\)|\<cough\>|\[cough\]|\<music\>|\[music\]|\[silence\]|\<snicker\>|\[snicker\])/gi, '').trim();

      // If transcript is empty or just noise punctuation (e.g. ".", "?", "-"), silently resume
      if (!spokenText || spokenText.length < 2 || /^[^a-zA-Z0-9]+$/.test(spokenText)) {
        console.log('[HUD] Discarded ambient noise transcript:', sttResult.text);
        setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        isProcessingSpeech = false;
        if (isHandsFreeMode && recorder) recorder.resume();
        return;
      }

      const lower = spokenText.toLowerCase();
      const cleanLower = lower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();

      // Discard physiological noise words that STT engines transcribe from coughs, breathing, or sighs
      const nonSpeechPattern = /^(cough|coughing|coughs|a cough|throat|throat clearing|clear throat|clearing throat|breath|breathing|deep breath|heavy breathing|sigh|sighs|snort|sniff|sniffle|sniffles|achoo|sneeze|sneezing|yawn|yawning|uh|um|er|ah|eh|oh|huh|hmm|hm|ha|shh|pff|wheeze|gasp|pant|pant pant|groan)$/i;
      if (nonSpeechPattern.test(cleanLower)) {
        console.log('[HUD] Discarded physiological noise utterance:', spokenText);
        setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        isProcessingSpeech = false;
        if (isHandsFreeMode && recorder) recorder.resume();
        return;
      }

      // 1. BYE TRIGGER: "bye", "by", "buy", "goodbye", "close", "close app", sleepWords, etc. -> Close application completely!
      if (isExitCommand(spokenText)) {
        await handleCloseAira();
        return;
      }

      displayUserQuery(spokenText);

      // 2. HI / WAKE TRIGGER: Check custom wake words and common greetings
      const isCustomWake = Array.isArray(wakeWords) && wakeWords.some(w => {
        const cleanW = (w || '').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
        return cleanW && (cleanLower === cleanW || cleanLower.startsWith(cleanW + ' '));
      });

      const isHiGreeting = isCustomWake || (
        cleanLower === 'hi' ||
        cleanLower === 'hey' ||
        cleanLower === 'hello' ||
        cleanLower === 'hi aira' ||
        cleanLower === 'hey aira' ||
        cleanLower === 'hello aira' ||
        cleanLower === 'wake up' ||
        cleanLower === 'wake up aira' ||
        cleanLower === 'aira' ||
        cleanLower === 'ok aira' ||
        cleanLower === 'namaste aira' ||
        cleanLower === 'namaskara aira'
      );

      if (isHiGreeting) {
        setAppStatus('SPEAKING', 'HI! I AM LISTENING...');
        const greetingText = "Hi! I'm listening, go ahead and ask me anything.";
        airaResponseLine.textContent = greetingText;

        try {
          const synthRes = await window.electronAPI.synthesizeSpeech({ text: greetingText });
          if (synthRes && synthRes.success) {
            await window.audioManager.playAudioData(synthRes.audioDataUrl, greetingText);
          } else {
            window.audioManager.speakFallback(greetingText);
          }
        } catch (e) {
          isProcessingSpeech = false;
          setAppStatus('LISTENING', 'AIRA IS LISTENING (Speak now)');
          userQueryLine.textContent = '🎙️ I am listening! Speak your question now...';
          updateMicButtonUI('RECORDING');
          if (isHandsFreeMode && recorder) recorder.forceSpeechStart();
        }
        return;
      }

      // Standard control commands
      if (cleanLower === 'stop' || cleanLower === 'aira stop' || cleanLower === 'quiet') {
        window.audioManager.stop();
        // If MCQ mode is active, "stop" also exits MCQ mode
        if (isMcqContinuousMode) {
          isProcessingSpeech = false;
          await stopMcqContinuousMode();
          return;
        }
        setAppStatus('IDLE', 'STOPPED');
        isProcessingSpeech = false;
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        if (isHandsFreeMode) setTimeout(() => startHandsFreeListening(), 500);
        return;
      }
      if (lower === 'pause' || lower === 'aira pause') {
        window.audioManager.pause();
        isProcessingSpeech = false;
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        return;
      }
      if (lower === 'resume' || lower === 'continue') {
        window.audioManager.resume();
        isProcessingSpeech = false;
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        return;
      }
      if (lower === 'read again' || lower === 'repeat' || lower === 'read that again') {
        window.audioManager.replay();
        isProcessingSpeech = false;
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        return;
      }
      if (lower === 'stop listening' || lower === 'pause hands free' || lower === 'disable auto listen') {
        toggleHandsFree(false);
        isProcessingSpeech = false;
        return;
      }
      if (lower === 'start listening' || lower === 'enable hands free' || lower === 'resume hands free') {
        toggleHandsFree(true);
        isProcessingSpeech = false;
        return;
      }
      if (lower === 'show screen' || lower === 'open screen' || lower === 'see screen') {
        if (liveScreenViewfinder) liveScreenViewfinder.style.display = 'flex';
        updateRealtimeScreenFeed();
      }

      // 3. REVISION VOICE TRIGGER: "revise my questions", "revise questions", "quiz me", "revise study set"
      const isReviseCommand = cleanLower.includes('revise') ||
                              cleanLower.includes('quiz me') ||
                              cleanLower === 'review my questions' ||
                              cleanLower === 'review questions' ||
                              cleanLower === 'practice questions' ||
                              cleanLower === 'test me';

      if (isReviseCommand) {
        isProcessingSpeech = true;
        const latestPack = await window.electronAPI.getLatestStudyPack();
        const packTitle = latestPack?.title || 'your questions';
        const revisePrompt = latestPack && latestPack.items && latestPack.items.length > 0
          ? `Let's revise ${packTitle}. Please quiz me on the questions we stored in memory, one question at a time! Ask me question 1 first, and wait for my response.`
          : `Let's revise the questions and answers from our past interactions stored in your memory. Please quiz me on them one by one!`;
        submitRevisionPrompt(revisePrompt);
        return;
      }

      // 3b. DOCUMENT & PRESENTATION CREATION TRIGGER:
      // "make ppt on [topic]", "make report in pdf on [topic]", "make report in word on [topic]"
      if (isDocumentCreationCommand(spokenText)) {
        isProcessingSpeech = true;
        await handleDocumentGeneration(spokenText);
        return;
      }

      // 4. LENGTHY QUESTION SCROLLED CAPTURE & AUTO-SOLVER
      if (isScrollQuestionMode) {
        if (isScrollCancelCommand(spokenText)) {
          isProcessingSpeech = false;
          cancelScrollQuestionCapture();
          return;
        }
        if (isScrollDoneCommand(spokenText)) {
          isProcessingSpeech = false;
          await finishScrollQuestionCapture();
          return;
        }

        // Check if user specifically asks to explain code line-by-line from the scroll images
        if (isScrollCodeExplanationCommand(spokenText)) {
          console.log('[ScrollMode] 🎙️ Code line-by-line explanation command in Scroll Mode:', spokenText);
          isProcessingSpeech = true;
          await explainCodeFromScrollMemory(spokenText);
          return;
        }

        // Custom user voice input in Scroll Mode!
        // E.g.: "explain full code line by line by seeing all images as I scroll down"
        console.log('[ScrollMode] 🎙️ Custom voice instruction in Scroll Mode:', spokenText);
        isProcessingSpeech = true;
        await finishScrollQuestionCapture(spokenText);
        return;
      }

      // 4b. VOICE COMMAND: Explain each line in code from scroll images memory!
      if (isScrollCodeExplanationCommand(spokenText)) {
        console.log('[HUD] 🎙️ Recognized code line-by-line explanation command from scroll memory:', spokenText);
        isProcessingSpeech = true;
        await explainCodeFromScrollMemory(spokenText);
        return;
      }

      if (isLengthyQuestionCommand(spokenText)) {
        isProcessingSpeech = false;
        await startScrollQuestionCapture();
        return;
      }

      // 5. MCQ CONTINUOUS MODE: Voice Commands & Direct Queries
      if (isMcqContinuousMode) {
        // A. Stop / Exit MCQ mode
        if (isMcqDeactivationCommand(spokenText)) {
          isProcessingSpeech = false;
          await stopMcqContinuousMode();
          return;
        }

        // Check if user asks for code explanation from scroll memory during MCQ mode
        if (isScrollCodeExplanationCommand(spokenText)) {
          console.log('[MCQ] 🎙️ Code line-by-line explanation from scroll memory requested:', spokenText);
          isProcessingSpeech = true;
          await explainCodeFromScrollMemory(spokenText);
          return;
        }

        // B. Format preference: "give only option number as questions change"
        if (isMcqOptionOnlyCommand(spokenText)) {
          isProcessingSpeech = false;
          mcqAnswerStyle = 'OPTION_ONLY';
          displayUserStatus('📝 MCQ Mode: Speaking OPTION NUMBER ONLY as questions change');
          airaResponseLine.textContent = 'Switched to Option-Only mode. I will speak only the option number as questions change.';
          const confirmText = "Option-only mode set! I will speak only the option number as questions change.";
          try {
            const synthRes = await window.electronAPI.synthesizeSpeech({
              text: confirmText,
              voiceConfig: { voiceName: currentVoiceName, rate: '+15%' }
            });
            if (synthRes && synthRes.success) await window.audioManager.playAudioData(synthRes.audioDataUrl, confirmText);
          } catch (e) {}
          setAppStatus('SCANNING', 'AIRA ACTIVE — OPTION ONLY');
          if (isHandsFreeMode && recorder) recorder.resume();
          return;
        }

        // C. Format preference: "give explanation" / "explain why as questions change"
        if (isMcqExplanationCommand(spokenText)) {
          isProcessingSpeech = false;
          mcqAnswerStyle = 'FULL_EXPLANATION';
          displayUserStatus('📝 MCQ Mode: Speaking OPTION + EXPLANATION as questions change');
          airaResponseLine.textContent = 'Switched to Full Explanation mode. I will speak the answer and explanation as questions change.';
          const confirmText = "Explanation mode set! I will include explanations as questions change.";
          try {
            const synthRes = await window.electronAPI.synthesizeSpeech({
              text: confirmText,
              voiceConfig: { voiceName: currentVoiceName, rate: '+15%' }
            });
            if (synthRes && synthRes.success) await window.audioManager.playAudioData(synthRes.audioDataUrl, confirmText);
          } catch (e) {}
          setAppStatus('SCANNING', 'AIRA ACTIVE — WITH EXPLANATION');
          if (isHandsFreeMode && recorder) recorder.resume();
          return;
        }

        // D. Switch to Scroll mode if requested
        if (isLengthyQuestionCommand(spokenText)) {
          isProcessingSpeech = false;
          await startScrollQuestionCapture();
          return;
        }

        // E. Direct Voice Question in MCQ Mode: Answer the user's specific query about the screen!
        // E.g.: "why is it option B?", "explain this question", "what does this mean?"
        console.log('[MCQ] 🎙️ Processing user voice query during MCQ mode:', spokenText);
        isProcessingSpeech = true;
        await processUserVoiceQueryInMcqMode(spokenText);
        return;
      }

      if (isMcqActivationCommand(spokenText)) {
        isProcessingSpeech = false;
        await startMcqContinuousMode();
        return;
      }

      // LIVE SCREEN VISION: Automatically capture and attach live screen
      if (isLiveScreenVision) {
        setAppStatus('SCANNING', 'ANALYZING LIVE SCREEN...');
        if (scanLaser) scanLaser.classList.add('active');
        try {
          const liveCap = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
          if (liveCap && liveCap.length > 50) {
            attachedScreen = liveCap;
            if (liveScreenImg) liveScreenImg.src = liveCap;
            if (window.airaOrb && window.airaOrb.updateLiveScreen) {
              window.airaOrb.updateLiveScreen(liveCap);
            }
          }
        } catch (e) {
          console.warn('Auto screen capture error:', e);
        }
        if (scanLaser) scanLaser.classList.remove('active');
      }

      // Check if user clicked Edit during screen capture or transcription
      if (isEditingQuery) {
        console.log('[HUD] User initiated edit during speech handling; skipping automatic Gemini query.');
        return;
      }

      const seq = ++activeQuerySequence;
      setAppStatus('THINKING', 'AIRA IS THINKING...');
      airaResponseLine.textContent = 'Thinking...';

      // Immediate processing (no 1000ms delay) for instant Siri-speed responses!
      if (pendingQueryTimer) clearTimeout(pendingQueryTimer);
      pendingQueryTimer = setTimeout(async () => {
        pendingQueryTimer = null;
        if (seq !== activeQuerySequence || isEditingQuery) {
          console.log('[HUD] Query superseded or in edit mode; skipping auto-process.');
          return;
        }
        await processUserQuery(spokenText, seq);
      }, 50);
    } else {
      setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
      if (!lastRawUserQuery) {
        displayUserStatus(isHandsFreeMode ? 'Listening... Speak anytime into your earbuds.' : 'Click "Speak" to try again.');
      }
      updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
      isProcessingSpeech = false;
      if (isHandsFreeMode && recorder) recorder.resume();
    }
  } catch (err) {
    console.error('Speech handling error:', err);
    setAppStatus('IDLE', 'ERROR');
    if (!lastRawUserQuery) {
      displayUserStatus('Error processing speech.');
    }
    updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
    isProcessingSpeech = false;
    if (isHandsFreeMode && recorder) recorder.resume();
  }
}

// Manual click-to-talk recording
async function startManualVoiceRecording() {
  if (window.audioManager && (window.audioManager.isPlaying || window.audioManager.isPaused)) {
    window.audioManager.stop();
  }
  isProcessingSpeech = false;

  try {
    if (!recorder) {
      recorder = new window.AudioRecorder();
    }
    const targetDevId = micDeviceSelect ? micDeviceSelect.value : (activeDeviceId || 'auto');
    recorder.setDeviceId(targetDevId);

    setAppStatus('LISTENING', 'AIRA IS LISTENING');
    userQueryLine.style.display = 'block';
    userQueryLine.textContent = '🎙️ Listening... Speak naturally, answers automatically when you finish.';
    updateMicButtonUI('RECORDING');

    await recorder.startManual({
      deviceId: targetDevId,
      onVolume: (vol) => {
        if (window.airaOrb) window.airaOrb.setAudioLevel(vol);
        if (micLiveDot) {
          if (vol > 0.02) micLiveDot.classList.add('active');
          else micLiveDot.classList.remove('active');
        }
      },
      onSpeechStart: () => {
        setAppStatus('LISTENING', 'AIRA IS LISTENING');
        updateMicButtonUI('RECORDING');
      },
      onSpeechEnd: async (wavBase64) => {
        updateMicButtonUI('PROCESSING');
        await handleHandsFreeSpeech(wavBase64);
      },
      onNoSpeech: () => {
        setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
      }
    });
    isRecording = true;
  } catch (err) {
    console.error('Manual recording error:', err);
    setAppStatus('IDLE', 'MIC ERROR');
    userQueryLine.textContent = `⚠️ Mic error: ${err.message}`;
    updateMicButtonUI('MANUAL_READY');
  }
}

// Unified Speak / Auto-Listen Button
btnMic.addEventListener('click', async () => {
  // If AIRA is speaking or generating an answer, user clicking Speak wants to interrupt & speak now!
  if (window.audioManager && (window.audioManager.isPlaying || window.audioManager.isPaused)) {
    window.audioManager.stop();
  }
  isProcessingSpeech = false;

  // Make sure AudioContext is running (guaranteed direct user gesture here)
  if (recorder && recorder.audioContext && recorder.audioContext.state === 'suspended') {
    try {
      await recorder.audioContext.resume();
    } catch (e) {}
  }

  // 1. If currently actively speaking and user clicks -> shortcut to finish immediately
  if (recorder && recorder.isSpeaking) {
    setAppStatus('THINKING', 'ANALYZING SPEECH...');
    userQueryLine.textContent = '⚡ Answering your question...';
    updateMicButtonUI('PROCESSING');
    recorder.triggerSpeechEnd();
    return;
  }

  // 2. In Auto-Listen mode -> Click arms active listening right now!
  if (isHandsFreeMode) {
    if (!recorder || !recorder.isRecording) {
      await startHandsFreeListening();
    }
    if (recorder) {
      recorder.forceSpeechStart();
    }
    setAppStatus('LISTENING', 'AIRA IS LISTENING');
    userQueryLine.style.display = 'block';
    userQueryLine.textContent = '🎙️ Listening... Speak naturally, answers automatically when you finish.';
    updateMicButtonUI('RECORDING');
    return;
  }

  // 3. In Manual Mode -> Click starts manual recording with auto sentence completion!
  await startManualVoiceRecording();
});

// Say "Bye" or click Close -> Close application completely!
async function handleCloseAira() {
  console.log('[HUD] handleCloseAira: Completely closing AIRA...');
  // 0. Stop MCQ mode if active
  if (isMcqContinuousMode) {
    isMcqContinuousMode = false;
    if (mcqPollTimer) { clearInterval(mcqPollTimer); mcqPollTimer = null; }
  }
  // 1. Immediately abort any recording
  if (recorder) {
    try { recorder.stop(); } catch (e) {}
    isRecording = false;
  }
  isProcessingSpeech = true;

  // 2. Immediate feedback in UI
  setAppStatus('IDLE', 'GOODBYE!');
  airaResponseLine.textContent = "Goodbye! Closing AIRA now...";
  displayUserStatus('You: Bye');

  // 3. Safety hard kill timer (1100ms max timeout)
  const hardKillTimer = setTimeout(() => {
    if (window.electronAPI && window.electronAPI.closeCompletely) {
      window.electronAPI.closeCompletely();
    }
  }, 1100);

  // 4. Try short friendly farewell audio
  try {
    const synthRes = await Promise.race([
      window.electronAPI.synthesizeSpeech({ text: "Goodbye! Have a great day." }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), 650))
    ]);

    if (synthRes && synthRes.success && synthRes.audioDataUrl) {
      await Promise.race([
        window.audioManager.playAudioData(synthRes.audioDataUrl, "Goodbye!"),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Playback timeout')), 750))
      ]);
    }
  } catch (e) {
    console.log('[HUD] Farewell sound skipped or timed out:', e.message);
  }

  // 5. Trigger final exit immediately
  clearTimeout(hardKillTimer);
  if (window.electronAPI && window.electronAPI.closeCompletely) {
    window.electronAPI.closeCompletely();
  }
}

// --- Text Input Fallback ---
btnSendText.addEventListener('click', () => {
  submitTextInput();
});

hudTextInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitTextInput();
  }
});

function submitTextInput() {
  const text = hudTextInput.value.trim();
  if (!text && !attachedScreen && attachedImages.length === 0) return;

  // Check if typed text is an exit command
  if (isExitCommand(text)) {
    hudTextInput.value = '';
    handleCloseAira();
    return;
  }

  // Check for mode commands via text input
  if (isScrollQuestionMode) {
    hudTextInput.value = '';
    if (isScrollCancelCommand(text)) {
      cancelScrollQuestionCapture();
      return;
    }
    if (isScrollCodeExplanationCommand(text)) {
      explainCodeFromScrollMemory(text);
      return;
    }
    finishScrollQuestionCapture(text);
    return;
  }

  // Check if typed text asks to explain code from scroll images memory
  if (isScrollCodeExplanationCommand(text)) {
    hudTextInput.value = '';
    explainCodeFromScrollMemory(text);
    return;
  }

  // Check if typed text asks to create a PowerPoint presentation or Report (PDF/Word)
  if (isDocumentCreationCommand(text)) {
    hudTextInput.value = '';
    handleDocumentGeneration(text);
    return;
  }

  if (isLengthyQuestionCommand(text)) {
    hudTextInput.value = '';
    startScrollQuestionCapture();
    return;
  }

  if (isMcqContinuousMode) {
    hudTextInput.value = '';
    if (isMcqDeactivationCommand(text)) {
      stopMcqContinuousMode();
      return;
    }
    if (isMcqOptionOnlyCommand(text)) {
      mcqAnswerStyle = 'OPTION_ONLY';
      displayUserStatus('📝 MCQ Mode: Option-only set.');
      return;
    }
    if (isMcqExplanationCommand(text)) {
      mcqAnswerStyle = 'FULL_EXPLANATION';
      displayUserStatus('📝 MCQ Mode: Full explanation set.');
      return;
    }
    processUserVoiceQueryInMcqMode(text);
    return;
  }

  if (isMcqActivationCommand(text)) {
    hudTextInput.value = '';
    startMcqContinuousMode();
    return;
  }

  if (isEditingQuery) {
    cancelQueryEditor();
  }

  hudTextInput.value = '';
  displayUserQuery(text);
  isProcessingSpeech = true;
  const newSeq = ++activeQuerySequence;
  processUserQuery(text, newSeq);
}

// --- Process Multimodal Query with Gemini ---

// ═══════════════════════════════════════════════════════════════════════════
// MCQ CONTINUOUS AUTO-ANSWER MODE
// ═══════════════════════════════════════════════════════════════════════════
// When activated by voice ("it's MCQ question, answer continuously" etc.),
// AIRA will poll the screen every ~2.5 seconds, detect when the question
// on screen changes, and automatically capture + answer the new MCQ —
// without needing a voice command for each question.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detects if user's speech is an MCQ continuous mode activation command
 */
function isMcqActivationCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  // Instant direct match for "mcq mode" (hidden voice-only feature)
  if (
    lower === 'mcq mode' ||
    lower === 'mcq' ||
    lower === 'start mcq' ||
    lower === 'start mcq mode' ||
    lower === 'activate mcq mode' ||
    lower === 'turn on mcq mode' ||
    lower === 'enable mcq mode' ||
    lower === 'its mcq mode' ||
    lower === 'it s mcq mode' ||
    lower === 'open mcq mode'
  ) {
    return true;
  }

  const mcqActivationPatterns = [
    // Direct patterns
    /mcq.*continuous/,
    /mcq.*auto/,
    /mcq.*mode/,
    /mcq.*question.*answer.*continuous/,
    /mcq.*answer.*continuous/,
    /continuous.*mcq/,
    /auto.*answer.*mcq/,
    /answer.*mcq.*continuous/,
    /its.*mcq.*question.*ans.*continuous/,
    /its.*mcq.*ans.*continuous/,
    /it.*s.*mcq.*continuous/,
    /its.*mcq.*question.*answer/,
    /answer.*continuously.*as.*question.*change/,
    /answer.*as.*question.*change/,
    /ans.*continuously.*question.*change/,
    /keep.*answering.*mcq/,
    /keep.*answering.*question/,
    /auto.*answer.*question/,
    /start.*mcq/,
    /start.*continuous.*answer/,
    /begin.*mcq/,
    /enable.*mcq/,
    /activate.*mcq/,
    /mcq.*start/,
    /answer.*every.*question.*automatic/,
    /answer.*each.*question.*automatic/,
    /answer.*all.*question.*automatic/,
    /answer.*question.*one.*by.*one/,
    /answer.*questions.*continuously/,
    /keep.*giving.*answer/,
    /give.*answer.*continuously/,
    /watch.*screen.*answer/,
    /monitor.*screen.*answer/,
    /track.*question.*answer/,
  ];

  for (const pattern of mcqActivationPatterns) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

/**
 * Detects if user's speech is an MCQ continuous mode deactivation command
 */
function isMcqDeactivationCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  const mcqStopPatterns = [
    /stop.*mcq/,
    /exit.*mcq/,
    /disable.*mcq/,
    /end.*mcq/,
    /quit.*mcq/,
    /cancel.*mcq/,
    /mcq.*stop/,
    /mcq.*off/,
    /mcq.*exit/,
    /mcq.*end/,
    /mcq.*cancel/,
    /mcq.*disable/,
    /stop.*continuous/,
    /stop.*auto.*answer/,
    /stop.*answering/,
    /no.*more.*mcq/,
    /done.*with.*mcq/,
    /finished.*mcq/,
    /that.*s.*enough/,
    /thats.*enough/,
    /enough.*mcq/,
  ];

  for (const pattern of mcqStopPatterns) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

/**
 * Detects if user requested only option number/letter as questions change in MCQ mode
 */
function isMcqOptionOnlyCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  const patterns = [
    /only.*option.*number/,
    /only.*option/,
    /give.*only.*option/,
    /just.*the.*option/,
    /just.*option/,
    /option.*number.*only/,
    /option.*only/,
    /no.*explanation/,
    /without.*explanation/,
    /skip.*explanation/,
    /dont.*explain/,
    /don.*t.*explain/,
    /do.*not.*explain/,
    /give.*only.*answer/,
    /only.*give.*option/,
    /only.*option.*as.*question.*change/,
    /give.*only.*option.*as.*question.*change/
  ];

  for (const p of patterns) {
    if (p.test(lower)) return true;
  }
  return false;
}

/**
 * Detects if user requested explanations with answers as questions change in MCQ mode
 */
function isMcqExplanationCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  const patterns = [
    /give.*explanation/,
    /with.*explanation/,
    /include.*explanation/,
    /explain.*each/,
    /explain.*answers/,
    /explain.*why/,
    /explain.*as.*question.*change/,
    /give.*explanation.*as.*question.*change/,
    /full.*explanation/,
    /detailed.*mode/,
    /explain.*it/
  ];

  for (const p of patterns) {
    if (p.test(lower)) return true;
  }
  return false;
}

/**
 * Detects if user's speech indicates a lengthy question requiring scrolling
 */
function isLengthyQuestionCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  // Direct fast match for "scroll mode"
  if (
    lower === 'scroll mode' ||
    lower === 'start scroll mode' ||
    lower === 'open scroll mode' ||
    lower === 'enable scroll mode' ||
    lower === 'turn on scroll mode' ||
    lower === 'activate scroll mode'
  ) {
    return true;
  }

  const lengthyPatterns = [
    /^scroll\s*mode$/,
    /start.*scroll.*mode/,
    /open.*scroll.*mode/,
    /enable.*scroll.*mode/,
    /turn.*on.*scroll.*mode/,
    /lengthy.*question/,
    /long.*question/,
    /question.*too.*lengthy/,
    /question.*too.*long/,
    /question.*is.*lengthy/,
    /question.*is.*long/,
    /make.*note.*as.*scroll/,
    /make.*note.*of.*whole.*question/,
    /note.*whole.*question.*as.*scroll/,
    /read.*whole.*question.*as.*scroll/,
    /note.*question.*as.*scroll/,
    /scroll.*down.*screen.*see.*whole.*question/,
    /scroll.*down.*see.*whole.*question/,
    /scroll.*down.*whole.*question/,
    /scroll.*to.*see.*whole.*question/,
    /scrolling.*down/,
    /scroll.*down/,
    /scrolling.*screen/,
    /let.*me.*scroll/,
    /wait.*scrolling/,
    /wait.*i.*need.*to.*scroll/,
    /hold.*on.*scrolling/,
    /scrolling.*for.*more/,
    /capture.*as.*i.*scroll/,
    /record.*as.*i.*scroll/,
    /scroll.*note/,
    /start.*scroll/,
    /start.*scrolling/
  ];

  for (const pattern of lengthyPatterns) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

/**
 * Detects if user finished scrolling and is ready for the complete answer
 */
function isScrollDoneCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  const donePatterns = [
    /done.*scrolling/,
    /finished.*scrolling/,
    /stop.*scrolling/,
    /that.*s.*the.*whole.*question/,
    /thats.*the.*whole.*question/,
    /that.*s.*all.*the.*question/,
    /thats.*all.*the.*question/,
    /whole.*question.*shown/,
    /give.*answer.*now/,
    /give.*answer/,
    /answer.*now/,
    /solve.*now/,
    /solve.*this.*question/,
    /answer.*this.*question/,
    /what.*s.*the.*answer/,
    /whats.*the.*answer/,
    /^done$/,
    /^solve$/,
    /^answer$/
  ];

  for (const pattern of donePatterns) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

/**
 * Detects if user wants to cancel scroll capture
 */
function isScrollCancelCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  const cancelPatterns = [
    /cancel.*scroll/,
    /cancel.*question/,
    /stop.*scroll/,
    /exit.*scroll/
  ];

  for (const pattern of cancelPatterns) {
    if (pattern.test(lower)) return true;
  }
  return false;
}

/**
 * Detects if user asks for line-by-line explanation of code from the scroll images in memory
 * E.g. "explain each line in the code from the scroll images"
 * "explain full code line by line from the scroll images"
 * "explain each line of code from scrolled images"
 */
function isScrollCodeExplanationCommand(text) {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  // Explicit line-by-line code explanation patterns targeting scroll captures
  const patterns = [
    /explain.*(each|every|full|all).*line.*(code|program|script).*scroll/,
    /explain.*(each|every|full|all).*line.*scroll.*(code|image)/,
    /explain.*line.*by.*line.*(code|program|script).*scroll/,
    /explain.*line.*by.*line.*scroll.*(code|image)/,
    /explain.*code.*line.*by.*line.*scroll/,
    /explain.*code.*from.*scroll/,
    /explain.*from.*scroll.*(code|image)/,
    /explain.*code.*(from|in).*scroll.*image/,
    /explain.*each.*line.*(in|of).*code/,
    /explain.*line.*by.*line.*code/,
    /explain.*each.*line.*code/,
    /line.*by.*line.*code.*scroll/,
    /code.*line.*by.*line.*scroll/,
    /walkthrough.*code.*scroll/
  ];

  for (const pattern of patterns) {
    if (pattern.test(lower)) return true;
  }

  // Broad check when scroll memory or active scroll capture is present:
  const memoryCount = (scrollImagesMemory?.length || 0) + (scrollCapturedParts?.length || 0);
  if (memoryCount > 0) {
    const hasExplain = lower.includes('explain') || lower.includes('walkthrough') || lower.includes('breakdown');
    const hasCode = lower.includes('code') || lower.includes('script') || lower.includes('program') || lower.includes('function');
    const hasLine = lower.includes('line') || lower.includes('each line') || lower.includes('line by line');
    const hasScroll = lower.includes('scroll') || lower.includes('scrolled') || lower.includes('images');

    if (hasExplain && hasCode && (hasLine || hasScroll)) return true;
    if (hasExplain && hasLine && (hasScroll || hasCode)) return true;
    if (hasLine && hasCode && hasScroll) return true;
  }

  return false;
}

/**
 * Detects if user asks to create a PowerPoint presentation (PPT) or Report (PDF / Word)
 */
function isDocumentCreationCommand(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, ' ').replace(/\s+/g, ' ').trim();

  // Explicit PPT / Presentation patterns
  const pptPatterns = [
    /^(make|create|generate|prepare|build|give|export).*(ppt|presentation|powerpoint|slides)/,
    /^(make|create|generate).*deck/,
    /.*(ppt|presentation|powerpoint|slides).*(on|about|for|of)/,
    /^make.*ppt/,
    /^create.*ppt/
  ];
  for (const p of pptPatterns) {
    if (p.test(lower)) return true;
  }

  // Explicit Report patterns (PDF, Word, or general)
  const reportPatterns = [
    /^(make|create|generate|prepare|build|give|export).*report/,
    /^(make|create|generate).*document/,
    /^(make|create|generate).*doc/,
    /.*report.*(pdf|word|docx)/,
    /.*(pdf|word|docx).*report/,
    /.*report.*in.*both.*(pdf|word)/,
    /.*report.*(on|about|for|regarding)/,
    /make.*(pdf|word|docx).*(on|about)/,
    /create.*(pdf|word|docx).*(on|about)/,
    /generate.*(pdf|word|docx).*(on|about)/
  ];
  for (const p of reportPatterns) {
    if (p.test(lower)) return true;
  }

  return false;
}

function parseDocumentRequest(text) {
  const lower = text.toLowerCase().trim();
  let format = 'pptx'; // default

  // Determine requested format
  if ((lower.includes('both') && lower.includes('pdf') && lower.includes('word')) ||
      (lower.includes('pdf') && lower.includes('word')) ||
      (lower.includes('pdf') && lower.includes('docx'))) {
    format = 'both';
  } else if (lower.includes('pdf')) {
    format = 'pdf';
  } else if (lower.includes('word') || lower.includes('docx') || lower.includes('word document')) {
    format = 'docx';
  } else if (lower.includes('ppt') || lower.includes('presentation') || lower.includes('powerpoint') || lower.includes('slides') || lower.includes('deck')) {
    format = 'pptx';
  } else if (lower.includes('report')) {
    format = 'both'; // if user says "make a report on X", create both PDF and Word!
  }

  // Extract the topic
  let topic = text
    .replace(/^(please\s+)?(aira\s+)?(can\s+you\s+)?(make|create|generate|prepare|build|export|give\s+me)\s+(a\s+|an\s+)?/i, '')
    .replace(/(powerpoint\s+presentation|presentation|ppt\s+slides|ppt|deck|slides|report\s+in\s+both\s+pdf\s+and\s+word|report\s+in\s+pdf|report\s+in\s+word|pdf\s+report|word\s+report|docx\s+report|word\s+document|pdf|docx|word|report|document)\s*(on|about|for|regarding|of)?\s*/i, '')
    .replace(/[.?!]+$/, '')
    .trim();

  if (!topic || topic.length < 2) {
    topic = 'Executive Strategic Analysis';
  }

  return { format, topic };
}

async function handleDocumentGeneration(userQuery) {
  const { format, topic } = parseDocumentRequest(userQuery);

  console.log(`[DocGen] Generating document: Format=${format}, Topic="${topic}"`);

  let formatLabel = 'PowerPoint Presentation (.pptx)';
  let appStatusMsg = 'GENERATING PPT PRESENTATION...';
  let initialMsg = `Generating your PowerPoint presentation on "${topic}"...`;

  if (format === 'pdf') {
    formatLabel = 'PDF Executive Report (.pdf)';
    appStatusMsg = 'GENERATING PDF REPORT...';
    initialMsg = `Writing and compiling your PDF report on "${topic}"...`;
  } else if (format === 'docx' || format === 'word') {
    formatLabel = 'Word Document Report (.docx)';
    appStatusMsg = 'GENERATING WORD DOCUMENT...';
    initialMsg = `Drafting your executive Word report on "${topic}"...`;
  } else if (format === 'both') {
    formatLabel = 'PDF & Word Reports';
    appStatusMsg = 'GENERATING PDF & WORD REPORTS...';
    initialMsg = `Creating both PDF and Word document reports on "${topic}"...`;
  }

  setAppStatus('THINKING', appStatusMsg);
  displayUserStatus(`📑 Generating ${formatLabel}: "${topic}"...`);
  airaResponseLine.innerHTML = `<div class="doc-generating-spinner">
    <div class="doc-spinner-ring"></div>
    <span>${initialMsg}</span>
  </div>`;

  try {
    // If Live Vision is ON or user query mentions screen/code, capture the current screen
    let currentScreen = attachedScreen;
    const lowerQuery = userQuery.toLowerCase();
    const asksAboutScreen = lowerQuery.includes('screen') || lowerQuery.includes('code') || lowerQuery.includes('look') || lowerQuery.includes('see');
    if ((isLiveScreenVision || asksAboutScreen) && !currentScreen) {
      try {
        currentScreen = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
      } catch (e) {}
    }

    const payload = {
      topic: topic,
      format: format,
      context: userQuery,
      screenCapture: currentScreen,
      images: attachedImages
    };

    let result = null;
    if (format === 'pptx') {
      result = await window.electronAPI.generatePresentation(payload);
    } else {
      result = await window.electronAPI.generateReport(payload);
    }

    if (result && result.success) {
      setAppStatus('SPEAKING', 'DOCUMENT READY');
      renderDocumentSuccessCard(result, format, topic);

      let spokenConfirmation = '';
      if (format === 'pptx') {
        spokenConfirmation = `I have created your PowerPoint presentation on ${topic} with ${result.slideCount || 6} slides! It is saved in your Downloads folder and ready to open.`;
      } else if (format === 'both') {
        spokenConfirmation = `I have created both your PDF report and Word document on ${topic}! Both files are ready in your Downloads folder.`;
      } else if (format === 'docx' || format === 'word') {
        spokenConfirmation = `I have created your Word report on ${topic}! It is saved in your Downloads folder.`;
      } else {
        spokenConfirmation = `I have compiled your executive PDF report on ${topic}! It is saved in your Downloads folder and ready to view.`;
      }

      try {
        const synthRes = await window.electronAPI.synthesizeSpeech({
          text: spokenConfirmation,
          voiceConfig: { voiceName: currentVoiceName, rate: '+10%' }
        });
        if (synthRes && synthRes.success) {
          await window.audioManager.playAudioData(synthRes.audioDataUrl, spokenConfirmation);
        } else {
          window.audioManager.speakFallback(spokenConfirmation);
        }
      } catch (synthErr) {
        console.warn('[DocGen] Speech error:', synthErr);
      }
    } else {
      setAppStatus('IDLE', 'AIRA READY');
      airaResponseLine.textContent = `Could not generate document: ${result?.error || 'Unknown error occurred.'}`;
    }
  } catch (err) {
    console.error('[DocGen] Error generating document:', err);
    setAppStatus('IDLE', 'AIRA READY');
    airaResponseLine.textContent = `Error: ${err.message}`;
  } finally {
    isProcessingSpeech = false;
    if (isHandsFreeMode && recorder) recorder.resume();
  }
}

function renderDocumentSuccessCard(result, format, topic) {
  airaResponseLine.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'doc-success-card';

  if (format === 'both' && Array.isArray(result.files)) {
    card.innerHTML = `
      <div class="doc-card-header">
        <span class="doc-card-badge">✓ REPORTS GENERATED (PDF + WORD)</span>
      </div>
      <div class="doc-card-title">${result.title || topic}</div>
      <div class="doc-card-details">2 executive documents saved in your Downloads folder:</div>
      <div class="doc-files-list">
        ${result.files.map(f => `
          <div class="doc-file-row">
            <span class="doc-file-icon">${f.fileType === 'pdf' ? '📑' : '📄'}</span>
            <span class="doc-file-name" title="${f.fileName}">${f.fileName}</span>
            <div class="doc-file-btn-group">
              <button class="btn-doc-action open" data-path="${encodeURIComponent(f.filePath)}">Open</button>
              <button class="btn-doc-action folder" data-path="${encodeURIComponent(f.filePath)}">Folder</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    const isPpt = result.fileType === 'pptx';
    const isPdf = result.fileType === 'pdf';
    const badgeText = isPpt ? '✓ POWERPOINT PRESENTATION CREATED' : (isPdf ? '✓ PDF REPORT GENERATED' : '✓ WORD DOCUMENT GENERATED');
    const icon = isPpt ? '📊' : (isPdf ? '📑' : '📄');
    const details = isPpt ? `${result.slideCount || 6} Slides • 16:9 Modern Deck` : (isPdf ? 'Executive PDF Report • A4 Vector' : 'Word Document • Structured Tables & Sections');

    card.innerHTML = `
      <div class="doc-card-header">
        <span class="doc-card-badge">${badgeText}</span>
      </div>
      <div class="doc-single-preview">
        <div class="doc-main-icon">${icon}</div>
        <div class="doc-main-info">
          <div class="doc-card-title">${result.title || topic}</div>
          <div class="doc-card-details">${details}</div>
          <div class="doc-card-filename" title="${result.filePath}">${result.fileName}</div>
        </div>
      </div>
      <div class="doc-card-actions">
        <button class="btn-doc-primary" id="btnDocOpenSingle">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          <span>Open File</span>
        </button>
        <button class="btn-doc-secondary" id="btnDocFolderSingle">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
          <span>Show in Folder</span>
        </button>
      </div>
    `;
  }

  airaResponseLine.appendChild(card);

  // Bind click handlers
  card.querySelectorAll('.btn-doc-action.open').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = decodeURIComponent(btn.getAttribute('data-path'));
      window.electronAPI.openFile(p);
    });
  });
  card.querySelectorAll('.btn-doc-action.folder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = decodeURIComponent(btn.getAttribute('data-path'));
      window.electronAPI.showInFolder(p);
    });
  });

  const singleOpen = card.querySelector('#btnDocOpenSingle');
  if (singleOpen && result.filePath) {
    singleOpen.addEventListener('click', (e) => {
      e.stopPropagation();
      window.electronAPI.openFile(result.filePath);
    });
  }
  const singleFolder = card.querySelector('#btnDocFolderSingle');
  if (singleFolder && result.filePath) {
    singleFolder.addEventListener('click', (e) => {
      e.stopPropagation();
      window.electronAPI.showInFolder(result.filePath);
    });
  }
}

/**
 * Compute a fast perceptual hash of a screen capture for change detection.
 * Samples across the compressed image payload and tracks payload byte size.
 */
function computeScreenHash(dataUrl) {
  if (!dataUrl || dataUrl.length < 100) return { hash: '', length: 0 };

  // Extract raw base64 data
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const dataLen = base64Data.length;

  // Skip first 1000 bytes (JPEG header tables) to focus on compressed image content
  const startIdx = Math.min(1000, Math.floor(dataLen * 0.05));
  const effectiveLen = dataLen - startIdx;
  const sampleCount = 384;
  const step = Math.max(1, Math.floor(effectiveLen / sampleCount));

  let hash = '';
  for (let i = startIdx; i < dataLen && hash.length < sampleCount; i += step) {
    hash += base64Data[i];
  }

  return { hash, length: dataLen };
}

/**
 * Compare two screen hashes and determine if content has meaningfully changed.
 * Returns true if enough sampled data or payload size differs to indicate a new question.
 */
function hasScreenChanged(info1, info2) {
  if (!info1 || !info2) return true;
  if (!info1.hash || !info2.hash) return true;
  if (info1.hash === info2.hash && info1.length === info2.length) return false;

  // 1. If payload compressed length changed by > 4%, content definitely changed
  if (info1.length && info2.length) {
    const sizeDiff = Math.abs(info1.length - info2.length) / Math.max(info1.length, info2.length);
    if (sizeDiff > 0.04) return true;
  }

  // 2. Sample mismatch check
  const h1 = info1.hash;
  const h2 = info2.hash;
  const minLen = Math.min(h1.length, h2.length);
  if (minLen === 0) return true;

  let diffCount = 0;
  for (let i = 0; i < minLen; i++) {
    if (h1[i] !== h2[i]) diffCount++;
  }

  const changeRatio = diffCount / minLen;
  return changeRatio > 0.06; // 6% difference indicates navigation to new question
}

/**
 * Activate MCQ Continuous Auto-Answer Mode
 */
async function startMcqContinuousMode() {
  if (isMcqContinuousMode) return; // Already active

  isMcqContinuousMode = true;
  mcqIsProcessing = false;
  mcqLastScreenHash = null;
  mcqLastAnsweredHash = null;
  mcqConsecutiveNoChangeCount = 0;

  console.log('[MCQ] ✅ MCQ Continuous Auto-Answer Mode ACTIVATED');

  // Update UI indicators
  const mcqBadge = document.getElementById('mcqHudBadge');
  if (mcqBadge) mcqBadge.style.display = 'flex';
  const btnMcq = document.getElementById('btnToggleMcq');
  if (btnMcq) {
    btnMcq.classList.add('active');
    const lbl = document.getElementById('mcqToggleLabel');
    if (lbl) lbl.textContent = 'MCQ: ON';
  }

  // Notify user
  setAppStatus('SCANNING', 'MCQ MODE ACTIVE');
  displayUserStatus('📝 MCQ Continuous Mode ON — Watching screen for question changes...');
  airaResponseLine.textContent = 'MCQ Mode Active! Navigate to your first question. I will automatically read and answer each question as it changes on your screen.';

  // Speak activation confirmation
  try {
    const confirmText = "MCQ continuous mode activated! I will now watch your screen and automatically answer each question as it changes. Navigate to your first question.";
    const synthRes = await window.electronAPI.synthesizeSpeech({ text: confirmText });
    if (synthRes && synthRes.success) {
      await window.audioManager.playAudioData(synthRes.audioDataUrl, confirmText);
    } else {
      window.audioManager.speakFallback(confirmText);
    }
  } catch (e) {
    console.warn('[MCQ] Confirmation speech error:', e);
  }

  // Capture initial screen as baseline
  try {
    const initialScreen = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
    if (initialScreen && initialScreen.length > 50) {
      mcqLastScreenHash = computeScreenHash(initialScreen);

      // Answer the first question immediately
      mcqIsProcessing = true;
      await processMcqScreen(initialScreen);
      mcqIsProcessing = false;
    }
  } catch (e) {
    console.warn('[MCQ] Initial screen capture error:', e);
  }

  // Start polling for screen changes
  startMcqScreenPolling();

  // Keep recorder alive for stop commands
  if (recorder && isHandsFreeMode) {
    startMcqVoiceListener();
  }
}

/**
 * Deactivate MCQ Continuous Auto-Answer Mode
 */
async function stopMcqContinuousMode() {
  if (!isMcqContinuousMode) return;

  isMcqContinuousMode = false;
  mcqIsProcessing = false;
  mcqLastScreenHash = null;
  mcqLastAnsweredHash = null;
  mcqConsecutiveNoChangeCount = 0;

  // Stop polling
  if (mcqPollTimer) {
    clearInterval(mcqPollTimer);
    mcqPollTimer = null;
  }

  console.log('[MCQ] ❌ MCQ Continuous Auto-Answer Mode DEACTIVATED');

  // Update UI indicators
  const mcqBadge = document.getElementById('mcqHudBadge');
  if (mcqBadge) mcqBadge.style.display = 'none';
  const btnMcq = document.getElementById('btnToggleMcq');
  if (btnMcq) {
    btnMcq.classList.remove('active');
    const lbl = document.getElementById('mcqToggleLabel');
    if (lbl) lbl.textContent = 'MCQ Auto';
  }

  // Notify user
  setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
  displayUserStatus('MCQ Continuous Mode OFF. Normal mode restored.');
  airaResponseLine.textContent = 'MCQ mode stopped. I\'m back to normal mode — speak anytime!';

  // Speak deactivation confirmation
  try {
    const confirmText = "MCQ continuous mode stopped. I'm back to normal mode.";
    const synthRes = await window.electronAPI.synthesizeSpeech({ text: confirmText });
    if (synthRes && synthRes.success) {
      await window.audioManager.playAudioData(synthRes.audioDataUrl, confirmText);
    } else {
      window.audioManager.speakFallback(confirmText);
    }
  } catch (e) {
    console.warn('[MCQ] Deactivation speech error:', e);
  }

  // Resume normal hands-free listening
  isProcessingSpeech = false;
  updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
  if (isHandsFreeMode) {
    setTimeout(() => startHandsFreeListening(), 500);
  }
}

/**
 * Start polling the screen for MCQ question changes
 */
function startMcqScreenPolling() {
  if (mcqPollTimer) clearInterval(mcqPollTimer);

  mcqPollTimer = setInterval(async () => {
    if (!isMcqContinuousMode || mcqIsProcessing || document.hidden || isScrollQuestionMode) return;

    // Skip if AIRA is currently speaking an answer
    if (window.audioManager && window.audioManager.isPlaying) return;

    try {
      const screenData = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
      if (!screenData || screenData.length < 100) return;

      const currentHash = computeScreenHash(screenData);

      // Check if screen content has meaningfully changed
      if (hasScreenChanged(currentHash, mcqLastScreenHash)) {
        // Screen changed! But also check it's different from what we last answered
        // (prevents re-answering if user just navigated back)
        if (hasScreenChanged(currentHash, mcqLastAnsweredHash)) {
          console.log('[MCQ] 🔄 Screen change detected! Analyzing new question...');
          mcqLastScreenHash = currentHash;
          mcqConsecutiveNoChangeCount = 0;
          mcqIsProcessing = true;

          await processMcqScreen(screenData);

          mcqIsProcessing = false;
        } else {
          mcqLastScreenHash = currentHash;
          mcqConsecutiveNoChangeCount++;
        }
      } else {
        mcqConsecutiveNoChangeCount++;
      }
    } catch (e) {
      console.warn('[MCQ] Screen poll error:', e);
    }
  }, mcqPollIntervalMs);
}

/**
 * Process a screen capture in MCQ mode — send to Gemini with MCQ-specific prompt
 */
async function processMcqScreen(screenData) {
  if (!isMcqContinuousMode) return;

  const currentScreenHash = computeScreenHash(screenData);

  setAppStatus('THINKING', 'ANALYZING MCQ QUESTION...');
  airaResponseLine.textContent = 'Reading and analyzing the question on screen...';

  try {
    const isOptionOnly = mcqAnswerStyle === 'OPTION_ONLY';

    // Send to Gemini with dynamic prompt depending on user's preference
    const mcqPrompt = isOptionOnly
      ? `[MCQ AUTO-ANSWER MODE - OPTION NUMBER ONLY] Look at the screen carefully. There is an MCQ (Multiple Choice Question) displayed.
1. Read the question text and all answer options (A, B, C, D or 1, 2, 3, 4).
2. Identify the CORRECT answer.
3. Reply ONLY with:
The answer is Option [Letter/Number]: [Exact option text]

Do NOT provide any explanation or reasons. Just state the correct option.`
      : `[MCQ AUTO-ANSWER MODE] Look at the screen carefully. There is an MCQ (Multiple Choice Question) displayed. 
    
Your task:
1. Read the question text carefully
2. Read ALL the answer options (A, B, C, D or 1, 2, 3, 4 etc.)
3. Identify the CORRECT answer
4. Reply in this format:
   - First line: "The answer is Option [Letter/Number]: [option text]"  
   - Second line: Brief 1-2 sentence explanation of WHY this is correct

Keep your response SHORT and DIRECT — this is timed MCQ mode. No lengthy explanations.
If you see multiple questions, answer only the CURRENT/highlighted/visible one.
If no MCQ question is visible, say "No MCQ question detected on screen."`;

    const res = await window.electronAPI.askAira({
      prompt: mcqPrompt,
      screenCapture: screenData,
      images: []
    });

    if (!isMcqContinuousMode) return; // Mode may have been deactivated during processing

    if (res && res.success) {
      // Update the hash of last answered screen
      mcqLastAnsweredHash = currentScreenHash;

      setAppStatus('SPEAKING', isOptionOnly ? 'OPTION' : 'MCQ ANSWER');
      renderFormattedResponse(airaResponseLine, res.text);

      // Check if "No MCQ question detected" — don't speak it, just display
      const lowerResponse = res.text.toLowerCase();
      if (lowerResponse.includes('no mcq question detected') || lowerResponse.includes('no question')) {
        setAppStatus('SCANNING', 'AIRA ACTIVE');
        return;
      }

      // Check if question is lengthy/cut-off and requires scrolling
      if (lowerResponse.includes('question is lengthy') || lowerResponse.includes('scroll down') || lowerResponse.includes('cut off')) {
        console.log('[MCQ] 📜 Lengthy question detected on screen! Prompting user to scroll...');
        setAppStatus('SCANNING', 'LENGTHY QUESTION — SCROLL DOWN');
        displayUserStatus('📜 Lengthy question detected! Scroll down the screen to capture whole question...');
        const promptSpeech = "This question is lengthy. Scroll down and I will make note of the whole question.";
        try {
          const synthRes = await window.electronAPI.synthesizeSpeech({
            text: promptSpeech,
            voiceConfig: { voiceName: currentVoiceName, rate: '+10%' }
          });
          if (synthRes && synthRes.success) {
            await window.audioManager.playAudioData(synthRes.audioDataUrl, promptSpeech);
          } else {
            window.audioManager.speakFallback(promptSpeech);
          }
        } catch (e) {}
        await startScrollQuestionCapture(screenData);
        return;
      }

      // Extract spoken text: Option Only vs Full Explanation
      let spokenText = '';
      if (isOptionOnly) {
        const match = res.text.match(/Option\s+([A-Za-z0-9])/i) || res.text.match(/([A-D1-4])\)/);
        spokenText = match ? `Option ${match[1].toUpperCase()}` : extractSpokenText(res.text).split(/[:.]/)[0];
      } else {
        spokenText = extractSpokenText(res.text);
      }

      try {
        const synthRes = await window.electronAPI.synthesizeSpeech({
          text: spokenText,
          voiceConfig: { voiceName: currentVoiceName, rate: '+15%' } // Fast delivery for tests
        });

        if (!isMcqContinuousMode) return;

        if (synthRes && synthRes.success) {
          await window.audioManager.playAudioData(synthRes.audioDataUrl, spokenText);
        } else {
          window.audioManager.speakFallback(spokenText);
        }
      } catch (synthErr) {
        console.warn('[MCQ] Speech synthesis error:', synthErr);
      }

      // After speaking, return to scanning status
      if (isMcqContinuousMode) {
        setAppStatus('SCANNING', 'AIRA ACTIVE');
        displayUserStatus(isOptionOnly ? '📝 Option-Only Mode: Watching for next question...' : '📝 Watching for next question...');
      }
    } else {
      console.warn('[MCQ] Gemini response error:', res?.text);
      airaResponseLine.textContent = res?.text || 'Could not analyze the question. Please try again.';
      setAppStatus('SCANNING', 'AIRA ACTIVE');
    }
  } catch (err) {
    console.error('[MCQ] Error processing MCQ screen:', err);
    airaResponseLine.textContent = `Error: ${err.message}`;
    setAppStatus('SCANNING', 'AIRA ACTIVE');
  }
}

/**
 * Handles ad-hoc user voice queries while in MCQ Mode (e.g. "why is it option B?", "explain this question")
 */
async function processUserVoiceQueryInMcqMode(userQuery) {
  setAppStatus('THINKING', 'ANSWERING YOUR QUESTION...');
  airaResponseLine.textContent = `Analyzing: "${userQuery}"...`;

  try {
    const screenData = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
    const prompt = `[MCQ MODE - USER VOICE QUESTION]
The user is currently taking an exam/quiz with an MCQ displayed on screen, and asked:
"${userQuery}"

Please look at the screen and answer the user's specific question directly, clearly, and concisely. If they asked to explain the answer or why a choice is correct/incorrect, explain it clearly in 2-3 sentences.`;

    const res = await window.electronAPI.askAira({
      prompt: prompt,
      screenCapture: screenData,
      images: []
    });

    if (res && res.success) {
      setAppStatus('SPEAKING', 'EXPLANATION');
      renderFormattedResponse(airaResponseLine, res.text);
      const spokenText = extractSpokenText(res.text);
      try {
        const synthRes = await window.electronAPI.synthesizeSpeech({
          text: spokenText,
          voiceConfig: { voiceName: currentVoiceName, rate: '+10%' }
        });
        if (synthRes && synthRes.success) {
          await window.audioManager.playAudioData(synthRes.audioDataUrl, spokenText);
        } else {
          window.audioManager.speakFallback(spokenText);
        }
      } catch (e) {}
    } else {
      airaResponseLine.textContent = res?.text || 'Could not answer the query.';
    }
  } catch (err) {
    console.warn('[MCQ] Voice query error:', err);
  } finally {
    isProcessingSpeech = false;
    if (isMcqContinuousMode) {
      setAppStatus('SCANNING', 'AIRA ACTIVE');
      displayUserStatus(`📝 Watching screen for question changes... (Say "stop" to exit)`);
      if (isHandsFreeMode && recorder) recorder.resume();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LENGTHY QUESTION SCROLLED CAPTURE & LIVE VISUAL INSPECTOR
// ═══════════════════════════════════════════════════════════════════════════
// When a question is too lengthy to fit on one screen and the user needs to
// scroll down, AIRA accumulates sequential screenshots (top, middle, bottom)
// as the user scrolls, renders live verification cards in the inspector panel
// so the user can verify the entire question is captured correctly, reconstructs
// the whole problem, solves it, and speaks the answer.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adds a visual verification card into the live Scroll Question Inspector panel
 */
function addScrollPartToInspector(dataUrl, partNum, label = '') {
  if (!inspectorPartsStrip) return;

  const card = document.createElement('div');
  card.className = 'scroll-part-card';
  card.dataset.idx = partNum - 1;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const partTag = partNum === 1 ? 'PART 1 (TOP)' : `PART ${partNum} (SCROLLED)`;

  card.innerHTML = `
    <div class="part-card-header">
      <span class="part-tag">${partTag}</span>
      <span class="part-time">${timeStr}</span>
    </div>
    <div class="part-thumb-wrap">
      <img src="${dataUrl}" alt="Part ${partNum}" class="part-thumb-img">
      <div class="part-check-badge">✓ Captured</div>
    </div>
    <div class="part-card-text">
      ${escapeHtml(label || (partNum === 1 ? 'Top of question / problem context' : 'Scrolled content / options'))}
    </div>
  `;

  // Clicking thumbnail opens full-screen preview in the viewfinder
  card.addEventListener('click', () => {
    if (liveScreenViewfinder && liveScreenImg) {
      liveScreenImg.src = dataUrl;
      liveScreenViewfinder.style.display = 'flex';
    }
  });

  inspectorPartsStrip.appendChild(card);
  inspectorPartsStrip.scrollLeft = inspectorPartsStrip.scrollWidth;

  if (inspectorPartsCountBadge) {
    inspectorPartsCountBadge.textContent = `${partNum} Part${partNum > 1 ? 's' : ''}`;
  }
}

/**
 * Start Lengthy Question Scrolled Note-Taking & Solving with Live Visual Inspector
 */
async function startScrollQuestionCapture(initialScreen = null) {
  if (isScrollQuestionMode) return;

  wasMcqActiveBeforeScroll = isMcqContinuousMode;
  isScrollQuestionMode = true;
  scrollCapturedParts = [];
  if (scrollAutoSolveTimer) clearTimeout(scrollAutoSolveTimer);

  console.log('[ScrollMode] 📜 Starting Lengthy Question Scroll Mode with Visual Inspector...');

  // Show the Live Visual Inspector Panel
  if (scrollInspectorPanel) {
    scrollInspectorPanel.style.display = 'flex';
  }
  if (inspectorPartsStrip) {
    inspectorPartsStrip.innerHTML = '';
  }
  if (inspectorPartsCountBadge) {
    inspectorPartsCountBadge.textContent = '1 Part';
  }
  if (inspectorGuidance) {
    inspectorGuidance.innerHTML = '<span>👇 Part 1 (Top) noted! Scroll down the screen to capture the rest...</span>';
  }
  if (btnToggleScrollMode) {
    btnToggleScrollMode.classList.add('active');
    if (scrollModeLabel) scrollModeLabel.textContent = 'Scroll: ON';
  }

  setAppStatus('SCANNING', 'SCROLL MODE — NOTING QUESTION');
  displayUserStatus('📜 Scroll Mode ON: Part 1 noted! Scroll down the screen to capture the whole question...');
  airaResponseLine.textContent = 'Scroll Mode active! Scroll down your screen — watch the visual inspector below to verify that every part of the question is captured.';

  // Speak confirmation
  try {
    const confirmText = "Scroll mode active! Scroll down, and verify each captured section in the inspector below.";
    const synthRes = await window.electronAPI.synthesizeSpeech({
      text: confirmText,
      voiceConfig: { voiceName: currentVoiceName, rate: '+15%' }
    });
    if (synthRes && synthRes.success) {
      await window.audioManager.playAudioData(synthRes.audioDataUrl, confirmText);
    }
  } catch (e) {
    console.warn('[ScrollMode] Speech confirmation error:', e);
  }

  // Capture Part 1 (Top of question)
  try {
    const part1 = initialScreen || await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
    if (part1 && part1.length > 50) {
      const p1Hash = computeScreenHash(part1);
      const part1Obj = {
        dataUrl: part1,
        hash: p1Hash,
        length: part1.length,
        timestamp: Date.now(),
        partNum: 1,
        label: 'Top of question / code beginning'
      };
      scrollCapturedParts.push(part1Obj);
      scrollImagesMemory = [part1Obj];
      scrollLastFrameHash = p1Hash;
      addScrollPartToInspector(part1, 1, 'Top of question / problem statement');
    }
  } catch (e) {
    console.warn('[ScrollMode] Part 1 capture error:', e);
  }

  // Start background scroll watcher
  startScrollMovementWatcher();

  // Keep recorder active so user can say "done" or "answer now"
  if (recorder && isHandsFreeMode) {
    recorder.resume();
  }
}

/**
 * Fast monitor that tracks scrolling movements down the screen and displays cards live
 */
function startScrollMovementWatcher() {
  if (scrollWatchTimer) clearInterval(scrollWatchTimer);

  scrollWatchTimer = setInterval(async () => {
    if (!isScrollQuestionMode || document.hidden) return;
    if (window.audioManager && window.audioManager.isPlaying) return;

    try {
      const screenData = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
      if (!screenData || screenData.length < 100) return;

      const currentHash = computeScreenHash(screenData);

      // Check if screen has meaningfully shifted from the last captured part
      if (hasScreenChanged(currentHash, scrollLastFrameHash)) {
        // Verify this frame hasn't already been captured
        const alreadyCaptured = scrollCapturedParts.some(p => !hasScreenChanged(currentHash, p.hash));
        if (!alreadyCaptured) {
          const partNum = scrollCapturedParts.length + 1;
          console.log(`[ScrollMode] 📜 Scroll shift detected! Capturing Part ${partNum}...`);

          const partObj = {
            dataUrl: screenData,
            hash: currentHash,
            length: screenData.length,
            timestamp: Date.now(),
            partNum: partNum,
            label: partNum === 2 ? 'Scrolled middle / code continuation' : 'Options & continuation'
          };
          scrollCapturedParts.push(partObj);
          scrollImagesMemory.push(partObj);
          scrollLastFrameHash = currentHash;

          // Add visual verification card to the live strip!
          addScrollPartToInspector(screenData, partNum, partNum === 2 ? 'Scrolled middle / code continuation' : 'Options & choices');

          if (inspectorGuidance) {
            inspectorGuidance.innerHTML = `<span>✓ Part ${partNum} captured! Keep scrolling or click <b>Solve Now</b>:</span>`;
          }
          displayUserStatus(`📜 Part ${partNum} captured! Inspect below or click Solve Now when finished scrolling.`);

          // Reset auto-solve timer: 4 seconds of stillness after scrolling triggers auto-solve
          if (scrollAutoSolveTimer) clearTimeout(scrollAutoSolveTimer);
          scrollAutoSolveTimer = setTimeout(async () => {
            if (isScrollQuestionMode && scrollCapturedParts.length >= 2) {
              console.log('[ScrollMode] ⏱️ Stillness detected after scroll, auto-solving whole question...');
              await finishScrollQuestionCapture();
            }
          }, scrollAutoSolveDelayMs);
        }
      }
    } catch (err) {
      console.warn('[ScrollMode] Watcher error:', err);
    }
  }, 1200);
}

/**
 * Explain each line of code synthesized across all sequential scroll images in memory
 */
async function explainCodeFromScrollMemory(userInstruction = null) {
  const parts = (scrollCapturedParts && scrollCapturedParts.length > 0)
    ? [...scrollCapturedParts]
    : [...scrollImagesMemory];

  if (parts.length === 0) {
    displayUserStatus('⚠️ No scroll images in memory yet.');
    airaResponseLine.textContent = 'I don’t have any scroll images in memory yet. Please capture some code using Scroll Mode (click "Scroll Mode" or say "scroll mode"), then ask me to explain each line!';
    const speakMsg = "I don't have any scroll images stored in memory yet. Please open Scroll Mode first so I can note the code as you scroll down!";
    try {
      const synthRes = await window.electronAPI.synthesizeSpeech({
        text: speakMsg,
        voiceConfig: { voiceName: currentVoiceName, rate: '+10%' }
      });
      if (synthRes && synthRes.success) {
        await window.audioManager.playAudioData(synthRes.audioDataUrl, speakMsg);
      }
    } catch (e) {}
    if (isHandsFreeMode && recorder) recorder.resume();
    return;
  }

  // Update persistent memory with all current parts
  scrollImagesMemory = [...parts];

  // If in active scroll mode, close the inspector/watchers gracefully
  if (isScrollQuestionMode) {
    if (scrollWatchTimer) { clearInterval(scrollWatchTimer); scrollWatchTimer = null; }
    if (scrollAutoSolveTimer) { clearTimeout(scrollAutoSolveTimer); scrollAutoSolveTimer = null; }
    isScrollQuestionMode = false;
    if (scrollInspectorPanel) scrollInspectorPanel.style.display = 'none';
    if (btnToggleScrollMode) {
      btnToggleScrollMode.classList.remove('active');
      if (scrollModeLabel) scrollModeLabel.textContent = 'Scroll Mode';
    }
  }

  const partsCount = parts.length;
  console.log(`[ScrollMemory] 🧠 Explaining each line of code using ${partsCount} scroll images from memory.`);

  setAppStatus('THINKING', `EXPLAINING EACH LINE OF CODE (${partsCount} SCROLLED IMAGES IN MEMORY)...`);
  displayUserStatus(`🧠 Retaining ${partsCount} scroll images in memory • Explaining code line by line...`);
  airaResponseLine.textContent = `Retrieved ${partsCount} sequential scroll images from memory. Synthesizing full code and explaining every line...`;

  if (sourcesPill) {
    sourcesPill.style.display = 'block';
    sourcesPill.textContent = `🧠 Memory: ${partsCount} scroll images retained`;
    sourcesPill.title = `Retained ${partsCount} scroll captures in working memory.`;
  }

  try {
    const imagesPayload = parts.map((part, idx) => ({
      dataUrl: part.dataUrl,
      name: `Scrolled Part ${idx + 1} of ${partsCount} (${idx === 0 ? 'Top / Code Beginning' : idx === partsCount - 1 ? 'Bottom / Code Ending' : 'Middle Continuation'})`
    }));

    const queryText = userInstruction || "explain each line in the code from the scroll images";

    const prompt = `[SCROLLED CODE COMPREHENSIVE LINE-BY-LINE EXPLANATION]
The user captured and stored in memory ${partsCount} sequential scroll screenshot parts from top to bottom showing a long code snippet/program that required scrolling.
All ${partsCount} sequential scroll images are attached in chronological top-to-bottom order.

USER'S QUERY:
"${queryText}"

YOUR MANDATORY INSTRUCTIONS:
1. CODE RECONSTRUCTION:
   - Carefully read all ${partsCount} images in sequence.
   - Reconstruct the unified, complete code from top to bottom.
   - Eliminate duplicated lines where screenshots overlap.
   - Output the clean reconstructed code in a fenced markdown block (e.g. \`\`\`python or \`\`\`javascript or \`\`\`cpp) with line numbers included.

2. LINE-BY-LINE EXPLANATION:
   - Explain EACH line (or logical line block) in the code thoroughly and clearly.
   - For each line or block:
     * Specify the line number and the exact statement.
     * Explain what the line does, variable modifications, methods called, and why it is written this way.
     * Clarify any algorithms, data structures, or edge cases handled.

3. OVERVIEW & COMPLEXITY:
   - Provide a concise summary of what the entire program accomplishes.
   - State the overall Time Complexity and Space Complexity with brief justification.

4. SPOKEN RESPONSE GUIDELINES:
   - The spoken version must be a natural, conversational walkthrough that explains the code's logic and flow from top to bottom.
   - Do NOT read out verbatim syntax tokens like semicolons, curly braces, or indentation aloud.`;

    const res = await window.electronAPI.askAira({
      prompt: prompt,
      screenCapture: parts[parts.length - 1].dataUrl,
      images: imagesPayload
    });

    if (res && res.success) {
      lastCodeExplanationMarkdown = res.text;
      setAppStatus('SPEAKING', 'LINE-BY-LINE CODE EXPLANATION');

      // 1. Render in the main HUD response line and scroll to top
      renderFormattedResponse(airaResponseLine, res.text);
      if (bubbleScroll) bubbleScroll.scrollTop = 0;

      // 2. Render and immediately pop open the full-view Code Explanation Drawer!
      renderCodeExplanationDrawer(res.text, partsCount);
      openCodeExplanationDrawer();

      const spokenText = extractSpokenText(res.text);
      try {
        const synthRes = await window.electronAPI.synthesizeSpeech({
          text: spokenText,
          voiceConfig: { voiceName: currentVoiceName, rate: '+10%' }
        });
        if (synthRes && synthRes.success) {
          await window.audioManager.playAudioData(synthRes.audioDataUrl, spokenText);
        } else {
          window.audioManager.speakFallback(spokenText);
        }
      } catch (synthErr) {
        console.warn('[ScrollMemory] Speech synthesis error:', synthErr);
      }
    } else {
      airaResponseLine.textContent = res?.text || 'Could not explain the code from the scroll images. Please try again.';
    }
  } catch (err) {
    console.error('[ScrollMemory] Error explaining code from scroll memory:', err);
    airaResponseLine.textContent = `Error: ${err.message}`;
  } finally {
    if (wasMcqActiveBeforeScroll) {
      setAppStatus('SCANNING', 'AIRA ACTIVE');
      displayUserStatus('MCQ Mode restored. Scroll memory preserved.');
      startMcqScreenPolling();
    } else {
      setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
      displayUserStatus(`🧠 Memory preserved: ${parts.length} scroll images. Speak anytime.`);
      if (isHandsFreeMode && recorder) recorder.resume();
    }
  }
}

/**
 * Assemble all captured scroll parts, synthesize with Gemini (either answering question or fulfilling user's custom instruction like "explain full code line by line"), and speak the answer
 */
async function finishScrollQuestionCapture(customPrompt = null) {
  if (!isScrollQuestionMode) return;

  if (customPrompt && isScrollCodeExplanationCommand(customPrompt)) {
    return await explainCodeFromScrollMemory(customPrompt);
  }

  if (scrollWatchTimer) {
    clearInterval(scrollWatchTimer);
    scrollWatchTimer = null;
  }
  if (scrollAutoSolveTimer) {
    clearTimeout(scrollAutoSolveTimer);
    scrollAutoSolveTimer = null;
  }

  // Also grab current screen in case user scrolled right before speaking
  try {
    const currentScreen = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
    if (currentScreen && currentScreen.length > 50) {
      const cHash = computeScreenHash(currentScreen);
      if (hasScreenChanged(cHash, scrollLastFrameHash)) {
        const partNum = scrollCapturedParts.length + 1;
        const curObj = {
          dataUrl: currentScreen,
          hash: cHash,
          length: currentScreen.length,
          timestamp: Date.now(),
          partNum: partNum,
          label: 'Current scrolled view'
        };
        scrollCapturedParts.push(curObj);
        scrollImagesMemory.push(curObj);
        scrollLastFrameHash = cHash;
        addScrollPartToInspector(currentScreen, partNum, 'Current scrolled view');
      }
    }
  } catch (e) {}

  const partsCount = scrollCapturedParts.length;
  console.log(`[ScrollMode] ✅ Finishing scroll capture with ${partsCount} parts. Custom Prompt:`, customPrompt);

  if (partsCount === 0) {
    cancelScrollQuestionCapture();
    return;
  }

  const isCustom = customPrompt && typeof customPrompt === 'string' && customPrompt.trim().length > 0 && !isScrollDoneCommand(customPrompt);

  setAppStatus('THINKING', isCustom ? `ANALYZING ${partsCount} SCROLLED PARTS...` : `READING FULL QUESTION (${partsCount} PARTS)...`);
  displayUserStatus(isCustom ? `📜 "${customPrompt}"` : `📜 Synthesizing ${partsCount} scrolled parts into the complete question...`);
  airaResponseLine.textContent = isCustom ? `Analyzing across all ${partsCount} scrolled images: "${customPrompt}"...` : `Analyzing all ${partsCount} parts of your lengthy question...`;

  try {
    const imagesPayload = scrollCapturedParts.map((part, idx) => ({
      dataUrl: part.dataUrl,
      name: `Scrolled Part ${idx + 1} of ${partsCount} (${idx === 0 ? 'Top / Beginning' : idx === partsCount - 1 ? 'Bottom / Ending' : 'Middle Continuation'})`
    }));

    let prompt = '';
    if (isCustom) {
      prompt = `[SCROLLED MULTI-IMAGE ANALYSIS & CODE EXPLANATION]
The user scrolled down their screen and captured ${partsCount} sequential screenshot parts from top to bottom.
All ${partsCount} parts are attached sequentially.

USER'S INSTRUCTION / VOICE INPUT:
"${customPrompt}"

INSTRUCTIONS FOR YOUR RESPONSE:
1. Carefully inspect ALL ${partsCount} attached image parts in sequence from top to bottom.
2. Directly answer or execute the user's specific instruction. If they asked to explain full code line by line, walk through the code across all attached parts line by line with clear markdown formatting.
3. If they asked to solve a problem, find a bug, or summarize, fulfill it completely and accurately based on the whole combined content.`;
    } else {
      prompt = `[LENGTHY QUESTION SCROLLED SOLVER]
The user encountered a lengthy question that could not fit on one screen and scrolled down to show it.
Attached are ${partsCount} sequential screen captures taken from top to bottom as the user scrolled down.

YOUR INSTRUCTIONS:
1. CAREFULLY RECONSTRUCT AND NOTE THE WHOLE QUESTION:
   - Read Part 1 (top of question, problem context, formulas, diagrams).
   - Read subsequent parts (middle continuation, code snippets, full text).
   - Read the final parts (all multiple choice options A, B, C, D or 1, 2, 3, 4).
2. SYNTHESIZE the entire question as ONE single problem.
3. DETERMINE THE CORRECT ANSWER based on the full question text and all options.
4. FORMAT YOUR RESPONSE AS:
   **Question Summary:** [1-sentence summary of the complete question]
   **Answer:** Option [Letter/Number]: [Exact option text]
   **Reason:** [1-2 concise sentences explaining why this answer is correct based on the complete problem statement].
5. Keep the spoken answer clear, direct, and authoritative so it can be spoken in under 8 seconds.`;
    }

    const res = await window.electronAPI.askAira({
      prompt: prompt,
      screenCapture: scrollCapturedParts[scrollCapturedParts.length - 1].dataUrl,
      images: imagesPayload
    });

    if (res && res.success) {
      setAppStatus('SPEAKING', isCustom ? 'ANSWER' : 'ANSWER TO FULL QUESTION');
      renderFormattedResponse(airaResponseLine, res.text);

      const spokenText = extractSpokenText(res.text);
      try {
        const synthRes = await window.electronAPI.synthesizeSpeech({
          text: spokenText,
          voiceConfig: { voiceName: currentVoiceName, rate: '+10%' }
        });
        if (synthRes && synthRes.success) {
          await window.audioManager.playAudioData(synthRes.audioDataUrl, spokenText);
        } else {
          window.audioManager.speakFallback(spokenText);
        }
      } catch (synthErr) {
        console.warn('[ScrollMode] Speech synthesis error:', synthErr);
      }
    } else {
      airaResponseLine.textContent = res?.text || 'Could not analyze the complete question. Please try again.';
    }
  } catch (err) {
    console.error('[ScrollMode] Error solving full question:', err);
    airaResponseLine.textContent = `Error: ${err.message}`;
  } finally {
    if (scrollCapturedParts.length > 0) {
      scrollImagesMemory = [...scrollCapturedParts];
    }
    isScrollQuestionMode = false;
    if (scrollInspectorPanel) scrollInspectorPanel.style.display = 'none';
    if (btnToggleScrollMode) {
      btnToggleScrollMode.classList.remove('active');
      if (scrollModeLabel) scrollModeLabel.textContent = 'Scroll Mode';
    }

    if (wasMcqActiveBeforeScroll) {
      setAppStatus('SCANNING', 'AIRA ACTIVE');
      displayUserStatus('MCQ Mode restored.');
      if (scrollCapturedParts.length > 0) {
        mcqLastAnsweredHash = scrollCapturedParts[scrollCapturedParts.length - 1].hash;
        mcqLastScreenHash = scrollCapturedParts[scrollCapturedParts.length - 1].hash;
      }
      startMcqScreenPolling();
    } else {
      setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
      displayUserStatus(`🧠 Memory preserved: ${scrollImagesMemory.length} scroll images. Speak anytime.`);
      if (isHandsFreeMode && recorder) recorder.resume();
    }
  }
}

/**
 * Cancel scroll capture mode
 */
function cancelScrollQuestionCapture() {
  isScrollQuestionMode = false;
  if (scrollCapturedParts.length > 0) {
    scrollImagesMemory = [...scrollCapturedParts];
  }
  scrollCapturedParts = [];
  if (scrollWatchTimer) {
    clearInterval(scrollWatchTimer);
    scrollWatchTimer = null;
  }
  if (scrollAutoSolveTimer) {
    clearTimeout(scrollAutoSolveTimer);
    scrollAutoSolveTimer = null;
  }
  if (scrollInspectorPanel) scrollInspectorPanel.style.display = 'none';
  if (btnToggleScrollMode) {
    btnToggleScrollMode.classList.remove('active');
    if (scrollModeLabel) scrollModeLabel.textContent = 'Scroll Mode';
  }

  if (wasMcqActiveBeforeScroll) {
    setAppStatus('SCANNING', 'MCQ MODE ACTIVE');
    displayUserStatus('📝 MCQ Mode Active — Watching for questions...');
    startMcqScreenPolling();
  } else {
    setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
    displayUserStatus('Scroll capture cancelled.');
  }
}


/**
 * Start a special voice listener during MCQ mode that only listens for
 * MCQ stop commands (so user can say "stop MCQ" to exit the mode)
 */
function startMcqVoiceListener() {
  if (!recorder || !isHandsFreeMode) return;

  // Resume the recorder but with a special handler
  recorder.resume();
}

async function processUserQuery(promptText, expectedSeq = null) {
  const currentSeq = expectedSeq || ++activeQuerySequence;

  if (currentSeq !== activeQuerySequence || isEditingQuery) {
    console.log('[HUD] Query aborted before execution because user is editing or newer query exists.');
    return;
  }

  let cleanPrompt = promptText || '';
  if (isExitCommand(cleanPrompt)) {
    await handleCloseAira();
    return;
  }
  wakeWords.forEach(w => {
    const regex = new RegExp(`^${w}\\b[\\s,]*`, 'i');
    cleanPrompt = cleanPrompt.replace(regex, '');
  });
  cleanPrompt = cleanPrompt.replace(/^[,\s.!?-]+/, '').trim();

  // If user said only a wake word / greeting, respond and start listening!
  if (!cleanPrompt && !attachedScreen && attachedImages.length === 0) {
    if (currentSeq !== activeQuerySequence || isEditingQuery) return;
    setAppStatus('SPEAKING', 'HI! I AM LISTENING...');
    const greetingText = "Hi! I'm listening, go ahead and ask me anything.";
    airaResponseLine.textContent = greetingText;
    try {
      const synthRes = await window.electronAPI.synthesizeSpeech({ text: greetingText });
      if (currentSeq !== activeQuerySequence || isEditingQuery) return;
      if (synthRes && synthRes.success) {
        await window.audioManager.playAudioData(synthRes.audioDataUrl, greetingText);
      } else {
        window.audioManager.speakFallback(greetingText);
      }
    } catch (e) {
      if (currentSeq !== activeQuerySequence || isEditingQuery) return;
      isProcessingSpeech = false;
      setAppStatus('LISTENING', 'AIRA IS LISTENING (Speak now)');
      userQueryLine.textContent = '🎙️ I am listening! Speak your question now...';
      updateMicButtonUI('RECORDING');
      if (isHandsFreeMode && recorder) recorder.forceSpeechStart();
    }
    return;
  }

  // CRITICAL: Ensure screen is captured if Live Vision is ON or user asks about screen
  const promptLower = cleanPrompt.toLowerCase();
  const asksAboutScreen = promptLower.includes('screen') || promptLower.includes('look') ||
                          promptLower.includes('see') || promptLower.includes('display') ||
                          promptLower.includes('read') || promptLower.includes('page') ||
                          promptLower.includes('window');

  if ((isLiveScreenVision || asksAboutScreen) && !attachedScreen) {
    if (currentSeq !== activeQuerySequence || isEditingQuery) return;
    setAppStatus('SCANNING', 'ANALYZING LIVE SCREEN...');
    try {
      const liveCap = await window.electronAPI.captureScreen(0, { width: 1920, height: 1080, quality: 85 });
      if (liveCap && liveCap.length > 50) {
        attachedScreen = liveCap;
        if (liveScreenImg) liveScreenImg.src = liveCap;
        if (window.airaOrb && window.airaOrb.updateLiveScreen) {
          window.airaOrb.updateLiveScreen(liveCap);
        }
      }
    } catch (e) {
      console.warn('[HUD] Automatic screen capture in query failed:', e);
    }
  }

  // If user clicked Edit while screen capture was taking place, abort immediately!
  if (currentSeq !== activeQuerySequence || isEditingQuery) {
    console.log('[HUD] Query aborted before Gemini API call because user is editing.');
    return;
  }

  setAppStatus('THINKING', 'SEARCHING & THINKING...');
  airaResponseLine.textContent = "Thinking...";
  sourcesPill.style.display = 'none';

  try {
    // If user's question mentions scroll or scrolled images and we have scroll images in memory, automatically attach them!
    let queryImages = [...attachedImages];
    const isRefScrollMemory = promptLower.includes('scroll') || promptLower.includes('scrolled');
    if (isRefScrollMemory && scrollImagesMemory && scrollImagesMemory.length > 0 && queryImages.length === 0) {
      scrollImagesMemory.forEach((part, idx) => {
        queryImages.push({
          dataUrl: part.dataUrl,
          name: `Scrolled Part ${idx + 1} of ${scrollImagesMemory.length}`
        });
      });
    }

    const payload = {
      prompt: cleanPrompt || "Analyze this image/screen for me in detail.",
      screenCapture: attachedScreen,
      images: queryImages
    };

    const res = await window.electronAPI.askAira(payload);

    // If user clicked Edit or modified question while Gemini was thinking, DISCARD IMMEDIATELY!
    if (currentSeq !== activeQuerySequence || isEditingQuery) {
      console.log('[HUD] Discarding Gemini response because user clicked Edit or submitted another query.');
      return;
    }

    // Clear attachments after query sent
    attachedScreen = null;
    attachedImages = [];
    updateAttachmentsUI();

    if (res && res.success) {
      setAppStatus('SPEAKING', 'ANSWERING...');
      renderFormattedResponse(airaResponseLine, res.text);

      // If multiple questions were detected, notify user that a Study Set was saved to memory!
      if (res.studyPack) {
        sourcesPill.style.display = 'block';
        sourcesPill.textContent = `📚 Saved ${res.studyPack.items?.length || ''} questions to Study Memory! Click "Revise" anytime.`;
        sourcesPill.title = `Saved question set "${res.studyPack.title}". Click History icon to review or revise.`;
        if (memoryDrawer && memoryDrawer.style.display !== 'none') {
          loadQuestionMemory();
        }
      } else if (res.sources && res.sources.length > 0) {
        sourcesPill.style.display = 'block';
        sourcesPill.textContent = `🔍 Grounded with ${res.sources.length} live web sources`;
        sourcesPill.title = res.sources.map(s => s.title || s.uri).join('\n');
      } else {
        sourcesPill.style.display = 'none';
      }

      // Synthesize spoken answer with Edge-TTS using friendly conversational speech (no raw code blocks)
      const spokenText = extractSpokenText(res.text);
      let speechPlayed = false;
      try {
        const synthRes = await window.electronAPI.synthesizeSpeech({
          text: spokenText,
          voiceConfig: { voiceName: currentVoiceName }
        });

        // Double check if user clicked Edit during synthesis
        if (currentSeq !== activeQuerySequence || isEditingQuery) {
          console.log('[HUD] Discarding synthesized audio because user is editing question.');
          return;
        }

        if (synthRes && synthRes.success) {
          speechPlayed = true;
          await window.audioManager.playAudioData(synthRes.audioDataUrl, spokenText);
        } else {
          speechPlayed = true;
          window.audioManager.speakFallback(spokenText);
        }
      } catch (synthErr) {
        console.warn('[HUD] Speech playback error:', synthErr);
        speechPlayed = false;
      }

      // If speech could not be played, reset immediately so user isn't stuck
      if (!speechPlayed && !isEditingQuery) {
        setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
        updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
        isProcessingSpeech = false;
        if (isHandsFreeMode) {
          setTimeout(() => startHandsFreeListening(), 500);
        }
      }
    } else {
      if (currentSeq !== activeQuerySequence || isEditingQuery) return;
      setAppStatus('IDLE', 'AIRA ERROR');
      airaResponseLine.textContent = res?.text || 'Unable to process question. Please check Gemini API key in Admin Console.';
      updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
      isProcessingSpeech = false;
      if (isHandsFreeMode) {
        setTimeout(() => startHandsFreeListening(), 800);
      }
    }
  } catch (err) {
    if (currentSeq !== activeQuerySequence || isEditingQuery) return;
    console.error('Error processing query:', err);
    setAppStatus('IDLE', 'ERROR');
    airaResponseLine.textContent = `Error: ${err.message || 'Failed to connect.'}`;
    updateMicButtonUI(isHandsFreeMode ? 'AUTO_READY' : 'MANUAL_READY');
    isProcessingSpeech = false;
    if (isHandsFreeMode) {
      setTimeout(() => startHandsFreeListening(), 800);
    }
  }
}

// --- Voice Control Buttons ---
btnPauseResume.addEventListener('click', () => {
  if (window.audioManager.isPlaying && !window.audioManager.isPaused) {
    // 1. User clicked Pause while AIRA is speaking: allow voice input or query editing
    window.audioManager.pause();
    isProcessingSpeech = false;
    setAppStatus('IDLE', 'PAUSED (Speak or Edit)');
    if (isHandsFreeMode) {
      if (recorder) recorder.resume();
      updateMicButtonUI('AUTO_READY');
      setTimeout(() => startHandsFreeListening(), 300);
    }
  } else if (window.audioManager.isPaused) {
    // 2. User clicked Resume: mute mic while AIRA speaks her answer
    if (recorder) recorder.pause();
    isProcessingSpeech = true;
    window.audioManager.resume();
    setAppStatus('SPEAKING', 'ANSWERING...');
    updateMicButtonUI('PROCESSING');
  }
});

btnStop.addEventListener('click', () => {
  window.audioManager.stop();
  isProcessingSpeech = false;

  // If MCQ mode is active, stop button also exits MCQ mode
  if (isMcqContinuousMode) {
    stopMcqContinuousMode();
    return;
  }

  setAppStatus('IDLE', isHandsFreeMode ? 'AIRA READY - SPEAK ANYTIME' : 'AIRA READY');
  if (isHandsFreeMode) {
    if (recorder) recorder.resume();
    updateMicButtonUI('AUTO_READY');
    setTimeout(() => startHandsFreeListening(), 300);
  } else {
    if (isRecording && recorder) {
      recorder.stop();
      isRecording = false;
    }
    updateMicButtonUI('MANUAL_READY');
  }
});

btnReadAgain.addEventListener('click', () => {
  window.audioManager.replay();
});

// Update voice playback button icons
window.audioManager.onStateChange(({ isPlaying, isPaused }) => {
  if (isPaused) {
    pauseIcon.style.display = 'none';
    playIcon.style.display = 'block';
    pauseLabel.textContent = 'Resume';
    setAppStatus('IDLE', 'PAUSED');
  } else if (isPlaying) {
    pauseIcon.style.display = 'block';
    playIcon.style.display = 'none';
    pauseLabel.textContent = 'Pause';
    setAppStatus('SPEAKING', 'SPEAKING');
  } else {
    pauseIcon.style.display = 'block';
    playIcon.style.display = 'none';
    pauseLabel.textContent = 'Pause';
  }
});

// Top Action Buttons
btnDock.addEventListener('click', () => {
  window.audioManager.stop();
  isProcessingSpeech = false;
  if (isRecording && recorder) {
    recorder.stop();
    isRecording = false;
  }
  window.electronAPI.hideBall();
});

btnAdmin.addEventListener('click', () => {
  window.electronAPI.openAdmin();
});

// Automatically resume hands-free listening when AIRA finishes speaking response
window.audioManager.onEnded(() => {
  isProcessingSpeech = false;

  // If MCQ mode is active, go back to scanning status and keep listening for stop commands
  if (isMcqContinuousMode) {
    setAppStatus('SCANNING', 'MCQ MODE — WATCHING FOR NEXT QUESTION...');
    displayUserStatus('📝 MCQ Mode Active — Navigate to next question...');
    updateMicButtonUI('AUTO_READY');
    // Resume voice listener so user can say "stop MCQ"
    if (isHandsFreeMode && recorder) {
      setTimeout(() => {
        if (isMcqContinuousMode && (!window.audioManager || !window.audioManager.isPlaying)) {
          startHandsFreeListening();
        }
      }, 450);
    }
    return;
  }

  if (isHandsFreeMode) {
    setAppStatus('IDLE', 'AIRA READY - SPEAK ANYTIME');
    if (!lastRawUserQuery) {
      displayUserStatus('🎙️ Listening hands-free... Speak anytime into your earbuds.');
    }
    updateMicButtonUI('AUTO_READY');
    setTimeout(() => {
      if (isHandsFreeMode && (!window.audioManager || !window.audioManager.isPlaying)) {
        startHandsFreeListening();
      }
    }, 450);
  } else {
    setAppStatus('IDLE', 'AIRA READY');
    updateMicButtonUI('MANUAL_READY');
  }
});

// Wake Trigger event from Main / Dock
if (window.electronAPI) {
  window.electronAPI.onWakeCommand(() => {
    if (isHandsFreeMode) {
      startHandsFreeListening();
    } else {
      startManualVoiceRecording();
    }
  });

  window.electronAPI.getConfig().then(cfg => {
    if (cfg && cfg.wakeWords) wakeWords = cfg.wakeWords;
    if (cfg && cfg.sleepWords) sleepWords = cfg.sleepWords;
    if (cfg && cfg.audioInputDeviceId) {
      activeDeviceId = cfg.audioInputDeviceId;
    }
    if (cfg && (cfg.voice?.voiceName || cfg.voiceName)) {
      currentVoiceName = cfg.voice?.voiceName || cfg.voiceName;
    }
    if (cfg && cfg.handsFreeMode !== undefined) {
      isHandsFreeMode = cfg.handsFreeMode;
      toggleHandsFree(isHandsFreeMode);
    }
    if (cfg && cfg.liveScreenVision !== undefined) {
      isLiveScreenVision = cfg.liveScreenVision;
      toggleLiveScreenVision(isLiveScreenVision);
    }
    initMicrophoneDevices();
    initVoicePersonaOptions();
    if (isLiveScreenVision) {
      startLiveScreenVisionFeed();
    }
    if (isHandsFreeMode) {
      setTimeout(() => startHandsFreeListening(), 600);
    }
  });

  window.electronAPI.onConfigUpdated(cfg => {
    if (cfg && cfg.wakeWords) wakeWords = cfg.wakeWords;
    if (cfg && cfg.sleepWords) sleepWords = cfg.sleepWords;
    if (cfg && (cfg.voice?.voiceName || cfg.voiceName)) {
      const vName = cfg.voice?.voiceName || cfg.voiceName;
      if (vName !== currentVoiceName) {
        currentVoiceName = vName;
        if (voicePersonaSelect) voicePersonaSelect.value = currentVoiceName;
      }
    }
    if (cfg && cfg.audioInputDeviceId && cfg.audioInputDeviceId !== activeDeviceId) {
      activeDeviceId = cfg.audioInputDeviceId;
      if (micDeviceSelect) micDeviceSelect.value = activeDeviceId;
      updateMicIconDisplay(activeDeviceId);
      if (recorder) recorder.setDeviceId(activeDeviceId);
    }
    if (cfg && cfg.handsFreeMode !== undefined && cfg.handsFreeMode !== isHandsFreeMode) {
      toggleHandsFree(cfg.handsFreeMode);
    }
    if (cfg && cfg.liveScreenVision !== undefined && cfg.liveScreenVision !== isLiveScreenVision) {
      toggleLiveScreenVision(cfg.liveScreenVision);
    }
  });
}
