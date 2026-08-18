/**
 * regulasi.js
 * Sumber acuan: Peraturan Menteri PANRB No. 1 Tahun 2023 tentang Jabatan Fungsional
 * (konversi predikat kinerja ke angka kredit tahunan, Pasal 36) dan
 * Peraturan BKN No. 3 Tahun 2023 tentang Angka Kredit, Kenaikan Pangkat, dan
 * Kenaikan Jenjang Jabatan Fungsional PNS.
 *
 * PENTING: Angka-angka di file ini adalah nilai standar yang berlaku umum.
 * Jika ada perubahan regulasi atau ketentuan khusus instansi Anda, silakan
 * sesuaikan nilai-nilai di bawah ini. Semua nilai dibuat mudah diubah supaya
 * aplikasi ini tetap valid meskipun aturan berubah di kemudian hari.
 */

// Koefisien Angka Kredit per tahun, berdasarkan jenjang jabatan fungsional
// (Lampiran Permenpan RB No. 1 Tahun 2023)
const KOEFISIEN_JENJANG = {
  // Kategori Keterampilan
  pemula:      { label: "Pemula",      kategori: "Keterampilan", koefisienTahun: 3.75,
                 akMinimalPangkat: 15,  akMinimalJenjang: null },
  terampil:    { label: "Terampil",    kategori: "Keterampilan", koefisienTahun: 5,
                 akMinimalPangkat: 20,  akMinimalJenjang: 60 },
  mahir:       { label: "Mahir",       kategori: "Keterampilan", koefisienTahun: 12.5,
                 akMinimalPangkat: 50,  akMinimalJenjang: 100 },
  penyelia:    { label: "Penyelia",    kategori: "Keterampilan", koefisienTahun: 25,
                 akMinimalPangkat: 100, akMinimalJenjang: null },
  // Kategori Keahlian
  ahli_pertama:{ label: "Ahli Pertama",kategori: "Keahlian",     koefisienTahun: 12.5,
                 akMinimalPangkat: 50,  akMinimalJenjang: 100 },
  ahli_muda:   { label: "Ahli Muda",   kategori: "Keahlian",     koefisienTahun: 25,
                 akMinimalPangkat: 100, akMinimalJenjang: 200 },
  ahli_madya:  { label: "Ahli Madya",  kategori: "Keahlian",     koefisienTahun: 37.5,
                 akMinimalPangkat: 150, akMinimalJenjang: 450 },
  ahli_utama:  { label: "Ahli Utama",  kategori: "Keahlian",     koefisienTahun: 50,
                 akMinimalPangkat: 200, akMinimalJenjang: null },
};

// Urutan jenjang untuk menentukan "jenjang berikutnya" (dipakai saat menyusun teks kesimpulan)
const URUTAN_JENJANG = {
  Keterampilan: ["pemula", "terampil", "mahir", "penyelia"],
  Keahlian: ["ahli_pertama", "ahli_muda", "ahli_madya", "ahli_utama"],
};

// Persentase konversi predikat kinerja terhadap koefisien AK tahunan
// (Permenpan RB No. 1 Tahun 2023, Pasal 36)
const PREDIKAT_SKP = {
  sangat_baik: { label: "Sangat Baik",              persen: 150 },
  baik:        { label: "Baik",                     persen: 100 },
  cukup:       { label: "Cukup / Butuh Perbaikan",  persen: 75 },
  kurang:      { label: "Kurang",                   persen: 50 },
  sangat_kurang:{ label: "Sangat Kurang",           persen: 25 },
};

// Nilai dasar default (basis pendidikan formal) untuk perhitungan PAK Integrasi
// AK Konvensional -> AK Integrasi = Jumlah AK Konvensional - Nilai Dasar
// Nilai ini bisa berbeda tergantung ketentuan instansi pembina masing-masing JF;
// disediakan sebagai default yang dapat diubah pengguna di form.
const NILAI_DASAR_DEFAULT = {
  sd: 25,
  smp: 40,
  sma_d1_d2_d3: 60,
  d4_s1: 100,
  s2: 150,
  s3: 200,
};

const REGULASI_EXPORTS = { KOEFISIEN_JENJANG, URUTAN_JENJANG, PREDIKAT_SKP, NILAI_DASAR_DEFAULT };

if (typeof module !== "undefined" && module.exports) {
  module.exports = REGULASI_EXPORTS;
}
// Di browser (dimuat sebagai <script> biasa), tempelkan juga ke window supaya
// file lain (calc.js, app.js) bisa mengaksesnya sebagai variabel global.
if (typeof window !== "undefined") {
  window.KOEFISIEN_JENJANG = KOEFISIEN_JENJANG;
  window.URUTAN_JENJANG = URUTAN_JENJANG;
  window.PREDIKAT_SKP = PREDIKAT_SKP;
  window.NILAI_DASAR_DEFAULT = NILAI_DASAR_DEFAULT;
  window.REGULASI = REGULASI_EXPORTS;
}
