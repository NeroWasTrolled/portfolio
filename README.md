<h1 align="center">Gabriel França • Portfolio Freelancer</h1>

<p align="center">
  Portfolio full stack com foco em dashboards, automações e sistemas web sob medida.
</p>

<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-20+-1f2937?style=for-the-badge&logo=node.js&logoColor=83cd29">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.x-111827?style=for-the-badge&logo=express&logoColor=white">
  <img alt="Nodemailer" src="https://img.shields.io/badge/Nodemailer-SMTP-1e293b?style=for-the-badge&logo=gmail&logoColor=ea4335">
  <img alt="Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white">
</p>

---

## Visão Geral

Este projeto é um portfolio moderno para apresentar serviços de desenvolvimento, com:

- Página responsiva com tema customizável
- Formulário de contato com envio real de e-mail via SMTP
- Cálculo de orçamento automático
- Backend Express com validações e reforços de segurança
- Estrutura pronta para deploy na Vercel

---

## Principais Recursos

- Interface com animações e identidade visual personalizada
- Painel de personalização de tema (cor e intensidade do fundo)
- Seções de serviços, projetos, sobre, processo e planos
- Endpoint de contato com:
  - Validação e sanitização de dados
  - Proteção básica contra abuso (rate limit simples)
  - Armazenamento local de leads quando possível
  - Envio de e-mail com Nodemailer
- Endpoint de orçamento para cálculo rápido de proposta

---

## Tecnologias

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)

### Backend
- Node.js
- Express
- Nodemailer
- Dotenv

---

## Estrutura do Projeto

- public/: arquivos da interface (HTML, CSS, JS)
- assets/: imagens e logo
- data/: dados locais de leads em ambiente local
- server.js: servidor Express e APIs
- vercel.json: configuração de deploy para Vercel

---

## Como Rodar Localmente

### 1) Instalar dependências

npm install

### 2) Configurar variáveis de ambiente

Crie um arquivo .env na raiz com:

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
NOTIFY_TO=seu-email@gmail.com

Importante:
- Para Gmail, use senha de app (não a senha normal da conta).
- Nunca publique o arquivo .env no GitHub.

### 3) Iniciar projeto

npm run dev

A aplicação ficará disponível em:

http://localhost:3000

---

## Variáveis de Ambiente

- SMTP_HOST: host SMTP (ex.: smtp.gmail.com)
- SMTP_PORT: porta SMTP (ex.: 587)
- SMTP_USER: usuário/e-mail SMTP
- SMTP_PASS: senha SMTP (senha de app)
- NOTIFY_TO: e-mail que receberá os leads

---

## Deploy na Vercel

1. Faça push do projeto para o GitHub
2. Importe o repositório na Vercel
3. Configure as variáveis de ambiente no painel da Vercel:
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASS
   - NOTIFY_TO
4. Faça um novo deploy após salvar as variáveis
5. Teste o formulário de contato em produção

Observação:
O projeto já possui configuração para Vercel via arquivo vercel.json.

---

## Segurança e Boas Práticas

- .env está ignorado no versionamento
- Headers básicos de segurança habilitados no backend
- Validação de e-mail e normalização dos campos de contato
- Sanitização de entradas antes de processar e enviar
- Rate limit simples para reduzir spam no endpoint de contato

---

## Roadmap

- Integração com banco de dados para leads
- Painel administrativo para visualizar contatos
- Testes automatizados (API e UI)
- Links reais dos projetos no portfólio
- Métricas de performance e monitoramento

---

## Autor

Gabriel França

- Portfolio: em evolução
- E-mail: gabrielfrancasimoes@gmail.com

---

## Licença

Uso pessoal e profissional do autor.
Se quiser reutilizar partes do projeto, entre em contato.
