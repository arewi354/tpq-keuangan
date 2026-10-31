/* Menu "Lainnya". Dimuat setelah skrip utama di index.html (memakai S, sb, call, $, v, toast, tbl, C, fd, compress). */
(() => {
const SEC = {}, A = () => S.prof.role === 'admin', sec = () => $('#sec'), today = L.todayWIB(), mkey = () => crypto.randomUUID();
const F = fs => fs.map(f => `<label>${f.l}</label>` + (f.t === 'select'
  ? `<select id="f_${f.id}">${f.o.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`
  : f.t === 'area' ? `<textarea id="f_${f.id}" rows="2"></textarea>`
  : `<input id="f_${f.id}" type="${f.t || 'text'}" ${f.a || ''} value="${esc(f.v == null ? '' : f.v)}">`)).join('');
const G = id => $('#f_' + id).value.trim(), N = id => Math.max(0, Math.floor(+$('#f_' + id).value || 0));
const act = async (b, fn, ok, again) => { b.disabled = true; try { await fn(); toast(ok); if (again) await again() } catch (e) { toast(e.message, 1) } finally { b.disabled = false } };
const ask = t => { const r = prompt(t); return r && r.trim() ? r.trim() : null };
const fundOpts = fl => S.funds.filter(fl || (() => true)).map(x => [x.code, x.name]);
const one = x => [].concat(x || [])[0];
const reload = async () => { S.members = await call(sb.from('members').select('id,name,grp,inactive_from').order('name')) };
const mon = today.slice(0, 7);

T.lainnya = ['Lainnya', () => lainnya()];
function lainnya() {
  const it = [['kor', 'Koreksi / batalkan transaksi'], ['usa', 'Usaha (pemasukan)'], ['trf', 'Transfer antar-dana'], ['rek', 'Rekonsiliasi & pemeriksaan data'], ['eks', 'Ekspor semua data']]
    .concat(A() ? [['sa', 'Saldo awal'], ['ang', 'Anggota & tarif iuran'], ['qt', 'Target qurban'], ['br', 'Bukti alternatif'], ['akun', 'Kelola akun pengguna']] : []);
  v.innerHTML = `<h2>Lainnya</h2><select id="sc"><option value="">— pilih menu —</option>${it.map(i => `<option value="${i[0]}">${i[1]}</option>`).join('')}</select><div id="sec"></div>`;
  $('#sc').onchange = e => { sec().innerHTML = ''; sec().onclick = null; if (e.target.value) { sec().innerHTML = '<p class="mu">Memuat…</p>'; SEC[e.target.value]().catch(x => sec().innerHTML = `<p class="bad">${esc(x.message)}</p>`) } };
}

// ---------- Koreksi / pembatalan (alasan wajib; riwayat tetap tersimpan) ----------
SEC.kor = async () => {
  const [pm, ex] = await Promise.all([
    call(sb.from('payments').select('id,pay_date,total,members(name),payment_corrections!payment_id(action)').order('created_at', { ascending: false }).limit(25)),
    call(sb.from('expenses_current').select('id,fund_code,expense_date,amount,purpose').order('created_at', { ascending: false }).limit(25))]);
  sec().innerHTML = '<p class="k">Transaksi lama tidak dihapus: dibuat transaksi pembalik. Mengganti pembayaran = batalkan, lalu catat ulang di tab Bayar.</p><h3>Pembayaran terakhir</h3>' +
    (pm.length ? pm.map(p => { const c = one(p.payment_corrections); return `<div class="cd"><b>${esc(p.members.name)}</b> · ${rp(p.total)}<div class="k">${p.pay_date}${c ? ' · ' + (c.action === 'batal' ? 'DIBATALKAN' : 'DIKOREKSI') : ''}</div>${c ? '' : `<button class="s" data-k="pb" data-id="${p.id}">Batalkan pembayaran</button>`}</div>` }).join('') : '<p class="mu">Belum ada.</p>') +
    '<h3>Pengeluaran terakhir</h3>' + (ex.length ? ex.map(x => `<div class="cd"><b>${esc(x.purpose)}</b> · ${rp(x.amount)}<div class="k">${esc(fd(x.fund_code))} · ${x.expense_date}</div><div class="row"><button class="s" data-k="ek" data-id="${x.id}">Koreksi</button><button class="s" data-k="eb" data-id="${x.id}">Batalkan</button></div></div>`).join('') : '<p class="mu">Belum ada.</p>');
  sec().onclick = async e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const id = b.dataset.id, k = b.dataset.k, r = ask('Alasan (wajib diisi):'); if (!r) return toast('Alasan wajib diisi.', 1);
    let fn;
    if (k === 'pb') fn = () => call(sb.rpc('correct_payment', { p_payment: id, p_reason: r }));
    else if (k === 'eb') fn = () => call(sb.rpc('correct_expense', { p_expense: id, p_reason: r, p_void: true }));
    else { const a = prompt('Nominal baru (kosongkan bila tetap):'), t = prompt('Keterangan baru (kosongkan bila tetap):');
      fn = () => call(sb.rpc('correct_expense', { p_expense: id, p_reason: r, p_new_amount: a && +a > 0 ? Math.floor(+a) : null, p_new_purpose: t && t.trim() ? t.trim() : null })) }
    if (confirm('Lanjutkan? Transaksi lama tetap tersimpan sebagai riwayat.')) await act(b, fn, 'Koreksi tersimpan.', SEC.kor);
  };
};

// ---------- Usaha: pemasukan + koreksi ----------
SEC.usa = async () => {
  const bz = await call(sb.from('businesses').select('id,name').eq('is_active', true).order('name'));
  const inc = await call(sb.from('business_income').select('id,income_date,amount,description,businesses(name),income_corrections!income_id(action)').order('created_at', { ascending: false }).limit(15));
  let key = mkey();
  sec().innerHTML = '<p class="k">Biaya operasional dan pengeluaran usaha dicatat di tab Pengeluaran (pilih dana "Usaha: …"; foto nota wajib).</p><h3>Catat pemasukan usaha</h3>' +
    F([{ id: 'b', l: 'Usaha', t: 'select', o: bz.map(b => [b.id, b.name]) }, { id: 'd', l: 'Tanggal', t: 'date', v: today, a: `max="${today}"` }, { id: 'a', l: 'Jumlah (Rp)', t: 'number', a: 'inputmode="numeric" min="1"' }, { id: 'k', l: 'Keterangan', t: 'area' }]) +
    '<label>Foto bukti (opsional)</label><input type="file" id="f_ph" accept="image/*" capture="environment"><button id="go">Simpan pemasukan</button>' +
    (A() ? '<h3>Tambah usaha baru</h3>' + F([{ id: 'nn', l: 'Nama usaha' }, { id: 'nc', l: 'Kode (huruf besar, contoh USAHA_LAUNDRY)', v: 'USAHA_' }]) + '<button class="s" id="nb">Tambah usaha</button>' : '') +
    '<h3>Pemasukan terakhir</h3>' + inc.map(i => { const c = one(i.income_corrections); return `<div class="cd"><b>${esc(i.businesses.name)}</b> · ${rp(i.amount)}<div class="k">${i.income_date} · ${esc(i.description)}${c ? ' · ' + (c.action === 'batal' ? 'DIBATALKAN' : 'DIKOREKSI') : ''}</div>${c ? '' : `<div class="row"><button class="s" data-k="ik" data-id="${i.id}">Koreksi nominal</button><button class="s" data-k="ib" data-id="${i.id}">Batalkan</button></div>`}</div>` }).join('');
  $('#go').onclick = e => act(e.target, async () => {
    const a = N('a'), k = G('k'); if (!a || !k) throw new Error('Isi jumlah dan keterangan.'); let path = null; const f = $('#f_ph').files[0];
    if (f) { path = `${(await sb.auth.getUser()).data.user.id}/${mkey()}.jpg`; const { error } = await sb.storage.from('bukti').upload(path, await compress(f), { contentType: 'image/jpeg' }); if (error) throw new Error('Unggah foto gagal. Pemasukan BELUM tersimpan.') }
    await call(sb.rpc('record_business_income', { p_business: G('b'), p_date: G('d'), p_amount: a, p_description: k, p_key: key, p_path: path })); key = mkey();
  }, 'Pemasukan tersimpan.', SEC.usa);
  if (A()) $('#nb').onclick = e => act(e.target, () => call(sb.rpc('create_business', { p_name: G('nn'), p_code: G('nc') })), 'Usaha ditambahkan.', SEC.usa);
  sec().onclick = async e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const r = ask('Alasan (wajib diisi):'); if (!r) return toast('Alasan wajib diisi.', 1);
    const p = { p_income: b.dataset.id, p_reason: r }; if (b.dataset.k === 'ib') p.p_void = true; else { const a = Math.floor(+prompt('Nominal baru (Rp):') || 0); if (a <= 0) return; p.p_new_amount = a }
    if (confirm('Lanjutkan? Catatan lama tetap tersimpan sebagai riwayat.')) await act(b, () => call(sb.rpc('correct_business_income', p)), 'Koreksi tersimpan.', SEC.usa);
  };
};

// ---------- Transfer antar-dana ----------
SEC.trf = async () => {
  const tr = await call(sb.from('transfers').select('id,from_fund,to_fund,transfer_date,amount,reason,transfer_reversals(id)').order('created_at', { ascending: false }).limit(15)); let key = mkey();
  sec().innerHTML = '<p class="k">Transfer memindahkan saldo, bukan pemasukan atau pengeluaran. Uang dari dana qurban hanya boleh dipindah admin.</p>' +
    F([{ id: 'f', l: 'Dari dana', t: 'select', o: fundOpts() }, { id: 't', l: 'Ke dana', t: 'select', o: fundOpts() }, { id: 'd', l: 'Tanggal', t: 'date', v: today, a: `max="${today}"` },
      { id: 'a', l: 'Jumlah (Rp)', t: 'number', a: 'inputmode="numeric" min="1"' }, { id: 'r', l: 'Alasan transfer (wajib)', t: 'area' }]) + '<button id="go">Simpan transfer</button><h3>Transfer terakhir</h3>' +
    tr.map(t => `<div class="cd"><b>${rp(t.amount)}</b> · ${esc(fd(t.from_fund))} → ${esc(fd(t.to_fund))}<div class="k">${t.transfer_date} · ${esc(t.reason)}${one(t.transfer_reversals) ? ' · DIBATALKAN' : ''}</div>${one(t.transfer_reversals) ? '' : `<button class="s" data-id="${t.id}">Batalkan transfer</button>`}</div>`).join('');
  $('#go').onclick = e => act(e.target, async () => { await call(sb.rpc('transfer_funds', { p_from: G('f'), p_to: G('t'), p_date: G('d'), p_amount: N('a'), p_reason: G('r'), p_key: key })); key = mkey() }, 'Transfer tersimpan.', SEC.trf);
  sec().onclick = async e => { const b = e.target.closest('button[data-id]'); if (!b) return; const r = ask('Alasan pembatalan (wajib):'); if (r && confirm('Batalkan transfer ini?')) await act(b, () => call(sb.rpc('reverse_transfer', { p_transfer: b.dataset.id, p_reason: r })), 'Transfer dibatalkan.', SEC.trf) };
};

// ---------- Rekonsiliasi uang fisik + pemeriksaan integritas ----------
SEC.rek = async () => {
  const rc = await call(sb.from('reconciliations').select('recon_date,counted_total,system_total,diff,note').order('created_at', { ascending: false }).limit(10));
  sec().innerHTML = '<h3>Cocokkan uang fisik dengan saldo sistem</h3><p class="k">Hitung seluruh uang (tunai + rekening, termasuk dana usaha), lalu isi totalnya.</p>' +
    F([{ id: 'd', l: 'Tanggal hitung', t: 'date', v: today, a: `max="${today}"` }, { id: 'j', l: 'Total uang fisik (Rp)', t: 'number', a: 'inputmode="numeric" min="0"' }, { id: 'n', l: 'Catatan (wajib bila ada selisih)', t: 'area' }]) +
    '<button id="go">Simpan hasil hitung</button><button class="s" id="ic">Periksa integritas data</button><div id="ir"></div><h3>Riwayat</h3>' +
    tbl([['recon_date', 'Tanggal'], ['counted_total', 'Uang fisik', 1], ['system_total', 'Saldo sistem', 1], ['diff', 'Selisih', 1], ['note', 'Catatan']], rc);
  $('#go').onclick = e => act(e.target, () => call(sb.rpc('record_reconciliation', { p_date: G('d'), p_counted: N('j'), p_note: G('n') || null })), 'Hasil hitung tersimpan.', SEC.rek);
  $('#ic').onclick = e => act(e.target, async () => { const r = await call(sb.rpc('integrity_check')); $('#ir').innerHTML = tbl([['no', 'No'], ['pemeriksaan', 'Pemeriksaan'], ['hasil', 'Hasil'], ['detail', 'Detail']], r) }, 'Pemeriksaan selesai.');
};

// ---------- Admin: saldo awal ----------
SEC.sa = async () => {
  const fb = await call(sb.from('fund_balances').select('fund_code,name,saldo_awal,saldo'));
  sec().innerHTML = '<p class="k">Saldo awal bukan pemasukan dan bukan pembayaran anggota. Mengganti saldo awal yang sudah ada wajib beralasan; riwayat tersimpan.</p>' +
    F([{ id: 'f', l: 'Dana', t: 'select', o: fundOpts() }, { id: 'd', l: 'Tanggal saldo', t: 'date', v: today }, { id: 'a', l: 'Nominal (Rp)', t: 'number', a: 'inputmode="numeric" min="0"' },
      { id: 's', l: 'Sumber dana' }, { id: 'n', l: 'Keterangan', t: 'area' }, { id: 'r', l: 'Alasan koreksi (hanya bila mengganti saldo awal yang sudah ada)' }]) +
    '<button id="go">Simpan saldo awal</button><h3>Saldo awal tercatat</h3>' + tbl([['name', 'Dana'], ['saldo_awal', 'Saldo awal', 1], ['saldo', 'Saldo kini', 1]], fb);
  $('#go').onclick = e => act(e.target, () => call(sb.rpc('set_opening_balance', { p_fund: G('f'), p_date: G('d'), p_amount: N('a'), p_source: G('s'), p_note: G('n'), p_reason: G('r') || null })), 'Saldo awal tersimpan.', SEC.sa);
};

// ---------- Admin: anggota dan tarif ----------
SEC.ang = async () => {
  const fr = await call(sb.from('fee_rates').select('fund_code,grp,amount,effective_from').order('effective_from', { ascending: false })), gr = Object.entries(L.GR);
  sec().innerHTML = '<h3>Tambah anggota</h3>' + F([{ id: 'n', l: 'Nama' }, { id: 'g', l: 'Kelompok', t: 'select', o: gr }, { id: 'm', l: 'Mulai aktif (bulan)', t: 'month', v: mon }]) + '<button id="ad">Tambah anggota</button>' +
    '<h3>Ubah / nonaktifkan anggota</h3><p class="k">Anggota tidak pernah dihapus. Perubahan tidak mengubah kewajiban yang sudah dibuat.</p>' +
    F([{ id: 'e', l: 'Anggota', t: 'select', o: S.members.map(m => [m.id, m.name + ' (' + L.GR[m.grp] + ')' + (m.inactive_from ? ' · keluar' : '')]) }, { id: 'eg', l: 'Kelompok baru', t: 'select', o: [['', '(tetap)'], ...gr] }, { id: 'ei', l: 'Nonaktif mulai bulan (kosongkan bila tetap)', t: 'month' }]) +
    '<button id="ed">Simpan perubahan</button><h3>Tarif iuran</h3>' + tbl([['fund_code', 'Dana', 5], ['grp', 'Kelompok', 4], ['amount', 'Nominal', 1], ['effective_from', 'Berlaku mulai', 2]], fr) +
    '<p class="k">Tarif baru hanya berlaku untuk bulan yang kewajibannya belum dibuat. Kewajiban lama tidak berubah.</p>' +
    F([{ id: 'tf', l: 'Dana', t: 'select', o: fundOpts(f => f.kind === 'wajib') }, { id: 'tg', l: 'Kelompok', t: 'select', o: gr }, { id: 'ta', l: 'Nominal (Rp)', t: 'number', a: 'inputmode="numeric" min="1"' }, { id: 'tm', l: 'Berlaku mulai bulan', t: 'month', v: mon }]) + '<button id="at">Simpan tarif</button>';
  $('#ad').onclick = e => act(e.target, async () => { if (!G('n') || !G('m')) throw new Error('Isi nama dan bulan mulai.'); await call(sb.from('members').insert({ name: G('n'), grp: G('g'), active_from: G('m') + '-01' })); await reload() }, 'Anggota ditambahkan.', SEC.ang);
  $('#ed').onclick = e => act(e.target, async () => {
    const p = {}; if (G('eg')) p.grp = G('eg'); if (G('ei')) p.inactive_from = G('ei') + '-01'; if (!Object.keys(p).length) throw new Error('Tidak ada yang diubah.');
    if (!confirm('Simpan perubahan anggota? Kewajiban lama tidak berubah.')) throw new Error('Dibatalkan.');
    const r = await call(sb.from('members').update(p).eq('id', G('e')).select('id')); if (!r || !r.length) throw new Error('Perubahan ditolak.'); await reload();
  }, 'Perubahan tersimpan.', SEC.ang);
  $('#at').onclick = e => act(e.target, async () => { if (!N('ta') || !G('tm')) throw new Error('Isi nominal dan bulan.'); await call(sb.from('fee_rates').insert({ fund_code: G('tf'), grp: G('tg'), amount: N('ta'), effective_from: G('tm') + '-01' })) }, 'Tarif tersimpan.', SEC.ang);
};

// ---------- Admin: target qurban ----------
SEC.qt = async () => {
  const q = await call(sb.rpc('qurban_report'));
  sec().innerHTML = '<p class="k">Mengubah target tidak mengubah transaksi; riwayat target tersimpan.</p>' +
    F([{ id: 'f', l: 'Dana qurban', t: 'select', o: fundOpts(f => f.is_qurban) }, { id: 'a', l: 'Target pembelian hewan (Rp)', t: 'number', a: 'inputmode="numeric" min="1"' }, { id: 'n', l: 'Catatan' }]) + '<button id="go">Simpan target</button>' + tbl(C.qur, q);
  $('#go').onclick = e => act(e.target, () => call(sb.rpc('set_qurban_target', { p_fund: G('f'), p_amount: N('a'), p_note: G('n') || null })), 'Target tersimpan.', SEC.qt);
};

// ---------- Admin: aturan bukti alternatif ----------
SEC.br = async () => {
  const rs = await call(sb.from('evidence_rules').select('id,name,description,max_amount,is_active').order('created_at'));
  sec().innerHTML = '<p class="k">Aturan ini menentukan pengeluaran apa yang boleh memakai bukti selain foto nota. Tanpa aturan aktif, semua pengeluaran wajib foto.</p>' +
    (rs.map(r => `<div class="cd"><b>${esc(r.name)}</b>${r.is_active ? '' : ' (nonaktif)'}<div class="k">${esc(r.description || '')} · batas ${r.max_amount ? rp(r.max_amount) : 'tanpa batas'}</div>${r.is_active ? `<button class="s" data-id="${r.id}">Nonaktifkan</button>` : ''}</div>`).join('') || '<p class="mu">Belum ada aturan.</p>') +
    '<h3>Tambah aturan</h3>' + F([{ id: 'n', l: 'Nama (contoh: Surat pernyataan)' }, { id: 'd', l: 'Penjelasan (siapa yang menyaksikan, dsb.)' }, { id: 'a', l: 'Batas nominal per pengeluaran (Rp, kosongkan = tanpa batas)', t: 'number', a: 'inputmode="numeric" min="1"' }]) + '<button id="go">Simpan aturan</button>';
  $('#go').onclick = e => act(e.target, async () => { if (!G('n')) throw new Error('Isi nama aturan.'); await call(sb.from('evidence_rules').insert({ name: G('n'), description: G('d') || null, max_amount: N('a') || null })) }, 'Aturan tersimpan.', SEC.br);
  sec().onclick = async e => { const b = e.target.closest('button[data-id]'); if (b && confirm('Nonaktifkan aturan ini?')) await act(b, () => call(sb.from('evidence_rules').update({ is_active: false }).eq('id', b.dataset.id)), 'Aturan dinonaktifkan.', SEC.br) };
};
// ---------- Admin: kelola akun (lewat fungsi server "kelola-akun") ----------
const inv = async body => { const { data, error } = await sb.functions.invoke(CFG.fn || 'kelola-akun', { body });
  if (error) { let m = error.message; try { m = (await error.context.json()).error || m } catch (_) {} throw new Error(m) }
  if (data && data.error) throw new Error(data.error); return data };
const showPw = r => { $('#pw').innerHTML = `<div class="cd"><b>Catat sekarang, hanya tampil sekali</b><br>Nama pengguna: <b>${esc(r.username)}</b><br>Kata sandi sementara: <b>${esc(r.temp_password)}</b><div class="k">Serahkan langsung kepada orangnya. Ia wajib menggantinya saat masuk pertama kali.</div></div>`; $('#pw').scrollIntoView() };
SEC.akun = async () => {
  let pend = [];
  const ps = await call(sb.from('profiles').select('id,username,full_name,role,is_active,must_change_password,member_id').order('role').order('username'));
  sec().innerHTML = '<p class="k">Batas: 2 admin aktif, 2 bendahara aktif; pengurus minimal 5. Setiap orang memakai akun sendiri.</p>' +
    ps.map(p => `<div class="cd"><b>${esc(p.full_name)}</b> · ${esc(p.username)}<div class="k">${p.role}${p.is_active ? '' : ' · NONAKTIF'}${p.must_change_password ? ' · belum ganti kata sandi' : ''}</div><div class="row"><button class="s" data-k="rs" data-id="${p.id}">Atur ulang kata sandi</button><button class="s" data-k="ac" data-id="${p.id}" data-a="${p.is_active ? 0 : 1}">${p.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></div>`).join('') +
    (() => { const have = new Set(ps.filter(p => p.member_id).map(p => p.member_id)); pend = S.members.filter(m => !m.inactive_from && !have.has(m.id));
      return '<h3>Akun pengamat untuk semua anggota</h3><p class="k">Pengamat hanya bisa melihat, tidak bisa mengubah apa pun. Satu akun per anggota aktif. ' + pend.length + ' anggota belum punya akun.</p>' + (pend.length ? `<button id="bk">Buat akun untuk ${pend.length} anggota</button>` : '') + '<div id="bo"></div>' })() +
    '<h3>Buat akun baru</h3>' + F([{ id: 'u', l: 'Nama pengguna (huruf kecil, angka; contoh: rama)', a: 'autocapitalize="none"' }, { id: 'n', l: 'Nama lengkap' }, { id: 'r', l: 'Peran', t: 'select', o: [['pengurus', 'Pengamat / pengurus (hanya melihat)'], ['bendahara', 'Bendahara'], ['admin', 'Admin']] }]) + '<button id="go">Buat akun</button><div id="pw"></div>';
  const showBulk = out => { $('#bo').innerHTML = `<div class="cd"><b>Catat sekarang, hanya tampil sekali (${out.length} akun)</b><div class="sc"><table><tr><th>Nama</th><th>Nama pengguna</th><th>Kata sandi sementara</th></tr>${out.map(o => `<tr><td>${esc(o.nama)}</td><td>${esc(o.username)}</td><td><b>${esc(o.sandi)}</b></td></tr>`).join('')}</table></div><button class="s" id="bx">Unduh daftar (Excel)</button><div class="k">Bagikan sandi langsung kepada tiap orang, lalu hapus berkas dari HP. Semua wajib mengganti sandi saat masuk pertama.</div></div>`;
    $('#bx').onclick = () => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Nama', 'Nama pengguna', 'Kata sandi sementara']].concat(out.map(o => [o.nama, o.username, o.sandi]))), 'Akun'); XLSX.writeFile(wb, `akun-pengamat-${L.todayWIB()}.xlsx`) } };
  if (pend.length) $('#bk').onclick = e => act(e.target, async () => {
    if (!confirm(`Buat ${pend.length} akun pengamat? Kata sandi sementara ditampilkan sekali.`)) throw new Error('Dibatalkan.');
    const taken = new Set(ps.map(p => p.username)), out = [];
    for (const m of pend) { $('#bo').insertAdjacentHTML('afterbegin', ''); const u = L.makeUsername(m.name, taken);
      const r = await inv({ action: 'create', username: u, full_name: m.name, role: 'pengurus', member_id: m.id });
      out.push({ nama: m.name, username: r.username, sandi: r.temp_password }); showBulk(out) }
  }, 'Selesai. Catat daftar kata sandi.');
  $('#go').onclick = e => act(e.target, async () => { showPw(await inv({ action: 'create', username: G('u').toLowerCase(), full_name: G('n'), role: G('r') })) }, 'Akun dibuat.');
  sec().onclick = async e => { const b = e.target.closest('button[data-k]'); if (!b) return;
    if (b.dataset.k === 'rs') { if (confirm('Atur ulang kata sandi akun ini?')) await act(b, async () => showPw(await inv({ action: 'reset', user_id: b.dataset.id })), 'Kata sandi diatur ulang.') }
    else if (confirm('Ubah status akun ini?')) await act(b, () => inv({ action: 'set_active', user_id: b.dataset.id, active: b.dataset.a === '1' }), 'Status akun diubah.', SEC.akun) };
};

// ---------- Ekspor seluruh data (agar tidak terkunci pada satu penyedia) ----------
SEC.eks = async () => {
  sec().innerHTML = '<p class="k">Mengunduh semua tabel ke satu berkas Excel. Berkas berisi data keuangan lengkap: simpan di tempat aman dan jangan dibagikan.</p><button id="go">Unduh semua data (.xlsx)</button><p class="k" id="st"></p>';
  $('#go').onclick = e => act(e.target, async () => {
    const names = ['members', 'funds', 'fee_rates', 'obligations', 'payments', 'payment_allocations', 'ledger_entries', 'opening_balances', 'expenses', 'expense_corrections', 'payment_corrections', 'evidence_rules', 'qurban_targets', 'reconciliations', 'audit_log', 'profiles', 'businesses', 'business_income', 'income_corrections', 'transfers', 'transfer_reversals', 'settings', 'backup_runs'];
    const ord = { funds: 'code', settings: 'key' }, wb = XLSX.utils.book_new();
    for (const n of names) {
      $('#st').textContent = 'Mengambil ' + n + '…'; let rows = [], from = 0;
      for (;;) { const { data, error } = await sb.from(n).select('*').order(ord[n] || 'id').range(from, from + 999); if (error) throw new Error(n + ': ' + error.message); rows = rows.concat(data); if (data.length < 1000) break; from += 1000 }
      const flat = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x !== null && typeof x === 'object' ? JSON.stringify(x).slice(0, 30000) : x])));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), n.slice(0, 31));
    }
    XLSX.writeFile(wb, `semua-data-tpq-${L.todayWIB()}.xlsx`);
  }, 'Berkas diunduh.');
};
})();
