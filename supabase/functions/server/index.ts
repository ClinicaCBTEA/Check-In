import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import {
  buildPasswordRecord,
  createSession,
  deleteSession,
  getSession,
  type AuthRole,
  type SessionRecord,
  verifyPassword,
} from "./security.ts";

const app = new Hono();
const FUNCTION_PREFIX = "/server";
const RESERVED_SLUGS = new Set(["login", "recepcao", "fila", "qrcode", "log", "admin", "assets"]);
const UNIT_SLUG_PREFIX = "unit-slug:";

type QueueStatus = "waiting" | "in-service" | "completed";

interface StoredCallHistory {
  calledTime: string;
  calledBy: string;
  returnedTime?: string;
}

interface StoredQueueEntry {
  id: string;
  patientName: string;
  phone: string;
  unitId: string;
  checkInTime: string;
  calledTime?: string;
  calledBy?: string;
  completedTime?: string;
  position: number;
  status: QueueStatus;
  callHistory: StoredCallHistory[];
  accessToken: string;
}

interface StoredReceptionist {
  id: string;
  name: string;
  username: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  unitIds: string[];
  createdAt: string;
}

interface StoredAdminCredentials {
  username: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
}

interface BootstrapAdminCredentials {
  username: string;
  password: string;
}

interface BootstrapReceptionist {
  id: string;
  name: string;
  username: string;
  password: string;
  unitIds: string[];
}

function getAllowedApiKeys(): string[] {
  const allowedKeys = new Set<string>();
  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");

  if (publishableKeysRaw) {
    try {
      const publishableKeys = JSON.parse(publishableKeysRaw) as Record<string, string>;
      for (const value of Object.values(publishableKeys)) {
        if (value) {
          allowedKeys.add(value);
        }
      }
    } catch (error) {
      console.warn("Failed to parse SUPABASE_PUBLISHABLE_KEYS:", error);
    }
  }

  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacyAnonKey) {
    allowedKeys.add(legacyAnonKey);
  }

  const customPublicKey = Deno.env.get("PUBLIC_API_KEY");
  if (customPublicKey) {
    allowedKeys.add(customPublicKey);
  }

  return Array.from(allowedKeys);
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function patientToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function sanitizeQueueEntry(entry: StoredQueueEntry) {
  const { accessToken: _accessToken, ...safeEntry } = entry;
  return safeEntry;
}

function sanitizeReceptionist(receptionist: StoredReceptionist) {
  const {
    password: _password,
    passwordHash: _passwordHash,
    passwordSalt: _passwordSalt,
    ...safeReceptionist
  } = receptionist;

  return safeReceptionist;
}

function sanitizeAdminCredentials(credentials: StoredAdminCredentials) {
  return {
    username: credentials.username,
    passwordConfigured: Boolean(credentials.passwordHash || credentials.password),
  };
}

function getBootstrapAdminCredentials(): BootstrapAdminCredentials | null {
  const username = String(Deno.env.get("DEFAULT_ADMIN_USERNAME") || "").trim();
  const password = String(Deno.env.get("DEFAULT_ADMIN_PASSWORD") || "");

  if (!username && !password) {
    return null;
  }

  if (!username || password.length < 6) {
    console.warn(
      "Bootstrap admin credentials are incomplete. Set DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD with at least 6 characters.",
    );
    return null;
  }

  return { username, password };
}

function getBootstrapReceptionist(): BootstrapReceptionist | null {
  const username = String(Deno.env.get("DEFAULT_RECEPTION_USERNAME") || "").trim();
  const password = String(Deno.env.get("DEFAULT_RECEPTION_PASSWORD") || "");
  const name = String(Deno.env.get("DEFAULT_RECEPTION_NAME") || "Recepcao Principal").trim();

  if (!username && !password) {
    return null;
  }

  if (!username || password.length < 6) {
    console.warn(
      "Bootstrap receptionist credentials are incomplete. Set DEFAULT_RECEPTION_USERNAME and DEFAULT_RECEPTION_PASSWORD with at least 6 characters.",
    );
    return null;
  }

  return {
    id: "rec-bootstrap",
    name,
    username,
    password,
    unitIds: ["unidadebarra", "unidadesantoamaro", "unidadeinga"],
  };
}

function getPatientAccessToken(c: any): string {
  return String(
    c.req.header("x-patient-access-token") ||
      c.req.query("accessToken") ||
      "",
  ).trim();
}

function statusFromError(error: unknown, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("already a patient in service") ||
    message.includes("not waiting in queue") ||
    message.includes("cannot return to queue") ||
    message.includes("Only completed attendances")
  ) {
    return 409;
  }

  if (
    message.includes("required") ||
    message.includes("Invalid unitId") ||
    message.includes("Unknown unitId")
  ) {
    return 400;
  }

  return fallbackStatus;
}

function sortQueue(entries: StoredQueueEntry[]) {
  entries.sort(
    (left, right) =>
      new Date(left.checkInTime).getTime() - new Date(right.checkInTime).getTime(),
  );
}

function getUnitSlugKey(slug: string) {
  return `${UNIT_SLUG_PREFIX}${slug}`;
}

function getBearerToken(authorizationHeader?: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

async function getQueueEntries(): Promise<StoredQueueEntry[]> {
  const entries = (await kv.getByPrefix("queue:")) as StoredQueueEntry[];
  const normalized = entries.map((entry) => ({
    ...entry,
    unitId: entry.unitId || "unidadebarra",
    callHistory: Array.isArray(entry.callHistory) ? entry.callHistory : [],
    status: (entry.status || "waiting") as QueueStatus,
  }));
  sortQueue(normalized);
  return normalized;
}

async function getQueueEntry(id: string): Promise<StoredQueueEntry | null> {
  const entry = (await kv.get(`queue:${id}`)) as StoredQueueEntry | null;
  if (!entry) {
    return null;
  }

  return {
    ...entry,
    unitId: entry.unitId || "unidadebarra",
    callHistory: Array.isArray(entry.callHistory) ? entry.callHistory : [],
    status: (entry.status || "waiting") as QueueStatus,
  };
}

async function getUnits() {
  const units = await kv.getByPrefix("unit:");
  units.sort((left: any, right: any) => (left.name || "").localeCompare(right.name || ""));
  return units;
}

async function storeUnitRecord(
  unit: { id: string; slug: string; [key: string]: unknown },
  previousSlug?: string,
) {
  await kv.set(`unit:${unit.id}`, unit);
  await kv.set(getUnitSlugKey(unit.slug), unit.id);

  if (previousSlug && previousSlug !== unit.slug) {
    await kv.del(getUnitSlugKey(previousSlug));
  }
}

async function getUnitBySlugOrId(slugOrId: string) {
  const normalizedSlug = normalizeSlug(slugOrId);
  const unitId = await kv.get(getUnitSlugKey(normalizedSlug));

  if (typeof unitId === "string") {
    const unit = await kv.get(`unit:${unitId}`);
    if (unit) {
      return unit;
    }

    await kv.del(getUnitSlugKey(normalizedSlug));
  }

  const directUnit = await kv.get(`unit:${normalizedSlug}`);
  if (directUnit) {
    if (directUnit.slug) {
      await kv.set(getUnitSlugKey(directUnit.slug), directUnit.id);
    }
    return directUnit;
  }

  const units = await getUnits();
  const unit = units.find((record: any) => record.slug === normalizedSlug || record.id === slugOrId);

  if (unit?.slug && unit?.id) {
    await kv.set(getUnitSlugKey(unit.slug), unit.id);
  }

  return unit || null;
}

async function unitExists(unitId: string): Promise<boolean> {
  const unit = await kv.get(`unit:${unitId}`);
  return Boolean(unit);
}

async function validateUnitIds(unitIds: string[]) {
  if (unitIds.length === 0) {
    throw new Error("At least one unitId in unitIds is required");
  }

  const allUnits = await getUnits();
  const validUnitIds = new Set(allUnits.map((unit: any) => unit.id));
  for (const unitId of unitIds) {
    if (!validUnitIds.has(unitId)) {
      throw new Error(`Unknown unitId: ${unitId}`);
    }
  }
}

async function getStoredAdminCredentials(): Promise<StoredAdminCredentials | null> {
  return (await kv.get("admin:credentials")) as StoredAdminCredentials | null;
}

async function verifyStoredPassword(
  inputPassword: string,
  record: { password?: string; passwordHash?: string; passwordSalt?: string },
): Promise<boolean> {
  if (record.passwordHash && record.passwordSalt) {
    return verifyPassword(inputPassword, record.passwordHash, record.passwordSalt);
  }

  if (record.password) {
    return record.password === inputPassword;
  }

  return false;
}

async function migrateAdminPasswordIfNeeded(
  credentials: StoredAdminCredentials,
  plainPassword: string,
) {
  if (credentials.passwordHash && credentials.passwordSalt && !credentials.password) {
    return credentials;
  }

  const passwordRecord = await buildPasswordRecord(plainPassword);
  const migrated: StoredAdminCredentials = {
    username: credentials.username,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
  };

  await kv.set("admin:credentials", migrated);
  return migrated;
}

async function migrateReceptionistPasswordIfNeeded(
  receptionist: StoredReceptionist,
  plainPassword: string,
) {
  if (receptionist.passwordHash && receptionist.passwordSalt && !receptionist.password) {
    return receptionist;
  }

  const passwordRecord = await buildPasswordRecord(plainPassword);
  const migrated: StoredReceptionist = {
    ...receptionist,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
  };
  delete migrated.password;

  await kv.set(`receptionist:${receptionist.id}`, migrated);
  return migrated;
}

async function ensureAdminCredentialsOrDefault(): Promise<StoredAdminCredentials> {
  const existing = await getStoredAdminCredentials();
  if (existing) {
    return existing;
  }

  const bootstrapCredentials = getBootstrapAdminCredentials();
  if (!bootstrapCredentials) {
    throw new Error(
      "Admin credentials are not configured. Set DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD.",
    );
  }

  const passwordRecord = await buildPasswordRecord(bootstrapCredentials.password);
  const credentials: StoredAdminCredentials = {
    username: bootstrapCredentials.username,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
  };
  await kv.set("admin:credentials", credentials);
  return credentials;
}

function canAccessUnit(session: SessionRecord, unitId: string): boolean {
  if (session.role === "admin") {
    return true;
  }

  return Array.isArray(session.unitIds) && session.unitIds.includes(unitId);
}

async function requireSessionForRoles(c: any, roles: AuthRole[]) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const session = await getSession(token);
  if (!session || !roles.includes(session.role)) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  c.set("session", session);
  return null;
}

async function withRole(c: any, roles: AuthRole[], handler: (session: SessionRecord) => Promise<Response>) {
  const unauthorized = await requireSessionForRoles(c, roles);
  if (unauthorized) {
    return unauthorized;
  }

  const session = c.get("session") as SessionRecord;
  return handler(session);
}

async function getActivePatientForUnit(unitId: string) {
  const queueEntries = await getQueueEntries();
  return queueEntries.find((entry) => entry.unitId === unitId && entry.status === "in-service") || null;
}

async function callPatient(
  entry: StoredQueueEntry,
  receptionistName: string,
  activePatientOverride?: StoredQueueEntry | null,
) {
  const activePatient =
    activePatientOverride === undefined
      ? await getActivePatientForUnit(entry.unitId)
      : activePatientOverride;
  if (activePatient && activePatient.id !== entry.id) {
    throw new Error("There is already a patient in service for this unit");
  }

  if (entry.status !== "waiting") {
    throw new Error("Patient is not waiting in queue");
  }

  const calledTime = new Date().toISOString();
  const updatedEntry: StoredQueueEntry = {
    ...entry,
    calledTime,
    calledBy: receptionistName,
    completedTime: undefined,
    status: "in-service",
    callHistory: [
      ...(entry.callHistory || []),
      {
        calledTime,
        calledBy: receptionistName,
      },
    ],
  };

  await kv.set(`queue:${entry.id}`, updatedEntry);
  return sanitizeQueueEntry(updatedEntry);
}

async function returnPatientToWaiting(entry: StoredQueueEntry) {
  const now = new Date().toISOString();
  const callHistory = [...(entry.callHistory || [])];
  const lastCall = callHistory[callHistory.length - 1];

  if (lastCall && !lastCall.returnedTime) {
    lastCall.returnedTime = now;
  }

  const updatedEntry: StoredQueueEntry = {
    ...entry,
    checkInTime: now,
    calledTime: undefined,
    calledBy: undefined,
    completedTime: undefined,
    status: "waiting",
    callHistory,
  };

  await kv.set(`queue:${entry.id}`, updatedEntry);
  return sanitizeQueueEntry(updatedEntry);
}

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-patient-access-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.use(`${FUNCTION_PREFIX}/*`, async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return next();
  }

  const allowedApiKeys = getAllowedApiKeys();
  if (allowedApiKeys.length === 0) {
    console.warn("No allowed API keys configured for request validation.");
    return next();
  }

  const apiKey = c.req.header("apikey");
  if (!apiKey || !allowedApiKeys.includes(apiKey)) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  return next();
});

app.get(`${FUNCTION_PREFIX}/health`, async (c) => {
  try {
    await ensureAdminCredentialsOrDefault();
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "3.0",
      database: "ok",
    });
  } catch (error) {
    console.error("Health check database error:", error);
    return c.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        version: "3.0",
        database: "unavailable",
        error: String(error),
      },
      500,
    );
  }
});

app.post(`${FUNCTION_PREFIX}/auth/reception/login`, async (c) => {
  try {
    const body = await c.req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return c.json({ success: false, error: "username and password are required" }, 400);
    }

    const receptionists = (await kv.getByPrefix("receptionist:")) as StoredReceptionist[];
    const receptionist = receptionists.find((record) => record.username === username);
    if (!receptionist) {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    const passwordMatches = await verifyStoredPassword(password, receptionist);
    if (!passwordMatches) {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    const normalizedReceptionist = await migrateReceptionistPasswordIfNeeded(receptionist, password);
    const session = await createSession({
      role: "receptionist",
      userId: normalizedReceptionist.id,
      username: normalizedReceptionist.username,
      name: normalizedReceptionist.name,
      unitIds: normalizedReceptionist.unitIds,
    });

    return c.json({
      success: true,
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        receptionist: sanitizeReceptionist(normalizedReceptionist),
      },
    });
  } catch (error) {
    console.error("Error authenticating receptionist:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post(`${FUNCTION_PREFIX}/auth/admin/login`, async (c) => {
  try {
    const body = await c.req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return c.json({ success: false, error: "username and password are required" }, 400);
    }

    const credentials = await ensureAdminCredentialsOrDefault();
    const passwordMatches =
      username === credentials.username && (await verifyStoredPassword(password, credentials));

    if (!passwordMatches) {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    const normalizedCredentials = await migrateAdminPasswordIfNeeded(credentials, password);
    const session = await createSession({
      role: "admin",
      userId: "admin",
      username: normalizedCredentials.username,
    });

    return c.json({
      success: true,
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        admin: {
          username: normalizedCredentials.username,
        },
      },
    });
  } catch (error) {
    console.error("Error authenticating admin:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get(`${FUNCTION_PREFIX}/auth/session`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) =>
    c.json({
      success: true,
      data: {
        token: session.token,
        role: session.role,
        userId: session.userId,
        username: session.username,
        name: session.name,
        unitIds: session.unitIds || [],
        expiresAt: session.expiresAt,
      },
    })
  ));

app.post(`${FUNCTION_PREFIX}/auth/logout`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    await deleteSession(session.token);
    return c.json({ success: true });
  }));

app.get(`${FUNCTION_PREFIX}/queue`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    const requestedUnitId = c.req.query("unitId");
    const queueEntries = await getQueueEntries();

    let filteredEntries = queueEntries;
    if (session.role === "receptionist") {
      filteredEntries = filteredEntries.filter((entry) => canAccessUnit(session, entry.unitId));
    }

    if (requestedUnitId) {
      if (!canAccessUnit(session, requestedUnitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }
      filteredEntries = filteredEntries.filter((entry) => entry.unitId === requestedUnitId);
    }

    return c.json({
      success: true,
      data: filteredEntries.map(sanitizeQueueEntry),
    });
  }));

app.post(`${FUNCTION_PREFIX}/queue`, async (c) => {
  try {
    const body = await c.req.json();
    const patientName = String(body.patientName || "").trim();
    const phone = normalizePhone(String(body.phone || ""));
    const unitId = String(body.unitId || "").trim();

    if (patientName.length < 3) {
      return c.json({ success: false, error: "patientName must contain at least 3 characters" }, 400);
    }

    if (phone.length < 10 || phone.length > 11) {
      return c.json({ success: false, error: "phone must contain 10 or 11 digits" }, 400);
    }

    if (!unitId || !(await unitExists(unitId))) {
      return c.json({ success: false, error: "Invalid unitId" }, 400);
    }

    const id = `patient-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const accessToken = patientToken();
    const newEntry: StoredQueueEntry = {
      id,
      patientName,
      phone,
      unitId,
      accessToken,
      checkInTime: new Date().toISOString(),
      position: 0,
      status: "waiting",
      callHistory: [],
    };

    await kv.set(`queue:${id}`, newEntry);
    return c.json({
      success: true,
      data: {
        id,
        unitId,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Error adding patient to queue:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get(`${FUNCTION_PREFIX}/patient/:id/status`, async (c) => {
  try {
    const id = c.req.param("id");
    const accessToken = getPatientAccessToken(c);
    if (!accessToken) {
      return c.json({ success: false, error: "accessToken is required" }, 400);
    }

    const entry = await getQueueEntry(id);
    if (!entry || entry.accessToken !== accessToken) {
      return c.json({ success: false, error: "Patient not found" }, 404);
    }

    const queueEntries = await getQueueEntries();
    const waitingEntries = queueEntries.filter(
      (queueEntry) => queueEntry.unitId === entry.unitId && queueEntry.status === "waiting",
    );
    const position =
      entry.status === "waiting"
        ? waitingEntries.findIndex((queueEntry) => queueEntry.id === entry.id) + 1 || null
        : null;

    return c.json({
      success: true,
      data: {
        id: entry.id,
        unitId: entry.unitId,
        status: entry.status,
        position,
        totalWaiting: waitingEntries.length,
        checkInTime: entry.checkInTime,
        calledTime: entry.calledTime,
        completedTime: entry.completedTime,
      },
    });
  } catch (error) {
    console.error("Error fetching patient status:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post(`${FUNCTION_PREFIX}/patient/:id/rejoin`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const accessToken = String(body.accessToken || "").trim();
    if (!accessToken) {
      return c.json({ success: false, error: "accessToken is required" }, 400);
    }

    const entry = await getQueueEntry(id);
    if (!entry || entry.accessToken !== accessToken) {
      return c.json({ success: false, error: "Patient not found" }, 404);
    }

    if (entry.status !== "completed") {
      return c.json({ success: false, error: "Only completed attendances can rejoin" }, 409);
    }

    const updatedEntry = await returnPatientToWaiting(entry);
    return c.json({ success: true, data: updatedEntry });
    } catch (error) {
      console.error("Error rejoining patient to queue:", error);
      return c.json({ success: false, error: String(error) }, statusFromError(error));
  }
});

app.post(`${FUNCTION_PREFIX}/queue/call-next`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    try {
      const body = await c.req.json();
      const unitId = String(body.unitId || "").trim();
      const receptionistName = String(body.receptionistName || "").trim();

      if (!unitId || !receptionistName) {
        return c.json({ success: false, error: "unitId and receptionistName are required" }, 400);
      }

      if (!canAccessUnit(session, unitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }

      const queueEntries = await getQueueEntries();
      const activePatient =
        queueEntries.find(
          (entry) => entry.unitId === unitId && entry.status === "in-service",
        ) || null;
      if (activePatient) {
        return c.json(
          { success: false, error: "There is already a patient in service for this unit" },
          409,
        );
      }

      const nextPatient = queueEntries.find(
        (entry) => entry.unitId === unitId && entry.status === "waiting",
      );

      if (!nextPatient) {
        return c.json({ success: false, error: "No waiting patients for this unit" }, 404);
      }

      const updatedEntry = await callPatient(nextPatient, receptionistName, activePatient);
      return c.json({ success: true, data: updatedEntry });
    } catch (error) {
      console.error("Error calling next patient:", error);
      return c.json({ success: false, error: String(error) }, statusFromError(error));
    }
  }));

app.post(`${FUNCTION_PREFIX}/queue/:id/call`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const receptionistName = String(body.receptionistName || "").trim();

      if (!receptionistName) {
        return c.json({ success: false, error: "receptionistName is required" }, 400);
      }

      const entry = await getQueueEntry(id);
      if (!entry) {
        return c.json({ success: false, error: "Patient not found" }, 404);
      }

      if (!canAccessUnit(session, entry.unitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }

      const updatedEntry = await callPatient(entry, receptionistName);
      return c.json({ success: true, data: updatedEntry });
    } catch (error) {
      console.error("Error calling specific patient:", error);
      return c.json({ success: false, error: String(error) }, statusFromError(error));
    }
  }));

app.post(`${FUNCTION_PREFIX}/queue/:id/complete`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    try {
      const id = c.req.param("id");
      const entry = await getQueueEntry(id);
      if (!entry) {
        return c.json({ success: false, error: "Patient not found" }, 404);
      }

      if (!canAccessUnit(session, entry.unitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }

      if (entry.status !== "in-service") {
        return c.json({ success: false, error: "Patient is not in service" }, 409);
      }

      const updatedEntry: StoredQueueEntry = {
        ...entry,
        completedTime: new Date().toISOString(),
        status: "completed",
      };

      await kv.set(`queue:${id}`, updatedEntry);
      return c.json({ success: true, data: sanitizeQueueEntry(updatedEntry) });
    } catch (error) {
      console.error("Error completing service:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.post(`${FUNCTION_PREFIX}/queue/:id/return`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    try {
      const id = c.req.param("id");
      const entry = await getQueueEntry(id);
      if (!entry) {
        return c.json({ success: false, error: "Patient not found" }, 404);
      }

      if (!canAccessUnit(session, entry.unitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }

      if (!["in-service", "completed"].includes(entry.status)) {
        return c.json({ success: false, error: "Patient cannot return to queue right now" }, 409);
      }

      const updatedEntry = await returnPatientToWaiting(entry);
      return c.json({ success: true, data: updatedEntry });
    } catch (error) {
      console.error("Error returning patient to queue:", error);
      return c.json({ success: false, error: String(error) }, statusFromError(error));
    }
  }));

app.post(`${FUNCTION_PREFIX}/queue/:id/prioritize`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    try {
      const id = c.req.param("id");
      const entry = await getQueueEntry(id);
      if (!entry) {
        return c.json({ success: false, error: "Patient not found" }, 404);
      }

      if (!canAccessUnit(session, entry.unitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }

      if (entry.status !== "waiting") {
        return c.json({ success: false, error: "Only waiting patients can be prioritized" }, 409);
      }

      const queueEntries = await getQueueEntries();
      const firstWaitingPatient = queueEntries.find(
        (queueEntry) => queueEntry.unitId === entry.unitId && queueEntry.status === "waiting",
      );
      const earliestTimestamp = firstWaitingPatient
        ? new Date(firstWaitingPatient.checkInTime).getTime() - 1
        : Date.now();

      const updatedEntry: StoredQueueEntry = {
        ...entry,
        checkInTime: new Date(earliestTimestamp).toISOString(),
      };

      await kv.set(`queue:${id}`, updatedEntry);
      return c.json({ success: true, data: sanitizeQueueEntry(updatedEntry) });
    } catch (error) {
      console.error("Error prioritizing patient:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.delete(`${FUNCTION_PREFIX}/queue/:id`, async (c) =>
  withRole(c, ["admin", "receptionist"], async (session) => {
    try {
      const id = c.req.param("id");
      const entry = await getQueueEntry(id);
      if (!entry) {
        return c.json({ success: true });
      }

      if (!canAccessUnit(session, entry.unitId)) {
        return c.json({ success: false, error: "Forbidden for this unit" }, 403);
      }

      await kv.del(`queue:${id}`);
      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting queue entry:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.get(`${FUNCTION_PREFIX}/receptionists`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const receptionists = (await kv.getByPrefix("receptionist:")) as StoredReceptionist[];
      const sanitizedReceptionists = receptionists
        .map((receptionist) => sanitizeReceptionist(receptionist))
        .sort((left: any, right: any) => left.name.localeCompare(right.name));

      return c.json({ success: true, data: sanitizedReceptionists });
    } catch (error) {
      console.error("Error fetching receptionists:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.post(`${FUNCTION_PREFIX}/receptionists`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const body = await c.req.json();
      const name = String(body.name || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const unitIds = Array.isArray(body.unitIds)
        ? body.unitIds.filter((unitId: unknown) => typeof unitId === "string")
        : [];

      if (!name || !username || password.length < 6) {
        return c.json(
          { success: false, error: "name, username, and a password with at least 6 characters are required" },
          400,
        );
      }

      await validateUnitIds(unitIds);

      const receptionists = (await kv.getByPrefix("receptionist:")) as StoredReceptionist[];
      const usernameExists = receptionists.some(
        (receptionist) => receptionist.username.toLowerCase() === username.toLowerCase(),
      );

      if (usernameExists) {
        return c.json({ success: false, error: "Username already exists" }, 400);
      }

      const passwordRecord = await buildPasswordRecord(password);
      const receptionist: StoredReceptionist = {
        id: `rec-${Date.now()}`,
        name,
        username,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
        unitIds,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`receptionist:${receptionist.id}`, receptionist);
      return c.json({ success: true, data: sanitizeReceptionist(receptionist) });
    } catch (error) {
      console.error("Error adding receptionist:", error);
      const message = error instanceof Error ? error.message : String(error);
      return c.json({ success: false, error: message }, 500);
    }
  }));

app.put(`${FUNCTION_PREFIX}/receptionists/:id`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const id = c.req.param("id");
      const body = await c.req.json();
      const existing = (await kv.get(`receptionist:${id}`)) as StoredReceptionist | null;
      if (!existing) {
        return c.json({ success: false, error: "Receptionist not found" }, 404);
      }

      const updated: StoredReceptionist = {
        ...existing,
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
      };

      if (typeof body.password === "string" && body.password.length > 0) {
        if (body.password.length < 6) {
          return c.json({ success: false, error: "Password must contain at least 6 characters" }, 400);
        }

        const passwordRecord = await buildPasswordRecord(body.password);
        updated.passwordHash = passwordRecord.hash;
        updated.passwordSalt = passwordRecord.salt;
        delete updated.password;
      }

      if (Array.isArray(body.unitIds)) {
        const unitIds = body.unitIds.filter((unitId: unknown) => typeof unitId === "string");
        await validateUnitIds(unitIds);
        updated.unitIds = unitIds;
      }

      await kv.set(`receptionist:${id}`, updated);
      return c.json({ success: true, data: sanitizeReceptionist(updated) });
    } catch (error) {
      console.error("Error updating receptionist:", error);
      const message = error instanceof Error ? error.message : String(error);
      return c.json({ success: false, error: message }, 500);
    }
  }));

app.delete(`${FUNCTION_PREFIX}/receptionists/:id`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const id = c.req.param("id");
      await kv.del(`receptionist:${id}`);
      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting receptionist:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.get(`${FUNCTION_PREFIX}/units`, async (c) => {
  try {
    const units = await getUnits();
    return c.json({ success: true, data: units });
  } catch (error) {
    console.error("Error fetching units:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get(`${FUNCTION_PREFIX}/units/by-slug/:slug`, async (c) => {
  try {
    const slug = c.req.param("slug");
    const unit = await getUnitBySlugOrId(slug);
    if (!unit) {
      return c.json({ success: false, error: "Unit not found" }, 404);
    }

    return c.json({ success: true, data: unit });
  } catch (error) {
    console.error("Error fetching unit by slug:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post(`${FUNCTION_PREFIX}/units`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const body = await c.req.json();
      const name = String(body.name || "").trim();
      const address = String(body.address || "").trim();
      const slug = normalizeSlug(String(body.slug || body.id || ""));
      const id = String(body.id || slug).trim();

      if (!name || !address || !slug || !id) {
        return c.json({ success: false, error: "slug, id, name, and address are required" }, 400);
      }

      if (RESERVED_SLUGS.has(slug)) {
        return c.json({ success: false, error: "slug is reserved" }, 400);
      }

      const existingById = await kv.get(`unit:${id}`);
      if (existingById) {
        return c.json({ success: false, error: "Unit id already exists" }, 400);
      }

      const units = await getUnits();
      const slugExists = units.some((unit: any) => unit.slug === slug);
      if (slugExists) {
        return c.json({ success: false, error: "Unit slug already exists" }, 400);
      }

      const unit = {
        id,
        slug,
        name,
        address,
        createdAt: new Date().toISOString(),
      };

      await storeUnitRecord(unit);
      return c.json({ success: true, data: unit });
    } catch (error) {
      console.error("Error creating unit:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.put(`${FUNCTION_PREFIX}/units/:id`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const id = c.req.param("id");
      const existing = await kv.get(`unit:${id}`);
      if (!existing) {
        return c.json({ success: false, error: "Unit not found" }, 404);
      }

      const body = await c.req.json();
      const nextSlug =
        typeof body.slug === "string" && body.slug.trim()
          ? normalizeSlug(body.slug)
          : existing.slug;

      if (RESERVED_SLUGS.has(nextSlug)) {
        return c.json({ success: false, error: "slug is reserved" }, 400);
      }

      const units = await getUnits();
      const slugExists = units.some((unit: any) => unit.id !== id && unit.slug === nextSlug);
      if (slugExists) {
        return c.json({ success: false, error: "Unit slug already exists" }, 400);
      }

      const updatedUnit = {
        ...existing,
        slug: nextSlug,
        name:
          typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
        address:
          typeof body.address === "string" && body.address.trim()
            ? body.address.trim()
            : existing.address,
      };

      await storeUnitRecord(updatedUnit, existing.slug);
      return c.json({ success: true, data: updatedUnit });
    } catch (error) {
      console.error("Error updating unit:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.delete(`${FUNCTION_PREFIX}/units/:id`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const id = c.req.param("id");
      const unit = await kv.get(`unit:${id}`);
      if (!unit) {
        return c.json({ success: true });
      }

      const receptionists = (await kv.getByPrefix("receptionist:")) as StoredReceptionist[];
      const hasAssignedReceptionists = receptionists.some((receptionist) =>
        Array.isArray(receptionist.unitIds) && receptionist.unitIds.includes(id),
      );
      if (hasAssignedReceptionists) {
        return c.json(
          { success: false, error: "This unit is still assigned to one or more receptionists" },
          409,
        );
      }

      const queueEntries = await getQueueEntries();
      const hasActiveQueue = queueEntries.some(
        (entry) => entry.unitId === id && entry.status !== "completed",
      );
      if (hasActiveQueue) {
        return c.json(
          { success: false, error: "This unit still has active patients in queue or in service" },
          409,
        );
      }

      await kv.del(getUnitSlugKey(unit.slug));
      await kv.del(`unit:${id}`);
      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting unit:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.get(`${FUNCTION_PREFIX}/admin/credentials`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const credentials = await ensureAdminCredentialsOrDefault();
      return c.json({ success: true, data: sanitizeAdminCredentials(credentials) });
    } catch (error) {
      console.error("Error fetching admin credentials:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

app.put(`${FUNCTION_PREFIX}/admin/credentials`, async (c) =>
  withRole(c, ["admin"], async () => {
    try {
      const body = await c.req.json();
      const username = String(body.username || "").trim();
      const password = String(body.password || "");

      if (!username || password.length < 6) {
        return c.json(
          { success: false, error: "username and a password with at least 6 characters are required" },
          400,
        );
      }

      const passwordRecord = await buildPasswordRecord(password);
      const credentials: StoredAdminCredentials = {
        username,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
      };

      await kv.set("admin:credentials", credentials);
      return c.json({ success: true, data: sanitizeAdminCredentials(credentials) });
    } catch (error) {
      console.error("Error updating admin credentials:", error);
      return c.json({ success: false, error: String(error) }, 500);
    }
  }));

async function initializeDefaultData() {
  try {
    const defaultUnits = [
      {
        id: "unidadebarra",
        slug: "unidadebarra",
        name: "Unidade Barra",
        address: "Av. Oceanica, s/n - Barra - Salvador/BA (atualize no painel administrativo)",
        createdAt: new Date("2024-01-01").toISOString(),
      },
      {
        id: "unidadesantoamaro",
        slug: "unidadesantoamaro",
        name: "Unidade Santo Amaro",
        address: "Rua do Amaro, s/n - Santo Amaro - Salvador/BA (atualize no painel administrativo)",
        createdAt: new Date("2024-01-01").toISOString(),
      },
      {
        id: "unidadeinga",
        slug: "unidadeinga",
        name: "Unidade Inga",
        address: "Rua do Inga, s/n - Salvador/BA (atualize no painel administrativo)",
        createdAt: new Date("2024-01-01").toISOString(),
      },
    ];

    const existingUnits = await getUnits();
    if (existingUnits.length === 0) {
      for (const unit of defaultUnits) {
        await storeUnitRecord(unit);
      }
    } else {
      for (const unit of existingUnits) {
        if (unit?.slug && unit?.id) {
          await kv.set(getUnitSlugKey(unit.slug), unit.id);
        }
      }
    }

    const existingAdminCredentials = await getStoredAdminCredentials();
    const bootstrapAdmin = getBootstrapAdminCredentials();
    if (!existingAdminCredentials && bootstrapAdmin) {
      const passwordRecord = await buildPasswordRecord(bootstrapAdmin.password);
      await kv.set("admin:credentials", {
        username: bootstrapAdmin.username,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
      });
    } else if (!existingAdminCredentials) {
      console.warn(
        "Admin bootstrap credentials were not configured. Set DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD before first login.",
      );
    }

    const existingReceptionists = (await kv.getByPrefix("receptionist:")) as StoredReceptionist[];
    if (existingReceptionists.length === 0) {
      const bootstrapReceptionist = getBootstrapReceptionist();
      if (bootstrapReceptionist) {
        const defaultPasswordRecord = await buildPasswordRecord(bootstrapReceptionist.password);
        await kv.set(`receptionist:${bootstrapReceptionist.id}`, {
          id: bootstrapReceptionist.id,
          name: bootstrapReceptionist.name,
          username: bootstrapReceptionist.username,
          passwordHash: defaultPasswordRecord.hash,
          passwordSalt: defaultPasswordRecord.salt,
          unitIds: bootstrapReceptionist.unitIds,
          createdAt: new Date("2024-01-01").toISOString(),
        });
      } else {
        console.warn(
          "No bootstrap receptionist configured. Create reception users from the admin panel after the first admin login.",
        );
      }
    } else {
      const bootstrapReceptionist = getBootstrapReceptionist();
      for (const receptionist of existingReceptionists) {
        const normalized: StoredReceptionist = {
          ...receptionist,
          unitIds:
            Array.isArray(receptionist.unitIds) && receptionist.unitIds.length > 0
              ? receptionist.unitIds
              : ["unidadebarra", "unidadesantoamaro", "unidadeinga"],
        };

        let needsUpdate = normalized.unitIds !== receptionist.unitIds;
        if (normalized.passwordHash && normalized.passwordSalt && !normalized.password) {
          if (needsUpdate) {
            await kv.set(`receptionist:${normalized.id}`, normalized);
          }
          continue;
        }

        const legacyPassword =
          normalized.password ||
          (bootstrapReceptionist?.username === normalized.username
            ? bootstrapReceptionist.password
            : "");

        if (legacyPassword) {
          const passwordRecord = await buildPasswordRecord(legacyPassword);
          normalized.passwordHash = passwordRecord.hash;
          normalized.passwordSalt = passwordRecord.salt;
          delete normalized.password;
          needsUpdate = true;
        } else {
          console.warn(
            `Receptionist ${normalized.username} has no valid password hash and could not be auto-migrated.`,
          );
        }

        if (needsUpdate) {
          await kv.set(`receptionist:${normalized.id}`, normalized);
        }
      }
    }

    const adminCredentials = await getStoredAdminCredentials();
    if (adminCredentials && (!adminCredentials.passwordHash || !adminCredentials.passwordSalt || adminCredentials.password)) {
      const legacyPassword =
        adminCredentials.password ||
        (bootstrapAdmin?.username === adminCredentials.username ? bootstrapAdmin.password : "");

      if (!legacyPassword) {
        console.warn(
          `Admin user ${adminCredentials.username} has no valid password hash and could not be auto-migrated.`,
        );
        return;
      }

      const passwordRecord = await buildPasswordRecord(legacyPassword);
      await kv.set("admin:credentials", {
        username: adminCredentials.username,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt,
      });
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
  }
}

initializeDefaultData();

Deno.serve(app.fetch);
