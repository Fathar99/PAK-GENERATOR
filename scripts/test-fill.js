const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const calc = require("../js/calc.js");

// --- Data pegawai (mengikuti contoh Nurfadilla) ---
const jenjangKey = "mahir"; // Bidan Mahir
const jenjangKeyAhli = "ahli_pertama"; // setelah alih ke Ahli Pertama

// --- Hitung Integrasi ---
const integrasiCalc = calc.hitungIntegrasi({
  pendidikan: 100, tugasPokok: 88.654, pengembanganProfesi: 4, penunjang: 4, nilaiDasar: 100,
});

// --- Hitung tiap periode konversi (fleksibel: bisa macam-macam panjang) ---
const periodeInput = [
  { tahun: 2023, tglMulaiLabel: "01 Juli 2023", tglSelesaiLabel: "31 Desember 2023", bulan: 6, jenjang: jenjangKey, predikat: "baik", nomorSurat: "800.1.11.1/001/2024", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "02 Januari 2024", jabatanTmtLabel: "01/01/2021" },
  { tahun: 2024, tglMulaiLabel: "01 Juli 2024", tglSelesaiLabel: "30 November 2024", bulan: 5, jenjang: jenjangKeyAhli, predikat: "baik", nomorSurat: "800.1.11.1/002/2024", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "01 Desember 2024", jabatanTmtLabel: "02/07/2024" },
];

const pegawaiRingkas = {
  nama: "NURFADILLA, S.Tr.Keb",
  nip: "198603172009032007",
  karpeg: "P. 083721",
  ttl: "Buton, 17 Maret 1986",
  jenisKelamin: "Perempuan",
  pangkatGolongan: "Penata Muda Tk. I, (III/b)",
  tmtPangkat: "01/10/2023",
  jabatan: "Bidan Ahli Pertama",
  unitKerja: "RSUD Pasarwajo Kabupaten Buton",
  instansi: "Dinas Kesehatan Kab. Buton",
  jabatanPenilai: "Kepala Dinas Kesehatan Kabupaten Buton",
  namaPenilai: "SYAFARUDDIN, SKM., M.Kes.",
  nipPenilai: "197303101998031009",
  tembusan1: "Direktur BLUD Rumah Sakit Daerah Kabupaten Buton;",
  tembusan2: "Sekretaris Tim Penilai Kinerja RSUD Kab. Buton;",
  tembusan3: "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.",
};

const periodeList = periodeInput.map((per) => {
  const hasil = calc.hitungKonversiPeriode(per.jenjang, per.predikat, per.bulan);
  return {
    ...pegawaiRingkas,
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
    jabatanTmtLabel: per.jabatanTmtLabel,
  };
});

const akumulasi = calc.hitungAkumulasi({
  nilaiIntegrasiAwal: integrasiCalc.nilaiIntegrasi,
  periodeList: periodeList.map((p) => ({ hasil: { angkaKredit: p.angkaKreditRaw } })),
});

const akumulasiBaris = [
  { uraian: "2023 - Nilai Integrasi", keterangan: "-", nilai: calc.fmtID(integrasiCalc.nilaiIntegrasi) },
  ...periodeList.map((p) => ({
    uraian: p.tglMulaiLabel.slice(-4),
    keterangan: `${p.tglMulaiLabel} - ${p.tglSelesaiLabel} (${p.predikatLabel})`,
    nilai: p.angkaKredit,
  })),
];

const penetapan = calc.hitungPenetapan({
  jenjangKey: jenjangKeyAhli,
  akDasarDiberikan: 0,
  akJFLama: integrasiCalc.nilaiIntegrasi,
  akKonversiBaru: akumulasi.totalAngkaKredit - integrasiCalc.nilaiIntegrasi,
});

const data = {
  kopPemda: "PEMERINTAH KABUPATEN BUTON",
  kopOPD: "DINAS KESEHATAN",
  kopAlamat: "Kecamatan Pasarwajo, Kabupaten Buton, Provinsi Sulawesi Tenggara",
  nama: "NURFADILLA, S.Tr.Keb",
  nip: "198603172009032007",
  karpeg: "P. 083721",
  ttl: "Buton, 17 Maret 1986",
  jenisKelamin: "Perempuan",
  pendidikan: "D-IV Kebidanan",
  pangkatGolongan: "Penata Muda Tk. I, (III/b)",
  tmtPangkat: "01/10/2023",
  jabatan: "Bidan Ahli Pertama",
  tmtJabatan: "02/07/2024",
  masaKerjaGolongan: "09 Tahun 07 Bulan",
  unitKerja: "RSUD Pasarwajo Kabupaten Buton",
  instansi: "Dinas Kesehatan Kab. Buton",

  adaIntegrasi: true,
  integrasiTempatPenetapan: "Pasarwajo",
  integrasiTanggalPenetapan: "30 Juni 2023",
  integrasiNomorSurat: "800.1.11.1/000/2023",
  integrasiPendidikanAK: calc.fmtID(100),
  integrasiTugasPokokAK: calc.fmtID(88.654),
  integrasiPengembanganProfesiAK: calc.fmtID(4),
  integrasiPenunjangAK: calc.fmtID(4),
  integrasiJumlahKonvensional: calc.fmtID(integrasiCalc.jumlahKonvensional),
  integrasiNilaiDasar: calc.fmtID(integrasiCalc.nilaiDasar),
  integrasiNilaiIntegrasi: calc.fmtID(integrasiCalc.nilaiIntegrasi),

  periodeList,

  nomorSuratAkumulasi: "800.1.11.1/003/2024",
  akumulasiBaris,
  akumulasiTotal: calc.fmtID(akumulasi.totalAngkaKredit),

  nomorSuratPenetapan: "800.1.11.1/004/2024",
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
  tanggalPenetapanAkhir: "01 Desember 2024",
  jabatanPenilai: "Kepala Dinas Kesehatan Kabupaten Buton",
  namaPenilai: "SYAFARUDDIN, SKM., M.Kes.",
  nipPenilai: "197303101998031009",
  tembusan1: "Direktur BLUD Rumah Sakit Daerah Kabupaten Buton;",
  tembusan2: "Sekretaris Tim Penilai Kinerja RSUD Kab. Buton;",
  tembusan3: "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.",
};

const content = fs.readFileSync(path.join(__dirname, "..", "templates", "template.docx"), "binary");
const zip = new PizZip(content);
const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

doc.render(data);

const buf = doc.getZip().generate({ type: "nodebuffer" });
const outPath = path.join(__dirname, "..", "test-output.docx");
fs.writeFileSync(outPath, buf);
console.log("OK -> " + outPath);
console.log("Akumulasi total:", akumulasi.totalAngkaKredit, "(harus 108.112)");
console.log("Penetapan:", penetapan);
