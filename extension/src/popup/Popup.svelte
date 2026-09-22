<script>
  import { MSG, STORAGE, RISK, ALERT, detectionKey, trialUrl } from '../../shared/messages.js';

  // Popup UI state (Svelte 5 runes). The popup performs NO network calls and
  // NO API logic — it reads chrome.storage.local and messages the service
  // worker. Storage is read in ONE batched get([...]) per load, never as a
  // sequence of individual gets.
  let record = $state(null);
  let loading = $state(true);
  let rescanNote = $state('');
  let snoozeUntil = $state(0);
  let dismissed = $state(false);
  let activeTabId = $state(null);
  // True only when the shown record is this tab's own detection, not a
  // fallback to the last result recorded on some other tab.
  let isThisPage = $state(false);

  const risk = $derived(record?.risk ?? RISK.UNKNOWN);
  const signals = $derived(record?.signals ?? null);
  const assessment = $derived(record?.assessment ?? null);
  const alertLevel = $derived(record?.alertLevel ?? ALERT.NONE);
  const ctaHref = $derived(record?.ctaUrl ?? trialUrl(alertLevel));
  const snoozed = $derived(snoozeUntil > Date.now());

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (resp) => {
        void chrome.runtime.lastError; // swallow "no receiver" noise
        resolve(resp);
      });
    });
  }

  async function currentTabId() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Load every piece of popup state in a SINGLE chrome.storage.local.get call.
   * Sequential per-key gets would mean one IPC round trip each on popup open —
   * the one place where latency is visible to the user.
   */
  async function load() {
    loading = true;
    activeTabId = await currentTabId();

    const keys = [
      STORAGE.LATEST,
      STORAGE.SNOOZE_UNTIL,
      STORAGE.DISMISSED_TABS,
      STORAGE.LAST_ALERT_LEVEL
    ];
    if (activeTabId != null) keys.push(detectionKey(activeTabId));

    const stored = await chrome.storage.local.get(keys);

    // Prefer this tab's own detection; fall back to the last global record so a
    // freshly opened popup on a non-Amazon tab still shows the latest finding.
    //
    // Track WHICH of the two we used. The extension runs only on Seller
    // Central, so most tabs have no detection of their own and we are showing
    // a result from somewhere else — the UI must not label that "this page".
    const perTab = activeTabId != null ? stored[detectionKey(activeTabId)] : null;
    isThisPage = perTab != null;
    record = perTab ?? stored[STORAGE.LATEST] ?? null;

    snoozeUntil = Number(stored[STORAGE.SNOOZE_UNTIL]) || 0;
    const dismissedTabs = stored[STORAGE.DISMISSED_TABS];
    dismissed = Array.isArray(dismissedTabs) && activeTabId != null
      ? dismissedTabs.includes(activeTabId)
      : false;

    loading = false;
  }

  async function rescan() {
    rescanNote = 'Scanning active tab…';
    const res = await sendMessage({ type: MSG.RESCAN });
    if (!res?.ok) {
      rescanNote =
        res?.reason === 'not_amazon'
          ? 'Open an Amazon Seller Central page, then re-scan.'
          : 'Could not scan the active tab.';
      return;
    }
    rescanNote = 'Scan requested — refreshing…';
    // Give the content script -> SW round trip a moment, then reload state.
    setTimeout(async () => {
      await load();
      rescanNote = '';
    }, 600);
  }

  async function snooze() {
    const res = await sendMessage({ type: MSG.SNOOZE });
    if (res?.snoozeUntil) snoozeUntil = res.snoozeUntil;
  }

  async function dismiss() {
    if (activeTabId == null) return;
    const res = await sendMessage({ type: MSG.DISMISS, tabId: activeTabId });
    if (res?.ok) dismissed = true;
  }

  function snoozeReturnLabel(until) {
    const days = Math.max(1, Math.ceil((until - Date.now()) / 86400000));
    return `Alerts paused — back in ${days} day${days === 1 ? '' : 's'}.`;
  }

  $effect(() => {
    load();
    // Live-update if the content script reports while the popup is open.
    const onChange = (changes, area) => {
      if (area !== 'local') return;
      // Keep `record` and `isThisPage` in lockstep, or a scan on a different
      // tab would repaint this popup with that tab's result still labelled
      // "this page". The service worker writes both keys in one set(), so when
      // the detection IS ours the second branch corrects the first.
      if (changes[STORAGE.LATEST]) {
        record = changes[STORAGE.LATEST].newValue;
        isThisPage = false;
      }
      if (activeTabId != null && changes[detectionKey(activeTabId)]) {
        record = changes[detectionKey(activeTabId)].newValue;
        isThisPage = true;
      }
      if (changes[STORAGE.SNOOZE_UNTIL]) {
        snoozeUntil = Number(changes[STORAGE.SNOOZE_UNTIL].newValue) || 0;
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  });

  // "on this page" is only truthful when we're showing this tab's own
  // detection. On any other tab the same record is the user's last known
  // state, not a statement about what they're currently looking at.
  const STATUS = $derived({
    [RISK.EXPOSED]: { label: 'CA nexus exposure detected', cls: 'exposed' },
    [RISK.CLEAR]: {
      label: isThisPage
        ? 'No CA inventory signal on this page'
        : 'No CA inventory signal in your last scan',
      cls: 'clear'
    },
    [RISK.UNKNOWN]: { label: 'No data yet', cls: 'unknown' }
  });

  // Only HIGH gets a chip. The chip must never contradict the status banner
  // beside it — a green "No CA inventory signal" next to an amber severity
  // badge reads as a bug, because it is one.
  const LEVEL_LABEL = {
    [ALERT.HIGH]: 'HIGH',
    [ALERT.NONE]: null
  };

  // Render the Assessment section only when it has something to say. The API
  // returns a well-formed body with no triggers and no minTax on a clear page,
  // which would otherwise paint a bare "ASSESSMENT" header over empty space.
  const hasAssessmentDetail = $derived(
    Boolean(assessment?.triggers?.length) || Boolean(assessment?.minTax)
  );
</script>

<main>
  <header>
    <span class="mark">TaxNexus</span>
    <span class="sub">Nexus Alert</span>
  </header>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    <div class="status {STATUS[risk].cls}">
      <strong>{STATUS[risk].label}</strong>
      {#if LEVEL_LABEL[alertLevel]}
        <span class="level {alertLevel}">{LEVEL_LABEL[alertLevel]}</span>
      {/if}
    </div>

    {#if snoozed}
      <p class="muted">{snoozeReturnLabel(snoozeUntil)}</p>
    {:else if dismissed}
      <p class="muted">Dismissed for this tab. Re-scan to bring it back.</p>
    {/if}

    {#if signals?.signals?.length}
      <section>
        <h2>{isThisPage ? 'Signals on this page' : 'Last scan (another tab)'}</h2>
        <ul>
          {#each signals.signals as s}
            <li>{s}</li>
          {/each}
        </ul>
        {#if signals.host}
          <p class="meta">{isThisPage ? '' : 'from '}{signals.host}{signals.path ?? ''}</p>
        {/if}
      </section>
    {/if}

    {#if hasAssessmentDetail}
      <section>
        <h2>Assessment</h2>
        {#if assessment.triggers?.length}
          <ul>
            {#each assessment.triggers as t}
              <li>{t}</li>
            {/each}
          </ul>
        {/if}
        {#if assessment.minTax}
          <p class="meta">Minimum franchise tax exposure: ${assessment.minTax}/yr</p>
        {/if}
      </section>
    {/if}

    {#if risk === RISK.EXPOSED}
      <p class="note">
        CA inventory makes a seller "doing business" at any volume — physical
        presence has no safe harbor. This is awareness, not tax advice.
      </p>
    {/if}

    <div class="actions">
      <button onclick={rescan}>Re-scan this page</button>
      <a href={ctaHref} target="_blank" rel="noreferrer">Start free trial →</a>
    </div>

    <div class="minor">
      {#if !dismissed}
        <button class="link" onclick={dismiss} disabled={activeTabId == null}>
          Dismiss for this tab
        </button>
      {/if}
      {#if !snoozed}
        <button class="link" onclick={snooze}>Snooze 7 days</button>
      {/if}
    </div>

    {#if rescanNote}<p class="muted">{rescanNote}</p>{/if}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
  }
  main {
    width: 320px;
    padding: 14px 16px;
    color: #1f2937;
    background: #fafaf9;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 12px;
  }
  .mark {
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .sub {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
    border: 1px solid transparent;
  }
  .status.exposed {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }
  .status.clear {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }
  .status.unknown {
    background: #f3f4f6;
    border-color: #e5e7eb;
    color: #4b5563;
  }
  .level {
    flex: none;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 6px;
    border-radius: 4px;
    color: #fff;
  }
  .level.high {
    background: #b91c1c;
  }
  section {
    margin-top: 14px;
  }
  h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    margin: 0 0 6px;
  }
  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
  }
  li {
    margin-bottom: 4px;
  }
  .meta {
    font-size: 11px;
    color: #6b7280;
    margin: 6px 0 0;
    word-break: break-all;
  }
  .note {
    font-size: 12px;
    color: #4b5563;
    margin-top: 12px;
    line-height: 1.4;
  }
  .muted {
    color: #6b7280;
    font-size: 12px;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
  }
  button {
    background: #111827;
    color: #fff;
    border: 0;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
  }
  a {
    font-size: 13px;
    color: #b45309;
    text-decoration: none;
    font-weight: 600;
  }
  .minor {
    display: flex;
    gap: 14px;
    margin-top: 10px;
  }
  button.link {
    background: none;
    color: #6b7280;
    padding: 0;
    font-size: 12px;
    text-decoration: underline;
  }
  button.link:disabled {
    color: #d1d5db;
    cursor: default;
  }
</style>
