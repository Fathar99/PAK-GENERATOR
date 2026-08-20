const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const bwipjs = require("bwip-js");

const ROOT = path.join(__dirname, "..");

async function main() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", resources: "usable" });
  const { window } = dom;

  let qrPngSync = null;
  let lastQrUrl = null;
  window.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes("template.docx")) {
      const buf = fs.readFileSync(path.join(ROOT, "templates", "template.docx"));
      return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    }
    if (urlStr.includes("api.qrserver.com")) {
      lastQrUrl = urlStr;
      return { ok: true, arrayBuffer: async () => qrPngSync.buffer.slice(qrPngSync.byteOffset, qrPngSync.byteOffset + qrPngSync.byteLength) };
    }
    throw new Error("Unexpected fetch: " + url);
  };
  let capturedBlob = null;
  window.URL.createObjectURL = (blob) => { capturedBlob = blob; return "blob:stub"; };
  window.URL.revokeObjectURL = () => {};
  window.PizZip = PizZip;
  window.docxtemplater = Docxtemplater;
  window.alert = () => {};
  window.confirm = () => true;
  window.HTMLFormElement.prototype.reportValidity = () => true;

  let downloadedName = null;
  const realCreateElement = window.document.createElement.bind(window.document);
  window.document.createElement = (tag) => {
    const elx = realCreateElement(tag);
    if (tag === "a") elx.click = () => { downloadedName = elx.download; };
    return elx;
  };

  for (const f of ["js/regulasi.js", "js/calc.js", "js/app.js"]) {
    const code = fs.readFileSync(path.join(ROOT, f), "utf8");
    window.eval(code);
  }
  await new Promise((r) => setTimeout(r, 50));

  const doc = window.document;

  doc.getElementById("btn-load-sample").dispatchEvent(new window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  const totalText = doc.getElementById("preview-total").textContent;
  console.log("Preview total:", totalText.trim());
  if (!totalText.includes("108,112")) throw new Error("Total AK preview salah, harus 108,112. Dapat: " + totalText);

  const penetapanHtml = doc.getElementById("preview-penetapan").innerHTML;
  if (!penetapanHtml.includes("108,112")) throw new Error("Jumlah kumulatif penetapan salah");
  console.log("Preview penetapan OK (mengandung 108,112)");

  // Siapkan QR PNG sinkron (bwip-js toBuffer bersifat async, generate dulu)
  qrPngSync = await bwipjs.toBuffer({
    bcid: "qrcode",
    text: "NIP: 198603172009032007\nNama: NURFADILLA, S.Tr.Keb\nPangkat/Golongan: Penata Muda Tk. I, (III/b)",
    scale: 3, includetext: false,
  });

  doc.getElementById("btn-generate").dispatchEvent(new window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  if (!downloadedName) throw new Error("Dokumen tidak terunduh (nama file kosong)");
  console.log("Nama file unduhan:", downloadedName);
  console.log("URL QR API terpanggil:", lastQrUrl);
  if (!lastQrUrl || !lastQrUrl.includes("api.qrserver.com")) throw new Error("QR Code tidak dibuat lewat api.qrserver.com");
  if (!lastQrUrl.includes(encodeURIComponent("198603172009032007"))) throw new Error("Data QR tidak mengandung NIP");
  if (!capturedBlob) throw new Error("Isi dokumen tidak tertangkap");

  const outPath = path.join(ROOT, "integration-test-output.docx");
  const buf = Buffer.from(await capturedBlob.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  console.log("Tersimpan ke:", outPath, "(" + buf.length + " bytes)");

  const zip = new PizZip(buf);
  const xml = zip.file("word/document.xml").asText();
  const checks = ["108,112", "96,654", "6,25", "5,208", "58,112", "8,112", "PENATA (III/c)"];
  checks.forEach((c) => {
    if (!xml.includes(c)) throw new Error(`Nilai "${c}" tidak ditemukan di dokumen hasil generate`);
  });
  console.log("Semua nilai kunci ditemukan di dokumen akhir:", checks.join(", "));

  // Pastikan gambar QR benar-benar tertukar (bukan placeholder lagi) di dalam docx
  const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith("word/media/") && !zip.files[f].dir);
  console.log("File media dalam docx:", mediaFiles);
  if (mediaFiles.length < 2) throw new Error("QR/logo tidak ter-embed (media file kurang dari 2)");
  const ukuranFile = mediaFiles.map((f) => zip.file(f).asUint8Array().length);
  console.log("Ukuran file media:", ukuranFile);
  const adaQrTertukar = ukuranFile.some((sz) => sz === qrPngSync.length);
  if (!adaQrTertukar) throw new Error("Placeholder QR tampaknya belum tertukar dengan QR asli");

  console.log("\n✅ SEMUA UJI INTEGRASI LULUS");
}

main().catch((e) => {
  console.error("❌ GAGAL:", e);
  process.exit(1);
});
