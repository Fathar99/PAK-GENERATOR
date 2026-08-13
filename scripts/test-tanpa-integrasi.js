const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const calc = require("../js/calc.js");

// Skenario: pegawai baru langsung sistem integrasi (TANPA PAK Integrasi),
// dengan periode konversi bulanan (fleksibel: 1 bulan, 2 bulan, dst)
const pegawai = {
  nama: "AHMAD FAUZI, S.Kom",
  nip: "199501012020121003",
  karpeg: "-",
  ttl: "Kendari, 01 Januari 1995",
  jenisKelamin: "Laki-laki",
  pangkatGolongan: "Penata Muda (III/a)",
  tmtPangkat: "01/12/2020",
  jabatan: "Pranata Komputer Ahli Pertama",
  unitKerja: "Dinas Komunikasi dan Informatika",
  instansi: "Dinas Kominfo Kab. Buton",
  jabatanPenilai: "Kepala Dinas Kominfo Kabupaten Buton",
  namaPenilai: "H. ANDI WIJAYA, S.T., M.T.",
  nipPenilai: "197001011995031002",
  tembusan1: "Sekretaris Dinas Kominfo;",
  tembusan2: "Kepala Bidang Aplikasi Informatika;",
  tembusan3: "Kepala Subbag Kepegawaian.",
};

// 3 periode BULANAN berturut-turut (menguji fleksibilitas per-bulan)
const periodeInput = [
  { tglMulaiLabel: "01 Januari 2025", tglSelesaiLabel: "31 Januari 2025", bulan: 1, predikat: "sangat_baik", nomorSurat: "005/2025", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "03 Februari 2025" },
  { tglMulaiLabel: "01 Februari 2025", tglSelesaiLabel: "28 Februari 2025", bulan: 1, predikat: "baik", nomorSurat: "006/2025", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "03 Maret 2025" },
  { tglMulaiLabel: "01 Maret 2025", tglSelesaiLabel: "30 April 2025", bulan: 2, predikat: "baik", nomorSurat: "007/2025", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "03 Mei 2025" },
];

const jenjangKey = "ahli_pertama";
const periodeList = periodeInput.map((per) => {
  const hasil = calc.hitungKonversiPeriode(jenjangKey, per.predikat, per.bulan);
  return {
    ...pegawai,
    tglMulaiLabel: per.tglMulaiLabel,
    tglSelesaiLabel: per.tglSelesaiLabel,
    predikatLabel: per.predikat.toUpperCase(),
    pecahanBulan: hasil.pecahanBulan,
    koefisienTahun: calc.fmtID(hasil.koefisienTahun),
    angkaKredit: calc.fmtID(hasil.angkaKredit),
    angkaKreditRaw: hasil.angkaKredit,
    nomorSurat: per.nomorSurat,
    tempatPenetapan: per.tempatPenetapan,
    tanggalPenetapan: per.tanggalPenetapan,
    jabatanTmtLabel: "01/12/2020",
  };
});

const akumulasi = calc.hitungAkumulasi({
  nilaiIntegrasiAwal: null, // TANPA PAK Integrasi
  periodeList: periodeList.map((p) => ({ hasil: { angkaKredit: p.angkaKreditRaw } })),
});

const akumulasiBaris = periodeList.map((p) => ({
  uraian: p.tglMulaiLabel.slice(-4),
  keterangan: `${p.tglMulaiLabel} - ${p.tglSelesaiLabel} (${p.predikatLabel})`,
  nilai: p.angkaKredit,
}));

const penetapan = calc.hitungPenetapan({
  jenjangKey,
  akDasarDiberikan: 100, // misal AK dasar dari ijazah S1 saat pengangkatan pertama
  akJFLama: 0,
  akKonversiBaru: akumulasi.totalAngkaKredit,
});

const data = {
  kopPemda: "PEMERINTAH KABUPATEN BUTON",
  kopOPD: "DINAS KOMUNIKASI DAN INFORMATIKA",
  kopAlamat: "Kecamatan Pasarwajo, Kabupaten Buton",
  ...pegawai,
  pendidikan: "S1 Ilmu Komputer",
  tmtJabatan: "01/12/2020",
  masaKerjaGolongan: "04 Tahun 02 Bulan",

  adaIntegrasi: false, // <<< TANPA PAK INTEGRASI
  integrasiTempatPenetapan: "", integrasiTanggalPenetapan: "", integrasiNomorSurat: "",
  integrasiPendidikanAK: "", integrasiTugasPokokAK: "", integrasiPengembanganProfesiAK: "",
  integrasiPenunjangAK: "", integrasiJumlahKonvensional: "", integrasiNilaiDasar: "", integrasiNilaiIntegrasi: "",

  periodeList,
  nomorSuratAkumulasi: "008/2025",
  akumulasiBaris,
  akumulasiTotal: calc.fmtID(akumulasi.totalAngkaKredit),

  nomorSuratPenetapan: "009/2025",
  penetapanAkDasarDiberikan: calc.fmtID(penetapan.akDasarDiberikan),
  penetapanAkJFLama: calc.fmtID(penetapan.akJFLama),
  penetapanAkKonversiBaru: calc.fmtID(penetapan.akKonversiBaru),
  penetapanJumlahKumulatif: calc.fmtID(penetapan.jumlahKumulatif),
  penetapanMinPangkat: calc.fmtID(penetapan.minPangkat),
  penetapanMinJenjang: calc.fmtID(penetapan.minJenjang),
  penetapanKelebihanPangkat: calc.fmtID(penetapan.kelebihanPangkat),
  penetapanKelebihanJenjang: calc.fmtID(penetapan.kelebihanJenjang),
  penetapanKesimpulan: penetapan.kesimpulan,

  tempatPenetapanAkhir: "Pasarwajo",
  tanggalPenetapanAkhir: "03 Mei 2025",
};

const content = fs.readFileSync(path.join(__dirname, "..", "templates", "template.docx"), "binary");
const zip = new PizZip(content);
const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
doc.render(data);
const buf = doc.getZip().generate({ type: "nodebuffer" });
fs.writeFileSync(path.join(__dirname, "..", "test-tanpa-integrasi.docx"), buf);

console.log("Jumlah periode bulanan:", periodeList.length, "(harus tanpa halaman integrasi)");
console.log("Total AK:", akumulasi.totalAngkaKredit, "= 1.5x12.5/12 + 1x12.5/12 + 2x12.5/12*... cek manual");
console.log("Detail per periode:", periodeList.map(p => p.angkaKredit));
console.log("Penetapan:", penetapan);
