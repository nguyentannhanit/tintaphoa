/* Mini App "Tin Tạp Hoá — Điều hành".
   Dữ liệu vào: tham số ?s= (JSON nén zlib + base64url) do bot gắn vào nút 🏪 mỗi lần gửi bàn phím.
   Dữ liệu ra: Telegram.WebApp.sendData(JSON) → bot nhận ở on_web_app. sendData đóng app,
   nên mỗi nút Lưu/Chạy/Gửi là một lần đóng — bot trả lời trong chat và làm mới nút 🏪. */
'use strict';
const TG = window.Telegram && window.Telegram.WebApp;
if (TG) { TG.ready(); TG.expand(); }

const TEN_NEN = {facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube'};
const ICON = {facebook: '📘', tiktok: '🎵', youtube: '▶️'};
const TEN_MAU = {tapchi: '🖼 Tạp chí ảnh', bantin: '📺 Bản tin', sotay: '📓 Sổ tay giấy', poster: '🔥 Poster đậm',
  dienanh: '🎞 Điện ảnh', neon: '💡 Neon', glass: '🧊 Kính mờ', truyentranh: '💥 Truyện tranh', doi: '🎧 Hai tông'};
const TEN_BG = {luoi: '▦ Lưới', cham: '·· Chấm', soc: '∕∕ Sọc', topo: '◠ Đồng mức', ke: '≡ Kẻ', min: '○ Trơn'};
const TEN_DUR = {20: '⚡ ~20 s', 32: '🎯 ~30 s', 55: '📺 ~55 s', 90: '📚 ~90 s'};
const TEN_KHEP = {tiktok: '🎵 TikTok', shorts: '▶️ Shorts', facebook: '📘 Facebook'};
const GOI_Y = [
  ['⭐ Chuẩn 3 lần/ngày', [['07:00', ['facebook', 'tiktok']], ['12:00', ['tiktok']], ['20:00', ['facebook', 'tiktok']]]],
  ['🔥 Tối cao điểm', [['19:00', ['tiktok']], ['20:00', ['facebook']], ['21:00', ['tiktok']]]],
  ['🌅 Sáng + tối', [['07:00', ['facebook', 'tiktok']], ['20:30', ['facebook', 'tiktok']]]],
];

// ---------- đọc trạng thái ----------
function giaiMa(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(pako.inflate(u8)));
}
let S;
try { S = giaiMa(new URLSearchParams(location.search).get('s') || ''); }
catch (e) { S = null; }
if (!S) S = {v: 1, ngay: '', lich: [], chung: {bao_loi: true, im_lang: ['23:00', '06:00'], tong_ket: '22:30'},
  homnay: [], tk: [], log: [], videos: [], nen_co: [], caidat: {}, models: [], bot: {}};
// bản nháp chỉnh sửa (chưa gửi)
const D = {lich: JSON.parse(JSON.stringify(S.lich || [])), chung: Object.assign({}, S.chung), caidat: Object.assign({}, S.caidat)};
let sua = null;   // id khung đang sửa

// ---------- tiện ích ----------
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const attr = o => esc(JSON.stringify(o));   // JSON đặt trong thuộc tính data-gui='…' — tên video có thể chứa ' hay "
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); }
// Mini App mở từ nút bàn phím KHÔNG có initData (Telegram chỉ cấp cho app mở từ nút inline/menu),
// nên nhận diện bằng platform. sendData đóng app ngay, bot trả lời trong chat.
const TRONG_TG = !!(TG && TG.platform && TG.platform !== 'unknown');
function gui(d) {
  const s = JSON.stringify(d);
  if (TRONG_TG) {
    try { TG.HapticFeedback && TG.HapticFeedback.impactOccurred('medium'); } catch (e) {}
    TG.sendData(s);
    return;
  }
  toast('Mở từ Telegram (nút 🏪) mới gửi được lệnh');
  console.log('sendData', s);
}
function phut(g) { const [h, m] = g.split(':').map(Number); return h * 60 + m; }
function gio(p) { p = ((p % 1440) + 1440) % 1440; return String(Math.floor(p / 60)).padStart(2, '0') + ':' + String(p % 60).padStart(2, '0'); }
function chips(nen) { return (nen && nen.length ? nen : []).map(n => `<span class="chip ${n}">${TEN_NEN[n] || n}</span>`).join('') || '<span class="chip">không đăng</span>'; }
function idMoi() { return 'k' + Date.now().toString(16).slice(-7); }
function tgLen(s) { s = Number(s || 0); const g = Math.floor(s / 3600), n = Math.floor((s % 3600) / 60); return g ? `${g} g ${n} ph` : `${n} phút`; }

// ---------- màn: tổng quan ----------
function manTong() {
  const hn = S.homnay || [], bat = hn.filter(k => k.bat).length, xong = hn.filter(k => k.tt === 'ok').length, loi = hn.filter(k => k.tt === 'loi').length;
  const ic = {ok: '✅', loi: '❌', chay: '🎬', tat: '⚫', cho: '⏳', qua: '⏭'};
  const rows = hn.length ? hn.map(k => `<div class="row ${k.bat ? '' : 'mo'}" data-sua="${k.id}"><div class="time">${k.gio}</div><div class="chips">${chips(k.nen)}</div>
     <div class="st ${k.tt === 'ok' ? 'ok' : k.tt === 'loi' ? 'loi' : ''}">${ic[k.tt] || ''} ${esc(k.ghi)}</div></div>`).join('')
    : '<div class="empty">Chưa có khung giờ nào. Sang tab Lịch để thêm.</div>';
  const log = (S.log || []).slice().reverse().map(m => `<div><time>${esc(m.t)}</time>${esc(m.x)}</div>`).join('') || '<div class="empty">Hôm nay chưa có gì.</div>';
  const b = S.bot || {};
  const dang = b.dang_lam ? `<div class="card"><h2>Đang làm</h2><div>🎬 ${esc(b.dang_lam)}${b.pct != null ? ' · ' + b.pct + '%' : ''}${b.cho ? ' · còn ' + b.cho + ' việc chờ' : ''}</div></div>` : '';
  return `<div class="wrap">
    <div class="card"><h2>Hôm nay · ${esc(S.ngay)}<span class="lnk" data-m="lich">Sửa lịch ›</span></h2>
      <div class="kpi"><div><b>${bat}</b><span>khung giờ</span></div><div><b>${xong}</b><span>đã đăng</span></div><div><b>${loi}</b><span>lỗi</span></div></div></div>
    ${dang}
    <div class="card"><h2>Lịch hôm nay</h2>${rows}</div>
    <div class="card"><h2>Nhật ký mới nhất</h2><div class="log">${log}</div></div>
    <div class="grid2"><button class="btn ghost" data-gui='{"a":"sukien"}'>📰 Sự kiện hôm nay</button><button class="btn ghost" data-gui='{"a":"thu_cong"}'>🎬 Tạo thủ công</button></div>
  </div>`;
}

// ---------- màn: lịch ----------
function manLich() {
  const rows = D.lich.length ? D.lich.map(k => `<div class="row ${k.bat ? '' : 'mo'}"><div class="time" data-sua="${k.id}">${k.gio}</div>
      <div class="chips" data-sua="${k.id}">${chips(k.nen)}</div><div class="sw ${k.bat ? 'on' : ''}" data-bat="${k.id}"></div></div>`).join('')
    : '<div class="empty">Chưa có khung giờ nào.</div>';
  const goiy = GOI_Y.map((g, i) => `<div data-goi="${i}"><b>${g[0]}</b><span>${g[1].map(x => x[0] + ' ' + x[1].map(n => ICON[n]).join('')).join(' · ')}</span></div>`).join('');
  const im = D.chung.im_lang || ['', ''];
  return `<div class="wrap">
    <div class="card"><h2>Khung giờ tự động</h2>${rows}
      ${D.lich.length < 8 ? '<button class="btn ghost" id="them">＋ Thêm khung giờ</button>' : ''}</div>
    <div class="card"><h2>Giờ đề xuất · người Việt xem nhiều</h2><div class="sug">${goiy}</div>
      <div class="empty">TikTok mạnh nhất 12:00–13:00 và 19:00–22:00 · Facebook 06:30–08:00, 11:30–12:30, 20:00–21:30. Chọn một bộ là thay toàn bộ lịch.</div></div>
    <div class="card"><h2>Chung</h2>
      <div class="field"><label>Báo lỗi vào chat<small>Mỗi lần dựng hỏng hay đăng hỏng</small></label><div class="sw ${D.chung.bao_loi ? 'on' : ''}" id="baoloi"></div></div>
      <div class="field"><label>Giờ im lặng<small>Không gửi thông báo (lỗi vẫn báo)</small></label>
        <input type="time" id="im1" value="${esc(im[0])}"> – <input type="time" id="im2" value="${esc(im[1])}"></div>
      <div class="field"><label>Tổng kết cuối ngày<small>Số video, tỷ lệ đăng, token</small></label><input type="time" id="tongket" value="${esc(D.chung.tong_ket || '22:30')}"></div>
    </div>
    <button class="btn" id="luuLich">Lưu lịch</button>
    <div class="empty">Lưu xong app đóng lại, bot xác nhận trong chat.</div>
  </div>`;
}

// ---------- màn: sửa khung ----------
function manKhung() {
  const k = D.lich.find(x => x.id === sua);
  if (!k) { sua = null; return manLich(); }
  const nenCo = ['facebook', 'tiktok'];
  return `<div class="wrap">
    <div class="card"><h2>Khung giờ ${D.lich.indexOf(k) + 1}<span class="lnk" id="veLich">‹ Lịch</span></h2>
      <div class="timebox"><button data-gio="-15">−</button><b id="gioHien">${k.gio}</b><button data-gio="15">+</button></div>
      <div class="empty" style="text-align:center">bước 15 phút · <input type="time" id="gioGo" value="${k.gio}"></div></div>
    <div class="card"><h2>Đăng lên</h2>
      ${nenCo.map(n => `<div class="field"><label>${ICON[n]} ${TEN_NEN[n]}${n === 'facebook' ? ' Reels' : ''}<small>${
        n === 'tiktok' ? '@tintaphoa_official' + (S.tt_direct ? ' · đăng thẳng' : ' · sandbox: vào hộp thư') : 'Fanpage Tin Tạp Hoá'}${
        (S.nen_co || []).includes(n) ? '' : ' · <span style="color:#FF8A75">chưa cấu hình trong phần mềm</span>'}</small></label>
        <div class="sw ${k.nen.includes(n) ? 'on' : ''}" data-nen="${n}"></div></div>`).join('')}</div>
    <div class="card"><h2>Nội dung</h2>
      <div class="field"><label>Nguồn tin</label><div class="seg" style="max-width:230px"><span class="${k.nguon !== 'chude' ? 'on' : ''}" data-nguon="sukien">Sự kiện nổi bật</span><span class="${k.nguon === 'chude' ? 'on' : ''}" data-nguon="chude">Chủ đề cố định</span></div></div>
      ${k.nguon === 'chude' ? `<div class="field"><input type="text" id="chude" placeholder="Ví dụ: Tin giá vàng hôm nay" value="${esc(k.chude || '')}"></div>` : ''}
      <div class="empty">Phong cách, thời lượng, giọng dùng chung ở tab Cài đặt.</div></div>
    <div class="field"><label>Bật khung này</label><div class="sw ${k.bat ? 'on' : ''}" id="batKhung"></div></div>
    <button class="btn" id="luuKhung">Lưu khung giờ</button>
    <div class="grid2"><button class="btn ghost" id="chayThu">▶ Chạy thử ngay</button><button class="btn warn" id="xoaKhung">🗑 Xoá khung</button></div>
  </div>`;
}

// ---------- màn: video ----------
function manVideo() {
  const vs = S.videos || [];
  const rows = vs.length ? vs.map(v => `<div class="vid"><div class="ten">${esc(v.ten)}<small>${esc(v.luc)} · ${v.mb} MB</small></div>
    <div class="acts"><button title="Gửi lại file" data-gui='${attr({a: 'gui_video', f: v.f})}'>📥</button>
    ${(S.nen_co || []).filter(n => n !== 'youtube').map(n => `<button title="Đăng lên ${TEN_NEN[n]}" data-gui='${attr({a: 'dang', f: v.f, nen: n})}'>${ICON[n]}</button>`).join('')}</div></div>`).join('')
    : '<div class="empty">Chưa có video nào.</div>';
  return `<div class="wrap"><div class="card"><h2>Video gần đây</h2>${rows}</div>
    <div class="empty">📥 gửi lại file vào chat · 📘 🎵 đăng thêm lên nền tảng (caption lấy theo tên video).</div></div>`;
}

// ---------- màn: báo cáo ----------
function manBaoCao() {
  const tk = S.tk || [];
  const tong = tk.reduce((a, d) => { a.v += d.video; a.fb += (d.facebook || [0, 0])[0]; a.tt += (d.tiktok || [0, 0])[0]; a.loi += d.loi; a.tok += d.tok; return a; }, {v: 0, fb: 0, tt: 0, loi: 0, tok: 0});
  const rows = tk.map(d => `<tr><td>${esc(d.ngay)}</td><td>${d.video}</td><td class="${(d.facebook || [0, 0])[1] ? 'loi' : 'ok'}">${(d.facebook || [0, 0]).join('/')}</td><td class="${(d.tiktok || [0, 0])[1] ? 'loi' : 'ok'}">${(d.tiktok || [0, 0]).join('/')}</td><td>${d.loi || ''}</td></tr>`).join('');
  return `<div class="wrap">
    <div class="card"><h2>7 ngày qua</h2><div class="kpi"><div><b>${tong.v}</b><span>video</span></div><div><b>${tong.fb + tong.tt}</b><span>lượt đăng ✅</span></div><div><b>${tong.loi}</b><span>lỗi</span></div></div></div>
    <div class="card"><h2>Theo ngày</h2><table><tr><th>Ngày</th><th>Video</th><th>📘 ok/lỗi</th><th>🎵 ok/lỗi</th><th>Lỗi</th></tr>${rows}</table>
      ${tong.tok ? `<div class="empty">Token AI 7 ngày: ${tong.tok.toLocaleString('vi-VN')}</div>` : ''}</div>
    <button class="btn ghost" data-gui='{"a":"bang"}'>🎛 Mở bảng nút trong chat</button>
  </div>`;
}

// ---------- màn: cài đặt ----------
function manCaiDat() {
  const c = D.caidat;
  const opt = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${String(k) === String(cur) ? 'selected' : ''}>${v}</option>`).join('');
  const models = (S.models || []).map(([m, ten]) => `<option value="${esc(m)}" ${m === c.model ? 'selected' : ''}>${esc(ten)}</option>`).join('');
  return `<div class="wrap">
    <div class="card"><h2>Hình ảnh</h2>
      <div class="field"><label>Bot tự chọn phong cách<small>Theo chủ đề từng video</small></label><div class="sw ${c.auto ? 'on' : ''}" id="auto"></div></div>
      ${c.auto ? '' : `<div class="field"><label>Phong cách</label><select id="style">${opt(TEN_MAU, c.style)}</select></div>
      <div class="field"><label>Hoa văn nền</label><select id="bg">${opt(TEN_BG, c.bg)}</select></div>`}
      <div class="field"><label>Nhân vật chibi</label><div class="sw ${c.mascot ? 'on' : ''}" id="mascot"></div></div></div>
    <div class="card"><h2>Video</h2>
      <div class="field"><label>Thời lượng</label><select id="dur">${opt(TEN_DUR, c.dur)}</select></div>
      <div class="field"><label>Cách khép video<small>Theo nền tảng chính</small></label><select id="nen_tang">${opt(TEN_KHEP, c.nen_tang)}</select></div>
      <div class="field"><label>Não AI</label><select id="model">${models}</select></div>
      <div class="field"><label>Giọng đọc<small>${esc(c.tts === 'vbee' ? 'Vbee · ' + c.giong : 'Edge · ' + c.giong)}</small></label><span class="val">đổi trong chat: /voice</span></div></div>
    <button class="btn" id="luuCaiDat">Lưu cài đặt</button>
    <div class="card"><h2>Kết nối</h2>
      <div class="field"><label>📘 Facebook</label><span class="val">${(S.nen_co || []).includes('facebook') ? '✅ đã nối' : '— chưa'}</span></div>
      <div class="field"><label>🎵 TikTok</label><span class="val">${(S.nen_co || []).includes('tiktok') ? (S.tt_direct ? '✅ đăng thẳng' : '✅ sandbox') : '— chưa'}</span></div>
      <div class="field"><label>Bot</label><span class="val">chạy ${tgLen((S.bot || {}).len)}</span></div></div>
  </div>`;
}

// ---------- điều hướng ----------
const MAN = {tong: manTong, lich: manLich, video: manVideo, baocao: manBaoCao, caidat: manCaiDat};
let man = 'tong';
function ve() {
  $('#man').innerHTML = sua ? manKhung() : MAN[man]();
  document.querySelectorAll('.tab a').forEach(a => a.classList.toggle('on', a.dataset.m === man));
  window.scrollTo(0, 0);
}
document.querySelector('.tab').addEventListener('click', ev => { const a = ev.target.closest('a'); if (!a) return; man = a.dataset.m; sua = null; ve(); });

document.addEventListener('click', ev => {
  const t = ev.target;
  const g = t.closest('[data-gui]'); if (g) { gui(JSON.parse(g.dataset.gui)); return; }
  const m = t.closest('[data-m]'); if (m && !m.closest('.tab')) { man = m.dataset.m; sua = null; ve(); return; }
  const s = t.closest('[data-sua]'); if (s) { man = 'lich'; sua = s.dataset.sua; ve(); return; }
  const b = t.closest('[data-bat]'); if (b) { const k = D.lich.find(x => x.id === b.dataset.bat); if (k) { k.bat = !k.bat; ve(); } return; }
  const gy = t.closest('[data-goi]'); if (gy) { D.lich = GOI_Y[+gy.dataset.goi][1].map(x => ({id: idMoi(), gio: x[0], nen: x[1].slice(), bat: true, nguon: 'sukien', chude: ''})); toast('Đã áp bộ giờ — nhớ bấm Lưu lịch'); ve(); return; }
  if (t.id === 'them') { const k = {id: idMoi(), gio: '07:00', nen: (S.nen_co || []).filter(n => n !== 'youtube'), bat: true, nguon: 'sukien', chude: ''}; if (!k.nen.length) k.nen = ['facebook', 'tiktok']; D.lich.push(k); sua = k.id; ve(); return; }
  if (t.id === 'baoloi') { D.chung.bao_loi = !D.chung.bao_loi; ve(); return; }
  if (t.id === 'luuLich') { docChung(); D.lich.sort((a, b) => phut(a.gio) - phut(b.gio)); gui({a: 'luu_lich', lich: D.lich, chung: D.chung}); return; }
  // màn sửa khung
  const k = sua && D.lich.find(x => x.id === sua);
  if (!k) return;
  const dg = t.closest('[data-gio]'); if (dg) { k.gio = gio(phut(k.gio) + Number(dg.dataset.gio)); ve(); return; }
  const dn = t.closest('[data-nen]'); if (dn) { const n = dn.dataset.nen; k.nen = k.nen.includes(n) ? k.nen.filter(x => x !== n) : k.nen.concat(n); ve(); return; }
  const ng = t.closest('[data-nguon]'); if (ng) { k.nguon = ng.dataset.nguon; ve(); return; }
  if (t.id === 'batKhung') { k.bat = !k.bat; ve(); return; }
  if (t.id === 'veLich') { docChuDe(k); sua = null; ve(); return; }
  if (t.id === 'luuKhung') { docChuDe(k); docChung(); D.lich.sort((a, b) => phut(a.gio) - phut(b.gio)); gui({a: 'luu_lich', lich: D.lich, chung: D.chung}); return; }
  if (t.id === 'chayThu') { const co = (S.lich || []).some(x => x.id === k.id); if (!co) { toast('Lưu lịch trước rồi mới chạy thử được'); return; } gui({a: 'chay_thu', id: k.id}); return; }
  if (t.id === 'xoaKhung') { D.lich = D.lich.filter(x => x.id !== k.id); sua = null; toast('Đã bỏ khung — bấm Lưu lịch để chốt'); ve(); return; }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  const k = sua && D.lich.find(x => x.id === sua);
  if (t.id === 'gioGo' && k && /^\d\d:\d\d$/.test(t.value)) { k.gio = t.value; ve(); }
  if (t.id === 'chude' && k) k.chude = t.value;
});
function docChung() {
  const a = $('#im1'), b = $('#im2'), c = $('#tongket');
  if (a && b) D.chung.im_lang = [a.value || '', b.value || ''];
  if (c && c.value) D.chung.tong_ket = c.value;
}
function docChuDe(k) { const c = $('#chude'); if (c) k.chude = c.value; }
// cài đặt
document.addEventListener('click', ev => {
  const t = ev.target;
  if (t.id === 'auto') { D.caidat.auto = !D.caidat.auto; ve(); }
  if (t.id === 'mascot') { D.caidat.mascot = !D.caidat.mascot; ve(); }
  if (t.id === 'luuCaiDat') {
    ['style', 'bg', 'dur', 'nen_tang', 'model'].forEach(id => { const el = $('#' + id); if (el) D.caidat[id] = id === 'dur' ? Number(el.value) : el.value; });
    gui({a: 'caidat', caidat: D.caidat});
  }
});
if ((S.bot || {}).dang_lam) { $('#pill').textContent = 'Đang dựng'; $('#pill').classList.add('ban'); }
ve();
