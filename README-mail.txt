Para o formulario enviar emails de verdade, copie os valores de .env.example para um arquivo .env e preencha as credenciais SMTP.

Exemplo com Gmail:
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=seu-email@gmail.com
- SMTP_PASS=sua senha de app do Google
- NOTIFY_TO=gabrielfrancasimoes@gmail.com

Observacao:
- Senha normal do Gmail nao funciona. Use uma senha de app.
- Sem SMTP configurado, o backend agora retorna erro no envio em vez de fingir sucesso.
