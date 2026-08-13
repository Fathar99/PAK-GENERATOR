/**
 * Membuat templates/template.docx — dokumen master berisi tag docxtemplater
 * ({tag}, {#loop}...{/loop}, {#kondisi}...{/kondisi}) yang nanti diisi oleh
 * aplikasi web (docxtemplater, berjalan di browser pengguna) memakai data
 * dari form.
 *
 * Jalankan: node scripts/build-template.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, PageBreak, HeadingLevel,
  VerticalAlign, ShadingType,
} = require("docx");

const FONT = "Arial";
const SZ = 20; // 10pt
const SZ_TITLE = 24; // 12pt

function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return { top: b, bottom: b, left: b, right: b };
}

function txt(text, opts = {}) {
  return new TextRun({ text: String(text), font: FONT, size: opts.size || SZ, bold: !!opts.bold, italics: !!opts.italics });
}

function p(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: opts.spacing || { after: 40 },
    heading: opts.heading,
  });
}

function pageBreakPara() {
  return new Paragraph({ children: [new PageBreak()] });
}

function kopSurat(pemdaTag, opdTag, alamatTag) {
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [p(txt("[LOGO]", { size: SZ, italics: true }), { alignment: AlignmentType.CENTER })],
              verticalAlign: VerticalAlign.CENTER,
            }),
            new TableCell({
              width: { size: 85, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [
                p(txt(`{${pemdaTag}}`, { size: SZ_TITLE, bold: true }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
                p(txt(`{${opdTag}}`, { size: SZ_TITLE + 4, bold: true }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
                p(txt(`{${alamatTag}}`, { size: SZ }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
              ],
              verticalAlign: VerticalAlign.CENTER,
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" } },
      spacing: { after: 200 },
      children: [new TextRun({ text: "", size: SZ })],
    }),
  ];
}

function judulDok(judul, subjudul) {
  const arr = [p(txt(judul, { size: SZ_TITLE, bold: true }), { alignment: AlignmentType.CENTER })];
  if (subjudul) arr.push(p(txt(subjudul, { size: SZ, bold: true }), { alignment: AlignmentType.CENTER }));
  return arr;
}

function dataPegawaiTable(prefix = "") {
  const rows = [
    ["Nama", `{nama}`],
    ["NIP", `{nip}`],
    ["Nomor Seri Karpeg", `{karpeg}`],
    ["Tempat/Tgl Lahir", `{ttl}`],
    ["Jenis Kelamin", `{jenisKelamin}`],
    ["Pendidikan", `{pendidikan}`],
    ["Pangkat/Golongan Ruang/TMT", `{pangkatGolongan} / {tmtPangkat}`],
    ["Jabatan/TMT", `{jabatan} / {tmtJabatan}`],
    ["Masa Kerja Golongan", `{masaKerjaGolongan}`],
    ["Unit Kerja", `{unitKerja}`],
    ["Instansi", `{instansi}`],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [500, 5000, 500, 4300],
    rows: rows.map((r, i) => new TableRow({
      children: [
        new TableCell({ width: { size: 500, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(String(i + 1)))] }),
        new TableCell({ width: { size: 5000, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(r[0]))] }),
        new TableCell({ width: { size: 500, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(":"))] }),
        new TableCell({ width: { size: 4300, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(r[1]))] }),
      ],
    })),
  });
}

function ttdBlok(tempatTag, tanggalTag, jabatanPenilaiTag, namaPenilaiTag, nipPenilaiTag) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              p(txt("ASLI Penetapan Angka Kredit untuk :", { bold: true })),
              p(txt("Jabatan Fungsional yang bersangkutan")),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              p(txt(`Ditetapkan di ${"{" + tempatTag + "}"}`), { alignment: AlignmentType.LEFT }),
              p(txt(`Pada tanggal {${tanggalTag}}`)),
              p(txt("")),
              p(txt(`{${jabatanPenilaiTag}}`, { bold: true })),
              p(txt("")),
              p(txt("")),
              p(txt(`{${namaPenilaiTag}}`, { bold: true })),
              p(txt(`NIP {${nipPenilaiTag}}`)),
            ],
          }),
        ],
      }),
    ],
  });
}

function tembusan() {
  return [
    p(txt("Tembusan disampaikan kepada:")),
    p(txt("1. {tembusan1}")),
    p(txt("2. {tembusan2}")),
    p(txt("3. {tembusan3}")),
  ];
}

// ---------- SECTION: PAK INTEGRASI (opsional) ----------
function sectionIntegrasi() {
  const out = [];
  out.push(p(txt("{#adaIntegrasi}")));

  // Halaman 1: Penghitungan & Akumulasi AK Penilaian Integrasi
  out.push(...kopSurat("kopPemda", "kopOPD", "kopAlamat"));
  out.push(...judulDok("PENGHITUNGAN DAN AKUMULASI ANGKA KREDIT PADA PENILAIAN INTEGRASI"));
  out.push(dataPegawaiTable());
  out.push(p(txt("")));
  out.push(p(txt("PERHITUNGAN PENYESUAIAN ANGKA KREDIT INTEGRASI", { bold: true })));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Jumlah Angka Kredit yang Diperoleh (Konvensional)", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Nilai Dasar", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Angka Kredit yang Dinilaikan pada Penilaian Integrasi", { bold: true }))] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiJumlahKonvensional}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiNilaiDasar}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiNilaiIntegrasi}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(ttdBlok("integrasiTempatPenetapan", "integrasiTanggalPenetapan", "jabatanPenilai", "namaPenilai", "nipPenilai"));
  out.push(p(txt("")));
  out.push(...tembusan());
  out.push(pageBreakPara());

  // Halaman 2: Penghitungan Kebutuhan Kekurangan Angka Kredit (rincian komponen konvensional)
  out.push(...kopSurat("kopPemda", "kopOPD", "kopAlamat"));
  out.push(...judulDok("PENGHITUNGAN KEBUTUHAN KEKURANGAN ANGKA KREDIT"));
  out.push(dataPegawaiTable());
  out.push(p(txt("")));
  out.push(p(txt("PERHITUNGAN PENYESUAIAN ANGKA KREDIT DARI KONVENSIONAL KE INTEGRASI", { bold: true })));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Komponen Angka Kredit Konvensional", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Nilai", { bold: true }))] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("1. Pendidikan"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiPendidikanAK}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("2. Tugas Pokok"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiTugasPokokAK}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("3. Pengembangan Profesi"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiPengembanganProfesiAK}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("4. Unsur Penunjang"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiPenunjangAK}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("JUMLAH", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiJumlahKonvensional}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(ttdBlok("integrasiTempatPenetapan", "integrasiTanggalPenetapan", "jabatanPenilai", "namaPenilai", "nipPenilai"));
  out.push(p(txt("")));
  out.push(...tembusan());
  out.push(pageBreakPara());

  // Halaman 3: Penetapan Angka Kredit Integrasi
  out.push(...kopSurat("kopPemda", "kopOPD", "kopAlamat"));
  out.push(...judulDok("PENETAPAN ANGKA KREDIT INTEGRASI", "Nomor: {integrasiNomorSurat}"));
  out.push(dataPegawaiTable());
  out.push(p(txt("")));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Penetapan Angka Kredit", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("LAMA", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("BARU", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("JUMLAH", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Angka Kredit yang diperoleh dari Kegiatan Tugas Jabatan"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("0,000"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiNilaiIntegrasi}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{integrasiNilaiIntegrasi}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(ttdBlok("integrasiTempatPenetapan", "integrasiTanggalPenetapan", "jabatanPenilai", "namaPenilai", "nipPenilai"));
  out.push(p(txt("")));
  out.push(...tembusan());

  out.push(p(txt("{/adaIntegrasi}")));
  return out;
}

function sectionAntarIntegrasiPeriode() {
  // Sisipkan page break HANYA jika section integrasi benar-benar dirender,
  // supaya tidak muncul halaman kosong ketika PAK Integrasi dinonaktifkan.
  return [p(txt("{#adaIntegrasi}")), pageBreakPara(), p(txt("{/adaIntegrasi}"))];
}

// ---------- SECTION: KONVERSI (loop per periode, fleksibel) ----------
function sectionKonversi() {
  const out = [];
  out.push(p(txt("{#periodeList}")));
  out.push(...kopSurat("kopPemda", "kopOPD", "kopAlamat"));
  out.push(...judulDok("KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT", "Nomor: {nomorSurat}"));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Instansi", { bold: true })), p(txt("{instansi}"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Periode", { bold: true })), p(txt("{tglMulaiLabel} - {tglSelesaiLabel}"))] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(p(txt("PEJABAT FUNGSIONAL YANG DINILAI", { bold: true })));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [500, 5000, 500, 4300],
    rows: [
      ["Nama", "{nama}"], ["NIP", "{nip}"], ["Nomor Seri Karpeg", "{karpeg}"],
      ["Tempat/Tgl Lahir", "{ttl}"], ["Jenis Kelamin", "{jenisKelamin}"],
      ["Pangkat/Golongan Ruang/TMT", "{pangkatGolongan} / {tmtPangkat}"],
      ["Jabatan/TMT", "{jabatan} / {jabatanTmtLabel}"],
      ["Unit Kerja", "{unitKerja}"], ["Instansi", "{instansi}"],
    ].map((r, i) => new TableRow({ children: [
      new TableCell({ width: { size: 500, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(String(i + 1)))] }),
      new TableCell({ width: { size: 5000, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(r[0]))] }),
      new TableCell({ width: { size: 500, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(":"))] }),
      new TableCell({ width: { size: 4300, type: WidthType.DXA }, borders: cellBorders(), children: [p(txt(r[1]))] }),
    ] })),
  }));
  out.push(p(txt("")));
  out.push(p(txt("KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT", { bold: true })));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Hasil Penilaian Kinerja", { bold: true })), p(txt("PREDIKAT", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("")), p(txt("PROSENTASE", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Koefisien per Tahun", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Angka Kredit yang didapat", { bold: true })), p(txt("(kolom 2 x kolom 3)"))] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("{predikatLabel}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{pecahanBulan}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{koefisienTahun}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{angkaKredit}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(ttdBlok("tempatPenetapan", "tanggalPenetapan", "jabatanPenilai", "namaPenilai", "nipPenilai"));
  out.push(p(txt("")));
  out.push(p(txt("Tembusan disampaikan kepada:")));
  out.push(p(txt("1. {tembusan1}")));
  out.push(p(txt("2. {tembusan2}")));
  out.push(p(txt("3. {tembusan3}")));
  out.push(pageBreakPara());
  out.push(p(txt("{/periodeList}")));
  return out;
}

// ---------- SECTION: AKUMULASI ANGKA KREDIT ----------
function sectionAkumulasi() {
  const out = [];
  out.push(...kopSurat("kopPemda", "kopOPD", "kopAlamat"));
  out.push(...judulDok("AKUMULASI ANGKA KREDIT", "Nomor: {nomorSuratAkumulasi}"));
  out.push(dataPegawaiTable());
  out.push(p(txt("")));
  out.push(p(txt("HASIL PENILAIAN ANGKA KREDIT", { bold: true })));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Uraian", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Periode / Predikat", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Angka Kredit", { bold: true }))] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("{#akumulasiBaris}{uraian}"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{keterangan}"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{nilai}{/akumulasiBaris}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("JUMLAH ANGKA KREDIT YANG DIPEROLEH", { bold: true }))], columnSpan: 2 }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{akumulasiTotal}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(ttdBlok("tempatPenetapanAkhir", "tanggalPenetapanAkhir", "jabatanPenilai", "namaPenilai", "nipPenilai"));
  out.push(p(txt("")));
  out.push(...tembusan());
  return out;
}

// ---------- SECTION: PENETAPAN ANGKA KREDIT (final) ----------
function sectionPenetapan() {
  const out = [];
  out.push(pageBreakPara());
  out.push(...kopSurat("kopPemda", "kopOPD", "kopAlamat"));
  out.push(...judulDok("PENETAPAN ANGKA KREDIT", "Nomor: {nomorSuratPenetapan}"));
  out.push(dataPegawaiTable());
  out.push(p(txt("")));
  out.push(p(txt("HASIL PENILAIAN ANGKA KREDIT", { bold: true })));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Penetapan Angka Kredit", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("LAMA", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("BARU", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("JUMLAH", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("AK Dasar yang diberikan"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkDasarDiberikan}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt(""))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkDasarDiberikan}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("AK JF Lama / AK Integrasi Awal"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkJFLama}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt(""))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkJFLama}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("AK Konversi Predikat Kinerja"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt(""))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkKonversiBaru}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkKonversiBaru}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("JUMLAH ANGKA KREDIT KUMULATIF", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkJFLama}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanAkKonversiBaru}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanJumlahKumulatif}", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Keterangan", { bold: true }))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Pangkat", { bold: true }), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("Jenjang Jabatan", { bold: true }), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Angka Kredit Minimal yang harus dipenuhi untuk kenaikan pangkat/jenjang"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanMinPangkat}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanMinJenjang}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: cellBorders(), children: [p(txt("Kelebihan/Kekurangan Angka Kredit"))] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanKelebihanPangkat}"), { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: cellBorders(), children: [p(txt("{penetapanKelebihanJenjang}"), { alignment: AlignmentType.CENTER })] }),
      ]}),
    ],
  }));
  out.push(p(txt("")));
  out.push(p(txt("{penetapanKesimpulan}", { bold: true }), { alignment: AlignmentType.CENTER }));
  out.push(p(txt("")));
  out.push(ttdBlok("tempatPenetapanAkhir", "tanggalPenetapanAkhir", "jabatanPenilai", "namaPenilai", "nipPenilai"));
  out.push(p(txt("")));
  out.push(...tembusan());
  return out;
}

function build() {
  const children = [
    ...sectionIntegrasi(),
    ...sectionAntarIntegrasiPeriode(),
    ...sectionKonversi(),
    ...sectionAkumulasi(),
    ...sectionPenetapan(),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 11907, height: 16839 }, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } }, // A4
        },
        children,
      },
    ],
    styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  });

  return Packer.toBuffer(doc).then((buf) => {
    const outPath = path.join(__dirname, "..", "templates", "template.docx");
    fs.writeFileSync(outPath, buf);
    console.log("Template ditulis ke:", outPath);
  });
}

build().catch((e) => { console.error(e); process.exit(1); });
