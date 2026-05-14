import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
const app = new Hono();
const FUNCTION_PREFIX = "/server";

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

// Helper function to remove undefined values from objects
function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanObject(obj[key]);
      }
    }
    return cleaned;
  }

  return obj;
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
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

  // Local fallback: if no platform keys are available, skip validation.
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

// Health check endpoint
app.get(`${FUNCTION_PREFIX}/health`, async (c) => {
  try {
    await kv.get("admin:credentials");

    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "2.0",
      database: "ok"
    });
  } catch (error) {
    console.error(`Health check database error:`, error);
    return c.json({
      status: "error",
      timestamp: new Date().toISOString(),
      version: "2.0",
      database: "unavailable",
      error: String(error)
    }, 500);
  }
});

// Debug endpoint to check database connection
app.get(`${FUNCTION_PREFIX}/debug`, async (c) => {
  try {
    const testKey = "debug:test";
    const testValue = { test: "data", timestamp: new Date().toISOString() };

    // Test write
    await kv.set(testKey, testValue);

    // Test read
    const readValue = await kv.get(testKey);

    // Test delete
    await kv.del(testKey);

    return c.json({
      success: true,
      message: "Database operations working correctly",
      tests: {
        write: "ok",
        read: "ok",
        delete: "ok"
      }
    });
  } catch (error) {
    console.error(`Debug endpoint error:`, error);
    return c.json({
      success: false,
      error: String(error),
      stack: error.stack
    }, 500);
  }
});

// ============ QUEUE ENDPOINTS ============

// Get all queue entries (optional filter: ?unitIds=id1,id2)
app.get(`${FUNCTION_PREFIX}/queue`, async (c) => {
  try {
    const entries = await kv.getByPrefix("queue:");
    const unitIdsParam = c.req.query("unitIds");
    let list = entries.map((e: any) => ({
      ...e,
      unitId: e.unitId || "unidadebarra",
    }));
    if (unitIdsParam) {
      const allowed = unitIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (allowed.length > 0) {
        list = list.filter((e: any) => allowed.includes(e.unitId));
      }
    }
    console.log(`Fetched ${list.length} queue entries (filter: ${unitIdsParam || "none"})`);
    return c.json({ success: true, data: list });
  } catch (error) {
    console.error(`Error fetching queue entries:`, error);
    console.error(`Error stack:`, error.stack);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Add patient to queue
app.post(`${FUNCTION_PREFIX}/queue`, async (c) => {
  try {
    const body = await c.req.json();
    const { patientName, phone, unitId } = body;

    console.log(`Adding patient to queue: ${patientName} unit: ${unitId}`);

    if (!patientName || !phone) {
      return c.json({ success: false, error: "patientName and phone are required" }, 400);
    }
    if (!unitId || typeof unitId !== "string") {
      return c.json({ success: false, error: "unitId is required" }, 400);
    }

    const unit = await kv.get(`unit:${unitId}`);
    if (!unit) {
      return c.json({ success: false, error: "Invalid unitId" }, 400);
    }

    const id = `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry = {
      id,
      patientName,
      phone,
      unitId,
      checkInTime: new Date().toISOString(),
      position: 0, // Will be recalculated on client
      status: 'waiting',
      callHistory: []
    };

    await kv.set(`queue:${id}`, newEntry);
    console.log(`Successfully added patient: ${id}`);
    return c.json({ success: true, data: newEntry });
  } catch (error) {
    console.error(`Error adding patient to queue:`, error);
    console.error(`Error stack:`, error.stack);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update queue entry (for calling, returning, etc.)
app.put(`${FUNCTION_PREFIX}/queue/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`Updating queue entry: ${id}`);

    const body = await c.req.json();
    console.log(`Update payload:`, JSON.stringify(body));

    const existingEntry = await kv.get(`queue:${id}`);
    if (!existingEntry) {
      console.log(`Patient not found: ${id}`);
      return c.json({ success: false, error: "Patient not found" }, 404);
    }

    console.log(`Existing entry:`, JSON.stringify(existingEntry));

    // Merge updates, handling undefined values properly
    const updatedEntry = { ...existingEntry };
    for (const key in body) {
      if (body[key] !== undefined) {
        updatedEntry[key] = body[key];
      } else if (body.hasOwnProperty(key)) {
        // Explicitly setting to undefined means we want to remove it
        delete updatedEntry[key];
      }
    }

    // Clean the object to remove any remaining undefined values
    const cleanedEntry = cleanObject(updatedEntry);
    console.log(`Updated entry:`, JSON.stringify(cleanedEntry));

    await kv.set(`queue:${id}`, cleanedEntry);
    return c.json({ success: true, data: cleanedEntry });
  } catch (error) {
    console.error(`Error updating queue entry ${c.req.param("id")}:`, error);
    console.error(`Error stack:`, error.stack);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete queue entry
app.delete(`${FUNCTION_PREFIX}/queue/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`queue:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting queue entry ${c.req.param("id")}: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get/Set current patient (por unidade: query/body unitId)
app.get(`${FUNCTION_PREFIX}/current-patient`, async (c) => {
  try {
    const unitId = c.req.query("unitId");
    if (!unitId) {
      return c.json({ success: false, error: "unitId query parameter is required" }, 400);
    }
    const patient = await kv.get(`current:patient:${unitId}`);
    console.log(`Fetched current patient for ${unitId}:`, patient ? "exists" : "null");
    return c.json({ success: true, data: patient || null });
  } catch (error) {
    console.error(`Error fetching current patient:`, error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post(`${FUNCTION_PREFIX}/current-patient`, async (c) => {
  try {
    const body = await c.req.json();
    const unitId = body.unitId as string | undefined;
    if (!unitId || typeof unitId !== "string") {
      return c.json({ success: false, error: "unitId is required" }, 400);
    }

    console.log(`Setting current patient for ${unitId}:`, JSON.stringify(body.patient));

    // If patient is null, delete the key instead of storing null
    if (body.patient === null || body.patient === undefined) {
      await kv.del(`current:patient:${unitId}`);
      return c.json({ success: true, data: null });
    }

    const p = body.patient as any;
    if (p.unitId && p.unitId !== unitId) {
      return c.json({ success: false, error: "patient.unitId does not match unitId" }, 400);
    }

    await kv.set(`current:patient:${unitId}`, body.patient);
    return c.json({ success: true, data: body.patient });
  } catch (error) {
    console.error(`Error setting current patient:`, error);
    console.error(`Error stack:`, error.stack);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ RECEPTIONIST ENDPOINTS ============

// Get all receptionists
app.get(`${FUNCTION_PREFIX}/receptionists`, async (c) => {
  try {
    const receptionists = await kv.getByPrefix("receptionist:");
    return c.json({ success: true, data: receptionists });
  } catch (error) {
    console.log(`Error fetching receptionists: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Add receptionist
app.post(`${FUNCTION_PREFIX}/receptionists`, async (c) => {
  try {
    const body = await c.req.json();
    const { name, username, password, unitIds } = body;

    if (!name || !username || !password) {
      return c.json({ success: false, error: "name, username, and password are required" }, 400);
    }

    const ids: string[] = Array.isArray(unitIds) ? unitIds.filter((u: unknown) => typeof u === "string") : [];
    if (ids.length === 0) {
      return c.json({ success: false, error: "At least one unitId in unitIds is required" }, 400);
    }

    const allUnits = await kv.getByPrefix("unit:");
    const validUnitIds = new Set(allUnits.map((u: any) => u.id));
    for (const uid of ids) {
      if (!validUnitIds.has(uid)) {
        return c.json({ success: false, error: `Unknown unitId: ${uid}` }, 400);
      }
    }

    // Check if username already exists
    const existingReceptionists = await kv.getByPrefix("receptionist:");
    const usernameExists = existingReceptionists.some((r: any) => r.username === username);

    if (usernameExists) {
      return c.json({ success: false, error: "Username already exists" }, 400);
    }

    const id = `rec-${Date.now()}`;
    const newReceptionist = {
      id,
      name,
      username,
      password,
      unitIds: ids,
      createdAt: new Date().toISOString()
    };

    await kv.set(`receptionist:${id}`, newReceptionist);
    return c.json({ success: true, data: newReceptionist });
  } catch (error) {
    console.log(`Error adding receptionist: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update receptionist (unidades e/ou nome e/ou senha)
app.put(`${FUNCTION_PREFIX}/receptionists/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`receptionist:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Receptionist not found" }, 404);
    }

    const updates: any = { ...existing };
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.password === "string" && body.password.length > 0) {
      updates.password = body.password;
    }
    if (Array.isArray(body.unitIds)) {
      const ids = body.unitIds.filter((u: unknown) => typeof u === "string");
      if (ids.length === 0) {
        return c.json({ success: false, error: "At least one unitId in unitIds is required" }, 400);
      }
      const allUnits = await kv.getByPrefix("unit:");
      const validUnitIds = new Set(allUnits.map((u: any) => u.id));
      for (const uid of ids) {
        if (!validUnitIds.has(uid)) {
          return c.json({ success: false, error: `Unknown unitId: ${uid}` }, 400);
        }
      }
      updates.unitIds = ids;
    }

    await kv.set(`receptionist:${id}`, updates);
    return c.json({ success: true, data: updates });
  } catch (error) {
    console.log(`Error updating receptionist: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete receptionist
app.delete(`${FUNCTION_PREFIX}/receptionists/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`receptionist:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting receptionist ${c.req.param("id")}: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Validate receptionist login
app.post(`${FUNCTION_PREFIX}/receptionists/validate`, async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, error: "username and password are required" }, 400);
    }

    const receptionists = await kv.getByPrefix("receptionist:");
    const receptionist = receptionists.find(
      (r: any) => r.username === username && r.password === password
    );

    if (!receptionist) {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    const withUnits = {
      ...receptionist,
      unitIds: Array.isArray((receptionist as any).unitIds) && (receptionist as any).unitIds.length > 0
        ? (receptionist as any).unitIds
        : ["unidadebarra"],
    };

    return c.json({ success: true, data: withUnits });
  } catch (error) {
    console.log(`Error validating receptionist credentials: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ UNITS (UNIDADES) ============

app.get(`${FUNCTION_PREFIX}/units`, async (c) => {
  try {
    const units = await kv.getByPrefix("unit:");
    units.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    return c.json({ success: true, data: units });
  } catch (error) {
    console.log(`Error fetching units: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get(`${FUNCTION_PREFIX}/units/by-slug/:slug`, async (c) => {
  try {
    const slug = c.req.param("slug");
    const units = await kv.getByPrefix("unit:");
    const unit = units.find((u: any) => u.slug === slug || u.id === slug);
    if (!unit) {
      return c.json({ success: false, error: "Unit not found" }, 404);
    }
    return c.json({ success: true, data: unit });
  } catch (error) {
    console.log(`Error fetching unit by slug: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post(`${FUNCTION_PREFIX}/units`, async (c) => {
  try {
    const body = await c.req.json();
    const { id, name, address, slug } = body;
    const unitSlug = (slug || id || "").toString().trim().toLowerCase().replace(/\s+/g, "");
    const unitName = (name || "").toString().trim();
    const unitAddress = (address || "").toString().trim();

    if (!unitSlug || !unitName || !unitAddress) {
      return c.json({ success: false, error: "slug (or id), name, and address are required" }, 400);
    }

    const reserved = new Set(["login", "recepcao", "fila", "qrcode", "log", "admin", "assets"]);
    if (reserved.has(unitSlug)) {
      return c.json({ success: false, error: "slug is reserved" }, 400);
    }

    const unitId = (id || unitSlug).toString().trim();
    const existing = await kv.get(`unit:${unitId}`);
    if (existing) {
      return c.json({ success: false, error: "Unit id already exists" }, 400);
    }

    const unit = {
      id: unitId,
      slug: unitSlug,
      name: unitName,
      address: unitAddress,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`unit:${unitId}`, unit);
    return c.json({ success: true, data: unit });
  } catch (error) {
    console.log(`Error creating unit: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put(`${FUNCTION_PREFIX}/units/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`unit:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Unit not found" }, 404);
    }
    const body = await c.req.json();
    const updated = {
      ...existing,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
      address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : existing.address,
    };
    if (typeof body.slug === "string" && body.slug.trim()) {
      const s = body.slug.trim().toLowerCase().replace(/\s+/g, "");
      const reserved = new Set(["login", "recepcao", "fila", "qrcode", "log", "admin", "assets"]);
      if (reserved.has(s)) {
        return c.json({ success: false, error: "slug is reserved" }, 400);
      }
      updated.slug = s;
    }
    await kv.set(`unit:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.log(`Error updating unit: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.delete(`${FUNCTION_PREFIX}/units/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`unit:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting unit: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ ADMIN ENDPOINTS ============

// Get admin credentials
app.get(`${FUNCTION_PREFIX}/admin/credentials`, async (c) => {
  try {
    const credentials = await kv.get("admin:credentials");
    return c.json({ success: true, data: credentials || { username: "admin", password: "admin123" } });
  } catch (error) {
    console.log(`Error fetching admin credentials: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update admin credentials
app.put(`${FUNCTION_PREFIX}/admin/credentials`, async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, error: "username and password are required" }, 400);
    }

    const newCredentials = { username, password };
    await kv.set("admin:credentials", newCredentials);
    return c.json({ success: true, data: newCredentials });
  } catch (error) {
    console.log(`Error updating admin credentials: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Validate admin login
app.post(`${FUNCTION_PREFIX}/admin/validate`, async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, error: "username and password are required" }, 400);
    }

    const credentials = await kv.get("admin:credentials");
    const adminCreds = credentials || { username: "admin", password: "admin123" };

    if (username === adminCreds.username && password === adminCreds.password) {
      return c.json({ success: true });
    } else {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }
  } catch (error) {
    console.log(`Error validating admin credentials: ${error}`);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ INITIALIZATION ============

// Initialize default data on first run
async function initializeDefaultData() {
  try {
    // Check if admin credentials exist
    const adminCreds = await kv.get("admin:credentials");
    if (!adminCreds) {
      await kv.set("admin:credentials", { username: "admin", password: "admin123" });
      console.log("Initialized default admin credentials");
    }

    const defaultUnits = [
      {
        id: "unidadebarra",
        slug: "unidadebarra",
        name: "Unidade Barra",
        address: "Av. Oceânica, s/n — Barra — Salvador/BA (endereço de exemplo — atualize no painel admin)",
        createdAt: new Date("2024-01-01").toISOString(),
      },
      {
        id: "unidadesantoamaro",
        slug: "unidadesantoamaro",
        name: "Unidade Santo Amaro",
        address: "Rua do Amaro, s/n — Santo Amaro — Salvador/BA (endereço de exemplo — atualize no painel admin)",
        createdAt: new Date("2024-01-01").toISOString(),
      },
      {
        id: "unidadeinga",
        slug: "unidadeinga",
        name: "Unidade Inga",
        address: "Rua do Inga, s/n — Salvador/BA (endereço de exemplo — atualize no painel admin)",
        createdAt: new Date("2024-01-01").toISOString(),
      },
    ];

    const existingUnits = await kv.getByPrefix("unit:");
    if (existingUnits.length === 0) {
      for (const u of defaultUnits) {
        await kv.set(`unit:${u.id}`, u);
      }
      console.log("Initialized default units");
    }

    // Check if default receptionist exists
    const receptionists = await kv.getByPrefix("receptionist:");
    if (receptionists.length === 0) {
      await kv.set("receptionist:rec-1", {
        id: "rec-1",
        name: "Recepção Principal",
        username: "recepcao",
        password: "cbtea2024",
        unitIds: ["unidadebarra", "unidadesantoamaro", "unidadeinga"],
        createdAt: new Date("2024-01-01").toISOString()
      });
      console.log("Initialized default receptionist");
    } else {
      for (const r of receptionists as any[]) {
        if (!Array.isArray(r.unitIds) || r.unitIds.length === 0) {
          const merged = {
            ...r,
            unitIds: ["unidadebarra", "unidadesantoamaro", "unidadeinga"],
          };
          await kv.set(`receptionist:${r.id}`, merged);
          console.log(`Migrated receptionist ${r.id} with default unitIds`);
        }
      }
    }
  } catch (error) {
    console.log(`Error initializing default data: ${error}`);
  }
}

// Initialize on startup
initializeDefaultData();

Deno.serve(app.fetch);
