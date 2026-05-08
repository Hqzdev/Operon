import crypto from "crypto";
import { prisma } from "../models/prisma";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";

type AgencyRoleValue = "owner" | "member" | "view_only";

type WorkspaceRow = {
  id: string;
  ownerId: string;
  name: string;
  logoUrl: string | null;
};

type ClientRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  storeUrl: string | null;
  userId: string | null;
  createdAt: Date;
};

type ReportRow = {
  id: string;
  clientId: string;
  weekStart: Date;
  generatedAt: Date;
  filename: string;
};

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

async function userWorkspace(userId: string): Promise<WorkspaceRow | null> {
  const rows = await prisma.$queryRaw<WorkspaceRow[]>`
    SELECT w."id", w."ownerId", w."name", w."logoUrl"
    FROM "AgencyWorkspace" w
    JOIN "AgencyMember" m ON m."workspaceId" = w."id"
    WHERE m."userId" = ${userId}
      AND m."acceptedAt" IS NOT NULL
    ORDER BY w."createdAt" ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function ensureAgencyWorkspace(userId: string) {
  const existing = await userWorkspace(userId);
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, storeName: true },
  });
  const workspaceId = cuid("agw");
  const now = new Date();
  const name = user?.storeName ?? (user?.name ? `${user.name}'s agency` : "Operon Agency");
  await prisma.$executeRaw`
    INSERT INTO "AgencyWorkspace" ("id", "ownerId", "name", "createdAt", "updatedAt")
    VALUES (${workspaceId}, ${userId}, ${name}, ${now}, ${now})
  `;
  await prisma.$executeRaw`
    INSERT INTO "AgencyMember" ("id", "workspaceId", "userId", "role", "acceptedAt", "createdAt", "updatedAt")
    VALUES (${cuid("agm")}, ${workspaceId}, ${userId}, 'owner'::"AgencyRole", ${now}, ${now}, ${now})
  `;
  return (await userWorkspace(userId))!;
}

async function requireAgencyRole(userId: string, workspaceId: string, allowed: AgencyRoleValue[]) {
  const rows = await prisma.$queryRaw<Array<{ role: AgencyRoleValue }>>`
    SELECT "role"::text AS "role"
    FROM "AgencyMember"
    WHERE "workspaceId" = ${workspaceId}
      AND "userId" = ${userId}
      AND "acceptedAt" IS NOT NULL
    LIMIT 1
  `;
  const role = rows[0]?.role;
  if (!role || !allowed.includes(role)) throw new Error("Agency workspace access denied");
  return role;
}

export async function createAgencyClient(userId: string, input: { name: string; contactEmail?: string; storeUrl?: string }) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner", "member"]);
  const now = new Date();
  const clientId = cuid("agc");
  await prisma.$executeRaw`
    INSERT INTO "AgencyClient" ("id", "workspaceId", "name", "contactEmail", "storeUrl", "createdAt", "updatedAt")
    VALUES (${clientId}, ${workspace.id}, ${input.name}, ${input.contactEmail ?? null}, ${input.storeUrl ?? null}, ${now}, ${now})
  `;
  return { id: clientId, workspaceId: workspace.id, ...input };
}

export async function updateAgencyWorkspace(
  userId: string,
  input: { name?: string; logoUrl?: string | null },
) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner"]);
  await prisma.$executeRaw`
    UPDATE "AgencyWorkspace"
    SET
      "name" = COALESCE(${input.name ?? null}, "name"),
      "logoUrl" = ${input.logoUrl ?? workspace.logoUrl},
      "updatedAt" = ${new Date()}
    WHERE "id" = ${workspace.id}
  `;
  return ensureAgencyWorkspace(userId);
}

export async function inviteClientViewer(userId: string, clientId: string, email: string) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner", "member"]);
  const client = await prisma.$queryRaw<ClientRow[]>`
    SELECT * FROM "AgencyClient" WHERE "id" = ${clientId} AND "workspaceId" = ${workspace.id} LIMIT 1
  `;
  if (!client[0]) throw new Error("Client not found");
  const token = crypto.randomBytes(24).toString("hex");
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "AgencyMember" ("id", "workspaceId", "clientId", "role", "invitedEmail", "inviteToken", "inviteExpiresAt", "createdAt", "updatedAt")
    VALUES (${cuid("agm")}, ${workspace.id}, ${clientId}, 'view_only'::"AgencyRole", ${email}, ${token}, ${addDays(now, 14)}, ${now}, ${now})
  `;
  return { inviteUrl: `/agency/invite/${token}`, token };
}

export async function acceptAgencyInvitation(input: { token: string; email: string; password: string; name?: string }) {
  const rows = await prisma.$queryRaw<Array<{ id: string; workspaceId: string; invitedEmail: string | null; clientId: string | null }>>`
    SELECT "id", "workspaceId", "invitedEmail", "clientId"
    FROM "AgencyMember"
    WHERE "inviteToken" = ${input.token}
      AND "acceptedAt" IS NULL
      AND "inviteExpiresAt" > ${new Date()}
    LIMIT 1
  `;
  const invite = rows[0];
  if (!invite) throw new Error("Invitation is invalid or expired");
  if (invite.invitedEmail && invite.invitedEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("Invitation email does not match");
  }

  let user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user) {
    const valid = await comparePassword(input.password, user.password);
    if (!valid) throw new Error("Password is incorrect for this email");
  } else {
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: await hashPassword(input.password),
      },
    });
  }

  await prisma.$executeRaw`
    UPDATE "AgencyMember"
    SET "userId" = ${user.id}, "acceptedAt" = ${new Date()}, "inviteToken" = NULL, "updatedAt" = ${new Date()}
    WHERE "id" = ${invite.id}
  `;
  if (invite.clientId) {
    await prisma.$executeRaw`
      UPDATE "AgencyClient" SET "userId" = ${user.id}, "updatedAt" = ${new Date()} WHERE "id" = ${invite.clientId}
    `;
  }

  return { token: signToken({ userId: user.id, email: user.email }), user };
}

export async function getAgencyOverview(userId: string) {
  const workspace = await ensureAgencyWorkspace(userId);
  const role = await requireAgencyRole(userId, workspace.id, ["owner", "member", "view_only"]);
  const clientFilter = role === "view_only"
    ? await prisma.$queryRaw<Array<{ clientId: string }>>`
        SELECT "clientId" FROM "AgencyMember" WHERE "workspaceId" = ${workspace.id} AND "userId" = ${userId} LIMIT 1
      `
    : [];
  const viewOnlyClientId = clientFilter[0]?.clientId ?? null;
  const clients = await prisma.$queryRaw<ClientRow[]>`
    SELECT "id", "name", "contactEmail", "storeUrl", "userId", "createdAt"
    FROM "AgencyClient"
    WHERE "workspaceId" = ${workspace.id}
      AND (${viewOnlyClientId}::text IS NULL OR "id" = ${viewOnlyClientId})
    ORDER BY "createdAt" DESC
  `;
  const reports = await prisma.$queryRaw<ReportRow[]>`
    SELECT "id", "clientId", "weekStart", "generatedAt", "filename"
    FROM "AgencyClientReport"
    WHERE "workspaceId" = ${workspace.id}
    ORDER BY "generatedAt" DESC
    LIMIT 20
  `;
  const week = addDays(new Date(), -7);
  const kills = await prisma.analysis.findMany({
    where: { userId: workspace.ownerId, createdAt: { gte: week } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
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
  const workspaces = await prisma.$queryRaw<WorkspaceRow[]>`SELECT "id", "ownerId", "name", "logoUrl" FROM "AgencyWorkspace"`;
  let generated = 0;
  const currentWeek = weekStart();
  for (const workspace of workspaces) {
    const clients = await prisma.$queryRaw<ClientRow[]>`
      SELECT "id", "name", "contactEmail", "storeUrl", "userId", "createdAt"
      FROM "AgencyClient"
      WHERE "workspaceId" = ${workspace.id}
    `;
    for (const client of clients) {
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "AgencyClientReport" WHERE "clientId" = ${client.id} AND "weekStart" = ${currentWeek} LIMIT 1
      `;
      if (existing[0]) continue;
      const since = addDays(currentWeek, -7);
      const analyses = await prisma.analysis.findMany({
        where: { userId: workspace.ownerId, createdAt: { gte: since, lt: currentWeek } },
        orderBy: { createdAt: "desc" },
        take: 25,
      });
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
      await prisma.$executeRaw`
        INSERT INTO "AgencyClientReport" ("id", "workspaceId", "clientId", "weekStart", "summary", "pdfBase64", "filename")
        VALUES (${cuid("agr")}, ${workspace.id}, ${client.id}, ${currentWeek}, ${JSON.stringify(summary)}::jsonb, ${pdf.toString("base64")}, ${`${client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-operon-weekly.pdf`})
      `;
      generated += 1;
    }
  }
  return { generated };
}

export async function getAgencyReportPdf(userId: string, reportId: string) {
  const workspace = await ensureAgencyWorkspace(userId);
  await requireAgencyRole(userId, workspace.id, ["owner", "member", "view_only"]);
  const rows = await prisma.$queryRaw<Array<{ pdfBase64: string; filename: string }>>`
    SELECT "pdfBase64", "filename" FROM "AgencyClientReport"
    WHERE "id" = ${reportId} AND "workspaceId" = ${workspace.id}
    LIMIT 1
  `;
  if (!rows[0]) throw new Error("Report not found");
  return { filename: rows[0].filename, buffer: Buffer.from(rows[0].pdfBase64, "base64") };
}
