// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

// Hash SHA-256 de la contraseña admin (Kratos061216.KMGC)
const HASH_ADMIN = "8ab635c701e33ec4bc2618b7511c4fad1dcf641f9e87148bfe74691329ccc0c9";

// Secreto para HMAC (igual que en BarPulse.java)
const SECRETO = "KMGC-Studios-2026-BarPulse-XK9-M4P7-L2Q8";

// WhatsApp del vendedor
const WHATSAPP = "525515836670";

// ═══════════════════════════════════════════════════════════════
// UTILIDADES CRIPTOGRÁFICAS
// ═══════════════════════════════════════════════════════════════

async function sha256(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hmacSha256(datos, clave) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(clave),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(datos));
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBase32(hex) {
    const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    let buffer = 0, bitsRestantes = 0;
    let resultado = '';
    for (const b of bytes) {
        buffer = (buffer << 8) | (b & 0xFF);
        bitsRestantes += 8;
        while (bitsRestantes >= 5) {
            bitsRestantes -= 5;
            resultado += ALFABETO.charAt((buffer >> bitsRestantes) & 0x1F);
        }
    }
    if (bitsRestantes > 0) {
        resultado += ALFABETO.charAt((buffer << (5 - bitsRestantes)) & 0x1F);
    }
    return resultado;
}

// ═══════════════════════════════════════════════════════════════
// GENERACIÓN DE CLAVES (igual que BarPulse)
// ═══════════════════════════════════════════════════════════════

async function generarClave(hwid) {
    const hwidLimpio = hwid.replace(/-/g, '').toUpperCase();
    const datos = hwidLimpio + "BARPULSE" + SECRETO;
    const hash = await hmacSha256(datos, SECRETO);
    const base32 = hexToBase32(hash);
    const cuerpo = base32.substring(0, 16);

    let clave = "BP-";
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) clave += "-";
        clave += cuerpo.charAt(i);
    }
    return clave;
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════════════════════════════

function validarHWID(hwid) {
    return /^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/.test(hwid);
}

// ═══════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

function mostrarMensaje(elementId, texto, tipo) {
    const el = $(elementId);
    el.textContent = texto;
    el.className = 'message ' + tipo;
    setTimeout(() => {
        el.textContent = '';
        el.className = 'message';
    }, 3000);
}

function mostrarPantalla(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════

$('loginBtn').addEventListener('click', async () => {
    const password = $('password').value;
    if (!password) {
        mostrarMensaje('loginMessage', '⚠️ Ingresá una contraseña', 'warning');
        return;
    }

    const hash = await sha256(password);

    if (hash.toLowerCase() === HASH_ADMIN.toLowerCase()) {
        mostrarMensaje('loginMessage', '✅ Acceso concedido', 'success');
        setTimeout(() => {
            sessionStorage.setItem('adminLogged', 'true');
            mostrarPantalla('mainScreen');
            $('password').value = '';
        }, 500);
    } else {
        mostrarMensaje('loginMessage', '❌ Contraseña incorrecta', 'error');
        $('password').value = '';
    }
});

$('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('loginBtn').click();
});

$('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminLogged');
    mostrarPantalla('loginScreen');
});

// Auto-login si ya está logueado
if (sessionStorage.getItem('adminLogged') === 'true') {
    mostrarPantalla('mainScreen');
}

// ═══════════════════════════════════════════════════════════════
// GENERACIÓN
// ═══════════════════════════════════════════════════════════════

let claveActual = '';
let hwidActual = '';

$('generateBtn').addEventListener('click', async () => {
    let hwid = $('hwidInput').value.trim().toUpperCase();
    if (!hwid) {
        mostrarMensaje('generateMessage', '⚠️ Pegá un HWID primero', 'warning');
        return;
    }

    if (!validarHWID(hwid)) {
        mostrarMensaje('generateMessage', '❌ HWID inválido. Formato: XXXX-XXXX-XXXX-XXXX', 'error');
        return;
    }

    try {
        const clave = await generarClave(hwid);
        claveActual = clave;
        hwidActual = hwid;

        $('keyDisplay').textContent = clave;
        $('resultCard').style.display = 'block';
        actualizarMensaje(hwid, clave);

        mostrarMensaje('generateMessage', '✅ Clave generada correctamente', 'success');
    } catch (err) {
        mostrarMensaje('generateMessage', '❌ Error generando clave', 'error');
        console.error(err);
    }
});

$('hwidInput').addEventListener('input', e => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z2-7-]/g, '');
    val = val.replace(/-/g, '');
    let formatted = '';
    for (let i = 0; i < val.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) formatted += '-';
        formatted += val[i];
    }
    e.target.value = formatted;
});

$('hwidInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('generateBtn').click();
});

// ═══════════════════════════════════════════════════════════════
// COPIAR
// ═══════════════════════════════════════════════════════════════

$('copyKeyBtn').addEventListener('click', () => {
    if (!claveActual) return;
    navigator.clipboard.writeText(claveActual);
    mostrarMensaje('generateMessage', '✅ Clave copiada', 'success');
});

$('copyMessageBtn').addEventListener('click', () => {
    const mensaje = $('messageText').value;
    navigator.clipboard.writeText(mensaje);
    mostrarMensaje('generateMessage', '✅ Mensaje copiado', 'success');
});

// ═══════════════════════════════════════════════════════════════
// MENSAJE Y WHATSAPP
// ═══════════════════════════════════════════════════════════════

function actualizarMensaje(hwid, clave) {
    const mensaje =
        "¡Hola! 🍻 Gracias por apoyar a un programador independiente. 🙌\n\n" +
        "🔑 Tu clave:\n" +
        clave + "\n\n" +
        "📋 Activación:\n" +
        "1. Abrí BarPulse\n" +
        "2. Pegá la clave\n" +
        "3. Clic en \"✅ Activar\"\n\n" +
        "⚠️ Clave única para tu PC:\n" +
        hwid + "\n\n" +
        "💬 Dudas, comentarios o sugerencias: escribime.\n" +
        "¡Disfrutá BarPulse! 🎉\n\n" +
        "— KMGC Studios";
    $('messageText').value = mensaje;
}

$('whatsappBtn').addEventListener('click', () => {
    const mensaje = $('messageText').value;
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
});