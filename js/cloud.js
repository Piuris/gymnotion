/* Backup na nuvem via API REST do Firebase (sem SDK).
 *
 * O app continua local-first: tudo é anotado no aparelho e funciona offline. O
 * estado inteiro é enviado como uma cópia para o Firestore ao concluir treinos,
 * e pode ser restaurado em outro aparelho entrando na mesma conta.
 *
 * Usar REST em vez do SDK evita 300-400 KB de dependência e mantém o app sem
 * empacotador e sem script de CDN — que quebraria o funcionamento offline.
 */

const CLOUD_KEY = 'gymnotion.cloud';

const CLOUD = {
  idToken: null,
  refreshToken: null,
  uid: null,
  email: null,
  expiraEm: 0,
  ultimoEnvio: 0,
};

const cloudConfigurado = () => !!(FIREBASE.apiKey && FIREBASE.projectId);
const cloudLogado = () => !!(CLOUD.refreshToken && CLOUD.uid);

function cloudCarregar() {
  try {
    const raw = localStorage.getItem(CLOUD_KEY);
    if (raw) Object.assign(CLOUD, JSON.parse(raw));
  } catch (e) { /* sessão inválida: segue deslogado */ }
}

function cloudGravar() {
  try { localStorage.setItem(CLOUD_KEY, JSON.stringify(CLOUD)); }
  catch (e) { console.error('não foi possível guardar a sessão', e); }
}

function cloudEsquecer() {
  Object.assign(CLOUD, { idToken: null, refreshToken: null, uid: null, email: null, expiraEm: 0, ultimoEnvio: 0 });
  try { localStorage.removeItem(CLOUD_KEY); } catch (e) { /* nada a fazer */ }
}

/* ---------- erros em português ---------- */

const ERROS = {
  EMAIL_EXISTS: 'Esse e-mail já tem conta. Use "Entrar".',
  EMAIL_NOT_FOUND: 'Não existe conta com esse e-mail.',
  INVALID_PASSWORD: 'Senha incorreta.',
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou senha incorretos.',
  INVALID_EMAIL: 'E-mail inválido.',
  MISSING_PASSWORD: 'Digite a senha.',
  WEAK_PASSWORD: 'A senha precisa de pelo menos 6 caracteres.',
  USER_DISABLED: 'Essa conta foi desativada.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Tente de novo mais tarde.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Entre de novo.',
  USER_NOT_FOUND: 'Sua sessão expirou. Entre de novo.',
};

function traduzErro(msg) {
  const texto = String(msg || '');
  const chave = texto.split(' :')[0].trim();
  if (ERROS[chave]) return ERROS[chave];
  /* O Firestore recusa tudo até as regras de firestore.rules serem publicadas;
     a mensagem crua ("Missing or insufficient permissions") não diz o que fazer. */
  if (/insufficient permissions|PERMISSION_DENIED/i.test(texto)) {
    return 'O banco recusou o acesso. Publique as regras de firestore.rules no console do Firebase.';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(texto)) {
    return 'Sem conexão. Seus treinos estão salvos no aparelho; tente enviar depois.';
  }
  return 'Falha na nuvem: ' + (texto || 'erro desconhecido');
}

async function postJSON(url, corpo, headers) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
      body: JSON.stringify(corpo),
    });
  } catch (e) {
    throw new Error(traduzErro(e.message));
  }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(traduzErro(dados.error && dados.error.message));
  return dados;
}

/* ---------- autenticação ---------- */

const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:';

async function cloudEntrar(email, senha, criar) {
  if (!cloudConfigurado()) throw new Error('Firebase não configurado.');
  const url = AUTH_URL + (criar ? 'signUp' : 'signInWithPassword') + '?key=' + FIREBASE.apiKey;
  const r = await postJSON(url, { email: email.trim(), password: senha, returnSecureToken: true });
  Object.assign(CLOUD, {
    idToken: r.idToken,
    refreshToken: r.refreshToken,
    uid: r.localId,
    email: r.email || email.trim(),
    expiraEm: Date.now() + (Number(r.expiresIn) || 3600) * 1000,
  });
  cloudGravar();
  return CLOUD;
}

/* O idToken vale 1 hora; o refreshToken é de longa duração. */
async function cloudToken() {
  if (!cloudLogado()) throw new Error('Entre na sua conta primeiro.');
  if (CLOUD.idToken && Date.now() < CLOUD.expiraEm - 60000) return CLOUD.idToken;

  const res = await fetch('https://securetoken.googleapis.com/v1/token?key=' + FIREBASE.apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(CLOUD.refreshToken),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    cloudEsquecer();
    throw new Error(traduzErro(d.error && d.error.message));
  }
  CLOUD.idToken = d.id_token;
  CLOUD.refreshToken = d.refresh_token || CLOUD.refreshToken;
  CLOUD.uid = d.user_id || CLOUD.uid;
  CLOUD.expiraEm = Date.now() + (Number(d.expires_in) || 3600) * 1000;
  cloudGravar();
  return CLOUD.idToken;
}

/* ---------- compactação ---------- */

/* O documento do Firestore tem teto de 1 MiB. Sem compactar, alguns anos de
   treino chegariam perto disso; com gzip o arquivo fica ~10x menor. */

function paraBase64(bytes) {
  let s = '';
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
  }
  return btoa(s);
}

function deBase64(txt) {
  const bin = atob(txt);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function compactar(texto) {
  if (typeof CompressionStream !== 'function') return { formato: 'json', dados: texto };
  try {
    const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(fluxo).arrayBuffer();
    return { formato: 'gzip+base64', dados: paraBase64(new Uint8Array(buf)) };
  } catch (e) {
    return { formato: 'json', dados: texto };
  }
}

async function descompactar(formato, dados) {
  if (formato !== 'gzip+base64') return dados;
  const fluxo = new Blob([deBase64(dados)]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(fluxo).text();
}

/* ---------- Firestore ---------- */

function docURL() {
  return 'https://firestore.googleapis.com/v1/projects/' + FIREBASE.projectId
    + '/databases/(default)/documents/usuarios/' + CLOUD.uid;
}

async function cloudEnviar() {
  const token = await cloudToken();
  const bruto = exportJSON();
  const { formato, dados } = await compactar(bruto);

  if (dados.length > 900000) {
    throw new Error('Backup grande demais para um documento só. Exporte o arquivo e me avise.');
  }

  const corpo = {
    fields: {
      dados: { stringValue: dados },
      formato: { stringValue: formato },
      versao: { integerValue: '1' },
      tamanhoOriginal: { integerValue: String(bruto.length) },
      atualizadoEm: { timestampValue: new Date().toISOString() },
    },
  };

  const res = await fetch(docURL(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(corpo),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(traduzErro(d.error && d.error.message));

  CLOUD.ultimoEnvio = Date.now();
  cloudGravar();
  return { bytes: dados.length, formato };
}

async function cloudBaixar() {
  const token = await cloudToken();
  const res = await fetch(docURL(), { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 404) return null;            // conta nova, sem backup ainda
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(traduzErro(d.error && d.error.message));

  const f = d.fields || {};
  if (!f.dados) return null;
  const texto = await descompactar(
    (f.formato && f.formato.stringValue) || 'json',
    f.dados.stringValue
  );
  return {
    texto,
    atualizadoEm: f.atualizadoEm ? Date.parse(f.atualizadoEm.timestampValue) : 0,
  };
}

/* Envia sem interromper o usuário: falha em silêncio e tenta de novo depois. */
function cloudEnviarEmSegundoPlano() {
  if (!cloudConfigurado() || !cloudLogado()) return;
  cloudEnviar().catch((e) => console.warn('[nuvem] envio adiado:', e.message));
}

cloudCarregar();
