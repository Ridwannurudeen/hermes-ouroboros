/**
 * Hermes Ouroboros — Embeddable Verification Widget
 * https://hermes-ouroboros.online
 *
 * Usage:
 *   <script src="https://hermes-ouroboros.online/widget.js"></script>
 *
 * Optional attributes on the script tag:
 *   data-api-key="ho_..."   — API key for cross-origin usage
 *   data-position="bottom-left" — button corner (default: bottom-right)
 */
(function () {
  'use strict';

  // Prevent double-initialization
  if (window.__hermesWidgetLoaded) return;
  window.__hermesWidgetLoaded = true;

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  var ORIGIN = 'https://hermes-ouroboros.online';
  var API_URL = ORIGIN + '/api/query';
  var HIDE_DELAY = 3000;
  var DEBOUNCE_MS = 300;
  var MAX_QUERY_LEN = 4000;
  var MIN_SELECTION_LEN = 10;

  // Read config from script tag attributes
  var scriptTag = document.currentScript;
  var apiKey = scriptTag ? scriptTag.getAttribute('data-api-key') : null;
  var position = scriptTag ? scriptTag.getAttribute('data-position') : null;
  var anchorRight = position !== 'bottom-left';

  // ---------------------------------------------------------------------------
  // Shadow DOM host
  // ---------------------------------------------------------------------------
  var host = document.createElement('div');
  host.id = 'hermes-ouroboros-widget';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;width:0;height:0;pointer-events:none;';
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: 'closed' });

  // ---------------------------------------------------------------------------
  // Styles (all scoped inside Shadow DOM)
  // ---------------------------------------------------------------------------
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',

    // Floating "Verify" trigger button
    '.hw-trigger {',
    '  position: fixed;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  padding: 6px 14px 6px 10px;',
    '  background: #6366f1;',
    '  color: #fff;',
    '  font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '  border: none;',
    '  border-radius: 999px;',
    '  cursor: pointer;',
    '  pointer-events: auto;',
    '  box-shadow: 0 4px 16px rgba(99,102,241,0.45), 0 1px 3px rgba(0,0,0,0.3);',
    '  transition: opacity 0.2s, transform 0.2s, background 0.15s;',
    '  opacity: 0;',
    '  transform: scale(0.85) translateY(4px);',
    '  z-index: 2147483647;',
    '  user-select: none;',
    '  -webkit-user-select: none;',
    '  white-space: nowrap;',
    '}',
    '.hw-trigger.hw-visible {',
    '  opacity: 1;',
    '  transform: scale(1) translateY(0);',
    '}',
    '.hw-trigger:hover { background: #818cf8; }',
    '.hw-trigger:active { transform: scale(0.96) translateY(0); }',

    // H icon inside trigger
    '.hw-icon {',
    '  width: 18px; height: 18px;',
    '  display: flex; align-items: center; justify-content: center;',
    '  background: rgba(255,255,255,0.2);',
    '  border-radius: 50%;',
    '  font-weight: 800; font-size: 11px; line-height: 1;',
    '}',

    // Panel overlay
    '.hw-overlay {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 2147483646;',
    '  pointer-events: auto;',
    '}',

    // Panel
    '.hw-panel {',
    '  position: fixed;',
    '  bottom: 20px;',
    (anchorRight ? '  right: 20px;' : '  left: 20px;'),
    '  width: 350px;',
    '  max-height: calc(100vh - 40px);',
    '  background: rgba(6, 6, 14, 0.95);',
    '  backdrop-filter: blur(20px);',
    '  -webkit-backdrop-filter: blur(20px);',
    '  border: 1px solid rgba(255,255,255,0.1);',
    '  border-radius: 16px;',
    '  box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15);',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '  color: #e2e8f0;',
    '  overflow: hidden;',
    '  z-index: 2147483647;',
    '  pointer-events: auto;',
    '  animation: hw-slideUp 0.25s ease-out;',
    '}',
    '@keyframes hw-slideUp {',
    '  from { opacity: 0; transform: translateY(16px); }',
    '  to { opacity: 1; transform: translateY(0); }',
    '}',

    // Panel header
    '.hw-header {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 14px 16px 12px;',
    '  border-bottom: 1px solid rgba(255,255,255,0.06);',
    '}',
    '.hw-brand {',
    '  display: flex; align-items: center; gap: 8px;',
    '  font-weight: 700; font-size: 13px; color: #c7d2fe;',
    '  letter-spacing: 0.3px;',
    '}',
    '.hw-brand-dot {',
    '  width: 8px; height: 8px; border-radius: 50%;',
    '  background: #6366f1;',
    '  box-shadow: 0 0 8px rgba(99,102,241,0.6);',
    '}',
    '.hw-close {',
    '  width: 28px; height: 28px;',
    '  display: flex; align-items: center; justify-content: center;',
    '  background: rgba(255,255,255,0.06);',
    '  border: 1px solid rgba(255,255,255,0.08);',
    '  border-radius: 8px;',
    '  color: rgba(255,255,255,0.5);',
    '  font-size: 14px; line-height: 1;',
    '  cursor: pointer;',
    '  transition: background 0.15s, color 0.15s;',
    '}',
    '.hw-close:hover { background: rgba(255,255,255,0.12); color: #fff; }',

    // Panel body
    '.hw-body {',
    '  padding: 16px;',
    '  overflow-y: auto;',
    '  max-height: calc(100vh - 120px);',
    '}',

    // Query display
    '.hw-query {',
    '  font-size: 12px; color: rgba(255,255,255,0.4);',
    '  line-height: 1.4;',
    '  margin-bottom: 16px;',
    '  padding: 8px 10px;',
    '  background: rgba(255,255,255,0.03);',
    '  border-radius: 8px;',
    '  border: 1px solid rgba(255,255,255,0.05);',
    '  max-height: 60px;',
    '  overflow: hidden;',
    '  word-break: break-word;',
    '}',

    // Loading state
    '.hw-loading {',
    '  display: flex; flex-direction: column; align-items: center;',
    '  gap: 12px; padding: 32px 0;',
    '}',
    '.hw-spinner {',
    '  width: 32px; height: 32px;',
    '  border: 3px solid rgba(99,102,241,0.2);',
    '  border-top-color: #6366f1;',
    '  border-radius: 50%;',
    '  animation: hw-spin 0.8s linear infinite;',
    '}',
    '@keyframes hw-spin { to { transform: rotate(360deg); } }',
    '.hw-loading-text {',
    '  font-size: 13px; color: rgba(255,255,255,0.5);',
    '  font-weight: 500;',
    '}',

    // Result
    '.hw-result { display: flex; flex-direction: column; gap: 14px; }',
    '.hw-result-top { display: flex; align-items: flex-start; gap: 14px; }',

    // Score gauge
    '.hw-gauge { flex-shrink: 0; position: relative; width: 60px; height: 60px; }',
    '.hw-gauge svg { width: 60px; height: 60px; transform: rotate(-90deg); }',
    '.hw-gauge-bg { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 5; }',
    '.hw-gauge-fill {',
    '  fill: none; stroke-width: 5; stroke-linecap: round;',
    '  transition: stroke-dashoffset 1.2s ease-out;',
    '}',
    '.hw-gauge-label {',
    '  position: absolute; inset: 0;',
    '  display: flex; flex-direction: column;',
    '  align-items: center; justify-content: center;',
    '}',
    '.hw-gauge-num {',
    '  font-size: 16px; font-weight: 800; line-height: 1;',
    '}',
    '.hw-gauge-sub {',
    '  font-size: 7px; font-weight: 600; letter-spacing: 0.5px;',
    '  color: rgba(255,255,255,0.35); text-transform: uppercase;',
    '  margin-top: 2px;',
    '}',

    // Verdict info
    '.hw-verdict-info { flex: 1; min-width: 0; }',
    '.hw-verdict-label {',
    '  font-size: 13px; font-weight: 800; text-transform: uppercase;',
    '  letter-spacing: 0.8px; margin-bottom: 4px;',
    '}',
    '.hw-confidence {',
    '  font-size: 11px; color: rgba(255,255,255,0.35); margin-bottom: 8px;',
    '}',
    '.hw-summary {',
    '  font-size: 12px; line-height: 1.55;',
    '  color: rgba(255,255,255,0.55);',
    '  word-break: break-word;',
    '}',

    // CTA link
    '.hw-cta {',
    '  display: flex; align-items: center; justify-content: center;',
    '  gap: 6px;',
    '  padding: 10px;',
    '  background: rgba(99,102,241,0.12);',
    '  border: 1px solid rgba(99,102,241,0.2);',
    '  border-radius: 10px;',
    '  color: #a5b4fc;',
    '  font-size: 12px; font-weight: 600;',
    '  text-decoration: none;',
    '  transition: background 0.15s, color 0.15s;',
    '}',
    '.hw-cta:hover { background: rgba(99,102,241,0.2); color: #c7d2fe; }',
    '.hw-cta-arrow { font-size: 14px; }',

    // Error state
    '.hw-error {',
    '  text-align: center; padding: 20px 0;',
    '}',
    '.hw-error-title {',
    '  font-size: 13px; font-weight: 600; color: #f87171; margin-bottom: 6px;',
    '}',
    '.hw-error-msg {',
    '  font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5;',
    '}',
    '.hw-error-link {',
    '  color: #a5b4fc; text-decoration: underline;',
    '  text-underline-offset: 2px;',
    '}',

    // Powered-by footer
    '.hw-footer {',
    '  padding: 10px 16px;',
    '  border-top: 1px solid rgba(255,255,255,0.04);',
    '  text-align: center;',
    '}',
    '.hw-footer a {',
    '  font-size: 10px; color: rgba(255,255,255,0.25);',
    '  text-decoration: none; letter-spacing: 0.3px;',
    '}',
    '.hw-footer a:hover { color: rgba(255,255,255,0.45); }',
  ].join('\n');
  shadow.appendChild(styleEl);

  // ---------------------------------------------------------------------------
  // DOM elements
  // ---------------------------------------------------------------------------

  // Trigger button
  var trigger = document.createElement('button');
  trigger.className = 'hw-trigger';
  trigger.innerHTML = '<span class="hw-icon">H</span>Verify';
  trigger.setAttribute('aria-label', 'Verify selected text with Hermes Ouroboros');
  shadow.appendChild(trigger);

  // Panel (created on demand)
  var panelOverlay = null;
  var panel = null;
  var panelBody = null;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var selectedText = '';
  var hideTimer = null;
  var debounceTimer = null;
  var abortController = null;
  var triggerVisible = false;

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function scoreColor(score) {
    if (score >= 70) return '#34d399'; // emerald
    if (score >= 40) return '#fbbf24'; // amber
    return '#f87171'; // rose
  }

  function verdictColor(label) {
    if (!label) return '#e2e8f0';
    var l = label.toLowerCase();
    if (l.indexOf('true') !== -1 || l.indexOf('verified') !== -1 || l.indexOf('supported') !== -1 || l.indexOf('credible') !== -1) return '#34d399';
    if (l.indexOf('false') !== -1 || l.indexOf('refuted') !== -1 || l.indexOf('debunked') !== -1 || l.indexOf('misleading') !== -1) return '#f87171';
    if (l.indexOf('mixed') !== -1 || l.indexOf('partial') !== -1 || l.indexOf('nuanced') !== -1) return '#fbbf24';
    return '#a5b4fc';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function truncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.slice(0, len).replace(/\s+\S*$/, '') + '...';
  }

  // ---------------------------------------------------------------------------
  // Selection tracking
  // ---------------------------------------------------------------------------
  function getSelectionText() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return '';
    return (sel.toString() || '').trim();
  }

  function getSelectionRect() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    var range = sel.getRangeAt(0);
    var rects = range.getClientRects();
    if (!rects || rects.length === 0) return null;
    // Use the last rect (end of selection) for positioning
    return rects[rects.length - 1];
  }

  function showTrigger(rect) {
    if (!rect) return;

    var btnW = 100;
    var btnH = 32;
    var margin = 8;

    // Position below and to the right of the selection end
    var top = rect.bottom + margin;
    var left = rect.right - btnW / 2;

    // Clamp to viewport
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    left = clamp(left, margin, vw - btnW - margin);
    top = clamp(top, margin, vh - btnH - margin);

    // If selection is near the bottom, show above
    if (top + btnH > vh - margin) {
      top = rect.top - btnH - margin;
      top = clamp(top, margin, vh - btnH - margin);
    }

    trigger.style.top = top + 'px';
    trigger.style.left = left + 'px';

    if (!triggerVisible) {
      triggerVisible = true;
      trigger.classList.add('hw-visible');
    }

    clearHideTimer();
    startHideTimer();
  }

  function hideTrigger() {
    if (triggerVisible) {
      triggerVisible = false;
      trigger.classList.remove('hw-visible');
    }
    clearHideTimer();
  }

  function startHideTimer() {
    clearHideTimer();
    hideTimer = setTimeout(function () {
      hideTrigger();
    }, HIDE_DELAY);
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function onSelectionChange() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var text = getSelectionText();
      if (text.length >= MIN_SELECTION_LEN) {
        selectedText = text;
        var rect = getSelectionRect();
        if (rect) {
          showTrigger(rect);
        }
      } else {
        selectedText = '';
        hideTrigger();
      }
    }, DEBOUNCE_MS);
  }

  document.addEventListener('selectionchange', onSelectionChange);

  // Also hide on scroll/resize if trigger is showing
  function onScrollOrResize() {
    if (triggerVisible && !panel) {
      // Reposition on the current selection
      var rect = getSelectionRect();
      if (rect) {
        showTrigger(rect);
      } else {
        hideTrigger();
      }
    }
  }
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  // Keep trigger alive on hover
  trigger.addEventListener('mouseenter', function () { clearHideTimer(); });
  trigger.addEventListener('mouseleave', function () {
    if (triggerVisible) startHideTimer();
  });

  // ---------------------------------------------------------------------------
  // Panel management
  // ---------------------------------------------------------------------------
  function createPanel() {
    // Overlay to catch outside clicks
    panelOverlay = document.createElement('div');
    panelOverlay.className = 'hw-overlay';
    panelOverlay.addEventListener('click', closePanel);
    shadow.appendChild(panelOverlay);

    panel = document.createElement('div');
    panel.className = 'hw-panel';

    // Header
    var header = document.createElement('div');
    header.className = 'hw-header';
    header.innerHTML =
      '<span class="hw-brand"><span class="hw-brand-dot"></span>HERMES OUROBOROS</span>';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'hw-close';
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.setAttribute('aria-label', 'Close panel');
    closeBtn.addEventListener('click', closePanel);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Body
    panelBody = document.createElement('div');
    panelBody.className = 'hw-body';
    panel.appendChild(panelBody);

    // Footer
    var footer = document.createElement('div');
    footer.className = 'hw-footer';
    footer.innerHTML = '<a href="' + ORIGIN + '" target="_blank" rel="noopener">Powered by Hermes Ouroboros</a>';
    panel.appendChild(footer);

    shadow.appendChild(panel);

    // ESC to close
    panel._escHandler = function (e) {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', panel._escHandler);
  }

  function closePanel() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (panel && panel._escHandler) {
      document.removeEventListener('keydown', panel._escHandler);
    }
    if (panelOverlay && panelOverlay.parentNode) {
      panelOverlay.parentNode.removeChild(panelOverlay);
    }
    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    panelOverlay = null;
    panel = null;
    panelBody = null;
  }

  function showLoading(queryText) {
    panelBody.innerHTML =
      '<div class="hw-query">' + escapeHtml(truncate(queryText, 120)) + '</div>' +
      '<div class="hw-loading">' +
      '  <div class="hw-spinner"></div>' +
      '  <div class="hw-loading-text">Analyzing...</div>' +
      '</div>';
  }

  function showError(title, message) {
    panelBody.innerHTML =
      '<div class="hw-error">' +
      '  <div class="hw-error-title">' + escapeHtml(title) + '</div>' +
      '  <div class="hw-error-msg">' + message + '</div>' +
      '</div>';
  }

  function buildScoreGauge(score) {
    var r = 24;
    var c = 2 * Math.PI * r;
    var offset = c - (Math.max(0, score) / 100) * c;
    var color = scoreColor(score);

    return (
      '<div class="hw-gauge">' +
      '  <svg viewBox="0 0 60 60">' +
      '    <circle class="hw-gauge-bg" cx="30" cy="30" r="' + r + '"/>' +
      '    <circle class="hw-gauge-fill" cx="30" cy="30" r="' + r + '"' +
      '      stroke="' + color + '"' +
      '      stroke-dasharray="' + c + '"' +
      '      stroke-dashoffset="' + offset + '"/>' +
      '  </svg>' +
      '  <div class="hw-gauge-label">' +
      '    <span class="hw-gauge-num" style="color:' + color + '">' + Math.round(score) + '</span>' +
      '    <span class="hw-gauge-sub">Score</span>' +
      '  </div>' +
      '</div>'
    );
  }

  function showResult(result) {
    var score = typeof result.hermes_score === 'number' ? result.hermes_score :
                (result.verdict_sections && typeof result.verdict_sections.hermes_score === 'number' ?
                  result.verdict_sections.hermes_score : result.confidence_score || 0);

    var label = (result.verdict_sections && result.verdict_sections.verdict_label) || '';
    var summaryText = result.arbiter_verdict || result.verdict || '';
    var confidence = typeof result.confidence_score === 'number' ? result.confidence_score : null;
    var sessionId = result.session_id || '';

    var fullUrl = ORIGIN + '/app';
    if (sessionId) {
      fullUrl = ORIGIN + '/app/sessions/' + encodeURIComponent(sessionId);
    }

    var html =
      '<div class="hw-query">' + escapeHtml(truncate(result.query || selectedText, 120)) + '</div>' +
      '<div class="hw-result">' +
      '  <div class="hw-result-top">' +
           buildScoreGauge(score) +
      '    <div class="hw-verdict-info">' +
      '      <div class="hw-verdict-label" style="color:' + verdictColor(label) + '">' +
               escapeHtml(label || 'Analysis Complete') +
      '      </div>' +
             (confidence !== null ?
               '<div class="hw-confidence">Confidence: ' + Math.round(confidence) + '%</div>' : '') +
      '      <div class="hw-summary">' + escapeHtml(truncate(summaryText, 200)) + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <a class="hw-cta" href="' + fullUrl + '" target="_blank" rel="noopener">' +
      '    Full Analysis <span class="hw-cta-arrow">&rarr;</span>' +
      '  </a>' +
      '</div>';

    panelBody.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // API call
  // ---------------------------------------------------------------------------
  function runVerification(queryText) {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    var headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    var body = JSON.stringify({
      query: queryText.slice(0, MAX_QUERY_LEN),
      analysis_mode: 'verify',
    });

    fetch(API_URL, {
      method: 'POST',
      headers: headers,
      body: body,
      signal: abortController.signal,
    })
      .then(function (response) {
        if (response.status === 429) {
          showError(
            'Rate Limited',
            'Too many requests. <a class="hw-error-link" href="' + ORIGIN + '" target="_blank" rel="noopener">' +
            'Get an API key at hermes-ouroboros.online</a>'
          );
          return null;
        }
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error(text || 'Request failed (' + response.status + ')');
          });
        }
        return response.json();
      })
      .then(function (data) {
        if (data === null) return; // rate limit already handled
        if (data && data.result) {
          showResult(data.result);
        } else {
          showError('Unexpected Response', 'The server returned an unexpected format.');
        }
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        showError('Error', escapeHtml(err.message || 'Something went wrong.'));
      });
  }

  // ---------------------------------------------------------------------------
  // Trigger click handler
  // ---------------------------------------------------------------------------
  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var text = selectedText || getSelectionText();
    if (!text || text.length < MIN_SELECTION_LEN) return;

    hideTrigger();

    // Clear any existing selection so it doesn't interfere
    // (keep the text we already captured)
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    closePanel();
    createPanel();
    showLoading(text);
    runVerification(text);
  });

  // ---------------------------------------------------------------------------
  // Cleanup on page unload
  // ---------------------------------------------------------------------------
  window.addEventListener('beforeunload', function () {
    document.removeEventListener('selectionchange', onSelectionChange);
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    if (abortController) abortController.abort();
    if (hideTimer) clearTimeout(hideTimer);
    if (debounceTimer) clearTimeout(debounceTimer);
  });
})();
