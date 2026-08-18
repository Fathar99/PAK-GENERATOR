const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const bwipjs = require("bwip-js");

const ROOT = path.join(__dirname, "..");

async function main() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", resources: "usable" });
  const { window } = dom;

  window.fetch = async (url) => {
    if (String(url).includes("template.docx")) {
      const buf = fs.readFileSync(path.join(ROOT, "templates", "template.docx"));
      return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    }
    throw new Error("Unexpected fetch: " + url);
  };
  let capturedBlob = null;
  window.URL.createObjectURL = (blob) => { capturedBlob = blob; return "blob:stub"; };
  window.URL.revokeObjectURL = () => {};
  window.PizZip = PizZip;
  window.docxtemplater = Docxtemplater;
  window.ImageModule = ImageModule;
  window.alert = () => {};
  window.confirm = () => true;
  window.HTMLFormElement.prototype.reportValidity = () => true;

  // jsdom tidak mendukung <canvas> asli (butuh binding native) -> stub JsBarcode
  // dengan bwip-js (barcode generator berbasis JS murni) supaya alur tetap teruji.
  let lastBarcodeText = null;
  let barcodePngSync = null;
  window.JsBarcode = function (canvas, text) {
    lastBarcodeText = text;
    canvas.toDataURL = () => "data:image/png;base64," + barcodePngSync.toString("base64");
    canvas.width = 300; canvas.height = 80;
  };

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

  // Siapkan barcode PNG sinkron (bwip-js toBuffer bersifat async, generate dulu)
  barcodePngSync = await bwipjs.toBuffer({ bcid: "code128", text: "198603172009032007|NURFADILLA, S.Tr.Keb", scale: 3, height: 10, includetext: false });

  doc.getElementById("btn-generate").dispatchEvent(new window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  if (!downloadedName) throw new Error("Dokumen tidak terunduh (nama file kosong)");
  console.log("Nama file unduhan:", downloadedName);
  console.log("Teks barcode terdeteksi:", lastBarcodeText);
  if (lastBarcodeText !== "198603172009032007|NURFADILLA, S.Tr.Keb") throw new Error("Isi barcode salah: " + lastBarcodeText);
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

  // Pastikan gambar barcode benar-benar ter-embed di dalam docx (folder media)
  const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith("word/media/"));
  console.log("File media dalam docx:", mediaFiles);
  if (mediaFiles.length < 2) throw new Error("Barcode/logo tidak ter-embed (media file kurang dari 2)");

  console.log("\n✅ SEMUA UJI INTEGRASI LULUS");
}

main().catch((e) => {
  console.error("❌ GAGAL:", e);
  process.exit(1);
});
