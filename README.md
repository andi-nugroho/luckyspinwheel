# 🎰 LuckySpinWheel Web App
**Spin & Win! 🎡**
Aplikasi web LuckySpinWheel berbasis Express.js untuk keseruan interaktif.

---

## 🚀 Langkah Instalasi

**1️⃣ Install Node.js & npm**
Pastikan Node.js dan npm terinstal pada sistem Anda dengan menjalankan perintah berikut:
```bash
sudo apt update
sudo apt install nodejs npm
```

**2️⃣ Masuk ke Folder Project**
Setelah Node.js dan npm terinstal, masuk ke folder project LuckySpinWheel:
```bash
cd LuckySpinWheel
```

**3️⃣ Install Dependency**
Install semua dependensi yang dibutuhkan untuk menjalankan aplikasi:
```bash
npm install
```

**4️⃣ Redirect Port 443 → 3000 (HTTPS ke Express)**
Karena Express berjalan di port 3000, alihkan port 443 (HTTPS) agar aplikasi dapat diakses secara publik:
```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 3000
```

**5️⃣ Jalankan Aplikasi**
Setelah semua pengaturan selesai, jalankan aplikasi dengan perintah:
```bash
npm start
```

**🌐 Akses di Browser**
Akses aplikasi LuckySpin di browser dengan menggunakan IP atau domain server:
```pgsql
https://<IP-atau-Domain-Server>
```

## Catatan Penting
 - Jika menggunakan domain, pastikan DNS sudah diarahkan ke IP server.