import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CONTACT_DESTINATION = "gabrielfrancasimoes@gmail.com";

const __dirname = path.resolve();
const PUBLIC_DIR = path.join(__dirname, "public");
const ASSETS_DIR = path.join(__dirname, "assets");
const DATA_DIR = path.join(__dirname, "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]", "utf-8");

app.use(express.static(PUBLIC_DIR));
app.use("/assets", express.static(ASSETS_DIR));
app.use(express.json({ limit: "1mb" }));

const PRICING = {
  base: 350, pages: 120, cms: 180, animations: 90, ecommerce: 700, seo: 120, rushMultiplier: 1.2
};
function calcQuote({ pages = 1, cms = false, animations = true, ecommerce = false, seo = true, rush = false }) {
  let total = PRICING.base + Math.max(0, pages - 1) * PRICING.pages;
  if (cms) total += PRICING.cms;
  if (animations) total += PRICING.animations;
  if (ecommerce) total += PRICING.ecommerce;
  if (seo) total += PRICING.seo;
  if (rush) total *= PRICING.rushMultiplier;
  return Math.round(total);
}

app.post("/api/quote", (req,res)=>{
  try{ res.json({ ok:true, currency:"BRL", total: calcQuote(req.body||{}) }); }
  catch{ res.status(400).json({ ok:false, error:"Invalid payload" }); }
});

app.post("/api/contact", async (req,res)=>{
  const { name, email, message, budget } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ ok:false, error:"Campos obrigatorios ausentes." });

  const record = { id: rid(), name, email, message, budget: budget ?? null, createdAt: new Date().toISOString() };
  const arr = JSON.parse(fs.readFileSync(LEADS_FILE,"utf-8")); arr.push(record);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(arr,null,2));

  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass);
  if (!hasSmtpConfig) {
    return res.status(503).json({
      ok:false,
      saved:true,
      error:"O servidor ainda nao esta configurado para envio de email. Preencha o arquivo .env com as credenciais SMTP."
    });
  }

  try{
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT||587), secure:false,
      auth:{ user:process.env.SMTP_USER, pass:smtpPass }
    });
    const formattedBudget = budget ? `R$ ${Number(budget).toLocaleString("pt-BR")}` : "Nao informado";
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo"
    }).format(new Date(record.createdAt));

    await transporter.sendMail({
      from: `Portfolio Bot <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_TO || CONTACT_DESTINATION,
      replyTo: email,
      subject: `Novo lead do portfolio: ${name}`,
      text: [
        "Novo lead recebido pelo portfolio",
        `Nome: ${name}`,
        `Email: ${email}`,
        `Budget: ${formattedBudget}`,
        "",
        "Descricao do projeto:",
        message,
        "",
        `Recebido em: ${formattedDate}`
      ].join("\n"),
      html: buildContactEmail({
        name: esc(name),
        email: esc(email),
        budget: esc(formattedBudget),
        message: esc(message),
        createdAt: esc(formattedDate)
      })
    });

    res.json({ ok:true, id: record.id, message:"Mensagem enviada com sucesso para o seu email." });
  }catch(e){
    console.error("Email fail:", e.message);
    res.status(502).json({
      ok:false,
      saved:true,
      error:"Nao foi possivel enviar o email com as credenciais SMTP atuais. Revise o .env e tente novamente."
    });
  }
});

// disponibilidade simples (mock) – você pode integrar com Google Calendar depois
app.get("/api/availability", (req,res)=>{
  const today = new Date();
  const slots = Array.from({length:10}).map((_,i)=>{
    const d = new Date(today); d.setDate(d.getDate()+i);
    return { date: d.toISOString().slice(0,10), available: Math.random() > 0.35 };
  });
  res.json({ ok:true, slots });
});

function rid(){ return "lead_"+Math.random().toString(36).slice(2)+Date.now().toString(36); }
function esc(s=""){return s.replace(/[&<>"'`=\/]/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"}[m]));}
function buildContactEmail({ name, email, budget, message, createdAt }){
  return `
    <div style="margin:0;padding:24px;background:#f5f1ff;font-family:Arial,Helvetica,sans-serif;color:#181424;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(109,44,255,.12);box-shadow:0 24px 60px rgba(46,22,105,.12);">
        <div style="padding:32px;background:linear-gradient(135deg,#1a1234 0%,#6d2cff 100%);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.72;">Novo lead</div>
          <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;">Contato recebido pelo portfolio</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;opacity:.82;">As informacoes abaixo foram enviadas pelo formulario do site.</p>
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

app.listen(PORT, ()=> console.log(`🚀 http://localhost:${PORT}`));
