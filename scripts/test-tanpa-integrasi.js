const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const bwipjs = require("bwip-js");
const calc = require("../js/calc.js");

const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function bulanNama(iso) { return BULAN_ID[Number(iso.split("-")[1]) - 1]; }
function fmtTanggalID(iso) { const [y,m,d] = iso.split("-").map(Number); return `${String(d).padStart(2,"0")} ${BULAN_ID[m-1]} ${y}`; }

// Skenario: pegawai baru langsung sistem integrasi (TANPA PAK Integrasi),
// dengan periode konversi BULANAN (menguji fleksibilitas per-bulan)
const pegawai = {
  nama: "AHMAD FAUZI, S.Kom",
  nip: "199501012020121003",
  karpeg: "-",
  ttl: "Kendari, 01 Januari 1995",
  jenisKelamin: "Laki-laki",
  pangkatGolongan: "Penata Muda (III/a)",
  tmtPangkat: "01/12/2020",
  jabatan: "Pranata Komputer Ahli Pertama",
  tmtJabatanLabel: "01/12/2020",
  unitKerja: "Dinas Komunikasi dan Informatika",
  instansi: "Dinas Kominfo Kab. Buton",
  jabatanPenilai: "Kepala Dinas Kominfo Kabupaten Buton",
  namaPenilai: "H. ANDI WIJAYA, S.T., M.T.",
  nipPenilai: "197001011995031002",
  tembusan1: "Sekretaris Dinas Kominfo;",
  tembusan2: "Kepala Bidang Aplikasi Informatika;",
  tembusan3: "Kepala Subbag Kepegawaian.",
  tembusanFinal1: "Pejabat Fungsional yang bersangkutan;",
  tembusanFinal2: "Sekretaris Dinas Kominfo;",
  tembusanFinal3: "Kepala Subbag Kepegawaian.",
};

const periodeInput = [
  { mulai: "2025-01-01", selesai: "2025-01-31", predikat: "sangat_baik", nomorSurat: "005/2025", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "2025-02-03" },
  { mulai: "2025-02-01", selesai: "2025-02-28", predikat: "baik", nomorSurat: "006/2025", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "2025-03-03" },
  { mulai: "2025-03-01", selesai: "2025-04-30", predikat: "baik", nomorSurat: "007/2025", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "2025-05-03" },
];

const jenjangKey = "ahli_pertama";
const periodeList = periodeInput.map((per) => {
  const bulan = calc.jumlahBulanInklusif(per.mulai, per.selesai);
  const hasil = calc.hitungKonversiPeriode(jenjangKey, per.predikat, bulan);
  return {
    ...pegawai,
    tahunLabel: per.mulai.slice(0, 4),
    periodikLabel: `${bulanNama(per.mulai)} - ${bulanNama(per.selesai)}`,
    periodeLabel: `${fmtTanggalID(per.mulai)} - ${fmtTanggalID(per.selesai)}`,
    predikatLabel: per.predikat.toUpperCase(),
    pecahanBulan: hasil.pecahanBulan,
    koefisienTahun: calc.fmtID(hasil.koefisienTahun),
    angkaKredit: calc.fmtID(hasil.angkaKredit),
    angkaKreditRaw: hasil.angkaKredit,
    nomorSurat: per.nomorSurat,
    tempatPenetapan: per.tempatPenetapan,
    tanggalPenetapan: fmtTanggalID(per.tanggalPenetapan),
  };
});

const akumulasi = calc.hitungAkumulasi({
  nilaiIntegrasiAwal: null, // TANPA PAK Integrasi
  periodeList: periodeList.map((p) => ({ hasil: { angkaKredit: p.angkaKreditRaw } })),
});

const penetapan = calc.hitungPenetapan({
  jenjangKey,
  akDasarDiberikan: 100,
  akJFLama: 0,
  akKonversiBaru: akumulasi.totalAngkaKredit,
});

const data = {
  kopOPD: "DINAS KOMUNIKASI DAN INFORMATIKA",
  kopAlamat: "Kecamatan Pasarwajo, Kabupaten Buton",
  ...pegawai,
  pendidikan: "S1 Ilmu Komputer",
  masaKerjaGolongan: "04 Tahun 02 Bulan",

  adaIntegrasi: false,
  integrasiTempatPenetapan: "", integrasiTanggalPenetapan: "", integrasiNomorSurat: "",
  integrasiMasaPenilaian: "", integrasiTahunLabel: "",
  integrasiPendidikanAK: "", integrasiTugasPokokAK: "", integrasiPengembanganProfesiAK: "",
  integrasiPenunjangAK: "", integrasiJumlahKonvensional: "", integrasiNilaiDasar: "", integrasiNilaiIntegrasi: "",

  periodeList,
  periodeTotalLabel: `${fmtTanggalID(periodeInput[0].mulai)} - ${fmtTanggalID(periodeInput[periodeInput.length - 1].selesai)}`,

  nomorSuratAkumulasi: "008/2025",
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
  penetapanKesimpulanPangkat: penetapan.kesimpulanPangkat,
  penetapanKesimpulanJenjang: penetapan.kesimpulanJenjang,

  tempatPenetapanAkhir: "Pasarwajo",
  tanggalPenetapanAkhir: "03 Mei 2025",

  barcode: `${pegawai.nip}|${pegawai.nama}`,
};

function tukarPlaceholderBarcode(zip, barcodeBytes) {
  const LOGO_MIN_SIZE = 50000;
  let jumlah = 0;
  Object.keys(zip.files).forEach((filename) => {
    if (!filename.startsWith("word/media/")) return;
    const file = zip.files[filename];
    if (file.dir) return;
    const content = file.asUint8Array();
    if (content.length > 0 && content.length < LOGO_MIN_SIZE) {
      zip.file(filename, barcodeBytes);
      jumlah += 1;
    }
  });
  return jumlah;
}

async function main() {
  const barcodePng = await bwipjs.toBuffer({ bcid: "code128", text: data.barcode, scale: 3, height: 10, includetext: false });

  const content = fs.readFileSync(path.join(__dirname, "..", "templates", "template.docx"), "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);

  const outZip = doc.getZip();
  const jumlahTukar = tukarPlaceholderBarcode(outZip, barcodePng);
  if (jumlahTukar === 0) throw new Error("Tidak ada placeholder barcode ditemukan!");

  const buf = outZip.generate({ type: "nodebuffer" });
  fs.writeFileSync(path.join(__dirname, "..", "test-tanpa-integrasi.docx"), buf);

  console.log("Jumlah periode bulanan:", periodeList.length);
  console.log("Detail per periode:", periodeList.map((p) => p.angkaKredit));
  console.log("Total AK:", akumulasi.totalAngkaKredit, "(harus 4.688)");
  console.log("Penetapan:", penetapan);
  if (Math.abs(akumulasi.totalAngkaKredit - 4.688) > 0.001) throw new Error("Total AK salah!");
  console.log("\n✅ Skenario tanpa integrasi + periode bulanan: OK");
}

main().catch((e) => { console.error("GAGAL:", e); process.exit(1); });
