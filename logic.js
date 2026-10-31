/* Logika murni aplikasi TPQ (tanpa akses jaringan) - diuji dengan test_logic.js */
(function (root) {
  const L = {};
  L.ST = { belum_bayar: 'Belum bayar', sebagian: 'Dibayar sebagian', lunas: 'Lunas' };
  L.GR = { pra_remaja: 'Pra remaja', remaja: 'Remaja', dewasa: 'Dewasa' };
  L.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  L.rp = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  L.todayWIB = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  L.monthStart = v => v + '-01';
  L.monthEnd = v => { const [y, m] = v.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  L.bulan = d => new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  L.tabsFor = role => role === 'pengurus' ? ['home', 'laporan'] : ['home', 'bayar', 'keluar', 'laporan', 'lainnya'];

  // Bagi uang ke kewajiban, bulan terlama dulu. Mengembalikan alokasi per kewajiban dan sisa uang.
  L.allocate = (rows, total) => {
    let left = Math.max(0, Math.floor(total || 0)); const alloc = {};
    [...rows].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0)).forEach(r => {
      const x = Math.min(left, r.remaining); alloc[r.obligation_id] = x; left -= x;
    });
    return { alloc, left };
  };
  // Rincian yang dikirim ke server (record_payment)
  L.buildLines = (alloc, extras) => {
    const lines = [];
    Object.keys(alloc).forEach(id => { if (alloc[id] > 0) lines.push({ obligation_id: id, amount: alloc[id] }); });
    Object.keys(extras || {}).forEach(code => { if (extras[code] > 0) lines.push({ fund_code: code, amount: extras[code] }); });
    return lines;
  };
  // Sel laporan: 1 uang, 2 bulan, 3 status, 4 kelompok, 5 nama dana
  L.cell = (f, v, fd) => f === 1 ? Number(v || 0) : f === 2 ? (v ? L.bulan(v) : '') : f === 3 ? (L.ST[v] || v || '')
    : f === 4 ? (L.GR[v] || v || '') : f === 5 ? (fd ? fd(v) : v) : (v == null ? '' : v);
  L.aoa = (cols, rows, fd, withTotal) => {
    const out = [cols.map(c => c[1])].concat(rows.map(r => cols.map(c => L.cell(c[2], r[c[0]], fd))));
    if (withTotal && rows.length) {
      out.push(cols.map((c, i) => c[2] === 1 ? rows.reduce((s, r) => s + Number(r[c[0]] || 0), 0) : i === 0 ? 'TOTAL' : ''));
    }
    return out;
  };
  L.pwCheck = (a, b) => (a || '').length < 10 ? 'Minimal 10 karakter.' : a !== b ? 'Kedua isian tidak sama.' : /^(.)\1+$/.test(a) ? 'Kata sandi terlalu mudah ditebak.' : null;
  L.backupState = (row, nowMs) => { if (!row) return { bad: true, text: 'Belum ada cadangan tercatat.' };
    const h = (nowMs - new Date(row.run_at).getTime()) / 3600e3;
    return row.status !== 'ok' ? { bad: true, text: 'Cadangan terakhir GAGAL. Hubungi admin.' } : h > 48 ? { bad: true, text: 'Cadangan terakhir sudah ' + Math.floor(h / 24) + ' hari lalu. Periksa pekerjaan cadangan.' } : { bad: false, text: 'Cadangan terakhir berhasil.' } };
  L.makeUsername = (name, taken) => {          // nama pengguna sah: huruf kecil/angka, 3-20 karakter, unik
    let b = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    if (b.length < 3) b = (b + 'tpq').slice(0, 20);
    let u = b, n = 2; while (taken.has(u)) u = b.slice(0, 18) + n++;
    taken.add(u); return u;
  };
  L.kas = rows => rows.filter(r => r.kind !== 'usaha');   // laporan kas tidak memuat dana usaha
  if (typeof module !== 'undefined') module.exports = L; else root.L = L;
})(this);
