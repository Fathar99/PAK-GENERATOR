const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const bwipjs = require("bwip-js");
const calc = require("../js/calc.js");

const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function bulanNama(iso) { const m = Number(iso.split("-")[1]); return BULAN_ID[m - 1]; }
function fmtTanggalID(iso) { const [y,m,d] = iso.split("-").map(Number); return `${String(d).padStart(2,"0")} ${BULAN_ID[m-1]} ${y}`; }

// --- Data pegawai (mengikuti contoh Nurfadilla) ---
const jenjangKey = "mahir";
const jenjangKeyAhli = "ahli_pertama";

const integrasiCalc = calc.hitungIntegrasi({
  pendidikan: 100, tugasPokok: 88.654, pengembanganProfesi: 4, penunjang: 4, nilaiDasar: 100,
});

const periodeInput = [
  { mulai: "2023-07-01", selesai: "2023-12-31", jenjang: jenjangKey, predikat: "baik", nomorSurat: "800.1.11.1/001/2024", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "2024-01-02" },
  { mulai: "2024-07-01", selesai: "2024-11-30", jenjang: jenjangKeyAhli, predikat: "baik", nomorSurat: "800.1.11.1/002/2024", tempatPenetapan: "Pasarwajo", tanggalPenetapan: "2024-12-01" },
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
  tmtJabatanLabel: "02/07/2024",
  unitKerja: "RSUD Pasarwajo Kabupaten Buton",
  instansi: "Dinas Kesehatan Kab. Buton",
  jabatanPenilai: "Kepala Dinas Kesehatan Kabupaten Buton",
  namaPenilai: "SYAFARUDDIN, SKM., M.Kes.",
  nipPenilai: "197303101998031009",
  tembusan1: "Direktur BLUD Rumah Sakit Daerah Kabupaten Buton;",
  tembusan2: "Sekretaris Tim Penilai Kinerja RSUD Kab. Buton;",
  tembusan3: "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.",
  tembusanFinal1: "Pejabat Fungsional yang bersangkutan;",
  tembusanFinal2: "Direktur BLUD RSUD;",
  tembusanFinal3: "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.",
};

const periodeList = periodeInput.map((per) => {
  const bulan = (new Date(per.selesai).getFullYear() - new Date(per.mulai).getFullYear()) * 12 +
    (new Date(per.selesai).getMonth() - new Date(per.mulai).getMonth()) + 1;
  const hasil = calc.hitungKonversiPeriode(per.jenjang, per.predikat, bulan);
  return {
    ...pegawaiRingkas,
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
  nilaiIntegrasiAwal: integrasiCalc.nilaiIntegrasi,
  periodeList: periodeList.map((p) => ({ hasil: { angkaKredit: p.angkaKreditRaw } })),
});

const penetapan = calc.hitungPenetapan({
  jenjangKey: jenjangKeyAhli,
  akDasarDiberikan: 0,
  akJFLama: integrasiCalc.nilaiIntegrasi,
  akKonversiBaru: akumulasi.totalAngkaKredit - integrasiCalc.nilaiIntegrasi,
  namaPangkatBerikutnya: "PENATA (III/c)",
});

const semuaTglMulai = periodeInput.map(p => p.mulai).sort();
const semuaTglSelesai = periodeInput.map(p => p.selesai).sort();
const periodeTotalLabel = `${fmtTanggalID(semuaTglMulai[0])} - ${fmtTanggalID(semuaTglSelesai[semuaTglSelesai.length-1])}`;

const data = {
  kopOPD: "DINAS KESEHATAN",
  kopAlamat: "Kecamatan Pasarwajo, Kabupaten Buton, Provinsi Sulawesi Tenggara",
  ...pegawaiRingkas,
  pendidikan: "D-IV Kebidanan",
  masaKerjaGolongan: "09 Tahun 07 Bulan",

  adaIntegrasi: true,
  integrasiTempatPenetapan: "Pasarwajo",
  integrasiTanggalPenetapan: "30 Juni 2023",
  integrasiNomorSurat: "800.1.11.1/000/2023",
  integrasiMasaPenilaian: "01 Januari 2021 - 30 Juni 2023",
  integrasiTahunLabel: "2023",
  integrasiPendidikanAK: calc.fmtID(100),
  integrasiTugasPokokAK: calc.fmtID(88.654),
  integrasiPengembanganProfesiAK: calc.fmtID(4),
  integrasiPenunjangAK: calc.fmtID(4),
  integrasiJumlahKonvensional: calc.fmtID(integrasiCalc.jumlahKonvensional),
  integrasiNilaiDasar: calc.fmtID(integrasiCalc.nilaiDasar),
  integrasiNilaiIntegrasi: calc.fmtID(integrasiCalc.nilaiIntegrasi),

  periodeList,
  periodeTotalLabel,

  nomorSuratAkumulasi: "800.1.11.1/003/2024",
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
  penetapanKesimpulanPangkat: penetapan.kesimpulanPangkat,
  penetapanKesimpulanJenjang: penetapan.kesimpulanJenjang,

  tempatPenetapanAkhir: "Pasarwajo",
  tanggalPenetapanAkhir: "01 Desember 2024",

  barcode: `${pegawaiRingkas.nip}|${pegawaiRingkas.nama}`,
};

async function main() {
  const barcodePng = await bwipjs.toBuffer({
    bcid: "code128",
    text: data.barcode,
    scale: 3, height: 10, includetext: false,
  });

  const imageOpts = {
    centered: false,
    getImage: () => barcodePng,
    getSize: () => [110, 32],
  };
  const imageModule = new ImageModule(imageOpts);

  const content = fs.readFileSync(path.join(__dirname, "..", "templates", "template.docx"), "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [imageModule] });

  doc.render(data);
  const buf = doc.getZip().generate({ type: "nodebuffer" });
  fs.writeFileSync(path.join(__dirname, "..", "test-output.docx"), buf);
  console.log("OK -> test-output.docx");
  console.log("Akumulasi total:", akumulasi.totalAngkaKredit, "(harus 108.112)");
  console.log("Penetapan:", penetapan);
}

main().catch((e) => { console.error("GAGAL:", e); process.exit(1); });
