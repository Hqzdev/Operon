const DEFAULT_API_BASE = "https://operons.vercel.app/api";
const ONBOARDING_DONE_KEY = "operon_onboarding_completed";
const LOCAL_ONBOARDING_DONE_KEY = "onboarding_completed";
let activeProvider = null;
let activeAccountName = "";
let onboardingStep = 0;

// ── helpers ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

function showScreen(name) {
  ["auth", "main", "loading"].forEach((s) => {
    const el = $(`screen-${s}`);
    if (el) el.classList.toggle("hidden", s !== name);
  });
}

function getSettings() {
  return new Promise((resolve) =>
    chrome.storage.local.get(
      ["operon_extension_key", "operon_api_base", "operon_account_name", "last_sync_result"],
      (r) =>
        resolve({
          extensionKey: r.operon_extension_key || "",
          apiBase: r.operon_api_base || DEFAULT_API_BASE,
          accountName: r.operon_account_name || "",
          lastSyncResult: r.last_sync_result || null,
        })
    )
  );
}

function setSettings(settings) {
  return new Promise((resolve) =>
    chrome.storage.local.set(
      {
        operon_extension_key: settings.extensionKey,
        operon_api_base: settings.apiBase || DEFAULT_API_BASE,
        operon_account_name: settings.accountName || "",
      },
      resolve
    )
  );
}

function getAutopilot() {
  return new Promise((resolve) =>
    chrome.storage.local.get("autopilot_enabled", (r) => resolve(!!r.autopilot_enabled))
  );
}

function setAutopilot(enabled) {
  return new Promise((resolve) =>
    chrome.storage.local.set({ autopilot_enabled: enabled }, resolve)
  );
}

function getOnboardingState() {
  return new Promise((resolve) =>
    chrome.storage.local.get([ONBOARDING_DONE_KEY, "operon_extension_key"], (r) =>
      resolve({
        completed: !!r[ONBOARDING_DONE_KEY] || localStorage.getItem(LOCAL_ONBOARDING_DONE_KEY) === "true",
        hasKey: !!r.operon_extension_key,
      })
    )
  );
}

function setOnboardingCompleted(completed = true) {
  localStorage.setItem(LOCAL_ONBOARDING_DONE_KEY, completed ? "true" : "false");
  return new Promise((resolve) =>
    chrome.storage.local.set({ [ONBOARDING_DONE_KEY]: completed }, resolve)
  );
}

function openTab(url) {
  chrome.tabs.create({ url });
}

function appBaseFromSettings(settings) {
  return (settings.apiBase || DEFAULT_API_BASE).replace(/\/api\/?$/, "");
}

async function getConnectionStatus() {
  const settings = await getSettings();
  if (!settings.extensionKey) throw new Error("Paste extension key first");

  const res = await fetch(`${settings.apiBase}/integrations/extension/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extensionKey: settings.extensionKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Connection check failed");
  chrome.storage.local.set({ operon_connection_status: data });
  return data;
}

function renderConnectionStatus(status) {
  if (!status) {
    hide("connected-account");
    return;
  }

  $("connected-account-name").textContent = status.accountName || `${status.provider || "Operon"} extension`;
  $("connected-account-email").textContent = status.userEmail ? `Operon: ${status.userEmail}` : "";
  $("connected-provider").textContent = status.provider || "EXT";
  show("connected-account");

  if (typeof status.autopilotEnabled === "boolean") {
    $("autopilot-switch").checked = status.autopilotEnabled;
    $("autopilot-dot").className = `status-dot ${status.autopilotEnabled ? "on" : "off"}`;
    setAutopilot(status.autopilotEnabled);
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function slug(value, fallback = "creative") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || fallback;
}

async function syncMetrics(provider, rows, accountName = "") {
  const settings = await getSettings();
  if (!settings.extensionKey) throw new Error("Paste extension key first");

  const metrics = rows.map((row, index) => {
    const purchases = Number(row.purchases || 0);
    const revenue = Number(row.revenue || 0);
    const name = row.name || row.entityName || `Creative ${index + 1}`;

    return {
      externalEntityId: row.externalEntityId || row.id || `${provider.toLowerCase()}-${slug(name)}-${index}`,
      entityName: name,
      date: todayIsoDate(),
      spend: Number(row.spend || 0),
      total_spend: Number(row.total_spend || row.totalSpend || row.spend || 0),
      days_active: Number(row.days_active || row.daysActive || 1),
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      add_to_cart: Number(row.add_to_cart || row.addToCart || 0),
      purchases,
      revenue,
      return_rate: Number(row.return_rate || row.returnRate || 0),
      net_revenue: Number(row.net_revenue || row.netRevenue || 0) || undefined,
      frequency: Number(row.frequency || 0),
      product_price: Number(row.product_price || (purchases ? revenue / purchases : 0)),
      cost: Number(row.cost || 0),
      source: { ...row, provider, capturedBy: "operon-popup", capturedAt: new Date().toISOString() },
    };
  });

  const res = await fetch(`${settings.apiBase}/integrations/extension/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      extensionKey: settings.extensionKey,
      accountName: accountName || settings.accountName || `${provider} browser sync`,
      externalAccountId: accountName || settings.accountName || provider.toLowerCase(),
      metrics,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Sync failed");
  chrome.storage.local.set({ last_sync: new Date().toISOString(), last_sync_result: data });
  return data;
}

function decisionClass(d) {
  if (d === "SCALE") return "badge-scale";
  if (d === "KILL") return "badge-kill";
  return "badge-wait";
}

// ── init ─────────────────────────────────────────────────────────────────────
async function init() {
  showScreen("loading");
  const settings = await getSettings();
  $("token-input").value = settings.extensionKey;
  if ($("api-base-input")) $("api-base-input").value = settings.apiBase;
  if ($("account-name-input")) $("account-name-input").value = settings.accountName;

  if (!settings.extensionKey) {
    showScreen("auth");
    await maybeShowOnboarding(settings);
    return;
  }

  showScreen("main");
  await onMainLoaded();
  await maybeShowOnboarding(settings);
}

async function maybeShowOnboarding(settings = null) {
  const state = await getOnboardingState();
  if (state.completed || state.hasKey) return;
  const currentSettings = settings || await getSettings();
  $("onboarding-extension-key").value = currentSettings.extensionKey || "";
  showOnboardingStep(0);
  show("onboarding-modal");
}

function showOnboardingStep(step) {
  onboardingStep = Math.max(0, Math.min(3, step));
  [0, 1, 2, 3].forEach((index) => {
    const stepEl = $(`onboarding-step-${index}`);
    if (stepEl) stepEl.classList.toggle("hidden", index !== onboardingStep);
    const dot = document.querySelector(`[data-onboarding-dot="${index}"]`);
    if (dot) dot.classList.toggle("active", index <= onboardingStep);
  });
}

async function closeOnboarding({ completed = false } = {}) {
  hide("onboarding-modal");
  if (completed) await setOnboardingCompleted(true);
}

async function saveOnboardingKey() {
  const extensionKey = $("onboarding-extension-key").value.trim();
  if (!extensionKey) {
    $("onboarding-key-error").textContent = "Paste your extension key first.";
    show("onboarding-key-error");
    return false;
  }

  hide("onboarding-key-error");
  const settings = await getSettings();
  await setSettings({
    extensionKey,
    apiBase: settings.apiBase || DEFAULT_API_BASE,
    accountName: settings.accountName || "",
  });
  $("token-input").value = extensionKey;
  showScreen("main");
  await onMainLoaded();
  return true;
}

// ── auth screen ───────────────────────────────────────────────────────────────
$("btn-save-token").addEventListener("click", async () => {
  const extensionKey = $("token-input").value.trim();
  if (!extensionKey) return;
  hide("auth-error");
  $("btn-save-token").disabled = true;
  try {
    await setSettings({
      extensionKey,
      apiBase: $("api-base-input")?.value.trim() || DEFAULT_API_BASE,
      accountName: $("account-name-input")?.value.trim() || "",
    });
    showScreen("main");
    await onMainLoaded();
  } catch (err) {
    $("auth-error").textContent = err.message;
    show("auth-error");
  } finally {
    $("btn-save-token").disabled = false;
  }
});

// ── first-run onboarding wizard ──────────────────────────────────────────────
$("btn-onboarding-skip-all").addEventListener("click", () => closeOnboarding({ completed: true }));

document.querySelectorAll(".onboarding-next").forEach((button) => {
  button.addEventListener("click", () => {
    showOnboardingStep(Number(button.dataset.nextStep || onboardingStep + 1));
  });
});

$("btn-onboarding-dashboard").addEventListener("click", async () => {
  const settings = await getSettings();
  openTab(`${appBaseFromSettings(settings)}/login`);
});

$("btn-onboarding-copy").addEventListener("click", async () => {
  const key = $("onboarding-extension-key").value.trim() || $("token-input").value.trim();
  if (!key) {
    $("onboarding-key-error").textContent = "Paste your extension key first.";
    show("onboarding-key-error");
    return;
  }
  hide("onboarding-key-error");
  try {
    await navigator.clipboard.writeText(key);
    $("onboarding-copy-label").textContent = "Copied ✓";
    setTimeout(() => {
      $("onboarding-copy-label").textContent = "Copy";
    }, 1400);
  } catch {
    $("onboarding-key-error").textContent = "Clipboard blocked. Select the key and copy it manually.";
    show("onboarding-key-error");
  }
});

$("btn-onboarding-save-key").addEventListener("click", async () => {
  const saved = await saveOnboardingKey();
  if (saved) showOnboardingStep(2);
});

$("btn-onboarding-meta").addEventListener("click", () => {
  openTab("https://www.facebook.com/ads/manager");
  showOnboardingStep(3);
});

$("btn-onboarding-done").addEventListener("click", () => closeOnboarding({ completed: true }));

// ── logout ────────────────────────────────────────────────────────────────────
$("btn-logout").addEventListener("click", async () => {
  await setSettings({ extensionKey: "", apiBase: DEFAULT_API_BASE, accountName: "" });
  await new Promise((resolve) => chrome.storage.local.remove(["operon_connection_status", "autopilot_enabled"], resolve));
  renderConnectionStatus(null);
  showScreen("auth");
});

// ── tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    $(`tab-${tab}`).classList.remove("hidden");
  });
});

// ── main loaded ───────────────────────────────────────────────────────────────
async function onMainLoaded() {
  const autopilotOn = await getAutopilot();
  $("autopilot-switch").checked = autopilotOn;
  $("autopilot-dot").className = `status-dot ${autopilotOn ? "on" : "off"}`;

  try {
    renderConnectionStatus(await getConnectionStatus());
  } catch (error) {
    $("connected-account-name").textContent = "Connection check failed";
    $("connected-account-email").textContent = error.message;
    $("connected-provider").textContent = "ERR";
    show("connected-account");
  }

  chrome.storage.local.get("last_sync", (r) => {
    $("last-sync-time").textContent = r.last_sync
      ? new Date(r.last_sync).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })
      : "Never";
  });

  chrome.storage.local.get("last_result", (r) => {
    if (r.last_result) showLastResult(r.last_result);
  });

  tryScrapeActiveTab();
}

// ── show last result banner ───────────────────────────────────────────────────
function showLastResult(result) {
  const decision = result.decision?.finalDecision ?? "—";
  $("result-decision-badge").textContent = decision;
  $("result-decision-badge").style.color =
    decision === "SCALE" ? "#10b981" : decision === "KILL" ? "#ef4444" : "#6b7280";
  $("result-product").textContent = result.productName ?? "";
  $("result-reason").textContent = result.shortReason ?? "";
  show("last-result");
}

// ── single analysis form ──────────────────────────────────────────────────────
$("btn-analyze").addEventListener("click", async () => {
  hide("analyze-error");
  hide("result-block");

  const form = {
    product_name:        $("f-product").value || "Untitled",
    product_price:       parseFloat($("f-price").value) || 0,
    cost:                parseFloat($("f-cost").value) || 0,
    impressions:         parseInt($("f-impressions").value) || 0,
    clicks:              parseInt($("f-clicks").value) || 0,
    cpc:                 parseFloat($("f-cpc").value) || 0,
    add_to_cart:         parseInt($("f-atc").value) || 0,
    purchases:           parseInt($("f-purchases").value) || 0,
    revenue:             parseFloat($("f-revenue").value) || 0,
    ctr:                 parseFloat($("f-ctr").value) || 0,
    cpm:                 0,
    stage:               "testing",
    product_description: "",
  };

  $("btn-analyze").disabled = true;
  $("btn-analyze").textContent = "Analyzing…";

  try {
    const provider = activeProvider || "META";
    const data = await syncMetrics(provider, [{ ...form, name: form.product_name }], activeAccountName);
    showSyncResult(data, form.product_name);
  } catch (err) {
    $("analyze-error").textContent = err.message;
    show("analyze-error");
  } finally {
    $("btn-analyze").disabled = false;
    $("btn-analyze").innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg> Sync to Operon`;
  }
});

function showSyncResult(result, productName) {
  const count = result.count ?? 1;
  $("res-decision").textContent = "SYNCED";
  $("res-decision").className = "badge badge-scale";
  $("res-confidence").textContent = `${count} metric snapshot${count === 1 ? "" : "s"}`;
  $("res-reason").textContent = `${productName} is now available in the Operon dashboard.`;
  $("d-roas").textContent = "-";
  $("d-spend").textContent = "-";
  $("d-be-roas").textContent = "-";
  $("d-margin").textContent = "-";
  $("res-actions").innerHTML = "";
  show("result-block");
}

function showAnalysisResult(result, productName) {
  const decision = result.decision?.finalDecision ?? "—";
  const res = $("res-decision");
  res.textContent = decision;
  res.className = `badge ${decisionClass(decision)}`;

  $("res-confidence").textContent = `Confidence: ${result.decision?.confidence ?? "—"}`;
  $("res-reason").textContent = result.decision?.shortReason ?? "";

  $("d-roas").textContent    = `${result.derived?.roas ?? "—"}x`;
  $("d-spend").textContent   = `$${result.derived?.spend ?? "—"}`;
  $("d-be-roas").textContent = `${result.derived?.breakEvenRoas ?? "—"}x`;
  $("d-margin").textContent  = `${result.derived?.netProfitMargin ?? "—"}%`;

  const actionsEl = $("res-actions");
  actionsEl.innerHTML = "";
  (result.actionPlan ?? []).slice(0, 3).forEach((action) => {
    const li = document.createElement("li");
    li.textContent = action;
    actionsEl.appendChild(li);
  });

  show("result-block");
}

// ── scrape active tab (single, fills analyze form) ────────────────────────────
async function tryScrapeActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_METRICS" })
      .catch(() => null);

    if (!response?.metrics) return;

    const m = response.metrics;
    activeProvider = response.provider || null;
    activeAccountName = response.accountName || "";
    if (m.impressions) $("f-impressions").value = m.impressions;
    if (m.clicks)      $("f-clicks").value      = m.clicks;
    if (m.cpc)         $("f-cpc").value          = m.cpc;
    if (m.ctr)         $("f-ctr").value          = m.ctr;
    if (m.purchases)   $("f-purchases").value    = m.purchases;
    if (m.revenue)     $("f-revenue").value      = m.revenue;
    if (m.name)        $("f-product").value      = m.name;

    $("scrape-hint").lastChild.textContent = " Fields auto-filled from the current page";
    show("scrape-hint");
  } catch {
    // not on a supported ads page
  }
}

// ── campaigns tab — bulk scrape ───────────────────────────────────────────────
let scrapedCampaigns = [];
let campaignResults  = {};

$("btn-scan-page").addEventListener("click", scanCurrentPage);

async function scanCurrentPage() {
  const btn = $("btn-scan-page");
  btn.disabled = true;
  btn.textContent = "Scanning…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_ALL" })
      .catch(() => null);

    scrapedCampaigns = response?.campaigns ?? [];
    activeProvider = response?.provider || activeProvider;
    activeAccountName = response?.accountName || activeAccountName;
    campaignResults  = {};
    renderCampaignList();
  } catch {
    // stay on empty state
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg> Scan current page`;
  }
}

function badgeClassFor(decision) {
  if (decision === "SCALE") return "scale";
  if (decision === "KILL")  return "kill";
  if (decision === "FIX")   return "fix";
  return "test";
}

function renderCampaignList() {
  if (scrapedCampaigns.length === 0) {
    show("campaigns-empty-state");
    hide("campaigns-found-state");
    return;
  }

  hide("campaigns-empty-state");
  show("campaigns-found-state");
  $("campaigns-count").textContent = `${scrapedCampaigns.length} campaign${scrapedCampaigns.length !== 1 ? "s" : ""} found`;

  const listEl = $("campaigns-list");
  listEl.innerHTML = "";

  scrapedCampaigns.forEach((c, i) => {
    const result = campaignResults[i];
    const decision = result?.decision?.finalDecision;

    const item = document.createElement("div");
    item.className = "campaign-item";

    const metaParts = [];
    if (c.impressions) metaParts.push(`${Number(c.impressions).toLocaleString()} imp`);
    if (c.spend) metaParts.push(`$${c.spend} spent`);
    else if (c.clicks) metaParts.push(`${c.clicks} clicks`);

    item.innerHTML = `
      <div style="min-width:0; flex:1">
        <div class="campaign-item-name">${c.name || `Campaign ${i + 1}`}</div>
        <div class="campaign-item-meta">${metaParts.join(" · ")}</div>
      </div>
      ${decision ? `<span class="campaign-item-badge ${badgeClassFor(decision)}">${decision}</span>` : ""}
    `;
    listEl.appendChild(item);
  });
}

$("btn-analyze-all").addEventListener("click", analyzeAll);

async function analyzeAll() {
  if (scrapedCampaigns.length === 0) return;

  const btn = $("btn-analyze-all");
  btn.disabled = true;
  hide("campaigns-error");
  show("bulk-progress");
  show("bulk-progress-bar");

  let completed = 0;

  for (let i = 0; i < scrapedCampaigns.length; i++) {
    const campaign = scrapedCampaigns[i];
    $("bulk-progress").textContent = `Syncing ${i + 1} / ${scrapedCampaigns.length}…`;
    $("bulk-progress-fill").style.width = `${Math.round((i / scrapedCampaigns.length) * 100)}%`;

    try {
      await syncMetrics(activeProvider || "META", [campaign], activeAccountName);
      campaignResults[i] = { decision: { finalDecision: "SYNCED" } };
    } catch {
      // continue on individual failure
    }

    completed++;
    renderCampaignList();
  }

  $("bulk-progress-fill").style.width = "100%";
  $("bulk-progress").textContent = `Done — ${completed} synced`;

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg> Sync all again`;
}

// ── autopilot toggle ──────────────────────────────────────────────────────────
$("autopilot-switch").addEventListener("change", async (e) => {
  const enabled = e.target.checked;
  await setAutopilot(enabled);
  $("autopilot-dot").className = `status-dot ${enabled ? "on" : "off"}`;
  chrome.runtime.sendMessage({ type: "AUTOPILOT_TOGGLE", enabled }, (response) => {
    if (response?.ok && response.result) {
      renderConnectionStatus(response.result);
      return;
    }
    if (!response?.ok) {
      const reverted = !enabled;
      setAutopilot(reverted);
      $("autopilot-switch").checked = reverted;
      $("autopilot-dot").className = `status-dot ${reverted ? "on" : "off"}`;
    }
  });
});

// ── sync now ─────────────────────────────────────────────────────────────────
$("btn-sync-now").addEventListener("click", async () => {
  $("btn-sync-now").disabled = true;
  $("btn-sync-now").textContent = "Syncing…";
  try {
    await new Promise((resolve, reject) =>
      chrome.runtime.sendMessage({ type: "MANUAL_SYNC" }, (r) =>
        r?.ok ? resolve() : reject()
      )
    );
    const now = new Date().toISOString();
    chrome.storage.local.set({ last_sync: now });
    $("last-sync-time").textContent = new Date(now).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    // silent
  } finally {
    $("btn-sync-now").disabled = false;
    $("btn-sync-now").textContent = "Sync now";
  }
});

// ── boot ─────────────────────────────────────────────────────────────────────
init();
