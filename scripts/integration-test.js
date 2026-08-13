const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const ROOT = path.join(__dirname, "..");

async function main() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "outside-only",
    resources: "usable",
  });
  const { window } = dom;

  // Stub browser APIs not provided by jsdom / not needed for this test
  window.fetch = async (url) => {
    if (String(url).includes("template.docx")) {
      const buf = fs.readFileSync(path.join(ROOT, "templates", "template.docx"));
      return {
        ok: true,
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      };
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
  // HTMLFormElement.reportValidity is not implemented in jsdom
  window.HTMLFormElement.prototype.reportValidity = () => true;
  // FileReader stub (not used in this test since no file input triggered)
  class FileReaderStub { readAsDataURL() { this.onload && this.onload(); } }
  window.FileReader = FileReaderStub;

  let generatedBuffer = null;
  let downloadedName = null;
  const realCreateElement = window.document.createElement.bind(window.document);
  window.document.createElement = (tag) => {
    const el = realCreateElement(tag);
    if (tag === "a") {
      el.click = () => { downloadedName = el.download; };
    }
    return el;
  };

  // Capture the Blob content passed into createObjectURL happens above via capturedBlob

  // Load scripts in order (regulasi.js, calc.js, app.js)
  for (const f of ["js/regulasi.js", "js/calc.js", "js/app.js"]) {
    const code = fs.readFileSync(path.join(ROOT, f), "utf8");
    window.eval(code);
  }

  // Wait a tick for any async init
  await new Promise((r) => setTimeout(r, 50));

  const doc = window.document;

  // 1) Klik "Muat contoh"
  doc.getElementById("btn-load-sample").dispatchEvent(new window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  // 2) Cek ringkasan preview
  const totalText = doc.getElementById("preview-total").textContent;
  console.log("Preview total:", totalText.trim());
  if (!totalText.includes("108,112")) throw new Error("Total AK preview salah, harus 108,112. Dapat: " + totalText);

  const penetapanHtml = doc.getElementById("preview-penetapan").innerHTML;
  if (!penetapanHtml.includes("108,112")) throw new Error("Jumlah kumulatif penetapan salah");
  console.log("Preview penetapan OK (mengandung 108,112)");

  // 3) Klik generate & unduh dokumen
  doc.getElementById("btn-generate").dispatchEvent(new window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));

  if (!downloadedName) throw new Error("Dokumen tidak terunduh (nama file kosong)");
  console.log("Nama file unduhan:", downloadedName);
  if (!capturedBlob) throw new Error("Isi dokumen tidak tertangkap");

  // Simpan hasil unduhan ke disk untuk pengecekan visual
  const outPath = path.join(ROOT, "integration-test-output.docx");
  const buf = Buffer.from(await capturedBlob.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  console.log("Tersimpan ke:", outPath, "(" + buf.length + " bytes)");

  // 4) Buka lagi hasilnya dengan docxtemplater untuk pastikan valid & berisi angka yang benar
  const zip = new PizZip(buf);
  const xml = zip.file("word/document.xml").asText();
  const checks = ["108,112", "96,654", "6,25", "5,208", "58,112", "8,112"];
  checks.forEach((c) => {
    if (!xml.includes(c)) throw new Error(`Nilai "${c}" tidak ditemukan di dokumen hasil generate`);
  });
  console.log("Semua nilai kunci ditemukan di dokumen akhir:", checks.join(", "));

  console.log("\n✅ SEMUA UJI INTEGRASI LULUS");
}

main().catch((e) => {
  console.error("❌ GAGAL:", e);
  process.exit(1);
});
