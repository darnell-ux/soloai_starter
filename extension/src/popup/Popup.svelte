<script>
  import { MSG, STORAGE, RISK } from '../../shared/messages.js';

  // Popup UI state (Svelte 5 runes). The popup performs NO network calls and
  // NO API logic — it only messages the service worker and renders state.
  let record = $state(null);
  let loading = $state(true);
  let rescanNote = $state('');

  const risk = $derived(record?.risk ?? RISK.UNKNOWN);
  const signals = $derived(record?.signals ?? null);
  const assessment = $derived(record?.assessment ?? null);

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (resp) => {
        void chrome.runtime.lastError; // swallow "no receiver" noise
        resolve(resp);
      });
    });
  }

  async function load() {
    loading = true;
    record = await sendMessage({ type: MSG.GET_STATE });
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

  $effect(() => {
    load();
    // Live-update if the content script reports while the popup is open.
    const onChange = (changes, area) => {
      if (area === 'local' && changes[STORAGE.LATEST]) {
        record = changes[STORAGE.LATEST].newValue;
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  });

  const STATUS = {
    [RISK.EXPOSED]: { label: 'CA nexus exposure detected', cls: 'exposed' },
    [RISK.CLEAR]: { label: 'No CA inventory signal on this page', cls: 'clear' },
    [RISK.UNKNOWN]: { label: 'No data yet', cls: 'unknown' }
  };
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
    </div>

    {#if signals?.signals?.length}
      <section>
        <h2>Signals on this page</h2>
        <ul>
          {#each signals.signals as s}
            <li>{s}</li>
          {/each}
        </ul>
        <p class="meta">{signals.host}{signals.path}</p>
      </section>
    {/if}

    {#if assessment}
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
      <a href="https://taxnexusapp.com/audit" target="_blank" rel="noreferrer">
        Run full audit →
      </a>
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
</style>
