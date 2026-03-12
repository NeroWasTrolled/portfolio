import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]", "utf-8");

app.use(express.static(PUBLIC_DIR));
app.use(express.json({ limit: "1mb" }));

const PRICING = {
  base: 900, pages: 300, cms: 600, animations: 450, ecommerce: 1600, seo: 350, rushMultiplier: 1.35
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
  if (!name || !email || !message) return res.status(400).json({ ok:false, error:"Campos obrigatórios ausentes." });

  const record = { id: rid(), name, email, message, budget: budget ?? null, createdAt: new Date().toISOString() };
  const arr = JSON.parse(fs.readFileSync(LEADS_FILE,"utf-8")); arr.push(record);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(arr,null,2));

  try{
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT||587), secure:false,
        auth:{ user:process.env.SMTP_USER, pass:process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from: `Portfolio Bot <${process.env.SMTP_USER}>`,
        to: process.env.NOTIFY_TO || process.env.SMTP_USER,
        subject: "Novo contato do portfólio (freelance)",
        html: `
          <h2>Novo Lead</h2>
          <p><b>Nome:</b> ${esc(name)}</p>
          <p><b>Email:</b> ${esc(email)}</p>
          <p><b>Budget:</b> ${budget ? "R$ "+Number(budget).toLocaleString("pt-BR") : "não informado"}</p>
          <p><b>Mensagem:</b></p>
          <pre style="white-space:pre-wrap;font-family:inherit">${esc(message)}</pre>
          <small>${record.createdAt}</small>
        `
      });
    }
  }catch(e){ console.error("Email fail:", e.message); }

  res.json({ ok:true, id: record.id });
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

app.listen(PORT, ()=> console.log(`🚀 http://localhost:${PORT}`));
