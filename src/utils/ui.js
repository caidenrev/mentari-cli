// UI Helper dengan warna orange dan simbol
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',  // Bold
    dim: '\x1b[2m',
    orange: '\x1b[38;5;208m',  // Orange
    darkOrange: '\x1b[38;5;166m',  // Dark Orange
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
    bgOrange: '\x1b[48;5;208m',  // Background orange
    bgDarkOrange: '\x1b[48;5;166m',
};

export const SYMBOLS = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ⓘ',
    arrow: '⟶',
    loading: '⟳',
    pending: '◯',
    process: '▶',
    skip: '⊘',
    check: '✔',
    cross: '✕',
    bullet: '●',
    pipe: '│',
    corner: '└',
};

// ─── Box drawing helpers ──────────────────────────────────────────────────────

export function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function colorize(text, color) {
    return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function bold(text) {
    return `${COLORS.bright}${text}${COLORS.reset}`;
}

/**
 * Buat kotak presisi dengan title di garis atas.
 * @param {string} title        - Judul kotak (plain text)
 * @param {string[]} rows       - Baris isi (boleh mengandung ANSI color)
 * @param {string} color        - Nama warna border (dari COLORS)
 * @param {number} [minWidth]   - Lebar minimum inner (opsional)
 */
export function drawBox(title, rows, color = 'orange', minWidth = 0) {
    const visibleLengths = rows.map(r => [...stripAnsi(r)].length);
    const titlePartLen   = title ? ('─ ' + title + ' ─').length : 0;
    const INNER_WIDTH    = Math.max(minWidth, titlePartLen, ...visibleLengths);

    const padLine = (coloredContent) => {
        const visible = [...stripAnsi(coloredContent)].length;
        return coloredContent + ' '.repeat(Math.max(0, INNER_WIDTH - visible));
    };

    const border   = colorize('│', color);
    const topInner = title
        ? ('─ ' + title + ' ─') + '─'.repeat(INNER_WIDTH - ('─ ' + title + ' ─').length)
        : '─'.repeat(INNER_WIDTH);
    const topBar   = colorize(`┌${topInner}┐`, color);
    const botBar   = colorize(`└${'─'.repeat(INNER_WIDTH)}┘`, color);

    return [topBar, ...rows.map(r => `${border}${padLine(r)}${border}`), botBar].join('\n');
}

export function header(title) {
    const line = '═'.repeat(50);
    return `${colorize(line, 'orange')}
${colorize(title, 'orange')} ${colorize(SYMBOLS.info, 'orange')}
${colorize(line, 'orange')}`;
}

export function section(title) {
    return `\n${colorize(`${SYMBOLS.arrow} ${title}`, 'orange')}`;
}

export function success(message) {
    return `${colorize(`${SYMBOLS.success}`, 'green')} ${message}`;
}

export function error(message) {
    return `${colorize(`${SYMBOLS.error}`, 'red')} ${message}`;
}

export function warning(message) {
    return `${colorize(`${SYMBOLS.warning}`, 'yellow')} ${message}`;
}

export function info(message) {
    return `${colorize(SYMBOLS.info, 'cyan')} ${message}`;
}

export function loading(message) {
    return `${colorize(SYMBOLS.loading, 'orange')} ${message}`;
}

export function log(type, message) {
    switch (type) {
        case 'success':
            return success(message);
        case 'error':
            return error(message);
        case 'warning':
            return warning(message);
        case 'info':
            return info(message);
        case 'loading':
            return loading(message);
        default:
            return message;
    }
}

export function logo() {
    // Helper: strip ANSI codes to measure visible length
    const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');

    // Box width (number of visible chars between ║ and ║, excluding the borders)
    const INNER_WIDTH = 91;

    // Pad a pre-colored string so its visible content fills INNER_WIDTH
    const padLine = (coloredContent) => {
        const visible = stripAnsi(coloredContent).length;
        const padding = INNER_WIDTH - visible;
        return coloredContent + ' '.repeat(Math.max(0, padding));
    };

    const border   = colorize('║', 'darkOrange');
    const topBar   = colorize('╔' + '═'.repeat(INNER_WIDTH) + '╗', 'darkOrange');
    const botBar   = colorize('╚' + '═'.repeat(INNER_WIDTH) + '╝', 'darkOrange');
    const emptyRow = `${border}${' '.repeat(INNER_WIDTH)}${border}`;

    // ASCII art rows (visible text only, no padding — padLine handles it)
    const rows = [
        `     ${bold(colorize('███╗   ███╗███████╗███╗   ██╗████████╗ █████╗ ██████╗ ██╗', 'orange'))}     ${bold(colorize('██████╗ ██╗     ██╗', 'orange'))}    `,
        `     ${bold(colorize('████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗██║', 'orange'))}     ${bold(colorize('██╔════╝██║     ██║', 'orange'))}    `,
        `     ${bold(colorize('██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████║██████╔╝██║', 'orange'))}     ${bold(colorize('██║     ██║     ██║', 'orange'))}    `,
        `     ${bold(colorize('██║╚██╔╝██║██╔══╝  ██║ ██╗██║   ██║   ██╔══██║██╔══██╗██║', 'orange'))}     ${bold(colorize('██║     ██║     ██║', 'orange'))}    `,
        `     ${bold(colorize('██║ ╚═╝ ██║███████╗██║  ╚████║   ██║   ██║  ██║██║  ██║██║', 'orange'))}     ${bold(colorize('╚██████╗███████╗██║', 'orange'))}    `,
        `     ${bold(colorize('╚═╝     ╚═╝╚══════╝╚═╝   ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝', 'orange'))}     ${bold(colorize('╚═════╝ ╚══════╝╚═╝', 'orange'))}    `,
    ];

    const subtitleLine  = `          ${bold(colorize('LMS AUTO-PILOT CLI v2.0 by Revan', 'orange'))}`;
    const descLine      = `     ${colorize('MENTARI CLI for Automation', 'gray')}`;

    const lines = [
        topBar,
        emptyRow,
        ...rows.map(r => `${border}${padLine(r)}${border}`),
        emptyRow,
        `${border}${padLine(subtitleLine)}${border}`,
        `${border}${padLine(descLine)}${border}`,
        emptyRow,
        botBar,
    ];

    return '\n' + lines.join('\n');
}

export function mainMenu() {
    const rows = [
        '',
        `  ${SYMBOLS.bullet}  ${bold('Scan Tugas Pending')}          ${colorize('• Cek status tugas dan absensi', 'gray')}`,
        '',
        `  ${SYMBOLS.bullet}  ${bold('Auto-Pilot Eksekusi')}         ${colorize('• Otomasi selesaikan tugas', 'gray')}`,
        '',
        `  ${SYMBOLS.bullet}  ${bold('Chat Bot Asisten AI')}         ${colorize('• Tanya ke AI Gemini', 'gray')}`,
        '',
        `  ${SYMBOLS.bullet}  ${bold('Ganti Model AI')}              ${colorize('• Pilih model Gemini lain', 'gray')}`,
        '',
        `  ${SYMBOLS.bullet}  ${bold('Keluar')}                      ${colorize('• Tutup aplikasi', 'gray')}`,
        '',
    ];
    return '\n' + drawBox('MENU UTAMA', rows, 'orange');
}

export function displayStep(step, total, title) {
    const progress = `[${colorize(step.toString(), 'orange')}/${colorize(total.toString(), 'orange')}]`;
    return `${colorize(SYMBOLS.process, 'orange')} ${progress} ${title}`;
}

export function statusBox(title, content) {
    return '\n' + drawBox(title, [` ${content}`], 'orange', 40);
}

export function separator() {
    return colorize('─'.repeat(60), 'darkOrange');
}

// ─── Chat UI ──────────────────────────────────────────────────────────────────

/**
 * Word-wrap teks ke lebar tertentu, kembalikan array baris.
 */
export function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        // Handle newline eksplisit dalam teks
        const parts = word.split('\n');
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i > 0) {
                lines.push(current);
                current = '';
            }
            if (current.length === 0) {
                current = part;
            } else if (current.length + 1 + part.length <= maxWidth) {
                current += ' ' + part;
            } else {
                lines.push(current);
                current = part;
            }
        }
    }
    if (current.length > 0) lines.push(current);
    return lines;
}

/**
 * Render bubble chat dengan box presisi.
 * role: 'user' | 'bot' | 'system'
 */
export function chatBubble(role, text) {
    const termWidth = (process.stdout.columns || 80) - 4; // -4 untuk PAD global
    const roleColors = { user: 'orange', bot: 'cyan', system: 'gray' };
    const roleLabels = { user: 'Anda', bot: 'Bot', system: 'System' };
    const color      = roleColors[role] || 'gray';
    const label      = roleLabels[role] || role;

    // Lebar inner = lebar terminal dikurangi border kiri+kanan (2 char)
    const INNER_WIDTH = termWidth - 2;

    // Word-wrap teks ke INNER_WIDTH - 2 (1 spasi padding kiri+kanan)
    const TEXT_WIDTH = INNER_WIDTH - 2;
    const wrapped = wrapText(text, TEXT_WIDTH);

    // Baris isi: 1 spasi kiri + teks + padding kanan sampai INNER_WIDTH - 1
    const border = colorize('│', color);
    const padLine = (line) => {
        const vlen = [...stripAnsi(line)].length;
        return ' ' + line + ' '.repeat(Math.max(0, INNER_WIDTH - 1 - vlen));
    };

    // Top bar: ─ Label ─ + sisa dash sampai INNER_WIDTH
    const titlePart = `─ ${label} ─`;
    const topInner  = titlePart + '─'.repeat(Math.max(0, INNER_WIDTH - titlePart.length));
    const topBar    = colorize(`┌${topInner}┐`, color);
    const botBar    = colorize(`└${'─'.repeat(INNER_WIDTH)}┘`, color);

    return [topBar, ...wrapped.map(l => `${border}${padLine(l)}${border}`), botBar].join('\n');
}
