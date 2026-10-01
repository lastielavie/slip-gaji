# Slip Gaji Teknisi (Standalone) — Madinah Flash

Aplikasi web standalone untuk membuat slip bagi hasil teknisi Madinah Flash dalam format PDF A4 secara offline tanpa instalasi atau server khusus.

## Panduan Penggunaan:
1. **Ekstrak File ZIP**: Ekstrak seluruh isi file zip ini ke folder komputer/laptop Anda.
2. **Buka Aplikasi**: Klik ganda (double-click) file index.html menggunakan browser modern apa saja (Google Chrome, Microsoft Edge, Mozilla Firefox, Opera, Brave, dll.).
3. **Unggah File Excel**: 
   - Klik area kotak unggah file atau seret & lepas (drag and drop) file Excel (.xlsx / .xls / .csv) perhitungan bagi hasil teknisi.
   - Sistem secara otomatis memproses sheet RAW atau sheet FINAL.
4. **Penyesuaian (Opsional)**:
   - Pilih teknisi dari dropdown untuk melihat rincian omzet, persentase akad, dan potongan.
   - Nilai omzet, persentase akad, dan potongan dapat disesuaikan langsung secara interaktif.
5. **Cetak & Unduh**:
   - Klik **Preview Slip** untuk melihat tata letak slip gaji sebelum dicetak.
   - Klik **Unduh PDF** untuk mencetak slip teknisi terpilih.
   - Klik **Unduh Semua Slip Gaji (.ZIP)** untuk men-generate seluruh slip gaji semua teknisi sekaligus dalam arsip ZIP (pilihan folder per cabang atau zip per cabang).

## Fitur & Keunggulan Standalone:
- **100% Offline**: Seluruh dependensi (SheetJS XLSX, jsPDF, JSZip, FileSaver, aset logo base64) sudah disertakan secara lokal di dalam folder vendor/ dan assets/. Tidak membutuhkan koneksi internet.
- **Portabel**: Dapat disimpan di flashdisk, Google Drive, atau folder lokal dan langsung dijalankan di komputer mana pun tanpa perlu install Node.js, Python, atau web server.
- **Desain & Tema Lengkap**: Dilengkapi dengan fitur pemilih tema warna (Light/Dark mode) dari Pandora Stack.