/**
 * app.js — logika UI: form dinamis, perhitungan langsung (live), dan
 * pembuatan dokumen .docx di sisi browser (docxtemplater + pizzip),
 * sehingga aplikasi ini 100% statis dan bisa di-deploy di GitHub Pages
 * tanpa server/backend.
 */
(function () {
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

  const form = document.getElementById("pak-form");
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
  let periodeState = []; // { id, el }
  let nilaiDasarManual = false;
  let logoDataUrl = null;

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

  // ---------- Nilai dasar otomatis (integrasi) ----------
  function updateNilaiDasarDefault() {
    if (nilaiDasarManual) return;
    const key = form.elements.jenjangPendidikan.value;
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
    return periodeState.map(({ id, el }) => {
      const mulai = el.querySelector('[name="p_mulai"]').value;
      const selesai = el.querySelector('[name="p_selesai"]').value;
      const jenjang = el.querySelector('[name="p_jenjang"]').value;
      const predikat = el.querySelector('[name="p_predikat"]').value;
      const nomor = el.querySelector('[name="p_nomor"]').value;
      const tempat = el.querySelector('[name="p_tempat"]').value;
      const tanggal = el.querySelector('[name="p_tanggal"]').value;
      let bulan = 0, hasil = null;
      if (mulai && selesai && jenjang && predikat) {
        bulan = PAKCalc.jumlahBulanInklusif(mulai, selesai);
        if (bulan > 0) hasil = PAKCalc.hitungKonversiPeriode(jenjang, predikat, bulan);
      }
      return { id, el, mulai, selesai, jenjang, predikat, nomor, tempat, tanggal, bulan, hasil };
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

    // --- Integrasi ---
    let nilaiIntegrasi = null;
    if (adaIntegrasiCheckbox.checked) {
      const ic = PAKCalc.hitungIntegrasi({
        pendidikan: form.elements.integrasiPendidikanAK.value,
        tugasPokok: form.elements.integrasiTugasPokokAK.value,
        pengembanganProfesi: form.elements.integrasiPengembanganProfesiAK.value,
        penunjang: form.elements.integrasiPenunjangAK.value,
        nilaiDasar: nilaiDasarInput.value,
      });
      document.getElementById("out-jumlah-konvensional").textContent = PAKCalc.fmtID(ic.jumlahKonvensional);
      document.getElementById("out-nilai-integrasi").textContent = PAKCalc.fmtID(ic.nilaiIntegrasi);
      nilaiIntegrasi = ic.nilaiIntegrasi;
    }

    // --- Akumulasi ---
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

    // --- Penetapan ---
    const akDasar = Number(form.elements.akDasarDiberikan.value) || 0;
    const akJFLama = nilaiIntegrasi !== null ? nilaiIntegrasi : 0;
    const akKonversiBaru = PAKCalc.round3(total - akJFLama);
    const jenjangFinal = jenjangSelect.value || "ahli_pertama";
    const pen = PAKCalc.hitungPenetapan({
      jenjangKey: jenjangFinal,
      akDasarDiberikan: akDasar,
      akJFLama,
      akKonversiBaru,
    });
    const kesimpulanKustom = form.elements.kesimpulanKustom.value.trim();
    const kesimpulanFinal = kesimpulanKustom || pen.kesimpulan;

    document.getElementById("preview-penetapan").innerHTML = `
      <div><span>AK Dasar</span><span>${PAKCalc.fmtID(pen.akDasarDiberikan)}</span></div>
      <div><span>AK Lama (Integrasi)</span><span>${PAKCalc.fmtID(pen.akJFLama)}</span></div>
      <div><span>AK Konversi Baru</span><span>${PAKCalc.fmtID(pen.akKonversiBaru)}</span></div>
      <div><span>Jumlah Kumulatif</span><span>${PAKCalc.fmtID(pen.jumlahKumulatif)}</span></div>
      <div><span>Min. AK Pangkat</span><span>${PAKCalc.fmtID(pen.minPangkat)}</span></div>
      <div><span>Min. AK Jenjang</span><span>${pen.minJenjang !== null ? PAKCalc.fmtID(pen.minJenjang) : "—"}</span></div>
      <div class="conclusion">${kesimpulanFinal}</div>
    `;

    return { rows, nilaiIntegrasi, total, pen, kesimpulanFinal };
  }

  form.addEventListener("input", recalc);
  form.addEventListener("change", recalc);

  adaIntegrasiCheckbox.addEventListener("change", () => {
    integrasiFields.classList.toggle("hidden", !adaIntegrasiCheckbox.checked);
    recalc();
  });
  nilaiDasarInput.addEventListener("input", () => { nilaiDasarManual = true; });

  form.elements.logoFile.addEventListener("change", () => {
    const file = form.elements.logoFile.files[0];
    if (!file) { logoDataUrl = null; return; }
    const reader = new FileReader();
    reader.onload = () => { logoDataUrl = reader.result; };
    reader.readAsDataURL(file);
  });

  // ---------- Muat contoh & reset ----------
  document.getElementById("btn-load-sample").addEventListener("click", () => {
    form.elements.kopPemda.value = "PEMERINTAH KABUPATEN BUTON";
    form.elements.kopOPD.value = "DINAS KESEHATAN";
    form.elements.kopAlamat.value = "Kecamatan Pasarwajo, Kabupaten Buton, Provinsi Sulawesi Tenggara";
    form.elements.nama.value = "NURFADILLA, S.Tr.Keb";
    form.elements.nip.value = "198603172009032007";
    form.elements.karpeg.value = "P. 083721";
    form.elements.jenisKelamin.value = "Perempuan";
    form.elements.tempatLahir.value = "Buton";
    form.elements.tglLahir.value = "1986-03-17";
    form.elements.pendidikan.value = "D-IV Kebidanan";
    form.elements.jenjangPendidikan.value = "d4_s1";
    form.elements.pangkatGolongan.value = "Penata Muda Tk. I, (III/b)";
    form.elements.tmtPangkat.value = "2023-10-01";
    form.elements.jabatan.value = "Bidan Ahli Pertama";
    form.elements.tmtJabatan.value = "2024-07-02";
    jenjangSelect.value = "ahli_pertama";
    form.elements.masaKerjaGolongan.value = "09 Tahun 07 Bulan";
    form.elements.unitKerja.value = "RSUD Pasarwajo Kabupaten Buton";
    form.elements.instansi.value = "Dinas Kesehatan Kab. Buton";

    adaIntegrasiCheckbox.checked = true;
    integrasiFields.classList.remove("hidden");
    form.elements.integrasiNomorSurat.value = "800.1.11.1/000/2023";
    form.elements.integrasiMasaAwal.value = "2021-01-01";
    form.elements.integrasiMasaAkhir.value = "2023-06-30";
    form.elements.integrasiTempatPenetapan.value = "Pasarwajo";
    form.elements.integrasiTanggalPenetapan.value = "2023-06-30";
    form.elements.integrasiPendidikanAK.value = 100;
    form.elements.integrasiTugasPokokAK.value = 88.654;
    form.elements.integrasiPengembanganProfesiAK.value = 4;
    form.elements.integrasiPenunjangAK.value = 4;
    nilaiDasarManual = false;
    updateNilaiDasarDefault();

    periodeListEl.innerHTML = "";
    periodeState = [];
    addPeriodeRow({ mulai: "2023-07-01", selesai: "2023-12-31", jenjang: "mahir", predikat: "baik", nomor: "800.1.11.1/001/2024", tempat: "Pasarwajo", tanggal: "2024-01-02" });
    addPeriodeRow({ mulai: "2024-07-01", selesai: "2024-11-30", jenjang: "ahli_pertama", predikat: "baik", nomor: "800.1.11.1/002/2024", tempat: "Pasarwajo", tanggal: "2024-12-01" });

    form.elements.akDasarDiberikan.value = 0;
    form.elements.nomorSuratAkumulasi.value = "800.1.11.1/003/2024";
    form.elements.nomorSuratPenetapan.value = "800.1.11.1/004/2024";
    form.elements.tempatPenetapanAkhir.value = "Pasarwajo";
    form.elements.tanggalPenetapanAkhir.value = "2024-12-01";
    form.elements.jabatanPenilai.value = "Kepala Dinas Kesehatan Kabupaten Buton";
    form.elements.namaPenilai.value = "SYAFARUDDIN, SKM., M.Kes.";
    form.elements.nipPenilai.value = "197303101998031009";
    form.elements.tembusan1.value = "Direktur BLUD Rumah Sakit Daerah Kabupaten Buton;";
    form.elements.tembusan2.value = "Sekretaris Tim Penilai Kinerja RSUD Kab. Buton;";
    form.elements.tembusan3.value = "Kepala Subbag Kepegawaian / Ketatausahaan RSUD Kab. Buton.";

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
        nama: form.elements.nama.value,
        nip: form.elements.nip.value,
        karpeg: form.elements.karpeg.value,
        ttl: `${form.elements.tempatLahir.value}, ${fmtTanggalID(form.elements.tglLahir.value)}`,
        jenisKelamin: form.elements.jenisKelamin.value,
        pangkatGolongan: form.elements.pangkatGolongan.value,
        tmtPangkat: fmtSlash(form.elements.tmtPangkat.value),
        jabatan: form.elements.jabatan.value,
        unitKerja: form.elements.unitKerja.value,
        instansi: form.elements.instansi.value,
        jabatanPenilai: form.elements.jabatanPenilai.value,
        namaPenilai: form.elements.namaPenilai.value,
        nipPenilai: form.elements.nipPenilai.value,
        tembusan1: form.elements.tembusan1.value,
        tembusan2: form.elements.tembusan2.value,
        tembusan3: form.elements.tembusan3.value,
      };

      const periodeList = usableRows.map((r) => ({
        ...pegawaiRingkas,
        tglMulaiLabel: fmtTanggalID(r.mulai),
        tglSelesaiLabel: fmtTanggalID(r.selesai),
        predikatLabel: PREDIKAT_SKP[r.predikat].label.toUpperCase(),
        pecahanBulan: r.hasil.pecahanBulan,
        koefisienTahun: PAKCalc.fmtID(r.hasil.koefisienTahun),
        angkaKredit: PAKCalc.fmtID(r.hasil.angkaKredit),
        nomorSurat: r.nomor,
        tempatPenetapan: r.tempat,
        tanggalPenetapan: fmtTanggalID(r.tanggal),
        jabatanTmtLabel: fmtSlash(form.elements.tmtJabatan.value),
      }));

      const akumulasiBaris = [];
      if (state.nilaiIntegrasi !== null) {
        akumulasiBaris.push({
          uraian: "Nilai Integrasi Awal",
          keterangan: form.elements.integrasiMasaAwal.value && form.elements.integrasiMasaAkhir.value
            ? `${fmtTanggalID(form.elements.integrasiMasaAwal.value)} - ${fmtTanggalID(form.elements.integrasiMasaAkhir.value)}`
            : "-",
          nilai: PAKCalc.fmtID(state.nilaiIntegrasi),
        });
      }
      usableRows.forEach((r) => {
        akumulasiBaris.push({
          uraian: fmtTanggalID(r.mulai).slice(-4) || "-",
          keterangan: `${fmtTanggalID(r.mulai)} - ${fmtTanggalID(r.selesai)} (${PREDIKAT_SKP[r.predikat].label})`,
          nilai: PAKCalc.fmtID(r.hasil.angkaKredit),
        });
      });

      const data = {
        kopPemda: form.elements.kopPemda.value,
        kopOPD: form.elements.kopOPD.value,
        kopAlamat: form.elements.kopAlamat.value,
        nama: form.elements.nama.value,
        nip: form.elements.nip.value,
        karpeg: form.elements.karpeg.value,
        ttl: pegawaiRingkas.ttl,
        jenisKelamin: form.elements.jenisKelamin.value,
        pendidikan: form.elements.pendidikan.value,
        pangkatGolongan: form.elements.pangkatGolongan.value,
        tmtPangkat: fmtSlash(form.elements.tmtPangkat.value),
        jabatan: form.elements.jabatan.value,
        tmtJabatan: fmtSlash(form.elements.tmtJabatan.value),
        masaKerjaGolongan: form.elements.masaKerjaGolongan.value,
        unitKerja: form.elements.unitKerja.value,
        instansi: form.elements.instansi.value,

        adaIntegrasi: adaIntegrasiCheckbox.checked,
        integrasiTempatPenetapan: form.elements.integrasiTempatPenetapan.value,
        integrasiTanggalPenetapan: fmtTanggalID(form.elements.integrasiTanggalPenetapan.value),
        integrasiNomorSurat: form.elements.integrasiNomorSurat.value,
        integrasiPendidikanAK: PAKCalc.fmtID(form.elements.integrasiPendidikanAK.value),
        integrasiTugasPokokAK: PAKCalc.fmtID(form.elements.integrasiTugasPokokAK.value),
        integrasiPengembanganProfesiAK: PAKCalc.fmtID(form.elements.integrasiPengembanganProfesiAK.value),
        integrasiPenunjangAK: PAKCalc.fmtID(form.elements.integrasiPenunjangAK.value),
        integrasiJumlahKonvensional: state.nilaiIntegrasi !== null ? PAKCalc.fmtID(PAKCalc.round3(
          (Number(form.elements.integrasiPendidikanAK.value) || 0) +
          (Number(form.elements.integrasiTugasPokokAK.value) || 0) +
          (Number(form.elements.integrasiPengembanganProfesiAK.value) || 0) +
          (Number(form.elements.integrasiPenunjangAK.value) || 0)
        )) : "",
        integrasiNilaiDasar: PAKCalc.fmtID(nilaiDasarInput.value),
        integrasiNilaiIntegrasi: state.nilaiIntegrasi !== null ? PAKCalc.fmtID(state.nilaiIntegrasi) : "",

        periodeList,

        nomorSuratAkumulasi: form.elements.nomorSuratAkumulasi.value,
        akumulasiBaris,
        akumulasiTotal: PAKCalc.fmtID(state.total),

        nomorSuratPenetapan: form.elements.nomorSuratPenetapan.value,
        penetapanAkDasarDiberikan: PAKCalc.fmtID(state.pen.akDasarDiberikan),
        penetapanAkJFLama: PAKCalc.fmtID(state.pen.akJFLama),
        penetapanAkKonversiBaru: PAKCalc.fmtID(state.pen.akKonversiBaru),
        penetapanJumlahKumulatif: PAKCalc.fmtID(state.pen.jumlahKumulatif),
        penetapanMinPangkat: PAKCalc.fmtID(state.pen.minPangkat),
        penetapanMinJenjang: state.pen.minJenjang !== null ? PAKCalc.fmtID(state.pen.minJenjang) : "-",
        penetapanKelebihanPangkat: state.pen.kelebihanPangkat !== null ? PAKCalc.fmtID(state.pen.kelebihanPangkat) : "-",
        penetapanKelebihanJenjang: state.pen.kelebihanJenjang !== null ? PAKCalc.fmtID(state.pen.kelebihanJenjang) : "-",
        penetapanKesimpulan: state.kesimpulanFinal,

        tempatPenetapanAkhir: form.elements.tempatPenetapanAkhir.value,
        tanggalPenetapanAkhir: fmtTanggalID(form.elements.tanggalPenetapanAkhir.value),
        jabatanPenilai: form.elements.jabatanPenilai.value,
        namaPenilai: form.elements.namaPenilai.value,
        nipPenilai: form.elements.nipPenilai.value,
        tembusan1: form.elements.tembusan1.value,
        tembusan2: form.elements.tembusan2.value,
        tembusan3: form.elements.tembusan3.value,
      };

      const resp = await fetch("templates/template.docx");
      if (!resp.ok) throw new Error("Gagal memuat template.docx");
      const arrayBuffer = await resp.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(data);
      const outBlob = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      const safeName = (form.elements.nama.value || "pegawai").replace(/[^a-z0-9]+/gi, "_");
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
