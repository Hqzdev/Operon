const API = "https://operons.vercel.app/api";

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

function getToken() {
  return new Promise((resolve) =>
    chrome.storage.local.get("operon_token", (r) => resolve(r.operon_token ?? null))
  );
}

function setToken(token) {
  return new Promise((resolve) =>
    chrome.storage.local.set({ operon_token: token }, resolve)
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

function apiFetch(path, options = {}) {
  return getToken().then((token) => {
    if (!token) throw new Error("no_token");
    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
  });
}

function decisionClass(d) {
  if (d === "SCALE") return "badge-scale";
  if (d === "KILL") return "badge-kill";
  return "badge-wait";
}

// ── init ─────────────────────────────────────────────────────────────────────
async function init() {
  showScreen("loading");
  const token = await getToken();
  if (!token) { showScreen("auth"); return; }

  try {
    const res = await apiFetch("/users/me");
    if (res.status === 401) { await setToken(null); showScreen("auth"); return; }
    showScreen("main");
    await onMainLoaded();
  } catch {
    showScreen("auth");
  }
}

// ── auth screen ───────────────────────────────────────────────────────────────
$("btn-save-token").addEventListener("click", async () => {
  const token = $("token-input").value.trim();
  if (!token) return;
  hide("auth-error");
  $("btn-save-token").disabled = true;
  try {
    const res = await fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Invalid token");
    await setToken(token);
    showScreen("main");
    await onMainLoaded();
  } catch (err) {
    $("auth-error").textContent = err.message;
    show("auth-error");
  } finally {
    $("btn-save-token").disabled = false;
  }
});

// ── logout ────────────────────────────────────────────────────────────────────
$("btn-logout").addEventListener("click", async () => {
  await setToken(null);
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
    const res = await apiFetch("/analysis", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Analysis failed");

    const result = data.result ?? data;
    showAnalysisResult(result, form.product_name);

    chrome.storage.local.set({
      last_result: {
        decision: result.decision,
        productName: form.product_name,
        shortReason: result.decision?.shortReason ?? "",
      },
    });
  } catch (err) {
    $("analyze-error").textContent = err.message;
    show("analyze-error");
  } finally {
    $("btn-analyze").disabled = false;
    $("btn-analyze").innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg> Run analysis`;
  }
});

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
    if (m.impressions) $("f-impressions").value = m.impressions;
    if (m.clicks)      $("f-clicks").value      = m.clicks;
    if (m.cpc)         $("f-cpc").value          = m.cpc;
    if (m.ctr)         $("f-ctr").value          = m.ctr;
    if (m.purchases)   $("f-purchases").value    = m.purchases;
    if (m.revenue)     $("f-revenue").value      = m.revenue;
    if (m.name)        $("f-product").value      = m.name;

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
    $("bulk-progress").textContent = `Analyzing ${i + 1} / ${scrapedCampaigns.length}…`;
    $("bulk-progress-fill").style.width = `${Math.round((i / scrapedCampaigns.length) * 100)}%`;

    try {
      const form = {
        product_name:        campaign.name || `Campaign ${i + 1}`,
        product_price:       0,
        cost:                0,
        impressions:         campaign.impressions || 0,
        clicks:              campaign.clicks || 0,
        cpc:                 campaign.cpc || 0,
        ctr:                 campaign.ctr || 0,
        purchases:           campaign.purchases || 0,
        revenue:             campaign.revenue || 0,
        add_to_cart:         0,
        cpm:                 0,
        stage:               "testing",
        product_description: "",
      };

      const res  = await apiFetch("/analysis", { method: "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        campaignResults[i] = data.result ?? data;
      }
    } catch {
      // continue on individual failure
    }

    completed++;
    renderCampaignList();
  }

  $("bulk-progress-fill").style.width = "100%";
  $("bulk-progress").textContent = `Done — ${completed} analyzed`;

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg> Re-analyze all`;
}

// ── autopilot toggle ──────────────────────────────────────────────────────────
$("autopilot-switch").addEventListener("change", async (e) => {
  const enabled = e.target.checked;
  await setAutopilot(enabled);
  $("autopilot-dot").className = `status-dot ${enabled ? "on" : "off"}`;
  chrome.runtime.sendMessage({ type: "AUTOPILOT_TOGGLE", enabled });
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
