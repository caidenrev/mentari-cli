import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

export async function startAuthServer() {
    console.log("\n=========================================");
    console.log("🛑 SESI BERAKHIR / DIBLOKIR CLOUDFLARE");
    console.log("=========================================");
    console.log("Silakan dapatkan token terbaru dari browser (F12 -> Network),");
    console.log("lalu paste langsung di bawah ini.\n");

    try {
        // Meminta input langsung di dalam terminal menggunakan Inquirer
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'bearer',
                message: 'Paste BEARER_TOKEN (tanpa kata Bearer):',
                validate: input => input.trim() !== '' ? true : 'Token tidak boleh kosong!'
            },
            {
                type: 'input',
                name: 'cf',
                message: 'Paste CF_CLEARANCE:',
                validate: input => input.trim() !== '' ? true : 'Cookie CF_CLEARANCE tidak boleh kosong!'
            }
        ]);

        // Bersihkan spasi atau kata "Bearer" jika user tidak sengaja meng-copy-nya
        let cleanBearer = answers.bearer.replace(/^Bearer\s+/i, '').trim();
        let cleanCf = answers.cf.trim();

        console.log("\n⏳ Menyimpan kredensial baru ke .env...");
        
        // Simpan ke file .env
        updateEnvFile(cleanBearer, cleanCf);

        return { bearerToken: cleanBearer, cfClearance: cleanCf };
    } catch (error) {
        throw new Error("Input token dibatalkan oleh user.");
    }
}

// Fungsi helper untuk menyimpan token ke file .env
function updateEnvFile(bearer, cf) {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const updateOrAppend = (key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    };

    updateOrAppend('BEARER_TOKEN', bearer);
    updateOrAppend('CF_CLEARANCE', cf);

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    
    // Langsung terapkan token baru ke memori aplikasi yang sedang berjalan
    process.env.BEARER_TOKEN = bearer;
    process.env.CF_CLEARANCE = cf;
    
    console.log("✅ Token berhasil diterapkan!\n");
}