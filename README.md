# Generator PAK (Penetapan Angka Kredit)

Aplikasi web statis untuk membuat dokumen **PAK Integrasi** (opsional) dan
**PAK Konversi Predikat Kinerja ke Angka Kredit** secara otomatis dalam
format Word (`.docx`), berdasarkan data pegawai yang diinput lewat form.

Aplikasi ini **100% berjalan di browser** (tidak ada server/backend), sehingga
bisa langsung di-deploy sebagai situs statis di **GitHub Pages**.

## Fitur

- Form input data pegawai (nama, NIP, karpeg, TTL, unit kerja, pangkat/golongan,
  jabatan, jenjang jabatan fungsional, dll).
- **Template Word replika presisi** dari format resmi Pemerintah Kabupaten
  Buton — kop surat dengan logo asli, font Cambria, struktur tabel bernomor
  romawi (I/II/III), sama seperti dokumen contoh yang dijadikan acuan.
- **QR Code keaslian dokumen** — di samping blok tanda tangan (atas Tembusan)
  setiap halaman memuat QR Code berisi NIP, Nama, dan Pangkat/Golongan
  pegawai, untuk membantu verifikasi bahwa dokumen tidak diubah/dipalsukan.
  QR dibuat lewat layanan online gratis (api.qrserver.com) dan "ditukar" ke
  dalam file `.docx` lewat manipulasi ZIP — pendekatan ini dipilih karena
  library alternatif (docxtemplater image module) punya bug lama yang belum
  diperbaiki di browser modern.
- **PAK Integrasi bersifat opsional** — bisa dinonaktifkan untuk pegawai yang
  langsung menggunakan sistem angka kredit integrasi (tanpa riwayat AK
  konvensional).
- **Periode konversi predikat kinerja fleksibel** — tambah/hapus periode
  sebanyak yang diperlukan, dengan rentang tanggal bebas (per bulan, dua
  bulan, enam bulan/semester, atau satu tahun penuh). Angka kredit dihitung
  otomatis per periode.
- Perhitungan angka kredit mengacu pada **Permenpan RB No. 1 Tahun 2023**
  (koefisien AK per jenjang & persentase predikat kinerja) dan
  **Peraturan BKN No. 3 Tahun 2023** (ambang batas AK minimal kenaikan
  pangkat/jenjang).
- Ringkasan perhitungan langsung (live preview) sebelum dokumen dibuat.
- Output dokumen Word (`.docx`) berisi: Penghitungan & Akumulasi AK Integrasi
  (jika diaktifkan), Penghitungan Kebutuhan Kekurangan AK, Penetapan AK
  Integrasi, Konversi Predikat Kinerja per periode, Akumulasi Angka Kredit,
  dan Penetapan Angka Kredit final — lengkap dengan kesimpulan otomatis
  "dapat/belum dapat dipertimbangkan untuk kenaikan pangkat" dan "...kenaikan
  jenjang jabatan" (masing-masing bisa diberi nama pangkat/jenjang tujuan).

## Struktur Proyek

```
pak-generator/
├── index.html              # Halaman utama (form + preview)
├── css/style.css            # Gaya tampilan
├── assets/
│   ├── logo-buton.png       # Logo resmi Kabupaten Buton (dipakai di kop surat)
│   └── qr-placeholder.png     # Placeholder, ditukar otomatis saat dokumen dibuat
├── js/
│   ├── regulasi.js          # Tabel koefisien AK, persentase predikat, AK minimal (BISA DIUBAH)
│   ├── calc.js               # Logika perhitungan (murni, teruji)
│   └── app.js                 # Logika form, live preview, QR Code, generate dokumen
├── templates/
│   └── template.docx        # Template Word master berisi tag docxtemplater
└── scripts/                  # Script Node.js untuk build & uji template (tidak dipakai saat runtime)
    ├── build-template.js     # Membangun ulang templates/template.docx
    ├── test-fill.js           # Uji perhitungan & QR Code skenario dengan PAK Integrasi
    ├── test-tanpa-integrasi.js # Uji perhitungan skenario tanpa PAK Integrasi (periode bulanan)
    └── integration-test.js    # Uji alur aplikasi web end-to-end (form → docx)
```

## Cara Deploy ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `pak-generator`.
2. Upload seluruh isi folder ini ke repository tersebut (via web upload,
   `git push`, atau GitHub Desktop). Struktur file harus tetap seperti di atas
   (jangan ubah nama folder `templates`, `js`, `css`).
3. Di repository, buka **Settings → Pages**.
4. Pada **Source**, pilih branch `main` (atau branch tempat Anda upload) dan
   folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, GitHub akan memberi URL seperti:
   `https://<username-anda>.github.io/pak-generator/`
6. Buka URL tersebut — aplikasi siap dipakai oleh siapa saja yang mengakses
   link tersebut, tanpa perlu instalasi apa pun.

> Aplikasi ini memuat library `pizzip` dan `docxtemplater` dari CDN
> (jsDelivr) saat halaman dibuka, dan memanggil layanan QR Code online
> (api.qrserver.com) saat tombol "Buat & Unduh Dokumen" diklik — jadi
> pengguna perlu koneksi internet aktif setiap saat memakai aplikasi ini.

## Cara Pakai

1. Isi **Kop Surat / Instansi** — nama OPD/dinas dan alamatnya (nama Pemerintah
   Kabupaten Buton sudah tetap mengikuti format resmi asli).
2. Isi **Data Pejabat Fungsional** — pilih **Jenjang Jabatan Fungsional**
   dengan benar karena ini menentukan koefisien angka kredit tahunan.
3. Jika pegawai memiliki riwayat AK konvensional (sebelum sistem integrasi),
   aktifkan **PAK Integrasi** dan isi rincian AK konvensional (pendidikan,
   tugas pokok, pengembangan profesi, penunjang). Nilai dasar otomatis
   terisi berdasarkan jenjang pendidikan, namun dapat diubah manual.
4. Tambahkan satu atau beberapa **Periode Konversi** dengan tombol
   "+ Tambah Periode Penilaian". Setiap periode bebas panjangnya (1 bulan,
   2 bulan, 6 bulan, dst) — cukup pilih tanggal mulai & selesai serta
   predikat SKP periode tersebut.
5. Lengkapi data **Pejabat Penilai** dan **Tembusan** (tembusan berbeda untuk
   dokumen Konversi/Integrasi vs. dokumen Akumulasi/Penetapan, sesuai format
   asli). Isi juga **Nama Pangkat/Jenjang Berikutnya** jika ingin kesimpulan
   otomatis menyebutkan nama pangkat/jenjang tujuan (mis. "PENATA (III/c)").
6. Periksa **Ringkasan Perhitungan** di panel kanan.
7. Klik **"Buat & Unduh Dokumen PAK (.docx)"** — dokumen Word akan otomatis
   terunduh, sudah terisi seluruh data, dilengkapi QR Code keaslian di setiap
   halaman, dan siap dicetak/ditandatangani.

## Mengubah Aturan Perhitungan (jika ada perubahan regulasi)

Semua angka acuan (koefisien AK per jenjang, persentase predikat kinerja,
AK minimal kenaikan pangkat/jenjang, nilai dasar integrasi) berada di satu
file: **`js/regulasi.js`**. Jika suatu saat ada perubahan peraturan,
cukup ubah nilai di file tersebut — tidak perlu menyentuh bagian lain
aplikasi.

## Mengubah Tampilan/Format Dokumen Word

Dokumen Word dihasilkan dari `templates/template.docx`, yang dibangun secara
terprogram oleh `scripts/build-template.js` (menggunakan library `docx`).
Untuk mengubah tata letak dokumen (misalnya menambah kolom, mengubah
kop surat, dll):

1. Edit `scripts/build-template.js`.
2. Jalankan ulang (butuh Node.js terpasang di komputer Anda, hanya untuk
   proses build ini saja — tidak memengaruhi cara kerja situs yang sudah
   di-deploy):
   ```bash
   npm install docx
   node scripts/build-template.js
   ```
3. File `templates/template.docx` akan diperbarui — commit & push perubahan
   ini ke GitHub, situs akan otomatis memakai template baru.

Alternatif lain: Anda juga bisa membuka `templates/template.docx` langsung
di Microsoft Word dan mengedit tata letak secara visual, selama nama-nama
tag (misalnya `{nama}`, `{nip}`, `{#periodeList}...{/periodeList}`) tetap
dipertahankan persis seperti semula.

## Menguji Perubahan Sebelum Deploy (opsional, untuk developer)

```bash
npm install
node scripts/test-fill.js               # Uji skenario dengan PAK Integrasi
node scripts/test-tanpa-integrasi.js     # Uji skenario tanpa PAK Integrasi
node scripts/integration-test.js         # Uji alur aplikasi web end-to-end
```

## Catatan Penting

- Aplikasi ini adalah **alat bantu**. Selalu periksa kembali hasil dokumen
  sebelum digunakan sebagai dasar administrasi resmi, terutama kalimat
  kesimpulan otomatis (Anda dapat mengganti kesimpulan dengan kalimat
  kustom lewat kolom "Kesimpulan Kustom" pada form).
- Data yang diisi di form **tidak dikirim ke server mana pun** — seluruh
  proses (perhitungan & pembuatan dokumen) terjadi di browser pengguna.
