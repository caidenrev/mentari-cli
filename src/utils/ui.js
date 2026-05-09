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

export function colorize(text, color) {
    return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function bold(text) {
    return `${COLORS.bright}${text}${COLORS.reset}`;
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
    const ascii = `
${colorize('╔══════════════════════════════════════════════════════════════════════════════╗', 'darkOrange')}
${colorize('║', 'darkOrange')}                                                                                      ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${bold(colorize('███╗   ███╗███████╗███╗   ██╗████████╗ █████╗ ██████╗ ██╗', 'orange'))}     ${bold(colorize(' ██████╗██╗     ██╗', 'orange'))}    ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${bold(colorize('████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗██║', 'orange'))}     ${bold(colorize('██╔════╝██║     ██║', 'orange'))}    ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${bold(colorize('██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████║██████╔╝██║', 'orange'))}     ${bold(colorize('██║     ██║     ██║', 'orange'))}    ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${bold(colorize('██║╚██╔╝██║██╔══╝  ██║ ██╗██║   ██║   ██╔══██║██╔══██╗██║', 'orange'))}     ${bold(colorize('██║     ██║     ██║', 'orange'))}    ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${bold(colorize('██║ ╚═╝ ██║███████╗██║  ╚████║   ██║   ██║  ██║██║  ██║██║', 'orange'))}     ${bold(colorize('╚██████╗███████╗██║', 'orange'))}    ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${bold(colorize('╚═╝     ╚═╝╚══════╝╚═╝   ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝', 'orange'))}     ${bold(colorize(' ╚═════╝╚══════╝╚═╝', 'orange'))}    ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}                                                                                      ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}          ${bold(colorize('LMS AUTO-PILOT CLI v2.0 by Revan', 'orange'))}                          ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}     ${colorize('MENTARI CLI for Automation', 'gray')}                                        ${colorize('║', 'darkOrange')}
${colorize('║', 'darkOrange')}                                                                                      ${colorize('║', 'darkOrange')}
${colorize('╚══════════════════════════════════════════════════════════════════════════════╝', 'darkOrange')}`;
    return ascii;
}

export function mainMenu() {
    const menu = `
${colorize('┌─ MENU UTAMA ─────────────────────────────────────────────┐', 'orange')}
${colorize('│', 'orange')}                                                              ${colorize('│', 'orange')}
${colorize('│  ', 'orange')}${SYMBOLS.bullet}  ${bold('Scan Tugas Pending')}          ${colorize('• Cek status tugas dan absensi', 'gray')}
${colorize('│', 'orange')}                                                              ${colorize('│', 'orange')}
${colorize('│  ', 'orange')}${SYMBOLS.bullet}  ${bold('Auto-Pilot Eksekusi')}         ${colorize('• Otomasi selesaikan tugas', 'gray')}
${colorize('│', 'orange')}                                                              ${colorize('│', 'orange')}
${colorize('│  ', 'orange')}${SYMBOLS.bullet}  ${bold('Chat Bot Asisten AI')}         ${colorize('• Tanya ke AI Gemini', 'gray')}
${colorize('│', 'orange')}                                                              ${colorize('│', 'orange')}
${colorize('│  ', 'orange')}${SYMBOLS.bullet}  ${bold('Keluar')}                      ${colorize('• Tutup aplikasi', 'gray')}
${colorize('│', 'orange')}                                                              ${colorize('│', 'orange')}
${colorize('└─────────────────────────────────────────────────────────┘', 'orange')}`;
    return menu;
}

export function displayStep(step, total, title) {
    const progress = `[${colorize(step.toString(), 'orange')}/${colorize(total.toString(), 'orange')}]`;
    return `${colorize(SYMBOLS.process, 'orange')} ${progress} ${title}`;
}

export function statusBox(title, content) {
    const box = `
${colorize('┌─ ' + title + ' ─────────────────────────────────────┐', 'orange')}
${colorize('│', 'orange')} ${content.padEnd(52)} ${colorize('│', 'orange')}
${colorize('└────────────────────────────────────────────────────┘', 'orange')}`;
    return box;
}

export function separator() {
    return colorize('─'.repeat(60), 'darkOrange');
}
