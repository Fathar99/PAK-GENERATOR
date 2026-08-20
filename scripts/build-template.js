/**
 * Membuat templates/template.docx — replika presisi dari format PAK Integrasi
 * dan PAK Konversi yang dikirim pengguna (font Cambria, kop dengan logo asli,
 * struktur tabel bernomor romawi, dsb), ditambah placeholder barcode
 * (docxtemplater-image-module-free, tag {%barcode}) berisi NIP + Nama untuk
 * verifikasi keaslian dokumen.
 *
 * Jalankan: node scripts/build-template.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, PageBreak, VerticalAlign,
  VerticalMergeType, ShadingType, ImageRun, TableLayoutType,
} = require("docx");

const FONT = "Cambria";
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-buton.png");
const QR_PLACEHOLDER_PATH = path.join(__dirname, "..", "assets", "qr-placeholder.png");

// ---------- util dasar ----------
function txt(text, opts = {}) {
  return new TextRun({
    text: String(text), font: FONT,
    size: opts.size || 22, // 11pt default (sesuai docDefaults dokumen asli)
    bold: !!opts.bold,
  });
}
function p(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: opts.spacing !== undefined ? opts.spacing : { after: 0 },
    indent: opts.indent,
  });
}
function pageBreakPara() { return new Paragraph({ children: [new PageBreak()] }); }
function noBorders() {
  const n = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: n, bottom: n, left: n, right: n, insideHorizontal: n, insideVertical: n };
}
function cellBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return { top: b, bottom: b, left: b, right: b };
}
function grayShade() { return { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }; }
function cell(children, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.colSpan,
    verticalMerge: opts.vMerge,
    borders: cellBorders(),
    shading: opts.shade ? grayShade() : undefined,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: (Array.isArray(children) ? children : [children]).map((c) =>
      typeof c === "string" ? p(txt(c, opts.textOpts), { alignment: opts.align || AlignmentType.LEFT }) : c
    ),
  });
}

// ---------- KOP SURAT (logo asli + barcode, garis rapat) ----------
function kopSurat() {
  let logoImage;
  try {
    const logoData = fs.readFileSync(LOGO_PATH);
    logoImage = new ImageRun({ data: logoData, transformation: { width: 55, height: 78 }, type: "png" });
  } catch (e) {
    logoImage = null;
  }

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 950, type: WidthType.DXA },
          borders: noBorders(),
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({ children: logoImage ? [logoImage] : [txt("")], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 8850, type: WidthType.DXA },
          borders: noBorders(),
          verticalAlign: VerticalAlign.CENTER,
          children: [
            p(txt("PEMERINTAH KABUPATEN BUTON", { size: 36 }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
            p(txt("{kopOPD}", { size: 36, bold: true }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
            p(txt("{kopAlamat}", { size: 24 }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
          ],
        }),
      ],
    }),
  ];

  return [
    new Table({
      width: { size: 9800, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [950, 8850],
      borders: noBorders(),
      rows,
    }),
    // garis pemisah kop — border langsung menempel pada paragraf kosong tipis,
    // supaya jaraknya rapat ke teks kop (bukan baris underscore terpisah)
    new Paragraph({
      spacing: { before: 20, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "000000", space: 1 } },
      children: [txt("", { size: 4 })],
    }),
  ];
}

function judulDok(judul, nomorLine) {
  const out = [p(txt(judul, { size: 24, bold: true }), { alignment: AlignmentType.CENTER, spacing: { after: 0 } })];
  if (nomorLine) {
    out.push(p(txt(nomorLine), { alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
  } else {
    out.push(p(txt(""), { spacing: { after: 160 } }));
  }
  return out;
}

// Baris "Instansi : ... / Periode : ..." format SATU BARIS (dipakai di halaman
// Akumulasi & Penetapan)
function instansiPeriodeInline(instansiTag, periodeTag) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5500, type: WidthType.DXA },
            borders: noBorders(),
            children: [p([txt("Instansi : "), txt(`{${instansiTag}}`)], { spacing: { after: 160 } })],
          }),
          new TableCell({
            width: { size: 3800, type: WidthType.DXA },
            borders: noBorders(),
            children: [p([txt("Periode : "), txt(`{${periodeTag}}`)], { alignment: AlignmentType.RIGHT, spacing: { after: 160 } })],
          }),
        ],
      }),
    ],
  });
}

// Baris "Instansi :" / value (baris baru) — kiri, dan "Periode :" / value —
// kanan, format DUA BARIS (dipakai di halaman Konversi & Integrasi)
function instansiPeriodeDuaBaris(instansiLabel, instansiTag, periodeLabel, periodeTag) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5000, type: WidthType.DXA },
            borders: noBorders(),
            children: [
              p(txt(`${instansiLabel} :`), { spacing: { after: 0 } }),
              p(txt(`{${instansiTag}}`), { spacing: { after: 160 } }),
            ],
          }),
          new TableCell({
            width: { size: 4300, type: WidthType.DXA },
            borders: noBorders(),
            children: [
              p(txt(`${periodeLabel} :`), { alignment: AlignmentType.RIGHT, spacing: { after: 0 } }),
              p(txt(`{${periodeTag}}`), { alignment: AlignmentType.RIGHT, spacing: { after: 160 } }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ---------- Tabel data pegawai (dengan nomor urut) ----------
function headerRowFull(text, colCount) {
  return new TableRow({
    children: [cell(text, { colSpan: colCount, align: AlignmentType.CENTER, textOpts: { bold: true } })],
  });
}

// fields: [ [label, tag], ... ]  -> tag sudah termasuk "{...}"
function pegawaiTableBernomor(fields, withRomanI) {
  const rows = [];
  if (withRomanI) {
    rows.push(new TableRow({
      children: [
        cell("I", { width: 500, align: AlignmentType.CENTER }),
        cell("KETERANGAN PERORANGAN", { colSpan: 2, align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ],
    }));
    fields.forEach(([label, tagExpr], i) => {
      rows.push(new TableRow({
        children: [
          cell(String(i + 1), { width: 500, align: AlignmentType.CENTER }),
          cell(label, { width: 3800 }),
          cell(tagExpr, { width: 4700 }),
        ],
      }));
    });
    return new Table({
      width: { size: 9000, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [500, 3800, 4700],
      rows,
    });
  }
  fields.forEach(([label, tagExpr], i) => {
    rows.push(new TableRow({
      children: [
        cell(String(i + 1), { width: 500, align: AlignmentType.CENTER }),
        cell(label, { width: 3800 }),
        cell(tagExpr, { width: 4700 }),
      ],
    }));
  });
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [500, 3800, 4700],
    rows,
  });
}

// Tabel pegawai TANPA nomor urut (dipakai di Integrasi halaman 1)
function pegawaiTableTanpaNomor(fields) {
  const rows = [
    new TableRow({ children: [cell("PEJABAT FUNGSIONAL YANG DINILAI", { colSpan: 2, align: AlignmentType.CENTER, textOpts: { bold: true } })] }),
  ];
  fields.forEach(([label, tagExpr]) => {
    rows.push(new TableRow({
      children: [
        cell(label, { width: 4000 }),
        cell(tagExpr, { width: 5000 }),
      ],
    }));
  });
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [4000, 5000],
    rows,
  });
}
function signatureBlock(tempatTag, tanggalTag, jabatanExpr, namaTag, nipTag) {
  let qrImage;
  try {
    const qrData = fs.readFileSync(QR_PLACEHOLDER_PATH);
    qrImage = new ImageRun({ data: qrData, transformation: { width: 78, height: 78 }, type: "png" });
  } catch (e) {
    qrImage = null;
  }

  return [
    p(txt(""), { spacing: { before: 200, after: 0 } }),
    new Table({
      width: { size: 9800, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [4300, 1400, 4100],
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4300, type: WidthType.DXA },
              borders: noBorders(),
              children: [p(txt(""))],
            }),
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              borders: noBorders(),
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ children: qrImage ? [qrImage] : [txt("")], alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              width: { size: 4100, type: WidthType.DXA },
              borders: noBorders(),
              verticalAlign: VerticalAlign.CENTER,
              children: [
                p([txt("Ditetapkan di "), txt(`{${tempatTag}}`)], { spacing: { after: 0 } }),
                p([txt("Pada tanggal "), txt(`{${tanggalTag}}`)], { spacing: { after: 0 } }),
                p(txt(jabatanExpr), { spacing: { after: 480 } }),
                p(txt(`{${namaTag}}`, { bold: true }), { spacing: { after: 0 } }),
                p([txt("NIP "), txt(`{${nipTag}}`)], { spacing: { after: 200 } }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

function tembusanBlok(withAsli, tag1, tag2, tag3) {
  const out = [];
  if (withAsli) {
    out.push(p([txt("ASLI", { bold: true }), txt(" Penetapan Angka Kredit untuk :")], { spacing: { after: 0 } }));
    out.push(p(txt("Jabatan Fungsional yang bersangkutan"), { spacing: { after: 160 } }));
  }
  out.push(p(txt("Tembusan disampaikan kepada:"), { spacing: { after: 60 } }));
  out.push(p(txt(`1. {${tag1}}`), { spacing: { after: 0 } }));
  out.push(p(txt(`2. {${tag2}}`), { spacing: { after: 0 } }));
  out.push(p(txt(`3. {${tag3}}`), { spacing: { after: 0 } }));
  return out;
}

const FIELDS_9 = [
  ["Nama", "{nama}"],
  ["NIP", "{nip}"],
  ["Nomor Seri Karpeg", "{karpeg}"],
  ["Tempat/Tgl Lahir", "{ttl}"],
  ["Jenis Kelamin", "{jenisKelamin}"],
  ["Pangkat/Golongan Ruang/TMT", "{pangkatGolongan} / {tmtPangkat}"],
  ["Jabatan/TMT", "{jabatan}/ {tmtJabatanLabel}"],
  ["Unit Kerja", "{unitKerja}"],
  ["Instansi", "{instansi}"],
];

// ============================================================
// SECTION: PAK INTEGRASI (opsional, 3 halaman)
// ============================================================
function sectionIntegrasi() {
  const out = [];
  out.push(p(txt("{#adaIntegrasi}")));

  // --- Halaman 1 ---
  out.push(...kopSurat());
  out.push(...judulDok("PENGHITUNGAN DAN AKUMULASI ANGKA KREDIT PADA PENILAIAN INTEGRASI"));
  out.push(pegawaiTableTanpaNomor([
    ["Nama", "{nama}"], ["NIP", "{nip}"], ["Nomor Seri Karpeg", "{karpeg}"],
    ["Pangkat/Golongan Ruang/TMT", "{pangkatGolongan} / {tmtPangkat}"],
    ["Tempat/Tgl Lahir", "{ttl}"], ["Jenis Kelamin", "{jenisKelamin}"],
    ["Pendidikan", "{pendidikan}"], ["Jabatan/TMT", "{jabatan}/ {tmtJabatanLabel}"],
    ["Masa Kerja Golongan", "{masaKerjaGolongan}"], ["Unit Kerja", "{unitKerja}"],
  ]));
  out.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [3000, 3000, 3000],
    rows: [
      headerRowFull("PERHITUNGAN PENYESUAIAN ANGKA KREDIT INTEGRASI", 3),
      new TableRow({ children: [
        cell(["JUMLAH ANGKA KREDIT YANG DIPEROLEH"], { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell(["NILAI DASAR"], { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell(["ANGKA KREDIT YANG DINILAIKAN PADA PENILAIAN INTEGRASI"], { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell("1", { align: AlignmentType.CENTER, shade: true }),
        cell("2", { align: AlignmentType.CENTER, shade: true }),
        cell("3", { align: AlignmentType.CENTER, shade: true }),
      ]}),
      new TableRow({ children: [
        cell("{integrasiJumlahKonvensional}", { align: AlignmentType.CENTER, textOpts: { bold: true, size: 26 } }),
        cell("{integrasiNilaiDasar}", { align: AlignmentType.CENTER, textOpts: { bold: true, size: 26 } }),
        cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER, textOpts: { bold: true, size: 26 } }),
      ]}),
    ],
  }));
  out.push(...signatureBlock("integrasiTempatPenetapan", "integrasiTanggalPenetapan", "{jabatanPenilai}", "namaPenilai", "nipPenilai"));
  out.push(...tembusanBlok(true, "tembusan1", "tembusan2", "tembusan3"));
  out.push(pageBreakPara());

  // --- Halaman 2 ---
  out.push(...kopSurat());
  out.push(...judulDok("PENGHITUNGAN KEBUTUHAN KEKURANGAN ANGKA KREDIT"));
  out.push(instansiPeriodeDuaBaris("Instansi", "unitKerja", "Masa Penilaian", "integrasiMasaPenilaian"));
  out.push(pegawaiTableBernomor([
    ["Nama", "{nama}"], ["NIP", "{nip}"], ["Nomor Seri Karpeg", "{karpeg}"],
    ["Pangkat/Golongan Ruang/TMT", "{pangkatGolongan} / {tmtPangkat}"],
    ["Tempat/Tgl Lahir", "{ttl}"], ["Jenis Kelamin", "{jenisKelamin}"],
    ["Pendidikan", "{pendidikan}"], ["Jabatan/TMT", "{jabatan}/ {tmtJabatanLabel}"],
    ["Masa Kerja Golongan", "{masaKerjaGolongan}"], ["Unit Kerja", "{unitKerja}"],
    ["Instansi", "{instansi}"],
  ], true));
  out.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [500, 1600, 1300, 2100, 3500],
    rows: [
      headerRowFull("PERHITUNGAN PENYESUAIAN ANGKA KREDIT DARI KONVENSIONAL KE INTEGRASI", 5),
      new TableRow({ children: [
        cell("II", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("ANGKA KREDIT KONVENSIONAL", { colSpan: 2, align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("ANGKA KREDIT INTEGRASI", { colSpan: 2, align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell("", { shade: true }),
        cell("1", { align: AlignmentType.CENTER, shade: true, colSpan: 2 }),
        cell("2", { align: AlignmentType.CENTER, shade: true, colSpan: 2 }),
      ]}),
      new TableRow({ children: [
        cell("1", { align: AlignmentType.CENTER }),
        cell("Pendidikan"),
        cell("{integrasiPendidikanAK}", { align: AlignmentType.CENTER }),
        cell("Tugas Jabatan", { vMerge: VerticalMergeType.RESTART }),
        cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER, vMerge: VerticalMergeType.RESTART }),
      ]}),
      new TableRow({ children: [
        cell("2", { align: AlignmentType.CENTER }),
        cell("Tugas Pokok"),
        cell("{integrasiTugasPokokAK}", { align: AlignmentType.CENTER }),
        cell("", { vMerge: VerticalMergeType.CONTINUE }),
        cell("", { vMerge: VerticalMergeType.CONTINUE }),
      ]}),
      new TableRow({ children: [
        cell("3", { align: AlignmentType.CENTER }),
        cell("Pengembangan Profesi"),
        cell("{integrasiPengembanganProfesiAK}", { align: AlignmentType.CENTER }),
        cell("Pengembangan Profesi", {}),
        cell("", {}),
      ]}),
      new TableRow({ children: [
        cell("4", { align: AlignmentType.CENTER }),
        cell("Unsur Penunjang"),
        cell("{integrasiPenunjangAK}", { align: AlignmentType.CENTER }),
        cell("Unsur Penunjang", {}),
        cell("", {}),
      ]}),
      new TableRow({ children: [
        cell("", {}),
        cell("JUMLAH", { textOpts: { bold: true } }),
        cell("{integrasiJumlahKonvensional}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("JUMLAH", { textOpts: { bold: true } }),
        cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
    ],
  }));
  out.push(...signatureBlock("integrasiTempatPenetapan", "integrasiTanggalPenetapan", "{jabatanPenilai}", "namaPenilai", "nipPenilai"));
  out.push(...tembusanBlok(true, "tembusan1", "tembusan2", "tembusan3"));
  out.push(pageBreakPara());

  // --- Halaman 3 ---
  out.push(...kopSurat());
  out.push(...judulDok("PENETAPAN ANGKA KREDIT INTEGRASI", "NOMOR:                            {integrasiNomorSurat}"));
  out.push(instansiPeriodeDuaBaris("Instansi", "instansi", "Masa Penilaian", "integrasiMasaPenilaian"));
  out.push(pegawaiTableBernomor(FIELDS_9, false));
  out.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [500, 3900, 1150, 1150, 1150, 1150],
    rows: [
      new TableRow({ children: [
        cell("II", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("PENETAPAN ANGKA KREDIT", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("LAMA", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("BARU", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("JUMLAH", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("PERALIHAN", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell("1", { align: AlignmentType.CENTER, shade: true }), cell("2", { align: AlignmentType.CENTER, shade: true }),
        cell("3", { align: AlignmentType.CENTER, shade: true }), cell("4", { align: AlignmentType.CENTER, shade: true }),
        cell("5", { align: AlignmentType.CENTER, shade: true }), cell("6", { align: AlignmentType.CENTER, shade: true }),
      ]}),
      new TableRow({ children: [cell("1", { align: AlignmentType.CENTER }), cell("Angka Kredit yang diberikan"), cell(""), cell(""), cell(""), cell("")] }),
      new TableRow({ children: [cell("2", { align: AlignmentType.CENTER }), cell("Angka Kredit yang diperoleh dari Pengalaman"), cell(""), cell(""), cell(""), cell("")] }),
      new TableRow({ children: [cell("3", { align: AlignmentType.CENTER }), cell("Angka Kredit yang diperoleh dari Kegiatan Tugas Jabatan"), cell("0,000", { align: AlignmentType.CENTER }), cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER }), cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER }), cell("")] }),
      new TableRow({ children: [cell("4", { align: AlignmentType.CENTER }), cell("Angka Kredit yang diperoleh dari Pengembangan Profesi"), cell(""), cell(""), cell(""), cell("")] }),
      new TableRow({ children: [cell("5", { align: AlignmentType.CENTER }), cell("Angka Kredit yang diperoleh dari Kegiatan Penunjang"), cell(""), cell(""), cell(""), cell("")] }),
      new TableRow({ children: [
        cell("TOTAL ANGKA KREDIT", { colSpan: 2, align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("0,000", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("{integrasiNilaiIntegrasi}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell(""),
      ]}),
    ],
  }));
  out.push(p(txt(""), { spacing: { after: 120 } }));
  out.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [3600, 1700, 1700, 2000],
    rows: [
      new TableRow({ children: [
        cell("Keterangan", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("Pangkat", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("Jenjang Jabatan", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("Pengembangan Profesi", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell("Angka Kredit minimal yang harus dicapai untuk kenaikan pangkat / jenjang"),
        cell("{penetapanMinPangkat}", { align: AlignmentType.CENTER }),
        cell("{penetapanMinJenjang}", { align: AlignmentType.CENTER }),
        cell("", {}),
      ]}),
      new TableRow({ children: [
        cell(["Kelebihan Angka Kredit yang harus dipenuhi untuk kenaikan pangkat", "Kekurangan Angka Kredit yang harus dipenuhi untuk kenaikan Jenjang Jabatan"]),
        cell("{penetapanKelebihanPangkat}", { align: AlignmentType.CENTER }),
        cell("{penetapanKelebihanJenjang}", { align: AlignmentType.CENTER }),
        cell("0", { align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cell(["III.  {penetapanKesimpulanPangkat}"], { colSpan: 4, textOpts: { bold: true } }),
      ]}),
    ],
  }));
  out.push(...signatureBlock("integrasiTempatPenetapan", "integrasiTanggalPenetapan", "{jabatanPenilai}", "namaPenilai", "nipPenilai"));
  out.push(...tembusanBlok(true, "tembusan1", "tembusan2", "tembusan3"));

  out.push(p(txt("{/adaIntegrasi}")));
  return out;
}

function sectionAntarIntegrasiPeriode() {
  return [p(txt("{#adaIntegrasi}")), pageBreakPara(), p(txt("{/adaIntegrasi}"))];
}

// ============================================================
// SECTION: KONVERSI PREDIKAT KINERJA (loop per periode, fleksibel)
// ============================================================
function sectionKonversi() {
  const out = [];
  out.push(p(txt("{#periodeList}")));
  out.push(...kopSurat());
  out.push(...judulDok("KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT", "NOMOR:                            {nomorSurat}"));
  out.push(instansiPeriodeDuaBaris("Instansi", "instansi", "Periode", "periodeLabel"));
  out.push(pegawaiTableBernomor(FIELDS_9, false));
  out.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [2200, 2200, 2200, 2400],
    rows: [
      headerRowFull("KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT", 4),
      new TableRow({ children: [
        cell("Hasil Penilaian Kinerja", { colSpan: 2, align: AlignmentType.CENTER }),
        cell("Koefisien per Tahun", { vMerge: VerticalMergeType.RESTART, align: AlignmentType.CENTER }),
        cell("Angka Kredit yang didapat (kolom 2 x kolom 3)", { vMerge: VerticalMergeType.RESTART, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cell("PREDIKAT", { align: AlignmentType.CENTER }),
        cell("PROSENTASE", { align: AlignmentType.CENTER }),
        cell("", { vMerge: VerticalMergeType.CONTINUE }),
        cell("", { vMerge: VerticalMergeType.CONTINUE }),
      ]}),
      new TableRow({ children: [
        cell("1", { align: AlignmentType.CENTER, shade: true }), cell("2", { align: AlignmentType.CENTER, shade: true }),
        cell("3", { align: AlignmentType.CENTER, shade: true }), cell("4", { align: AlignmentType.CENTER, shade: true }),
      ]}),
      new TableRow({ children: [
        cell("{predikatLabel}", { align: AlignmentType.CENTER, textOpts: { size: 26 } }),
        cell("{pecahanBulan}", { align: AlignmentType.CENTER, textOpts: { size: 26 } }),
        cell("{koefisienTahun}", { align: AlignmentType.CENTER, textOpts: { size: 26 } }),
        cell("{angkaKredit}", { align: AlignmentType.CENTER, textOpts: { size: 26, bold: true } }),
      ]}),
    ],
  }));
  out.push(...signatureBlock("tempatPenetapan", "tanggalPenetapan", "{jabatanPenilai}", "namaPenilai", "nipPenilai"));
  out.push(...tembusanBlok(true, "tembusan1", "tembusan2", "tembusan3"));
  out.push(pageBreakPara());
  out.push(p(txt("{/periodeList}")));
  return out;
}

// ============================================================
// SECTION: AKUMULASI ANGKA KREDIT
// ============================================================
function sectionAkumulasi() {
  const out = [];
  out.push(...kopSurat());
  out.push(...judulDok("AKUMULASI ANGKA KREDIT", "NOMOR:                            {nomorSuratAkumulasi}"));
  out.push(instansiPeriodeInline("instansi", "periodeTotalLabel"));
  out.push(pegawaiTableBernomor(FIELDS_9, true));
  out.push(new Table({
    width: { size: 9800, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [1200, 2000, 1600, 1600, 1600, 1800],
    rows: [
      headerRowFull("HASIL PENILAIAN ANGKA KREDIT", 6),
      new TableRow({ children: [
        cell("HASIL PENILAIAN KINERJA", { colSpan: 4, align: AlignmentType.CENTER }),
        cell("KOEFISIEN PER TAHUN", { vMerge: VerticalMergeType.RESTART, align: AlignmentType.CENTER }),
        cell("ANGKA KREDIT YANG DIDAPAT", { vMerge: VerticalMergeType.RESTART, align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cell("TAHUN", { align: AlignmentType.CENTER }),
        cell("PERIODIK (BULAN)", { align: AlignmentType.CENTER }),
        cell("PREDIKAT", { align: AlignmentType.CENTER }),
        cell("PROSENTASE", { align: AlignmentType.CENTER }),
        cell("", { vMerge: VerticalMergeType.CONTINUE }),
        cell("", { vMerge: VerticalMergeType.CONTINUE }),
      ]}),
      new TableRow({ children: [
        cell("1", { align: AlignmentType.CENTER, shade: true }), cell("2", { align: AlignmentType.CENTER, shade: true }),
        cell("3", { align: AlignmentType.CENTER, shade: true }), cell("4", { align: AlignmentType.CENTER, shade: true }),
        cell("5", { align: AlignmentType.CENTER, shade: true }), cell("6", { align: AlignmentType.CENTER, shade: true }),
      ]}),
      // baris nilai integrasi (opsional)
      new TableRow({ children: [
        cell("{#adaIntegrasi}{integrasiTahunLabel}{/adaIntegrasi}", { align: AlignmentType.CENTER }),
        cell("{#adaIntegrasi}Nilai Integrasi{/adaIntegrasi}", { align: AlignmentType.CENTER }),
        cell(""), cell(""), cell(""),
        cell("{#adaIntegrasi}{integrasiNilaiIntegrasi}{/adaIntegrasi}", { align: AlignmentType.CENTER }),
      ]}),
      // baris per-periode (loop di dalam tabel yang sama)
      new TableRow({ children: [
        cell("{#periodeList}{tahunLabel}", { align: AlignmentType.CENTER }),
        cell("{periodikLabel}", { align: AlignmentType.CENTER }),
        cell("{predikatLabel}", { align: AlignmentType.CENTER }),
        cell("{pecahanBulan}", { align: AlignmentType.CENTER }),
        cell("{koefisienTahun}", { align: AlignmentType.CENTER }),
        cell("{angkaKredit}{/periodeList}", { align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cell("JUMLAH ANGKA KREDIT YANG DIPEROLEH", { colSpan: 5, align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("{akumulasiTotal}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
    ],
  }));
  out.push(...signatureBlock("tempatPenetapanAkhir", "tanggalPenetapanAkhir", "{jabatanPenilai}", "namaPenilai", "nipPenilai"));
  out.push(...tembusanBlok(false, "tembusanFinal1", "tembusanFinal2", "tembusanFinal3"));
  return out;
}

// ============================================================
// SECTION: PENETAPAN ANGKA KREDIT (final)
// ============================================================
function sectionPenetapan() {
  const out = [];
  out.push(pageBreakPara());
  out.push(...kopSurat());
  out.push(...judulDok("PENETAPAN ANGKA KREDIT", "NOMOR:                            {nomorSuratPenetapan}"));
  out.push(instansiPeriodeInline("instansi", "periodeTotalLabel"));
  out.push(pegawaiTableBernomor(FIELDS_9, true));
  out.push(new Table({
    width: { size: 9800, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [500, 3700, 1150, 1150, 1150, 2150],
    rows: [
      headerRowFull("HASIL PENILAIAN ANGKA KREDIT", 6),
      new TableRow({ children: [
        cell("II", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("PENETAPAN ANGKA KREDIT", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("LAMA", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("BARU", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("JUMLAH", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("KETERANGAN", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell("1", { align: AlignmentType.CENTER, shade: true }), cell("2", { align: AlignmentType.CENTER, shade: true }),
        cell("3", { align: AlignmentType.CENTER, shade: true }), cell("4", { align: AlignmentType.CENTER, shade: true }),
        cell("5", { align: AlignmentType.CENTER, shade: true }), cell("6", { align: AlignmentType.CENTER, shade: true }),
      ]}),
      new TableRow({ children: [cell("1", { align: AlignmentType.CENTER }), cell("AK Dasar yang diberikan"), cell("{penetapanAkDasarDiberikan}", { align: AlignmentType.CENTER }), cell(""), cell("{penetapanAkDasarDiberikan}", { align: AlignmentType.CENTER }), cell("")] }),
      new TableRow({ children: [cell("2", { align: AlignmentType.CENTER }), cell("AK JF lama"), cell("{penetapanAkJFLama}", { align: AlignmentType.CENTER }), cell(""), cell("{penetapanAkJFLama}", { align: AlignmentType.CENTER }), cell("")] }),
      new TableRow({ children: [cell("3", { align: AlignmentType.CENTER }), cell("AK Penyesuaian/Penyetaraan"), cell(""), cell(""), cell(""), cell("")] }),
      new TableRow({ children: [cell("4", { align: AlignmentType.CENTER }), cell("AK Konversi"), cell(""), cell("{penetapanAkKonversiBaru}", { align: AlignmentType.CENTER }), cell("{penetapanAkKonversiBaru}", { align: AlignmentType.CENTER }), cell("")] }),
      new TableRow({ children: [cell("5", { align: AlignmentType.CENTER }), cell("AK yang diperoleh dari peningkatan pendidikan"), cell(""), cell(""), cell(""), cell("")] }),
      new TableRow({ children: [
        cell("JUMLAH ANGKA KREDIT KUMULATIF", { colSpan: 2, align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("{penetapanAkJFLama}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("{penetapanAkKonversiBaru}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("{penetapanJumlahKumulatif}", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell(""),
      ]}),
    ],
  }));
  out.push(new Table({
    width: { size: 9000, type: WidthType.DXA }, layout: TableLayoutType.FIXED,
    columnWidths: [5000, 2000, 2000],
    rows: [
      new TableRow({ children: [
        cell("Keterangan", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("Pangkat", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
        cell("Jenjang Jabatan", { align: AlignmentType.CENTER, textOpts: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell("Angka Kredit Minimal yang harus dipenuhi untuk kenaikan pangkat/jenjang"),
        cell("{penetapanMinPangkat}", { align: AlignmentType.CENTER }),
        cell("{penetapanMinJenjang}", { align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [
        cell(["Kelebihan Angka Kredit yang harus dipenuhi untuk kenaikan pangkat", "Kekurangan Angka Kredit yang harus dipenuhi untuk kenaikan Jenjang Jabatan"]),
        cell("{penetapanKelebihanPangkat}", { align: AlignmentType.CENTER }),
        cell("{penetapanKelebihanJenjang}", { align: AlignmentType.CENTER }),
      ]}),
      new TableRow({ children: [cell(["{penetapanKesimpulanPangkat}", "{penetapanKesimpulanJenjang}"], { colSpan: 3, textOpts: { bold: true } })] }),
    ],
  }));
  out.push(...signatureBlock("tempatPenetapanAkhir", "tanggalPenetapanAkhir", "{jabatanPenilai}", "namaPenilai", "nipPenilai"));
  out.push(...tembusanBlok(false, "tembusanFinal1", "tembusanFinal2", "tembusanFinal3"));
  return out;
}

function build() {
  // Pastikan placeholder QR code tersedia (dibuat sekali, akan ditukar dengan
  // QR asli berisi NIP+Nama+Pangkat/Golongan secara dinamis oleh js/app.js
  // saat dokumen dibuat).
  if (!fs.existsSync(QR_PLACEHOLDER_PATH)) {
    const bwipjs = require("bwip-js");
    return bwipjs
      .toBuffer({ bcid: "qrcode", text: "PLACEHOLDER", scale: 3, includetext: false })
      .then((png) => {
        fs.writeFileSync(QR_PLACEHOLDER_PATH, png);
        return buildDocument();
      });
  }
  return buildDocument();
}

function buildDocument() {
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
          page: { size: { width: 11907, height: 16839 }, margin: { top: 700, bottom: 700, left: 1100, right: 1100 } },
        },
        children,
      },
    ],
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  });

  return Packer.toBuffer(doc).then((buf) => {
    const outPath = path.join(__dirname, "..", "templates", "template.docx");
    fs.writeFileSync(outPath, buf);
    console.log("Template ditulis ke:", outPath);
  });
}

build().catch((e) => { console.error(e); process.exit(1); });
