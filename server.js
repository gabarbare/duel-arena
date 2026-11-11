const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const html = fs.readFileSync(path.join(__dirname, 'index.html'));
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
const wss = new WebSocketServer({ server });

const W = 900, G = 380, BW = 44, BH = 90, GR = 0.65, ROUND = 5400; // 5400 frames = 1 min 30
// type: m = mêlée, p = projectile, d = dash, sky = foudre du ciel, buff = bonus temporaire
// ult:1 = ultime (barre pleine requise), ub:1 = ne peut pas être bloqué, multi = touche plusieurs fois
const CH = [
  { name: 'Bruno', desc: 'Bagarreur, corps à corps', hp: 110, spd: 4.2, jmp: 13.5, color: '#e74c3c', atk: [
    { n: 'Direct', type: 'm', su: 4, ac: 4, rc: 8, cd: 6, dmg: 9, rng: 68, h: 30, kb: 4, st: 14 },
    { n: 'Crochet', type: 'm', su: 8, ac: 5, rc: 14, cd: 35, dmg: 15, rng: 74, h: 40, kb: 9, st: 20 },
    { n: 'Uppercut', type: 'm', su: 12, ac: 6, rc: 24, cd: 100, dmg: 24, rng: 55, h: 80, kb: 12, st: 32, lift: -11 },
    { n: 'Charge rageuse', ult: 1, ub: 1, type: 'd', su: 10, ac: 14, rc: 20, cd: 0, dmg: 30, rng: 50, h: 90, kb: 18, st: 40, lift: -9, spd: 18 }] },
  { name: 'Zéphyr', desc: 'Mage, attaques à distance', hp: 90, spd: 3.6, jmp: 13, color: '#9b59b6', atk: [
    { n: 'Éclair', type: 'p', su: 6, ac: 1, rc: 8, cd: 18, dmg: 5, vx: 12, r: 7, kb: 3, st: 12 },
    { n: 'Boule de feu', type: 'p', su: 12, ac: 1, rc: 16, cd: 70, dmg: 14, vx: 7, r: 16, kb: 10, st: 24 },
    { n: 'Rafale (x3)', type: 'p', su: 10, ac: 1, rc: 18, cd: 110, dmg: 6, vx: 9, r: 8, kb: 5, st: 14, cnt: 3 },
    { n: 'Foudre céleste', ult: 1, ub: 1, type: 'sky', su: 20, ac: 1, rc: 22, cd: 0, dmg: 36, kb: 12, st: 36, warn: 28, strike: 8 }] },
  { name: 'Kaze', desc: 'Ninja, rapide avec dash', hp: 85, spd: 5.6, jmp: 14.5, color: '#2ecc71', atk: [
    { n: 'Lame', type: 'm', su: 3, ac: 3, rc: 6, cd: 4, dmg: 4, rng: 55, h: 35, kb: 3, st: 11 },
    { n: 'Dash', type: 'd', su: 4, ac: 10, rc: 14, cd: 60, dmg: 11, rng: 34, h: 60, kb: 10, st: 22, spd: 15 },
    { n: 'Kunaï', type: 'p', su: 5, ac: 1, rc: 10, cd: 30, dmg: 7, vx: 14, r: 6, kb: 4, st: 14 },
    { n: 'Danse des lames', ult: 1, ub: 1, type: 'm', su: 8, ac: 24, rc: 14, cd: 0, dmg: 8, rng: 80, h: 90, kb: 3, st: 11, both: 1, multi: 6 }] },
  { name: 'Titan', desc: 'Tank, lent mais puissant', hp: 150, spd: 3.0, jmp: 11.9, color: '#f39c12', atk: [
    { n: 'Poing', type: 'm', su: 10, ac: 5, rc: 16, cd: 10, dmg: 9, rng: 98, h: 60, kb: 8, st: 18 },
    { n: 'Écrasement', type: 'm', su: 18, ac: 6, rc: 28, cd: 90, dmg: 22, rng: 90, h: 100, kb: 12, st: 28, both: 1 },
    { n: 'Séisme (au sol)', type: 'p', su: 14, ac: 1, rc: 24, cd: 120, dmg: 15, vx: 5, r: 20, kb: 11, st: 26, low: 1 },
    { n: 'Poing du Géant', ult: 1, ub: 1, type: 'm', su: 22, ac: 6, rc: 34, cd: 0, dmg: 45, rng: 105, h: 120, kb: 20, st: 44, lift: -8 }] },
  { name: 'Luffy', desc: 'Pirate élastique, coups à distance', hp: 100, spd: 4.4, jmp: 13.5, color: '#3b6fd8', atk: [
    { n: 'Pistol', type: 'm', su: 8, ac: 4, rc: 12, cd: 10, dmg: 8, rng: 170, h: 26, kb: 6, st: 14 },
    { n: 'Bazooka', type: 'm', su: 16, ac: 5, rc: 22, cd: 50, dmg: 16, rng: 115, h: 50, kb: 15, st: 28 },
    { n: 'Gear Second', type: 'buff', su: 10, ac: 1, rc: 12, cd: 420, dur: 300 },
    { n: 'Gatling', ult: 1, ub: 1, type: 'm', su: 10, ac: 24, rc: 16, cd: 0, dmg: 7, rng: 190, h: 46, kb: 2, st: 10, multi: 6 }] },
  { name: 'Chevalier', desc: 'Épée et bouclier, défense solide (blocage renforcé)', hp: 130, spd: 3.2, jmp: 12, color: '#aab7c4', blk: 0.05, atk: [
    { n: 'Estoc', type: 'm', su: 7, ac: 4, rc: 12, cd: 8, dmg: 8, rng: 88, h: 26, kb: 6, st: 15 },
    { n: 'Coup de bouclier', type: 'm', su: 10, ac: 4, rc: 16, cd: 45, dmg: 9, rng: 50, h: 85, kb: 18, st: 30 },
    { n: 'Taillade', type: 'm', su: 14, ac: 5, rc: 22, cd: 70, dmg: 17, rng: 95, h: 110, kb: 11, st: 26 },
    { n: 'Lame divine', ult: 1, ub: 1, type: 'p', su: 20, ac: 1, rc: 24, cd: 0, dmg: 34, vx: 13, r: 26, kb: 16, st: 34, vis: 3 }] },
  { name: 'Naruto', desc: 'Ninja de Konoha, clones et Rasengan', hp: 100, spd: 4.8, jmp: 14, color: '#ff7f27', atk: [
    { n: 'Uzumaki Rendan', type: 'm', su: 8, ac: 12, rc: 14, cd: 40, dmg: 4, rng: 62, h: 50, kb: 2, st: 9, multi: 4 },
    { n: 'Rasengan', type: 'm', su: 16, ac: 5, rc: 22, cd: 80, dmg: 18, rng: 72, h: 40, kb: 16, st: 30 },
    { n: 'Kage Bunshin', type: 'p', su: 9, ac: 1, rc: 14, cd: 100, dmg: 7, vx: 8, r: 16, kb: 8, st: 18, cnt: 2, clone: 1, cy: 45, vis: 1 },
    { n: 'Rasenshuriken', ult: 1, ub: 1, type: 'p', su: 24, ac: 1, rc: 26, cd: 0, dmg: 38, vx: 9, r: 30, kb: 18, st: 36, vis: 2 }] },
  { name: 'Gojo', desc: 'Sorcier suprême : sphères Rouge/Bleu, soin, Infini', hp: 100, spd: 4.2, jmp: 13.5, color: '#6ec6ff', atk: [
    { n: 'Rouge (repousse)', type: 'p', su: 9, ac: 1, rc: 14, cd: 45, dmg: 8, vx: 9, r: 16, kb: 24, st: 24, vis: 4 },
    { n: 'Bleu (attire)', type: 'p', su: 9, ac: 1, rc: 14, cd: 60, dmg: 5, vx: 6, r: 16, kb: 20, st: 26, vis: 5, pull: 1 },
    { n: 'Soin (annulé si touché)', type: 'heal', su: 8, ac: 90, rc: 10, cd: 300, hps: 0.22 },
    { n: 'Infini (2e barre de vie)', ult: 1, type: 'shield', su: 12, ac: 1, rc: 16, cd: 0, val: 60 }] },
  { name: 'Deku', desc: 'Héros en herbe, One For All', hp: 105, spd: 4.4, jmp: 14, color: '#388e3c', atk: [
    { n: 'Coup de poing', type: 'm', su: 5, ac: 4, rc: 9, cd: 8, dmg: 7, rng: 62, h: 30, kb: 5, st: 14 },
    { n: 'Air Force', type: 'p', su: 8, ac: 1, rc: 12, cd: 26, dmg: 7, vx: 12, r: 11, kb: 9, st: 16, vis: 6 },
    { n: 'Full Cowling', type: 'buff', su: 10, ac: 1, rc: 12, cd: 420, dur: 360 },
    { n: 'Detroit Smash 100%', ult: 1, ub: 1, type: 'dp', su: 10, dsh: 8, spd: 13, ac: 6, rc: 28, cd: 0, pct: 0.7, rng: 70, h: 60, kb: 20, st: 45 }] },
  // bd = dash arrière (invulnérable), form = transformation (remplace les attaques par 'alt'), jam = saut + onde de choc à l'atterrissage
  { name: 'Denji', desc: 'Chainsaw Man : Pochita, recul, transformation', hp: 105, spd: 4.3, jmp: 13.5, color: '#d4402f', atk: [
    { n: 'Coup simple', type: 'm', su: 5, ac: 4, rc: 9, cd: 8, dmg: 6, rng: 58, h: 30, kb: 5, st: 13 },
    { n: 'Pochita (lancer en cloche)', type: 'p', su: 10, ac: 1, rc: 16, cd: 80, dmg: 13, vx: 7, vy0: -10, grav: .5, r: 14, kb: 10, st: 24, vis: 7 },
    { n: 'Dash arrière', type: 'bd', su: 2, ac: 10, rc: 8, cd: 70, spd: 12 },
    { n: 'Chainsaw Man', ult: 1, type: 'form', su: 20, ac: 1, rc: 20, cd: 0, dur: 600 }], alt: [
    { n: 'Coup tronçonneuse', type: 'm', su: 6, ac: 5, rc: 10, cd: 8, dmg: 11, rng: 70, h: 42, kb: 9, st: 16 },
    { n: 'Charge', type: 'd', su: 8, ac: 16, rc: 18, cd: 50, spd: 11, dmg: 17, rng: 46, h: 70, kb: 14, st: 26 },
    { n: 'Saut écrasant', type: 'jam', su: 8, ac: 0, rc: 22, cd: 70, dmg: 20, jv: 15, jx: 3, aoe: 80, kb: 14, st: 30 }] }
];
const CHARS = CH.map(({ name, desc, hp, color, atk, alt }) => ({ name, desc, hp, color, atk: atk.map(a => a.n), alt: alt ? alt.map(a => a.n) : null }));

// gr = gravité, acc = adhérence du sol (1 = normal, petit = glissant)
const MAPS = [
  { n: 'Dojo', note: '', gr: GR, acc: 1 },
  { n: 'Volcan', note: '', gr: GR, acc: 1 },
  { n: 'Ville de nuit', note: '', gr: GR, acc: 1 },
  { n: 'Banquise', note: 'sol glissant', gr: GR, acc: 0.1 },
  { n: 'Lune', note: 'gravité réduite', gr: 0.42, acc: 1 }
];
function rollMap(r) { let m; do { m = Math.random() * MAPS.length | 0; } while (m === r.mi); r.mi = m; }

const atks = f => (f.form > 0 && CH[f.c].alt) || CH[f.c].atk;
const nf = (c, i, inp, ult) => ({ c, x: i ? 650 : 250, y: G, vx: 0, vy: 0, hp: CH[c].hp, face: i ? -1 : 1, stun: 0, atk: null, cds: [0, 0, 0, 0],
  block: 0, fl: 0, buff: 0, shield: 0, form: 0, inv: 0, ult: ult || 0, inp: inp || { l: 0, r: 0, u: 0, d: 0, a: [0, 0, 0, 0] } });

const box = (f, d) => {
  const y1 = f.y - BH * .85;
  if (d.both) return [f.x - BW / 2 - d.rng, f.x + BW / 2 + d.rng, y1, y1 + d.h];
  const a = f.x + f.face * BW / 2, b = f.x + f.face * (BW / 2 + d.rng);
  return [Math.min(a, b), Math.max(a, b), y1, y1 + d.h];
};
const hit = (b, t) => b[0] < t.x + BW / 2 && b[1] > t.x - BW / 2 && b[2] < t.y && b[3] > t.y - BH;

// t = victime, a = attaquant (pour la barre d'ultime), ub = non blocable
function hurt(t, dmg, kb, st, lift, srcX, ub, a) {
  const dir = srcX < t.x ? 1 : -1;
  if (t.inv) return;
  if (t.shield > 0) { // Infini : la 2e barre de vie absorbe tout, sans recul ni étourdissement
    t.shield = Math.max(0, t.shield - dmg); t.fl = 3;
    if (a && !ub) a.ult = Math.min(100, a.ult + dmg * .75);
    return;
  }
  if (!ub && t.block && t.stun <= 0 && t.y >= G) { t.hp -= dmg * (CH[t.c].blk ?? .15); t.vx = dir * kb * .3; t.fl = 4; return; }
  t.hp -= dmg; t.stun = st; t.vx = dir * kb; if (lift) t.vy = lift; t.atk = null; t.fl = 6;
  if (!ub) { t.ult = Math.min(100, t.ult + dmg * 1.2); if (a) a.ult = Math.min(100, a.ult + dmg * 1.5); }
}

function step(r, i) {
  const f = r.f[i], o = r.f[1 - i], c = CH[f.c], k = f.inp, dm = f.buff > 0 ? 1.25 : 1, M = MAPS[r.mi];
  f.cds = f.cds.map(v => v > 0 ? v - 1 : 0);
  if (f.fl > 0) f.fl--;
  if (f.buff > 0) f.buff--;
  if (f.form > 0) f.form--;
  f.inv = 0;
  f.ult = Math.min(100, f.ult + 0.008);
  const gr = f.y >= G; f.block = 0;
  if (f.stun > 0) { f.stun--; f.vx *= .9 + (1 - M.acc) * .08; }
  else if (f.atk) {
    const a = f.atk, d = a.d, s0 = d.su + (d.dsh || 0); a.f++;
    if ((d.type === 'd' && a.f > d.su && a.f <= d.su + d.ac) || (d.type === 'dp' && a.f > d.su && a.f <= s0)) f.vx = f.face * d.spd; else if (gr) f.vx *= .6 + (1 - M.acc) * .35;
    if (d.type === 'bd' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = -f.face * d.spd; f.inv = 1; }
    if (a.f === d.su + 1) {
      if (d.type === 'p') {
        for (let j = 0; j < (d.cnt || 1); j++)
          r.pj.push({ x: f.x + f.face * (30 - (d.clone ? j * 45 : 0)), y: f.y - (d.cy || (d.low ? 18 : BH * .6)), vx: f.face * d.vx, vy: d.vy0 || (d.cnt && !d.clone ? (j - 1) * 1.8 : 0), r: d.r, o: i, d });
      } else if (d.type === 'sky') r.fx.push({ x: o.x, t: 0, o: i, d });
      else if (d.type === 'buff') f.buff = d.dur;
      else if (d.type === 'shield') f.shield = d.val;
      else if (d.type === 'form') f.form = d.dur;
    }
    const act = a.f > s0 && a.f <= s0 + d.ac, mel = d.type === 'm' || d.type === 'd' || d.type === 'dp';
    if (d.type === 'heal' && act) f.hp = Math.min(c.hp, f.hp + d.hps);
    a.b = act && mel ? box(f, d) : null;
    if (d.type === 'jam') {
      if (a.f === d.su + 1) { f.vy = -d.jv; f.vx = f.face * d.jx; a.air = 1; }
      else if (a.air && f.y >= G && a.f > d.su + 3) {
        a.air = 0; a.land = a.f; a.lb = 6; f.vx = 0;
        if (hit([f.x - d.aoe, f.x + d.aoe, G - 70, G], o)) hurt(o, d.dmg * dm, d.kb, d.st, d.lift, f.x, d.ub, f);
      }
      if (a.lb > 0) { a.lb--; a.b = [f.x - d.aoe, f.x + d.aoe, G - 70, G]; }
    }
    if (a.b && d.multi && a.f % d.multi === 0) a.hit = 0;
    if (a.b && !a.hit && hit(a.b, o)) { a.hit = 1; hurt(o, d.pct ? CH[o.c].hp * d.pct : d.dmg * dm, d.kb, d.st, d.lift, f.x, d.ub, f); }
    if (f.atk && (d.type === 'jam' ? (a.land && a.f >= a.land + d.rc) || a.f > 150 : a.f >= s0 + d.ac + d.rc)) f.atk = null;
  } else {
    f.face = o.x >= f.x ? 1 : -1;
    const spd = c.spd * (f.buff > 0 ? 1.4 : 1);
    if (k.d && gr) { f.block = 1; f.vx *= 1 - M.acc; }
    else { f.vx += ((k.r - k.l) * spd - f.vx) * (gr ? M.acc : 1); if (k.u && gr) f.vy = -c.jmp; }
    for (let j = 0; j < 4; j++) if (k.a[j] && !f.cds[j] && !f.block) {
      const d = atks(f)[j];
      if (!d) continue;
      if (d.ult && f.ult < 100) continue;
      if (d.ult) f.ult = 0;
      f.atk = { k: j, f: 0, d }; f.cds[j] = d.cd + d.su + (d.dsh || 0) + d.ac + d.rc; break;
    }
  }
  f.x += f.vx; f.y += f.vy;
  if (f.y < G) f.vy += M.gr; else { f.y = G; f.vy = 0; }
  f.x = Math.max(BW / 2, Math.min(W - BW / 2, f.x));
}

function sep(r) {
  const [a, b] = r.f;
  if (Math.abs(a.x - b.x) < BW && Math.abs(a.y - b.y) < BH * .8) {
    const m = (BW - Math.abs(a.x - b.x)) / 2, s = a.x < b.x ? -1 : 1;
    a.x += s * m; b.x -= s * m;
  }
}

function projs(r) {
  r.pj = r.pj.filter(p => {
    p.x += p.vx; p.y += p.vy; if (p.d.grav) p.vy += p.d.grav;
    const t = r.f[1 - p.o], ow = r.f[p.o];
    if (Math.abs(p.x - t.x) < BW / 2 + p.r && p.y > t.y - BH - p.r && p.y < t.y + p.r) {
      hurt(t, p.d.dmg * (ow.buff > 0 ? 1.25 : 1), p.d.kb, p.d.st, 0, p.d.pull ? t.x + Math.sign(p.vx) * 50 : p.x - p.vx * 3, p.d.ub, ow); return false;
    }
    return p.x > -50 && p.x < W + 50 && p.y < G + 25;
  });
}

// foudre : zone marquée au sol pendant "warn" frames, puis frappe pendant "strike" frames
function fxs(r) {
  r.fx = r.fx.filter(e => {
    e.t++;
    const d = e.d, t = r.f[1 - e.o], ow = r.f[e.o];
    if (e.t > d.warn && e.t <= d.warn + d.strike && !e.hit && Math.abs(t.x - e.x) < 45) {
      e.hit = 1; hurt(t, d.dmg * (ow.buff > 0 ? 1.25 : 1), d.kb, d.st, -8, e.x, d.ub, ow);
    }
    return e.t <= d.warn + d.strike;
  });
}

function start(r) { r.f = [nf(r.sel[0], 0), nf(r.sel[1], 1)]; r.pj = []; r.fx = []; rollMap(r); r.ph = 'cd'; r.t = 150; r.tm = ROUND; r.msg = ''; }

function tick(r) {
  if (r.ph === 'cd') { if (--r.t <= 0) r.ph = 'fight'; }
  else if (r.ph === 'fight') {
    step(r, 0); step(r, 1); sep(r); projs(r); fxs(r); r.tm--;
    const [a, b] = r.f;
    if (a.hp <= 0 || b.hp <= 0 || r.tm <= 0) {
      const w = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
      if (w >= 0) r.wins[w]++;
      r.msg = w < 0 ? 'Égalité !' : CH[r.f[w].c].name + ' gagne la manche !';
      r.ph = 'rend'; r.t = 150;
      if (r.wins[0] >= 2 || r.wins[1] >= 2) { r.ph = 'end'; r.msg = '🏆 ' + CH[r.f[w].c].name + ' remporte le match !'; r.again = [0, 0]; r.co = [0, 1].map(q => r.wins[q] * 10 + (r.wins[q] >= 2 ? 30 : 10)); }
    }
  }
  else if (r.ph === 'rend') {
    if (--r.t <= 0) { r.f = r.f.map((f, i) => nf(f.c, i, f.inp, f.ult)); r.pj = []; r.fx = []; rollMap(r); r.ph = 'cd'; r.t = 120; r.tm = ROUND; r.msg = ''; }
  }
  else if (r.ph === 'end') {
    if (r.again[0] && r.again[1]) { r.ph = 'select'; r.sel = [null, null]; r.wins = [0, 0]; r.msg = ''; r.f = []; }
  }
  const live = r.ph !== 'wait' && r.ph !== 'select';
  const s = { t: 's', p: r.ph, n: Math.ceil(r.t / 60), tm: Math.ceil(r.tm / 60), w: r.wins, m: r.msg, sel: r.sel, mp: r.mi, co: r.ph === 'end' ? r.co : null, ag: r.again,
    f: live ? r.f.map((f, q) => {
      const d = f.atk && f.atk.d;
      return { c: f.c, sk: r.sk[q], x: Math.round(f.x), y: Math.round(f.y), hp: Math.max(0, Math.round(f.hp)), fc: f.face, bl: f.block, fl: f.fl > 0 ? 1 : 0,
        ul: Math.round(f.ult), bf: f.buff > 0 ? 1 : 0, sh: Math.round(f.shield), fm: f.form > 0 ? 1 : 0, iv: f.inv ? 1 : 0,
        ak: f.atk ? f.atk.k : -1, ap: d ? (f.atk.f <= d.su + (d.dsh || 0) ? 0 : f.atk.f <= d.su + (d.dsh || 0) + d.ac ? 1 : 2) : -1,
        b: f.atk && f.atk.b ? f.atk.b.map(Math.round) : null };
    }) : [],
    pj: live ? r.pj.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, o: p.o, k: p.d.vis || 0, v: Math.sign(p.vx) })) : [],
    fx: live ? r.fx.map(e => ({ x: Math.round(e.x), p: e.t > e.d.warn ? 1 : 0 })) : [] };
  r.ps.forEach(p => tx(p, s));
}

const tx = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
const rooms = new Map(), queue = [];
const newCode = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; };
const join = ws => tx(ws, { t: 'room', code: ws.room.code, idx: ws.idx, chars: CHARS, maps: MAPS.map(({ n, note }) => ({ n, note })) });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'create' && !ws.room) {
      const r = { code: newCode(), ps: [ws], ph: 'wait', sel: [null, null], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: -1, sk: ['', ''], again: [0, 0], co: [0, 0] };
      rooms.set(r.code, r); ws.room = r; ws.idx = 0; join(ws);
    } else if (m.t === 'queue' && !ws.room && !queue.includes(ws)) {
      while (queue.length && queue[0].readyState !== 1) queue.shift();
      const other = queue.shift();
      if (other) {
        const r = { code: newCode(), ps: [other, ws], ph: 'select', sel: [null, null], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: -1, sk: ['', ''], again: [0, 0], co: [0, 0] };
        rooms.set(r.code, r); other.room = r; other.idx = 0; ws.room = r; ws.idx = 1; join(other); join(ws);
      } else { queue.push(ws); tx(ws, { t: 'queued' }); }
    } else if (m.t === 'join' && !ws.room) {
      const r = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!r || r.ps.length > 1) return tx(ws, { t: 'err', m: 'Code invalide ou partie pleine' });
      r.ps.push(ws); ws.room = r; ws.idx = 1; r.ph = 'select'; join(ws); tx(r.ps[0], { t: 'room', code: r.code, idx: 0, chars: CHARS, maps: MAPS.map(({ n, note }) => ({ n, note })) });
    } else if (m.t === 'pick') {
      const r = ws.room;
      if (r && r.ph === 'select' && CH[m.c]) { r.sel[ws.idx] = m.c; r.sk[ws.idx] = String(m.sk || '').slice(0, 40); if (r.sel[0] != null && r.sel[1] != null) { r.wins = [0, 0]; start(r); } }
    } else if (m.t === 'again') {
      const r = ws.room; if (r && r.ph === 'end') r.again[ws.idx] = 1;
    } else if (m.t === 'in') {
      const r = ws.room;
      if (r && r.f[ws.idx]) r.f[ws.idx].inp = { l: +!!m.l, r: +!!m.r, u: +!!m.u, d: +!!m.d, a: [0, 1, 2, 3].map(k => +!!(m.a && m.a[k])) };
    }
  });
  ws.on('close', () => {
    const qi = queue.indexOf(ws); if (qi >= 0) queue.splice(qi, 1);
    const r = ws.room; if (!r) return;
    rooms.delete(r.code);
    r.ps.forEach(p => { if (p !== ws) { tx(p, { t: 'err', m: 'Adversaire déconnecté' }); p.room = null; } });
  });
});

setInterval(() => rooms.forEach(tick), 1000 / 60);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Duel Arena sur http://localhost:' + PORT));
