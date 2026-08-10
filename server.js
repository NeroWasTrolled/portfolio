import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { spawn } from "child_process";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CONTACT_DESTINATION = "gabrielfrancasimoes@gmail.com";
const IS_VERCEL = Boolean(process.env.VERCEL);
const MAX_FIELD_LEN = 160;
const MAX_MESSAGE_LEN = 4000;
const CONTACT_RATE_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_RATE_MAX = 8;
const PYTHON_TIMEOUT_MS = 12000;

const __dirname = path.resolve();
const PUBLIC_DIR = path.join(__dirname, "public");
const ASSETS_DIR = path.join(__dirname, "assets");
const DATA_DIR = IS_VERCEL ? "/tmp/data" : path.join(__dirname, "data");
const AUTOMATIONS_DIR = path.join(__dirname, "automations");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const contactRateMap = new Map();

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]", "utf-8");
} catch (e) {
  console.warn("Storage init fail:", e.message);
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(express.static(PUBLIC_DIR));
app.use("/assets", express.static(ASSETS_DIR));
app.use(express.json({ limit: "1mb" }));

const PRICING = {
  types: {
    dashboard: { simples: 850, medio: 1250, completo: 2100 },
    automacao: { simples: 650, medio: 950, completo: 1600 },
    sistema: { simples: 1200, medio: 1800, completo: 2800 }
  },
  integracoes: 250,
  auth: 180,
  deploy: 0,
  rushMultiplier: 1.2
};

function calcQuote(body = {}) {
  const type = String(body.type || "dashboard");
  const size = String(body.size || "medio");
  const table = PRICING.types[type] || PRICING.types.dashboard;
  let total = table[size] ?? table.medio;
  if (body.integracoes) total += PRICING.integracoes;
  if (body.auth) total += PRICING.auth;
  if (body.rush) total *= PRICING.rushMultiplier;
  // deploy incluso no valor-base dos tipos; flag só documenta
  return Math.round(total);
}

app.post("/api/quote", (req, res) => {
  try {
    const body = req.body || {};
    const total = calcQuote(body);
    res.json({
      ok: true,
      currency: "BRL",
      total,
      label: `Faixa inicial para ${body.type || "dashboard"} (${body.size || "medio"})`,
      note: "Estimativa. O valor final sai no briefing com escopo fechado.",
      engine: "node"
    });
  } catch {
    res.status(400).json({ ok: false, error: "Invalid payload" });
  }
});

app.post("/api/contact", async (req, res) => {
  const sourceIp = getClientIp(req);
  if (!checkRateLimit(contactRateMap, sourceIp, CONTACT_RATE_WINDOW_MS, CONTACT_RATE_MAX)) {
    return res.status(429).json({ ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
  }

  const { name, email, message, budget } = req.body || {};
  const safeName = sanitizeSingleLine(name, MAX_FIELD_LEN);
  const safeEmail = sanitizeSingleLine(email, MAX_FIELD_LEN).toLowerCase();
  const safeMessage = sanitizeMessage(message, MAX_MESSAGE_LEN);
  const safeBudget = normalizeBudget(budget);

  if (!safeName || !safeEmail || !safeMessage) {
    return res.status(400).json({ ok: false, error: "Campos obrigatorios ausentes." });
  }
  if (!isValidEmail(safeEmail)) {
    return res.status(400).json({ ok: false, error: "Email invalido." });
  }
  if (safeBudget !== null && !Number.isFinite(safeBudget)) {
    return res.status(400).json({ ok: false, error: "Budget invalido." });
  }

  const record = {
    id: rid(),
    name: safeName,
    email: safeEmail,
    message: safeMessage,
    budget: safeBudget,
    createdAt: new Date().toISOString()
  };

  const pipeline = {
    saved: false,
    python: { ok: false, skipped: false },
    email: { ok: false, skipped: false }
  };

  try {
    const arr = fs.existsSync(LEADS_FILE) ? JSON.parse(fs.readFileSync(LEADS_FILE, "utf-8")) : [];
    arr.push(record);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(arr, null, 2));
    pipeline.saved = true;
  } catch (e) {
    console.warn("Lead save fail:", e.message);
  }

  try {
    const py = await runPython("process_lead.py", ["--out-dir", DATA_DIR], JSON.stringify(record));
    pipeline.python = {
      ok: py.ok,
      engine: "python",
      script: "process_lead.py",
      durationMs: py.durationMs,
      digest: py.json || null,
      error: py.ok ? null : (py.error || py.stderr || "Falha no process_lead.py")
    };
  } catch (e) {
    pipeline.python = { ok: false, engine: "python", error: e.message };
  }

  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass);
  if (!hasSmtpConfig) {
    pipeline.email = {
      ok: false,
      skipped: true,
      error: "SMTP nao configurado. Lead salvo localmente; configure SMTP_HOST, SMTP_USER e SMTP_PASS."
    };
    return res.status(503).json({
      ok: false,
      saved: pipeline.saved,
      id: record.id,
      pipeline,
      error: pipeline.email.error
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: smtpPass }
    });
    const formattedBudget = safeBudget !== null ? `R$ ${safeBudget.toLocaleString("pt-BR")}` : "Nao informado";
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo"
    }).format(new Date(record.createdAt));

    const signals = pipeline.python?.digest?.analysis?.signals?.join(", ") || "geral";

    await transporter.sendMail({
      from: `Portfolio Bot <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_TO || CONTACT_DESTINATION,
      replyTo: safeEmail,
      subject: `Novo lead do portfolio: ${safeName}`,
      text: [
        "Novo lead recebido pelo portfolio",
        `Nome: ${safeName}`,
        `Email: ${safeEmail}`,
        `Budget: ${formattedBudget}`,
        `Sinais (Python): ${signals}`,
        "",
        "Descricao do projeto:",
        safeMessage,
        "",
        `Recebido em: ${formattedDate}`
      ].join("\n"),
      html: buildContactEmail({
        name: esc(safeName),
        email: esc(safeEmail),
        budget: esc(formattedBudget),
        message: esc(safeMessage),
        createdAt: esc(formattedDate),
        signals: esc(signals)
      })
    });

    pipeline.email = { ok: true };
    res.json({
      ok: true,
      id: record.id,
      message: "Mensagem enviada com sucesso.",
      pipeline
    });
  } catch (e) {
    console.error("Email fail:", e.message, e.code || "", e.response || "");
    pipeline.email = { ok: false, error: e.message };
    res.status(502).json({
      ok: false,
      saved: pipeline.saved,
      id: record.id,
      pipeline,
      error: "Nao foi possivel enviar o email com as credenciais SMTP atuais. Revise o .env e tente novamente."
    });
  }
});

app.get("/api/availability", (_req, res) => {
  const today = new Date();
  const slots = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const day = d.getDay(); // 0 sun ... 6 sat
    const available = day !== 0 && day !== 6 && i % 3 !== 0;
    return { date: d.toISOString().slice(0, 10), available };
  });
  res.json({ ok: true, slots, engine: "rules" });
});

function resolvePythonBin() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  return process.platform === "win32" ? "py" : "python3";
}

function runPython(scriptName, args = [], stdinData = null) {
  return new Promise((resolve) => {
    const started = Date.now();
    const scriptPath = path.join(AUTOMATIONS_DIR, scriptName);
    const bin = resolvePythonBin();
    const spawnArgs = process.platform === "win32" && bin === "py"
      ? ["-3", scriptPath, ...args]
      : [scriptPath, ...args];

    const child = spawn(bin, spawnArgs, {
      cwd: AUTOMATIONS_DIR,
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({
        ok: false,
        durationMs: Date.now() - started,
        error: `Timeout apos ${PYTHON_TIMEOUT_MS}ms`,
        stdout,
        stderr
      });
    }, PYTHON_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf-8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf-8"); });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        durationMs: Date.now() - started,
        error: err.message,
        stdout,
        stderr
      });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      let json = null;
      const trimmed = stdout.trim();
      if (trimmed) {
        try {
          const lastLine = trimmed.split(/\r?\n/).filter(Boolean).at(-1);
          json = JSON.parse(lastLine);
        } catch {
          try { json = JSON.parse(trimmed); } catch { /* ignore */ }
        }
      }
      resolve({
        ok: code === 0 && Boolean(json?.ok !== false),
        code,
        durationMs: Date.now() - started,
        stdout,
        stderr,
        json,
        error: code === 0 ? null : (stderr.trim() || `exit code ${code}`)
      });
    });

    if (stdinData != null) {
      child.stdin.write(stdinData);
    }
    child.stdin.end();
  });
}

function rid() { return "lead_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function esc(s = "") {
  return s.replace(/[&<>"'`=\/]/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;", "/": "&#x2F;", "`": "&#x60;", "=": "&#x3D;"
  }[m]));
}
function sanitizeSingleLine(value, maxLen) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen); }
function sanitizeMessage(value, maxLen) { return String(value ?? "").replace(/\r/g, "").trim().slice(0, maxLen); }
function normalizeBudget(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return Number.NaN;
  return Math.round(n);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.ip || "unknown";
}
function checkRateLimit(map, ip, windowMs, max) {
  const now = Date.now();
  const entry = map.get(ip);
  if (!entry || now > entry.expiresAt) {
    map.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  map.set(ip, entry);
  return entry.count <= max;
}

function buildContactEmail({ name, email, budget, message, createdAt, signals }) {
  return `
    <div style="margin:0;padding:24px;background:#f5f1ff;font-family:Arial,Helvetica,sans-serif;color:#181424;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(109,44,255,.12);box-shadow:0 24px 60px rgba(46,22,105,.12);">
        <div style="padding:32px;background:linear-gradient(135deg,#1a1234 0%,#6d2cff 100%);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.72;">Novo lead</div>
          <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">Contato recebido pelo portfolio</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;opacity:.82;">Pipeline: formulario → JSON → Python digest → email SMTP.</p>
        </div>
        <div style="padding:32px;">
          <div style="display:grid;gap:16px;">
            <div style="padding:16px 20px;border-radius:16px;background:#f8f5ff;border:1px solid rgba(109,44,255,.1);">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6f6694;margin-bottom:8px;">Nome</div>
              <div style="font-size:18px;font-weight:700;color:#181424;">${name}</div>
            </div>
            <div style="padding:16px 20px;border-radius:16px;background:#f8f5ff;border:1px solid rgba(109,44,255,.1);">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6f6694;margin-bottom:8px;">Email</div>
              <div style="font-size:16px;font-weight:600;color:#181424;">${email}</div>
            </div>
            <div style="padding:16px 20px;border-radius:16px;background:#f8f5ff;border:1px solid rgba(109,44,255,.1);">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6f6694;margin-bottom:8px;">Budget</div>
              <div style="font-size:16px;font-weight:700;color:#181424;">${budget}</div>
            </div>
            <div style="padding:16px 20px;border-radius:16px;background:#f8f5ff;border:1px solid rgba(109,44,255,.1);">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#6f6694;margin-bottom:8px;">Sinais (Python)</div>
              <div style="font-size:16px;font-weight:700;color:#181424;">${signals}</div>
            </div>
            <div style="padding:20px;border-radius:20px;background:#120d20;color:#f6f1ff;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#b6a8ee;margin-bottom:12px;">Descricao do projeto</div>
              <div style="font-size:15px;line-height:1.7;white-space:pre-wrap;">${message}</div>
            </div>
          </div>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(109,44,255,.12);background:#fcfbff;color:#6f6694;font-size:13px;line-height:1.6;">
          <strong style="color:#181424;display:block;margin-bottom:4px;">Recebido em</strong>
          ${createdAt}
        </div>
      </div>
    </div>
  `;
}

if (!IS_VERCEL) {
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

export default app;
