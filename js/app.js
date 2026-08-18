/**
 * app.js — logika UI: form dinamis, perhitungan langsung (live), pembuatan
 * barcode (JsBarcode, berisi NIP + Nama untuk verifikasi keaslian), dan
 * pembuatan dokumen .docx di sisi browser (docxtemplater + pizzip +
 * docxtemplater-image-module-free), sehingga aplikasi ini 100% statis dan
 * bisa di-deploy di GitHub Pages tanpa server/backend.
 */
(function () {
  // Naikkan angka ini setiap kali templates/template.docx diperbarui, supaya
  // browser pengguna tidak memakai versi lama yang tersimpan di cache.
  const TEMPLATE_VERSION = "3";

  const BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  function fmtTanggalID(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return "";
    return `${String(d).padStart(2, "0")} ${BULAN_ID[m - 1]} ${y}`;
  }
  function fmtSlash(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function bulanNama(iso) {
    if (!iso) return "";
    const m = Number(iso.split("-")[1]);
    return BULAN_ID[m - 1];
  }
  function tahunOf(iso) { return iso ? iso.split("-")[0] : ""; }

  const form = document.getElementById("pak-form");
  const el = form.elements;
  const jenjangSelect = document.getElementById("jenjang-select");
  const jenjangHint = document.getElementById("jenjang-hint");
  const adaIntegrasiCheckbox = document.getElementById("ada-integrasi");
  const integrasiFields = document.getElementById("integrasi-fields");
  const nilaiDasarInput = document.getElementById("nilai-dasar-input");
  const periodeListEl = document.getElementById("periode-list");
  const btnAddPeriode = document.getElementById("btn-add-periode");
  const btnGenerate = document.getElementById("btn-generate");
  const genStatus = document.getElementById("generate-status");

  let periodeCounter = 0;
  let periodeState = [];
  let nilaiDasarManual = false;

  // ---------- Isi pilihan jenjang jabatan ----------
  function populateJenjang() {
    jenjangSelect.innerHTML = "";
    Object.entries(KOEFISIEN_JENJANG).forEach(([key, v]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${v.label} (${v.kategori}) — koef. ${PAKCalc.fmtID(v.koefisienTahun)}/thn`;
      jenjangSelect.appendChild(opt);
    });
  }
  function updateJenjangHint() {
    const j = KOEFISIEN_JENJANG[jenjangSelect.value];
    if (!j) { jenjangHint.textContent = ""; return; }
    const minJenjangTxt = j.akMinimalJenjang ? `${PAKCalc.fmtID(j.akMinimalJenjang)} AK untuk naik jenjang` : "jenjang tertinggi kategori ini";
    jenjangHint.textContent = `Koefisien AK per tahun: ${PAKCalc.fmtID(j.koefisienTahun)}. Minimal ${PAKCalc.fmtID(j.akMinimalPangkat)} AK untuk naik pangkat, ${minJenjangTxt}.`;
  }

  function updateNilaiDasarDefault() {
    if (nilaiDasarManual) return;
    const key = el.jenjangPendidikan.value;
    nilaiDasarInput.value = NILAI_DASAR_DEFAULT[key] ?? 100;
  }

  // ---------- Baris periode konversi (dinamis) ----------
  function addPeriodeRow(prefill) {
    periodeCounter += 1;
    const id = periodeCounter;
    const wrap = document.createElement("div");
    wrap.className = "periode-row";
    wrap.dataset.id = id;
    wrap.innerHTML = `
      <div class="row-head">
        <span class="row-title">Periode #${id}</span>
        <button type="button" class="btn-remove" data-remove="${id}">Hapus</button>
      </div>
      <div class="grid-4">
        <label>Tanggal Mulai
          <input type="date" name="p_mulai" required />
        </label>
        <label>Tanggal Selesai
          <input type="date" name="p_selesai" required />
        </label>
        <label>Jenjang saat periode ini
          <select name="p_jenjang"></select>
        </label>
        <label>Predikat SKP
          <select name="p_predikat"></select>
        </label>
      </div>
      <div class="grid-3">
        <label>Nomor Surat
          <input type="text" name="p_nomor" placeholder="800.1.11.1/00x/2024" />
        </label>
        <label>Tempat Penetapan
          <input type="text" name="p_tempat" placeholder="Pasarwajo" />
        </label>
        <label>Tanggal Penetapan
          <input type="date" name="p_tanggal" />
        </label>
      </div>
      <div class="periode-ak" data-role="ak-output">Angka Kredit: —</div>
    `;
    periodeListEl.appendChild(wrap);

    const jenjangSel = wrap.querySelector('select[name="p_jenjang"]');
    Object.entries(KOEFISIEN_JENJANG).forEach(([key, v]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${v.label} (${v.kategori})`;
      jenjangSel.appendChild(opt);
    });
    jenjangSel.value = jenjangSelect.value || "ahli_pertama";

    const predikatSel = wrap.querySelector('select[name="p_predikat"]');
    Object.entries(PREDIKAT_SKP).forEach(([key, v]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${v.label} (${v.persen}%)`;
      predikatSel.appendChild(opt);
    });
    predikatSel.value = "baik";

    if (prefill) {
      if (prefill.mulai) wrap.querySelector('[name="p_mulai"]').value = prefill.mulai;
      if (prefill.selesai) wrap.querySelector('[name="p_selesai"]').value = prefill.selesai;
      if (prefill.jenjang) jenjangSel.value = prefill.jenjang;
      if (prefill.predikat) predikatSel.value = prefill.predikat;
      if (prefill.nomor) wrap.querySelector('[name="p_nomor"]').value = prefill.nomor;
      if (prefill.tempat) wrap.querySelector('[name="p_tempat"]').value = prefill.tempat;
      if (prefill.tanggal) wrap.querySelector('[name="p_tanggal"]').value = prefill.tanggal;
    }

    wrap.querySelector('[data-remove]').addEventListener("click", () => {
      wrap.remove();
      periodeState = periodeState.filter((p) => p.id !== id);
      recalc();
    });
    wrap.addEventListener("input", recalc);
    wrap.addEventListener("change", recalc);

    periodeState.push({ id, el: wrap });
  }

  btnAddPeriode.addEventListener("click", () => { addPeriodeRow(); recalc(); });

  // ---------- Kalkulasi & preview langsung ----------
  function readPeriodeRows() {
    return periodeState.map(({ id, el: rowEl }) => {
      const mulai = rowEl.querySelector('[name="p_mulai"]').value;
      const selesai = rowEl.querySelector('[name="p_selesai"]').value;
      const jenjang = rowEl.querySelector('[name="p_jenjang"]').value;
      const predikat = rowEl.querySelector('[name="p_predikat"]').value;
      const nomor = rowEl.querySelector('[name="p_nomor"]').value;
      const tempat = rowEl.querySelector('[name="p_tempat"]').value;
      const tanggal = rowEl.querySelector('[name="p_tanggal"]').value;
      let bulan = 0, hasil = null;
      if (mulai && selesai && jenjang && predikat) {
        bulan = PAKCalc.jumlahBulanInklusif(mulai, selesai);
        if (bulan > 0) hasil = PAKCalc.hitungKonversiPeriode(jenjang, predikat, bulan);
      }
      return { id, el: rowEl, mulai, selesai, jenjang, predikat, nomor, tempat, tanggal, bulan, hasil };
    });
  }

  function recalc() {
    updateJenjangHint();
    updateNilaiDasarDefault();

    const rows = readPeriodeRows();
    rows.forEach((r) => {
      const out = r.el.querySelector('[data-role="ak-output"]');
      if (r.hasil) {
        out.textContent = `Angka Kredit periode ini: ${PAKCalc.fmtID(r.hasil.angkaKredit)}  (${r.bulan} bln, ${r.hasil.pecahanBulan})`;
      } else {
        out.textContent = "Lengkapi tanggal, jenjang & predikat untuk menghitung.";
      }
    });

    let nilaiIntegrasi = null;
    if (adaIntegrasiCheckbox.checked) {
      const ic = PAKCalc.hitungIntegrasi({
        pendidikan: el.integrasiPendidikanAK.value,
        tugasPokok: el.integrasiTugasPokokAK.value,
        pengembanganProfesi: el.integrasiPengembanganProfesiAK.value,
        penunjang: el.integrasiPenunjangAK.value,
        nilaiDasar: nilaiDasarInput.value,
      });
      document.getElementById("out-jumlah-konvensional").textContent = PAKCalc.fmtID(ic.jumlahKonvensional);
      document.getElementById("out-nilai-integrasi").textContent = PAKCalc.fmtID(ic.nilaiIntegrasi);
      nilaiIntegrasi = ic.nilaiIntegrasi;
    }

    const previewBody = document.querySelector("#preview-table tbody");
    previewBody.innerHTML = "";
    let total = 0;
    if (nilaiIntegrasi !== null) {
      total += nilaiIntegrasi;
      previewBody.insertAdjacentHTML("beforeend", `<tr><td>Nilai Integrasi Awal</td><td>${PAKCalc.fmtID(nilaiIntegrasi)}</td></tr>`);
    }
    rows.forEach((r, idx) => {
      if (r.hasil) {
        total += r.hasil.angkaKredit;
        const label = r.mulai && r.selesai ? `${fmtTanggalID(r.mulai)} – ${fmtTanggalID(r.selesai)}` : `Periode #${idx + 1}`;
        previewBody.insertAdjacentHTML("beforeend", `<tr><td>${label}<br><span class="muted">${PREDIKAT_SKP[r.predikat]?.label || ""}</span></td><td>${PAKCalc.fmtID(r.hasil.angkaKredit)}</td></tr>`);
      }
    });
    total = PAKCalc.round3(total);
    document.getElementById("preview-total").innerHTML = `Jumlah Angka Kredit: <strong>${PAKCalc.fmtID(total)}</strong>`;

    const akDasar = Number(el.akDasarDiberikan.value) || 0;
    const akJFLama = nilaiIntegrasi !== null ? nilaiIntegrasi : 0;
    const akKonversiBaru = PAKCalc.round3(total - akJFLama);
    const jenjangFinal = jenjangSelect.value || "ahli_pertama";
    const pen = PAKCalc.hitungPenetapan({
      jenjangKey: jenjangFinal,
      akDasarDiberikan: akDasar,
      akJFLama,
      akKonversiBaru,
      namaPangkatBerikutnya: el.namaPangkatBerikutnya.value.trim(),
      namaJenjangBerikutnya: el.namaJenjangBerikutnya.value.trim(),
    });

    document.getElementById("preview-penetapan").innerHTML = `
      <div><span>AK Dasar</span><span>${PAKCalc.fmtID(pen.akDasarDiberikan)}</span></div>
      <div><span>AK Lama (Integrasi)</span><span>${PAKCalc.fmtID(pen.akJFLama)}</span></div>
      <div><span>AK Konversi Baru</span><span>${PAKCalc.fmtID(pen.akKonversiBaru)}</span></div>
      <div><span>Jumlah Kumulatif</span><span>${PAKCalc.fmtID(pen.jumlahKumulatif)}</span></div>
      <div><span>Min. AK Pangkat</span><span>${PAKCalc.fmtID(pen.minPangkat)}</span></div>
      <div><span>Min. AK Jenjang</span><span>${pen.minJenjang !== null ? PAKCalc.fmtID(pen.minJenjang) : "—"}</span></div>
      <div class="conclusion">${pen.kesimpulanPangkat}</div>
      <div class="conclusion">${pen.kesimpulanJenjang || ""}</div>
    `;

    return { rows, nilaiIntegrasi, total, pen };
  }

  form.addEventListener("input", recalc);
  form.addEventListener("change", recalc);
  adaIntegrasiCheckbox.addEventListener("change", () => {
    integrasiFields.classList.toggle("hidden", !adaIntegrasiCheckbox.checked);
    recalc();
  });
  nilaiDasarInput.addEventListener("input", () => { nilaiDasarManual = true; });

  // ---------- Muat contoh & reset ----------
  document.getElementById("btn-load-sample").addEventListener("click", () => {
    el.kopOPD.value = "DINAS KESEHATAN";
    el.kopAlamat.value = "Kecamatan Pasarwajo, Kabupaten Buton, Provinsi Sulawesi Tenggara";
    el.nama.value = "NURFADILLA, S.Tr.Keb";
    el.nip.value = "198603172009032007";
    el.karpeg.value = "P. 083721";
    el.jenisKelamin.value = "Perempuan";
    el.tempatLahir.value = "Buton";
    el.tglLahir.value = "1986-03-17";
    el.pendidikan.value = "D-IV Kebidanan";
    el.jenjangPendidikan.value = "d4_s1";
    el.pangkatGolongan.value = "Penata Muda Tk. I, (III/b)";
    el.tmtPangkat.value = "2023-10-01";
    el.jabatan.value = "Bidan Ahli Pertama";
    el.tmtJabatan.value = "2024-07-02";
    jenjangSelect.value = "ahli_pertama";
    el.masaKerjaGolongan.value = "09 Tahun 07 Bulan";
    el.unitKerja.value = "RSUD Pasarwajo Kabupaten Buton";
    el.instansi.value = "Dinas Kesehatan Kab. Buton";

    adaIntegrasiCheckbox.checked = true;
    integrasiFields.classList.remove("hidden");
    el.integrasiNomorSurat.value = "800.1.11.1/000/2023";
    el.integrasiMasaAwal.value = "2021-01-01";
    el.integrasiMasaAkhir.value = "2023-06-30";
    el.integrasiTempatPenetapan.value = "Pasarwajo";
    el.integrasiTanggalPenetapan.value = "2023-06-30";
    el.integrasiPendidikanAK.value = 100;
    el.integrasiTugasPokokAK.value = 88.654;
    el.integrasiPengembanganProfesiAK.value = 4;
    el.integrasiPenunjangAK.value = 4;
    nilaiDasarManual = false;
    updateNilaiDasarDefault();

    periodeListEl.innerHTML = "";
    periodeState = [];
    addPeriodeRow({ mulai: "2023-07-01", selesai: "2023-12-31", jenjang: "mahir", predikat: "baik", nomor: "800.1.11.1/001/2024", tempat: "Pasarwajo", tanggal: "2024-01-02" });
    addPeriodeRow({ mulai: "2024-07-01", selesai: "2024-11-30", jenjang: "ahli_pertama", predikat: "baik", nomor: "800.1.11.1/002/2024", tempat: "Pasarwajo", tanggal: "2024-12-01" });

    el.akDasarDiberikan.value = 0;
    el.namaPangkatBerikutnya.value = "PENATA (III/c)";
    el.namaJenjangBerikutnya.value = "";
    el.nomorSuratAkumulasi.value = "800.1.11.1/003/2024";
    el.nomorSuratPenetapan.value = "800.1.11.1/004/2024";
    el.tempatPenetapanAkhir.value = "Pasarwajo";
    el.tanggalPenetapanAkhir.value = "2024-12-01";
    el.jabatanPenilai.value = "Kepala Dinas Kesehatan Kabupaten Buton";
    el.namaPenilai.value = "SYAFARUDDIN, SKM., M.Kes.";
    el.nipPenilai.value = "197303101998031009";
    el.tembusan1.value = "Direktur BLUD Rumah Sakit Daerah Kabupaten Buton;";
    el.tembusan2.value = "Sekretaris Tim Penilai Kinerja RSUD Kab. Buton;";
    el.tembusan3.value = "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.";
    el.tembusanFinal1.value = "Pejabat Fungsional yang bersangkutan;";
    el.tembusanFinal2.value = "Direktur BLUD RSUD;";
    el.tembusanFinal3.value = "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.";

    recalc();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("Kosongkan semua isian?")) return;
    form.reset();
    integrasiFields.classList.add("hidden");
    periodeListEl.innerHTML = "";
    periodeState = [];
    nilaiDasarManual = false;
    addPeriodeRow();
    recalc();
  });

  // ---------- Barcode (JsBarcode) ----------
  function buatBarcodePngBuffer(teks) {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, teks, { format: "CODE128", displayValue: false, margin: 4, height: 32, width: 1.6 });
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes: bytes.buffer, width: canvas.width, height: canvas.height };
  }

  // ---------- Generate dokumen Word ----------
  async function generateDocx() {
    if (!form.reportValidity()) return;
    const rows = readPeriodeRows();
    const usableRows = rows.filter((r) => r.hasil);
    if (usableRows.length === 0) {
      genStatus.textContent = "Tambahkan minimal satu periode konversi yang valid.";
      genStatus.className = "err";
      return;
    }

    genStatus.textContent = "Membuat dokumen...";
    genStatus.className = "";
    btnGenerate.disabled = true;

    try {
      const state = recalc();

      const pegawaiRingkas = {
        nama: el.nama.value,
        nip: el.nip.value,
        karpeg: el.karpeg.value,
        ttl: `${el.tempatLahir.value}, ${fmtTanggalID(el.tglLahir.value)}`,
        jenisKelamin: el.jenisKelamin.value,
        pangkatGolongan: el.pangkatGolongan.value,
        tmtPangkat: fmtSlash(el.tmtPangkat.value),
        jabatan: el.jabatan.value,
        tmtJabatanLabel: fmtSlash(el.tmtJabatan.value),
        unitKerja: el.unitKerja.value,
        instansi: el.instansi.value,
        jabatanPenilai: el.jabatanPenilai.value,
        namaPenilai: el.namaPenilai.value,
        nipPenilai: el.nipPenilai.value,
        tembusan1: el.tembusan1.value,
        tembusan2: el.tembusan2.value,
        tembusan3: el.tembusan3.value,
      };

      const periodeList = usableRows.map((r) => ({
        ...pegawaiRingkas,
        tahunLabel: tahunOf(r.mulai),
        periodikLabel: `${bulanNama(r.mulai)} - ${bulanNama(r.selesai)}`,
        periodeLabel: `${fmtTanggalID(r.mulai)} - ${fmtTanggalID(r.selesai)}`,
        predikatLabel: PREDIKAT_SKP[r.predikat].label.toUpperCase(),
        pecahanBulan: r.hasil.pecahanBulan,
        koefisienTahun: PAKCalc.fmtID(r.hasil.koefisienTahun),
        angkaKredit: PAKCalc.fmtID(r.hasil.angkaKredit),
        nomorSurat: r.nomor,
        tempatPenetapan: r.tempat,
        tanggalPenetapan: fmtTanggalID(r.tanggal),
      }));

      const semuaMulai = usableRows.map((r) => r.mulai).sort();
      const semuaSelesai = usableRows.map((r) => r.selesai).sort();
      let batasAwal = semuaMulai[0];
      let batasAkhir = semuaSelesai[semuaSelesai.length - 1];
      if (adaIntegrasiCheckbox.checked && el.integrasiMasaAwal.value) {
        if (!batasAwal || el.integrasiMasaAwal.value < batasAwal) batasAwal = el.integrasiMasaAwal.value;
      }
      const periodeTotalLabel = `${fmtTanggalID(batasAwal)} - ${fmtTanggalID(batasAkhir)}`;

      const jumlahKonvensional = adaIntegrasiCheckbox.checked ? PAKCalc.round3(
        (Number(el.integrasiPendidikanAK.value) || 0) +
        (Number(el.integrasiTugasPokokAK.value) || 0) +
        (Number(el.integrasiPengembanganProfesiAK.value) || 0) +
        (Number(el.integrasiPenunjangAK.value) || 0)
      ) : 0;

      const barcodeTeks = `${el.nip.value}|${el.nama.value}`;

      const data = {
        kopOPD: el.kopOPD.value,
        kopAlamat: el.kopAlamat.value,
        nama: el.nama.value,
        nip: el.nip.value,
        karpeg: el.karpeg.value,
        ttl: pegawaiRingkas.ttl,
        jenisKelamin: el.jenisKelamin.value,
        pendidikan: el.pendidikan.value,
        pangkatGolongan: el.pangkatGolongan.value,
        tmtPangkat: fmtSlash(el.tmtPangkat.value),
        jabatan: el.jabatan.value,
        tmtJabatanLabel: fmtSlash(el.tmtJabatan.value),
        masaKerjaGolongan: el.masaKerjaGolongan.value,
        unitKerja: el.unitKerja.value,
        instansi: el.instansi.value,

        adaIntegrasi: adaIntegrasiCheckbox.checked,
        integrasiTempatPenetapan: el.integrasiTempatPenetapan.value,
        integrasiTanggalPenetapan: fmtTanggalID(el.integrasiTanggalPenetapan.value),
        integrasiNomorSurat: el.integrasiNomorSurat.value,
        integrasiMasaPenilaian: (el.integrasiMasaAwal.value && el.integrasiMasaAkhir.value)
          ? `${fmtTanggalID(el.integrasiMasaAwal.value)} - ${fmtTanggalID(el.integrasiMasaAkhir.value)}` : "",
        integrasiTahunLabel: tahunOf(el.integrasiTanggalPenetapan.value),
        integrasiPendidikanAK: PAKCalc.fmtID(el.integrasiPendidikanAK.value),
        integrasiTugasPokokAK: PAKCalc.fmtID(el.integrasiTugasPokokAK.value),
        integrasiPengembanganProfesiAK: PAKCalc.fmtID(el.integrasiPengembanganProfesiAK.value),
        integrasiPenunjangAK: PAKCalc.fmtID(el.integrasiPenunjangAK.value),
        integrasiJumlahKonvensional: PAKCalc.fmtID(jumlahKonvensional),
        integrasiNilaiDasar: PAKCalc.fmtID(nilaiDasarInput.value),
        integrasiNilaiIntegrasi: state.nilaiIntegrasi !== null ? PAKCalc.fmtID(state.nilaiIntegrasi) : "",

        periodeList,
        periodeTotalLabel,

        nomorSuratAkumulasi: el.nomorSuratAkumulasi.value,
        akumulasiTotal: PAKCalc.fmtID(state.total),

        nomorSuratPenetapan: el.nomorSuratPenetapan.value,
        penetapanAkDasarDiberikan: PAKCalc.fmtID(state.pen.akDasarDiberikan),
        penetapanAkJFLama: PAKCalc.fmtID(state.pen.akJFLama),
        penetapanAkKonversiBaru: PAKCalc.fmtID(state.pen.akKonversiBaru),
        penetapanJumlahKumulatif: PAKCalc.fmtID(state.pen.jumlahKumulatif),
        penetapanMinPangkat: PAKCalc.fmtID(state.pen.minPangkat),
        penetapanMinJenjang: state.pen.minJenjang !== null ? PAKCalc.fmtID(state.pen.minJenjang) : "-",
        penetapanKelebihanPangkat: state.pen.kelebihanPangkat !== null ? PAKCalc.fmtID(state.pen.kelebihanPangkat) : "-",
        penetapanKelebihanJenjang: state.pen.kelebihanJenjang !== null ? PAKCalc.fmtID(state.pen.kelebihanJenjang) : "-",
        penetapanKesimpulanPangkat: state.pen.kesimpulanPangkat,
        penetapanKesimpulanJenjang: state.pen.kesimpulanJenjang,

        tempatPenetapanAkhir: el.tempatPenetapanAkhir.value,
        tanggalPenetapanAkhir: fmtTanggalID(el.tanggalPenetapanAkhir.value),
        jabatanPenilai: el.jabatanPenilai.value,
        namaPenilai: el.namaPenilai.value,
        nipPenilai: el.nipPenilai.value,
        tembusan1: el.tembusan1.value,
        tembusan2: el.tembusan2.value,
        tembusan3: el.tembusan3.value,
        tembusanFinal1: el.tembusanFinal1.value,
        tembusanFinal2: el.tembusanFinal2.value,
        tembusanFinal3: el.tembusanFinal3.value,

        barcode: barcodeTeks,
      };

      const barcodeImg = buatBarcodePngBuffer(barcodeTeks);
      const imageOpts = {
        centered: false,
        getImage: () => barcodeImg.bytes,
        getSize: () => [110, 32],
      };
      const imageModule = new window.ImageModule(imageOpts);

      const resp = await fetch("templates/template.docx?v=" + TEMPLATE_VERSION, { cache: "no-store" });
      if (!resp.ok) throw new Error("Gagal memuat template.docx");
      const arrayBuffer = await resp.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [imageModule] });
      doc.render(data);
      const outBlob = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      const safeName = (el.nama.value || "pegawai").replace(/[^a-z0-9]+/gi, "_");
      a.href = url;
      a.download = `PAK_${safeName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      genStatus.textContent = "Dokumen berhasil dibuat dan diunduh.";
      genStatus.className = "ok";
    } catch (err) {
      console.error(err);
      genStatus.textContent = "Gagal membuat dokumen: " + err.message;
      genStatus.className = "err";
    } finally {
      btnGenerate.disabled = false;
    }
  }

  btnGenerate.addEventListener("click", generateDocx);

  // ---------- Inisialisasi ----------
  populateJenjang();
  addPeriodeRow();
  recalc();
})();
