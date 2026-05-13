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

// Get all queue entries
app.get(`${FUNCTION_PREFIX}/queue`, async (c) => {
  try {
    const entries = await kv.getByPrefix("queue:");
    console.log(`Fetched ${entries.length} queue entries`);
    return c.json({ success: true, data: entries });
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
    const { patientName, phone } = body;

    console.log(`Adding patient to queue: ${patientName}`);

    if (!patientName || !phone) {
      return c.json({ success: false, error: "patientName and phone are required" }, 400);
    }

    const id = `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry = {
      id,
      patientName,
      phone,
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

// Get/Set current patient
app.get(`${FUNCTION_PREFIX}/current-patient`, async (c) => {
  try {
    const patient = await kv.get("current:patient");
    console.log(`Fetched current patient:`, patient ? 'exists' : 'null');
    return c.json({ success: true, data: patient || null });
  } catch (error) {
    console.error(`Error fetching current patient:`, error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post(`${FUNCTION_PREFIX}/current-patient`, async (c) => {
  try {
    const body = await c.req.json();
    console.log(`Setting current patient:`, JSON.stringify(body.patient));

    // If patient is null, delete the key instead of storing null
    if (body.patient === null || body.patient === undefined) {
      await kv.del("current:patient");
      return c.json({ success: true, data: null });
    }

    await kv.set("current:patient", body.patient);
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
    const { name, username, password } = body;

    if (!name || !username || !password) {
      return c.json({ success: false, error: "name, username, and password are required" }, 400);
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
      createdAt: new Date().toISOString()
    };

    await kv.set(`receptionist:${id}`, newReceptionist);
    return c.json({ success: true, data: newReceptionist });
  } catch (error) {
    console.log(`Error adding receptionist: ${error}`);
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

    return c.json({ success: true, data: receptionist });
  } catch (error) {
    console.log(`Error validating receptionist credentials: ${error}`);
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

    // Check if default receptionist exists
    const receptionists = await kv.getByPrefix("receptionist:");
    if (receptionists.length === 0) {
      await kv.set("receptionist:rec-1", {
        id: "rec-1",
        name: "Recepção Principal",
        username: "recepcao",
        password: "cbtea2024",
        createdAt: new Date("2024-01-01").toISOString()
      });
      console.log("Initialized default receptionist");
    }
  } catch (error) {
    console.log(`Error initializing default data: ${error}`);
  }
}

// Initialize on startup
initializeDefaultData();

Deno.serve(app.fetch);
