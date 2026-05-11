import crypto from "crypto";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { UserRepository } from "../repositories/userRepository";
import { AnalysisRepository } from "../repositories/analysisRepository";
import { AgencyRepository } from "../repositories/agencyRepository";

type AgencyRoleValue = "owner" | "member" | "view_only";

function cuid(prefix: string) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function weekStart(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 770 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "" : "0 -24 Td",
      `(${escapePdf(line).slice(0, 100)}) Tj`,
    ]).filter(Boolean),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

async function requireAgencyRole(userId: string, workspaceId: string, allowed: AgencyRoleValue[]) {
  const role = await AgencyRepository.getMemberRole(userId, workspaceId) as AgencyRoleValue | null;
  if (!role || !allowed.includes(role)) throw new Error("Agency workspace access denied");
  return role;
}

export async function ensureAgencyWorkspace(userId: string) {
  const existing = await AgencyRepository.findWorkspaceByUser(userId);
  if (existing) return existing;

  const user = await UserRepository.findById(userId);
  const workspaceId = cuid("agw");
  const now = new Date();
  const name = user?.storeName ?? (user?.name ? `${user.name}'s agency` : "Operon Agency");
  await AgencyRepository.createWorkspace(workspaceId, userId, name, now);
  await AgencyRepository.createMember(cuid("agm"), workspaceId, userId, "owner", now);
  return (await AgencyRepository.findWorkspaceByUser(userId))!;
}

export async function createAgencyClient(userId: string, input: { name: string; contactEmail?: string; storeUrl?: string }) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner", "member"]);
  const now = new Date();
  const clientId = cuid("agc");
  await AgencyRepository.createClient(clientId, workspace.id, input.name, input.contactEmail ?? null, input.storeUrl ?? null, now);
  return { id: clientId, workspaceId: workspace.id, ...input };
}

export async function updateAgencyWorkspace(
  userId: string,
  input: { name?: string; logoUrl?: string | null },
) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner"]);
  await AgencyRepository.updateWorkspace(workspace.id, input.name ?? null, input.logoUrl ?? workspace.logoUrl);
  return ensureAgencyWorkspace(userId);
}

export async function inviteClientViewer(userId: string, clientId: string, email: string) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner", "member"]);
  const client = await AgencyRepository.findClientById(clientId, workspace.id);
  if (!client) throw new Error("Client not found");
  const token = crypto.randomBytes(24).toString("hex");
  const now = new Date();
  await AgencyRepository.createClientInvite(cuid("agm"), workspace.id, clientId, email, token, addDays(now, 14), now);
  return { inviteUrl: `/agency/invite/${token}`, token };
}

export async function acceptAgencyInvitation(input: { token: string; email: string; password: string; name?: string }) {
  const invite = await AgencyRepository.findPendingInvite(input.token);
  if (!invite) throw new Error("Invitation is invalid or expired");
  if (invite.invitedEmail && invite.invitedEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("Invitation email does not match");
  }

  let user = await UserRepository.findByEmail(input.email);
  if (user) {
    const valid = await comparePassword(input.password, user.password);
    if (!valid) throw new Error("Password is incorrect for this email");
  } else {
    user = await UserRepository.create({
      email: input.email,
      name: input.name,
      password: await hashPassword(input.password),
    } as never);
  }

  await AgencyRepository.acceptInvite(invite.id, user.id);
  if (invite.clientId) {
    await AgencyRepository.setClientUserId(invite.clientId, user.id);
  }

  return { token: signToken({ userId: user.id, email: user.email }), user };
}

export async function getAgencyOverview(userId: string) {
  const workspace = await ensureAgencyWorkspace(userId);
  const role = await requireAgencyRole(userId, workspace.id, ["owner", "member", "view_only"]);
  const viewOnlyClientId = role === "view_only"
    ? await AgencyRepository.getViewOnlyClientId(workspace.id, userId)
    : null;
  const clients = await AgencyRepository.findClientsByWorkspace(workspace.id, viewOnlyClientId);
  const reports = await AgencyRepository.findReportsByWorkspace(workspace.id, 20);
  const week = addDays(new Date(), -7);
  const kills = await AnalysisRepository.findByUserSince(workspace.ownerId, week, 50);
  const killItems = kills
    .filter((analysis) => (analysis.result as { decision?: { finalDecision?: string } })?.decision?.finalDecision === "KILL")
    .map((analysis) => ({
      id: analysis.id,
      createdAt: analysis.createdAt,
      clientName: clients.find((client) =>
        JSON.stringify(analysis.inputData).toLowerCase().includes(client.name.toLowerCase()),
      )?.name ?? "Unassigned",
      reason: (analysis.result as { decision?: { shortReason?: string } })?.decision?.shortReason ?? "KILL verdict",
    }));

  return {
    workspace,
    role,
    clients,
    clientCount: clients.length,
    killsThisWeek: killItems.length,
    killItems: killItems.slice(0, 10),
    reports,
    pricingAnchor: "Agency tier should anchor at 5-15x prosumer pricing with per-seat billing.",
  };
}

export async function generateWeeklyAgencyReports() {
  const workspaces = await AgencyRepository.findAllWorkspaces();
  let generated = 0;
  const currentWeek = weekStart();
  for (const workspace of workspaces) {
    const clients = await AgencyRepository.findClientsByWorkspace(workspace.id);
    for (const client of clients) {
      const exists = await AgencyRepository.findReportExists(client.id, currentWeek);
      if (exists) continue;
      const since = addDays(currentWeek, -7);
      const analyses = await AnalysisRepository.findByUserBetween(workspace.ownerId, since, currentWeek, 25);
      const matching = analyses.filter((analysis) =>
        JSON.stringify(analysis.inputData).toLowerCase().includes(client.name.toLowerCase()),
      );
      const verdicts = matching.map((analysis) => (analysis.result as { decision?: { finalDecision?: string } })?.decision?.finalDecision ?? "WATCH");
      const kills = verdicts.filter((verdict) => verdict === "KILL").length;
      const scales = verdicts.filter((verdict) => verdict === "SCALE").length;
      const summary = {
        clientName: client.name,
        agencyName: workspace.name,
        verdicts: matching.length,
        kills,
        scales,
        weekStart: currentWeek.toISOString(),
      };
      const pdf = buildPdf([
        workspace.name,
        workspace.logoUrl ? `Agency logo: ${workspace.logoUrl}` : "Agency logo: not set",
        `Weekly Operon report: ${client.name}`,
        `Week of ${currentWeek.toISOString().slice(0, 10)}`,
        `Verdicts reviewed: ${matching.length}`,
        `KILL calls: ${kills}`,
        `SCALE calls: ${scales}`,
        "Generated automatically by Operon.",
      ]);
      await AgencyRepository.createReport(
        cuid("agr"),
        workspace.id,
        client.id,
        currentWeek,
        summary,
        pdf.toString("base64"),
        `${client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-operon-weekly.pdf`,
      );
      generated += 1;
    }
  }
  return { generated };
}

export async function getAgencyReportPdf(userId: string, reportId: string) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner", "member", "view_only"]);
  const row = await AgencyRepository.findReportPdf(reportId, workspace.id);
  if (!row) throw new Error("Report not found");
  return { filename: row.filename, buffer: Buffer.from(row.pdfBase64, "base64") };
}
