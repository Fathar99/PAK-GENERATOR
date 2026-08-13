/**
 * calc.js
 * Logika perhitungan murni (tanpa DOM) sehingga mudah diuji dan dipakai ulang.
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./regulasi.js"));
  } else {
    root.PAKCalc = factory(root.REGULASI || root);
  }
})(typeof self !== "undefined" ? self : this, function (regulasiModule) {
  const { KOEFISIEN_JENJANG, PREDIKAT_SKP, URUTAN_JENJANG } = regulasiModule;

  function round3(n) {
    // Pembulatan 3 desimal, sesuai gaya penulisan pada contoh dokumen (mis. 6,25 / 96,654)
    return Math.round((n + Number.EPSILON) * 1000) / 1000;
  }

  function fmtID(n, decimals) {
    if (n === null || n === undefined || isNaN(n)) return "-";
    const d = decimals === undefined ? 3 : decimals;
    return Number(n).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: d,
    });
  }

  // Selisih bulan (inklusif) antara dua tanggal ISO "YYYY-MM-DD"
  function jumlahBulanInklusif(tglMulai, tglSelesai) {
    const a = new Date(tglMulai);
    const b = new Date(tglSelesai);
    let bulan = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    return Math.max(bulan, 0);
  }

  /**
   * Hitung angka kredit hasil konversi 1 periode penilaian kinerja.
   * @param {string} jenjangKey - key di KOEFISIEN_JENJANG
   * @param {string} predikatKey - key di PREDIKAT_SKP
   * @param {number} jumlahBulan - panjang periode dalam bulan (fleksibel: 1, 2, 6, 12, dst.)
   */
  function hitungKonversiPeriode(jenjangKey, predikatKey, jumlahBulan) {
    const jenjang = KOEFISIEN_JENJANG[jenjangKey];
    const predikat = PREDIKAT_SKP[predikatKey];
    if (!jenjang) throw new Error("Jenjang tidak dikenal: " + jenjangKey);
    if (!predikat) throw new Error("Predikat tidak dikenal: " + predikatKey);

    const koefisienTahun = jenjang.koefisienTahun;
    const persen = predikat.persen;
    // AK = (bulan/12) x koefisien per tahun x (persentase predikat / 100)
    const angkaKredit = round3((jumlahBulan / 12) * koefisienTahun * (persen / 100));

    return {
      koefisienTahun,
      persen,
      angkaKredit,
      pecahanBulan: `${jumlahBulan} /12 x ${persen}%`,
    };
  }

  /**
   * Hitung nilai AK Integrasi dari AK Konvensional (untuk dokumen PAK Integrasi).
   * Formula: AK Integrasi = Jumlah AK Konvensional - Nilai Dasar
   */
  function hitungIntegrasi({ pendidikan, tugasPokok, pengembanganProfesi, penunjang, nilaiDasar }) {
    const jumlahKonvensional = round3(
      (Number(pendidikan) || 0) +
        (Number(tugasPokok) || 0) +
        (Number(pengembanganProfesi) || 0) +
        (Number(penunjang) || 0)
    );
    const nilaiIntegrasi = round3(jumlahKonvensional - (Number(nilaiDasar) || 0));
    return { jumlahKonvensional, nilaiDasar: Number(nilaiDasar) || 0, nilaiIntegrasi };
  }

  /**
   * Hitung tabel Akumulasi Angka Kredit: nilai integrasi (opsional) + tiap periode konversi.
   */
  function hitungAkumulasi({ nilaiIntegrasiAwal, periodeList }) {
    const baris = [];
    let total = 0;

    if (nilaiIntegrasiAwal !== null && nilaiIntegrasiAwal !== undefined) {
      baris.push({ jenis: "integrasi", nilai: nilaiIntegrasiAwal });
      total += Number(nilaiIntegrasiAwal) || 0;
    }

    periodeList.forEach((p) => {
      baris.push({ jenis: "konversi", ...p });
      total += Number(p.hasil.angkaKredit) || 0;
    });

    return { baris, totalAngkaKredit: round3(total) };
  }

  /**
   * Susun tabel Penetapan Angka Kredit final (LAMA / BARU / JUMLAH) + evaluasi
   * kecukupan AK untuk kenaikan pangkat/jenjang.
   */
  function hitungPenetapan({ jenjangKey, akDasarDiberikan, akJFLama, akKonversiBaru }) {
    const jenjang = KOEFISIEN_JENJANG[jenjangKey];
    const dasar = Number(akDasarDiberikan) || 0;
    const lama = Number(akJFLama) || 0;
    const baru = Number(akKonversiBaru) || 0;
    const jumlahKumulatif = round3(dasar + lama + baru);

    const minPangkat = jenjang.akMinimalPangkat;
    const minJenjang = jenjang.akMinimalJenjang;

    const kelebihanPangkat =
      minPangkat !== null && minPangkat !== undefined ? round3(jumlahKumulatif - minPangkat) : null;
    const kelebihanJenjang =
      minJenjang !== null && minJenjang !== undefined ? round3(jumlahKumulatif - minJenjang) : null;

    let kesimpulan = "";
    const cukupPangkat = kelebihanPangkat !== null && kelebihanPangkat >= 0;
    const cukupJenjang = kelebihanJenjang !== null && kelebihanJenjang >= 0;

    if (cukupPangkat || cukupJenjang) {
      const bagian = [];
      if (cukupPangkat) bagian.push("KENAIKAN PANGKAT SETINGKAT LEBIH TINGGI");
      if (cukupJenjang) bagian.push("KENAIKAN JENJANG JABATAN SETINGKAT LEBIH TINGGI");
      kesimpulan = `DAPAT DIPERTIMBANGKAN UNTUK ${bagian.join(" DAN ")}.`;
    } else {
      kesimpulan = "BELUM DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN PANGKAT/JENJANG JABATAN SETINGKAT LEBIH TINGGI.";
    }

    return {
      akDasarDiberikan: dasar,
      akJFLama: lama,
      akKonversiBaru: baru,
      jumlahKumulatif,
      minPangkat,
      minJenjang,
      kelebihanPangkat,
      kelebihanJenjang,
      kesimpulan,
    };
  }

  return {
    round3,
    fmtID,
    jumlahBulanInklusif,
    hitungKonversiPeriode,
    hitungIntegrasi,
    hitungAkumulasi,
    hitungPenetapan,
  };
});
