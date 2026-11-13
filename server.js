const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const html = fs.readFileSync(path.join(__dirname, 'index (6).html'));
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
    { n: 'Charge rageuse', ult: 1, ub: 1, type: 'd', su: 10, ac: 14, rc: 20, cd: 0, dmg: 30, rng: 50, h: 90, kb: 18, st: 50, lift: -9, spd: 18 }] },
  { name: 'Zéphyr', desc: 'Mage, attaques à distance', hp: 90, spd: 3.6, jmp: 13, color: '#9b59b6', atk: [
    { n: 'Éclair', type: 'p', su: 6, ac: 1, rc: 8, cd: 23, dmg: 5, vx: 12, r: 7, kb: 3, st: 12, vis: 18 },
    { n: 'Boule de feu', type: 'p', su: 12, ac: 1, rc: 36, cd: 70, dmg: 14, vx: 7, r: 16, kb: 10, st: 24, vis: 19 },
    { n: 'Orbes de vent (x3)', type: 'p', su: 10, ac: 1, rc: 34, cd: 110, dmg: 6, vx: 9, r: 8, kb: 5, st: 14, cnt: 3, vis: 20 },
    { n: 'Foudre céleste', ult: 1, ub: 1, type: 'sky', su: 20, ac: 1, rc: 22, cd: 0, dmg: 36, kb: 12, st: 36, warn: 28, strike: 8 }] },
  { name: 'Kaze', desc: 'Ninja, rapide avec dash', hp: 85, spd: 5.6, jmp: 14.5, color: '#2ecc71', atk: [
    { n: 'Kunai au corps à corps', type: 'm', su: 3, ac: 3, rc: 6, cd: 4, dmg: 4, rng: 55, h: 35, kb: 3, st: 11 },
    { n: 'Dash', type: 'd', su: 4, ac: 10, rc: 14, cd: 60, dmg: 11, rng: 34, h: 60, kb: 10, st: 22, spd: 15 },
    { n: 'Lancer de kunai', type: 'p', su: 5, ac: 1, rc: 10, cd: 80, dmg: 5, vx: 14, r: 6, kb: 4, st: 5, vis: 21 },
    { n: 'Pluie de kunaï (5 + 1 planté)', ult: 1, ub: 1, type: 'kunai6', su: 10, ac: 76, rc: 14, cd: 0, cnt: 5, gap: 8, vx: 22, r: 6, spd: 32, fin: 16, finKb: 14, finSt: 34, lift: -6, kd: { dmg: 6, kb: 4, st: 12, vis: 21, ub: 1 } }] },
  { name: 'Viking', desc: 'Tank, lent mais puissant', hp: 150, spd: 3.0, jmp: 11.9, color: '#f39c12', atk: [
    { n: 'Poing', type: 'm', su: 8, ac: 5, rc: 12, cd: 6, dmg: 9, rng: 98, h: 60, kb: 8, st: 18 },
    { n: 'Écrasement', type: 'm', su: 14, ac: 6, rc: 22, cd: 70, dmg: 26, rng: 90, h: 100, kb: 12, st: 28, both: 1 },
    { n: 'Vague de séisme', type: 'p', su: 12, ac: 1, rc: 20, cd: 100, dmg: 15, vx: 5, r: 20, kb: 11, st: 26, low: 1, vis: 22 },
    { n: 'Poing du Géant', ult: 1, ub: 1, type: 'm', su: 18, ac: 6, rc: 28, cd: 0, dmg: 45, rng: 105, h: 120, kb: 20, st: 44, lift: -8 }] },
  { name: 'Chevalier', desc: 'Épée et bouclier, défense solide (blocage renforcé)', hp: 130, spd: 3.2, jmp: 12, color: '#aab7c4', blk: 0.05, atk: [
    { n: 'Estoc', type: 'm', su: 7, ac: 4, rc: 12, cd: 8, dmg: 8, rng: 88, h: 26, kb: 6, st: 15 },
    { n: 'Coup de bouclier', type: 'm', su: 10, ac: 4, rc: 16, cd: 20, dmg: 9, rng: 50, h: 85, kb: 18, st: 30 },
    { n: 'Taillade', type: 'm', su: 14, ac: 5, rc: 22, cd: 70, dmg: 17, rng: 95, h: 110, kb: 11, st: 26 },
    { n: 'Lame divine', ult: 1, ub: 1, type: 'p', su: 20, ac: 1, rc: 24, cd: 0, dmg: 34, vx: 13, r: 26, kb: 16, st: 34, vis: 3 }] },
  { name: 'Kairos', desc: 'Horloger du temps : écho, rembobinage, arrêt du temps', hp: 95, spd: 4.4, jmp: 13.5, color: '#d9b84a', atk: [
    { n: 'Aiguille', type: 'm', su: 6, ac: 4, rc: 10, cd: 8, dmg: 7, rng: 72, h: 30, kb: 5, st: 14 },
    { n: 'Écho temporel (frappe différée)', type: 'echo', su: 8, ac: 1, rc: 14, cd: 150, dmg: 16, kb: 12, st: 26, warn: 50, rad: 75 },
    { n: 'Rembobinage (retour 2 s en arrière)', type: 'rewind', su: 6, ac: 1, rc: 12, cd: 180, heal: .6 },
    { n: 'Arrêt du temps', ult: 1, ub: 1, type: 'timestop', su: 14, ac: 1, rc: 12, cd: 0, dur: 120, mult: 1.2 }] },
  { name: 'Luffy', desc: 'Pirate élastique, coups à distance', hp: 100, spd: 4.4, jmp: 13.5, color: '#3b6fd8', atk: [
    { n: 'Pistol', type: 'm', su: 8, ac: 4, rc: 12, cd: 10, dmg: 7, rng: 150, h: 26, kb: 6, st: 14 },
    { n: 'Bazooka', type: 'm', su: 16, ac: 5, rc: 22, cd: 50, dmg: 16, rng: 115, h: 50, kb: 15, st: 28 },
    { n: 'Gear Second', type: 'buff', su: 10, ac: 1, rc: 12, cd: 420, dur: 300 },
    { n: 'Gatling', ult: 1, ub: 1, type: 'm', su: 10, ac: 24, rc: 16, cd: 0, dmg: 7, rng: 190, h: 46, kb: 2, st: 10, multi: 6 }] },
  { name: 'Naruto', desc: 'Ninja de Konoha, clones et Rasengan', hp: 100, spd: 4.8, jmp: 14, color: '#ff7f27', atk: [
    { n: 'Uzumaki Rendan', type: 'm', su: 8, ac: 12, rc: 14, cd: 40, dmg: 4, rng: 62, h: 50, kb: 2, st: 9, multi: 4 },
    { n: 'Rasengan', type: 'm', su: 16, ac: 5, rc: 22, cd: 80, dmg: 18, rng: 72, h: 40, kb: 16, st: 30 },
    { n: 'Kage Bunshin', type: 'p', su: 9, ac: 1, rc: 14, cd: 100, dmg: 7, vx: 8, r: 16, kb: 8, st: 18, cnt: 2, clone: 1, cy: 45, vis: 1 },
    { n: 'Rasenshuriken', ult: 1, ub: 1, type: 'p', su: 24, ac: 1, rc: 26, cd: 0, dmg: 38, vx: 9, r: 30, kb: 18, st: 36, vis: 2 }] },
  { name: 'Gojo', desc: 'Sorcier suprême : sphères Rouge/Bleu, soin, Infini', hp: 100, spd: 4.2, jmp: 13.5, color: '#6ec6ff', atk: [
    { n: 'Rouge (repousse)', type: 'p', su: 9, ac: 1, rc: 14, cd: 75, dmg: 7, vx: 9, r: 16, kb: 24, st: 24, vis: 4 },
    { n: 'Bleu (attire)', type: 'p', su: 9, ac: 1, rc: 14, cd: 70, dmg: 5, vx: 6, r: 16, kb: 20, st: 26, vis: 5, pull: 1 },
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
    { n: 'Charge', type: 'd', su: 8, ac: 16, rc: 18, cd: 50, spd: 20, dmg: 19, rng: 67, h: 70, kb: 14, st: 26 },
    { n: 'Saut écrasant', type: 'jam', su: 8, ac: 0, rc: 22, cd: 70, dmg: 24, jv: 15, jx: 3, aoe: 80, kb: 14, st: 30 }] },
  // ===== LÉGENDE DES STATS (60 frames = 1 seconde) =====
  // PERSO : hp = points de vie | spd = vitesse de marche | jmp = force du saut | blk = part des dégâts subis en blocage (défaut .15)
  //   big = taille en forme (2 = double) | fspd = multiplicateur de vitesse en forme | atk = attaques J K L U | alt = attaques de remplacement en forme
  // ATTAQUE : n = nom | type = comportement (voir plus bas) | su = frames avant que l'effet démarre | ac = frames où l'attaque touche
  //   rc = frames de récupération après | cd = attente supplémentaire avant de la refaire | dmg = dégâts | kb = recul infligé | st = étourdissement (frames)
  //   rng = portée (px, depuis le bord du corps) | h = hauteur de la zone de touche | by = hauteur de départ de la zone (fraction du corps, .85 par défaut, plus grand = plus haut)
  //   lift = propulsion verticale (négatif = vers le haut) | both = touche des deux côtés | multi = retouche toutes les N frames | air = ne touche que les ennemis en l'air
  //   ult = ultime (barre pleine requise) | ub = ne peut pas être bloqué | pct = dégâts en % des PV max de l'adversaire
  //   vx / vy0 / grav = vitesse / vitesse verticale de départ / gravité d'un projectile | r = rayon projectile | cnt = nombre de projectiles | cy / low = hauteur de tir | vis = apparence | clone / pull = clones / attire
  //   spd = vitesse d'un dash ou du déplacement | dsh = frames de dash avant le coup (dp) | len = durée d'une passe | legs = nombre de passes | fin = dégâts de la dernière passe
  //   dur = durée d'un effet | val = taille du bouclier | hps = PV soignés par frame | warn / strike = foudre : frames d'alerte / de frappe | warn / life / wd = laser : alerte / durée / épaisseur
  //   aoe = rayon de l'onde de choc | jv / jx = vitesse du saut vertical / horizontal | tick / life / w = brûlure : dégâts par tick / durée / largeur | trail = flammes laissées au sol
  //   dist = distance (téléportation, portail) | ttl = durée de vie du portail | tohook / nohook = dash vers le grappin / attaque utilisée sans grappin | aim = vise l'ennemi automatiquement
  // TYPE : m = mêlée | p = projectile | d = dash qui frappe | dp = dash puis coup | bd = dash arrière invulnérable | sd = dash éclair invulnérable | zz = passes alternées avant/arrière
  //   dk = dash-coup de pied (direction des flèches, ou vers le grappin, ou auto) | rush = rafale de passes autour de l'ennemi | tp = téléportation | portal = pose / rejoint un portail
  //   beam = gros laser | laserform = devient un rayon laser | fly = vol | fire = flammes au sol | grap = grappin | cut = coupe les projectiles | sky = foudre | portals = portails à lasers
  //   buff = bonus | shield = 2e barre de vie | form = transformation | crys = cristallisation | heal = soin | jam = saut avec onde de choc
  { name: 'Yugo', desc: 'Éliatrope : gros laser, portail, épée, forme laser', hp: 90, spd: 4.6, jmp: 14, color: '#2f80ed', atk: [
    { n: 'Gros laser (part du portail s’il existe)', type: 'beam', su: 8, ac: 1, rc: 14, cd: 70, dmg: 14, kb: 10, st: 24, warn: 14, life: 8, wd: 26 },
    { n: 'Portail : poser (flèches) / y aller', type: 'portal', su: 2, ac: 1, rc: 8, cd: 50, dist: 270, ttl: 600 },
    { n: 'Épée montante', type: 'm', su: 5, ac: 4, rc: 12, cd: 40, dmg: 16, rng: 60, h: 165, by: 1.6, kb: 11, st: 22, lift: -6 },
    { n: 'Forme laser', ult: 1, ub: 1, type: 'laserform', su: 12, ac: 1, rc: 10, cd: 0, dur: 240, spd: 9, dmg: 11, kb: 6, st: 14, tick: 14 }] },
  { name: 'Shinra', desc: 'Pyrokinésiste : vol, coup de pied à visée auto, explosions', hp: 100, spd: 4.6, jmp: 14.5, color: '#ff5722', atk: [
    { n: 'Vol (3 s)', type: 'fly', su: 3, ac: 1, rc: 6, cd: 240, dur: 180 },
    { n: 'Coup de pied (visée auto)', type: 'dk', aim: 1, su: 5, ac: 11, rc: 14, cd: 40, spd: 15, dmg: 12, kb: 12, st: 22 },
    { n: 'Explosion de flammes', type: 'm', both: 1, su: 10, ac: 3, rc: 16, cd: 110, dmg: 15, rng: 105, h: 150, by: 1, kb: 20, st: 28, trail: { tick: 1.5, life: 180, w: 170 } },
    { n: 'Pas du Diable (rafale de coups de pied)', ult: 1, ub: 1, type: 'rush', su: 12, ac: 66, rc: 18, cd: 0, dmg: 6, kb: 6, st: 12, spd: 24, len: 11, legs: 6, fin: 20 }] },
  { name: 'Eren', desc: 'Éclaireur : grappins, épée, Titan Assaillant', hp: 105, spd: 4.5, jmp: 14, color: '#5d8a4e', big: 2, fspd: .85, atk: [
    { n: 'Grappin (flèches)', type: 'grap', su: 5, ac: 1, rc: 8, cd: 25 },
    { n: 'Dash grappin / Épée', type: 'dk', tohook: 1, su: 3, ac: 12, rc: 12, cd: 40, spd: 18, dmg: 18, kb: 12, st: 22,
      nohook: { n: 'Épée', type: 'm', su: 6, ac: 4, rc: 10, cd: 30, dmg: 13, rng: 85, h: 50, kb: 7, st: 16 } },
    { n: 'Coupe-projectiles', type: 'cut', su: 4, ac: 9, rc: 12, cd: 45, rng: 95, h: 100, by: .95 },
    { n: 'Titan Assaillant', ult: 1, type: 'form', su: 20, ac: 1, rc: 24, cd: 0, dur: 720 }], alt: [
    { n: 'Coup de pied', type: 'm', su: 10, ac: 5, rc: 18, cd: 30, dmg: 19, rng: 100, h: 80, by: .45, kb: 16, st: 26 },
    { n: 'Poing anti-air', type: 'm', su: 12, ac: 6, rc: 22, cd: 60, dmg: 24, rng: 90, h: 200, by: 1, kb: 10, st: 34, lift: -10, air: 1 },
    { n: 'Cristallisation (-60% dégâts)', type: 'crys', su: 6, ac: 1, rc: 10, cd: 300, dur: 200 }] },
  { name: 'Koro', desc: 'Koro-sensei : tentacules, vitesse Mach 20', hp: 95, spd: 5.2, jmp: 14.5, color: '#f1c40f', atk: [
    { n: 'Tentacule', type: 'm', su: 5, ac: 4, rc: 9, cd: 8, dmg: 7, rng: 75, h: 30, kb: 5, st: 14 },
    { n: 'Dash éclair', type: 'sd', su: 2, ac: 5, rc: 8, cd: 45, spd: 34 },
    { n: 'Fouet (2 s)', type: 'm', su: 6, ac: 120, rc: 14, cd: 300, dmg: 5, rng: 110, h: 100, kb: 4, st: 7, both: 1, multi: 12 },
    { n: 'Mach 20 enchaîné', ult: 1, ub: 1, type: 'zz', su: 12, ac: 40, rc: 18, cd: 0, dmg: 12, kb: 3, st: 14, spd: 28, len: 12 }] },
  // Ichigo (Bleach) : Zangetsu = grand sabre | tpb = Shunpo derrière l'ennemi | form = Bankai (vitesse x1.35, attaques remplacées par 'alt') | masque d'Hollow = bonus qui se cumule avec le Bankai
  { name: 'Ichigo', desc: 'Shinigami remplaçant : Zangetsu, Getsuga Tenshō, Bankai', hp: 105, spd: 4.5, jmp: 14, color: '#f0801f', fspd: 1.35, atk: [
    { n: 'Zangetsu (grand sabre)', type: 'm', su: 9, ac: 5, rc: 15, cd: 10, dmg: 12, rng: 92, h: 75, kb: 9, st: 19 },
    { n: 'Getsuga Tenshō', type: 'p', su: 14, ac: 1, rc: 18, cd: 80, dmg: 15, vx: 11, r: 22, kb: 12, st: 24, vis: 9 },
    { n: 'Shunpo (derrière l’ennemi)', type: 'tpb', su: 3, ac: 1, rc: 9, cd: 100 },
    { n: 'Bankai : Tensa Zangetsu', ult: 1, type: 'form', su: 20, ac: 1, rc: 20, cd: 0, dur: 600 }], alt: [
    { n: 'Tensa Zangetsu (katana rapide)', type: 'm', su: 4, ac: 4, rc: 7, cd: 6, dmg: 8, rng: 84, h: 34, kb: 5, st: 12 },
    { n: 'Getsuga noir (Kuroi)', type: 'p', su: 10, ac: 1, rc: 14, cd: 55, dmg: 19, vx: 16, r: 24, kb: 14, st: 26, vis: 10 },
    { n: 'Masque d’Hollow (bonus)', type: 'buff', su: 8, ac: 1, rc: 10, cd: 420, dur: 300 }] }
  // Kairos (perso original) : echo = frappe différée sur la position marquée | rewind = retour 2 s en arrière (rend une partie des PV perdus) | timestop = fige l'ennemi, ses dégâts sont mis de côté puis infligés d'un coup
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
  block: 0, fl: 0, buff: 0, shield: 0, form: 0, inv: 0, fly: 0, crys: 0, hf: null, hook: null, hkt: 0, sz: 1, ghost: 0, portal: null, lz: 0, lzcd: 0, lzd: null, hist: [], frozen: 0, stored: 0, fzm: 1, ult: ult || 0, inp: inp || { l: 0, r: 0, u: 0, d: 0, a: [0, 0, 0, 0] } });

const sz = f => f.sz || 1;
const clampX = (v, z) => Math.max(BW * z / 2, Math.min(W - BW * z / 2, v));
const box = (f, d) => {
  const z = sz(f), y1 = f.y - BH * z * (d.by ?? .85);
  if (d.type === 'dk' || d.type === 'zz' || d.type === 'rush') { // bulle autour du corps, décalée dans le sens du dash
    const a = f.atk, ox = ((a && a.dx) || 0) * 30, oy = ((a && a.dy) || 0) * 30;
    return [f.x + ox - 40 * z, f.x + ox + 40 * z, f.y + oy - BH * z - 12, f.y + oy + 12];
  }
  if (d.both) return [f.x - BW * z / 2 - d.rng, f.x + BW * z / 2 + d.rng, y1, y1 + d.h];
  const a = f.x + f.face * BW * z / 2, b = f.x + f.face * (BW * z / 2 + d.rng);
  return [Math.min(a, b), Math.max(a, b), y1, y1 + d.h];
};
const hit = (b, t) => { const z = sz(t); return b[0] < t.x + BW * z / 2 && b[1] > t.x - BW * z / 2 && b[2] < t.y && b[3] > t.y - BH * z; };
const segDist = (x1, y1, x2, y2, px, py) => {
  const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L));
  return Math.hypot(px - x1 - u * dx, py - y1 - u * dy);
};

// Statistiques du mannequin en mode entraînement.
function recordTrainingHit(t, dmg) {
  if (!t.trainingDummy) return;
  t.totalDamage += dmg;
  t.hitCount += 1;
  t.lastDamage = Math.round(dmg);
}

// t = victime, a = attaquant (pour la barre d'ultime), ub = non blocable
function hurt(t, dmg, kb, st, lift, srcX, ub, a) {
  const dir = srcX < t.x ? 1 : -1;
  if (t.inv) return;
  if (t.frozen > 0) { t.stored += dmg * (t.fzm || 1); t.fl = 3; recordTrainingHit(t, dmg); return; }
  if (t.shield > 0) { // Infini : la 2e barre de vie absorbe tout, sans recul ni étourdissement
    t.shield = Math.max(0, t.shield - dmg); t.fl = 3;
    if (a && !ub) a.ult = Math.min(100, a.ult + dmg * .75);
    return;
  }
  if (t.crys > 0) dmg *= .4; // cristallisation
  if (!ub && t.block && t.stun <= 0 && t.y >= G) { t.hp -= dmg * (CH[t.c].blk ?? .15); t.vx = dir * kb * .3; t.fl = 4; return; }
  recordTrainingHit(t, dmg);
  t.hp -= dmg; t.stun = st; t.vx = dir * kb; if (lift) t.vy = lift; t.atk = null; t.fl = 6; t.fly = 0; t.hf = null; t.hook = null;
  if (!ub) { t.ult = Math.min(100, t.ult + dmg * 1.2); if (a) a.ult = Math.min(100, a.ult + dmg * 1.5); }
}
// brûlure : dégâts sans étourdissement
function burn(t, dmg) {
  if (t.inv) return;
  if (t.shield > 0) { t.shield = Math.max(0, t.shield - dmg); return; }
  const actualDamage = dmg * (t.crys > 0 ? .4 : 1);
  recordTrainingHit(t, actualDamage);
  t.hp -= actualDamage; t.fl = 2;
}

function step(r, i) {
  const f = r.f[i], o = r.f[1 - i], c = CH[f.c], k = f.inp, dm = f.buff > 0 ? 1.25 : 1, M = MAPS[r.mi];
  if (f.frozen > 0) { // temps arrêté : figé, les dégâts reçus sont mis de côté puis infligés d'un coup à la reprise
    if (--f.frozen === 0 && f.stored > 0) { f.hp -= f.stored; f.stored = 0; f.fl = 8; f.stun = 25; f.atk = null; f.vx = (f.x < o.x ? -1 : 1) * 8; }
    return;
  }
  f.hist.push([f.x, f.y, f.hp]); if (f.hist.length > 130) f.hist.shift(); // mémoire des ~2 dernières secondes (rembobinage)
  f.cds = f.cds.map(v => v > 0 ? v - 1 : 0);
  if (f.fl > 0) f.fl--;
  if (f.buff > 0) f.buff--;
  if (f.form > 0) f.form--;
  if (f.fly > 0) f.fly--;
  if (f.crys > 0) f.crys--;
  if (f.hook && --f.hkt <= 0) f.hook = null;
  if (f.portal && --f.portal.t <= 0) f.portal = null;
  f.inv = 0; f.ghost = 0; f.sz = (f.form > 0 && c.big) || 1;
  f.ult = Math.min(100, f.ult + 0.008);
  const z = f.sz, dx0 = k.r - k.l, dy0 = k.d - k.u;
  if (f.hf) { // grappin en vol : s'accroche à l'ennemi ou aux bords de l'arène
    const h = f.hf, oz = sz(o), tb = o.y - BH * oz / 2;
    h.x += h.dx * 18; h.y += h.dy * 18; h.t++;
    if (Math.abs(h.x - o.x) < BW * oz / 2 + 8 && Math.abs(h.y - tb) < BH * oz / 2 + 8) { f.hook = { x: o.x, y: tb, e: 1 }; f.hkt = 180; f.hf = null; }
    else if (h.x <= 0 || h.x >= W || h.y <= 40 || h.y >= G) { f.hook = { x: Math.max(0, Math.min(W, h.x)), y: Math.max(40, Math.min(G, h.y)) }; f.hkt = 180; f.hf = null; }
    else if (h.t > 28) f.hf = null;
  }
  const gr = f.y >= G; f.block = 0;
  if (f.lz > 0) { // forme laser (ultime de Yugo) : vol libre, invulnérable, blesse l'ennemi au contact
    const d = f.lzd, L = Math.hypot(dx0, dy0);
    f.lz--; f.inv = 1; f.ghost = 1; f.atk = null; f.stun = 0; f.block = 0;
    if (L) { f.vx = dx0 / L * d.spd; f.vy = dy0 / L * d.spd; } else { f.vx *= .85; f.vy *= .85; }
    if (f.lzcd > 0) f.lzcd--;
    if (!f.lzcd && hit([f.x - 34, f.x + 34, f.y - 66, f.y + 8], o)) { hurt(o, d.dmg * dm, d.kb, d.st, d.lift, f.x, d.ub, f); f.lzcd = d.tick; }
  }
  else if (f.stun > 0) { f.stun--; f.vx *= .9 + (1 - M.acc) * .08; }
  else if (f.atk) {
    const a = f.atk, d = a.d, s0 = d.su + (d.dsh || 0); a.f++;
    if ((d.type === 'd' && a.f > d.su && a.f <= d.su + d.ac) || (d.type === 'dp' && a.f > d.su && a.f <= s0)) f.vx = f.face * d.spd; else if (gr) f.vx *= .6 + (1 - M.acc) * .35;
    if (f.fly > 0) f.vy = 0; // en vol, on reste en l'air pendant une attaque
    if (d.type === 'bd' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = -f.face * d.spd; f.inv = 1; }
    if ((d.type === 'tp' || d.type === 'tpb' || (d.type === 'portal' && a.tp) || d.type === 'rewind') && a.f <= d.su + (d.type === 'rewind' ? 10 : 6)) f.inv = 1;
    if (a.f === d.su + 1) {
      if (d.trail && f.y >= G - 2) r.fx.push({ k: 'fire', x: f.x, w: d.trail.w, t: 0, o: i, d: d.trail });
      if (d.type === 'p') {
        for (let j = 0; j < (d.cnt || 1); j++)
          r.pj.push({ x: f.x + f.face * (30 - (d.clone ? j * 45 : 0)), y: f.y - (d.cy || (d.low ? 18 : BH * .6)), vx: f.face * d.vx, vy: d.vy0 || (d.cnt && !d.clone ? (j - 1) * 1.8 : 0), r: d.r, o: i, d });
      } else if (d.type === 'sky') r.fx.push({ x: o.x, t: 0, o: i, d });
      else if (d.type === 'buff') f.buff = d.dur;
      else if (d.type === 'shield') f.shield = d.val;
      else if (d.type === 'form') f.form = d.dur;
      else if (d.type === 'fly') f.fly = d.dur;
      else if (d.type === 'echo') r.fx.push({ k: 'echo', x: o.x, y: o.y - BH * sz(o) / 2, t: 0, o: i, d });
      else if (d.type === 'timestop') { o.frozen = d.dur; o.stored = 0; o.fzm = d.mult; }
      else if (d.type === 'rewind') {
        const hs = f.hist[0];
        if (hs) {
          r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
          f.hp = Math.min(c.hp, f.hp + Math.max(0, hs[2] - f.hp) * d.heal); f.x = hs[0]; f.y = hs[1]; f.vx = 0; f.vy = 0; f.hist = [];
          r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
        }
      }
      else if (d.type === 'laserform') { f.lz = d.dur; f.lzd = d; }
      else if (d.type === 'beam') { // gros laser : part du portail s'il existe, sinon de Yugo, vers la position actuelle de l'ennemi
        r.fx.push({ k: 'beam', o: i, d, np: f.portal ? 0 : 1, x: f.portal ? f.portal.x : f.x + f.face * 18, y: f.portal ? f.portal.y - 45 : f.y - BH * z * .6, tx: o.x, ty: o.y - BH * sz(o) / 2, t: 0 });
      } else if (d.type === 'portal') {
        if (f.portal) { // un portail existe : on s'y téléporte
          r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
          f.x = clampX(f.portal.x, z); f.y = Math.min(G, Math.max(BH * z + 10, f.portal.y)); f.vx = 0; f.vy = 0; f.portal = null; a.tp = 1;
          r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
        } else { // sinon on en pose un dans la direction des flèches
          let ux = dx0, uy = dy0;
          if (uy > 0 && f.y >= G) uy = 0;
          if (!ux && !uy) ux = f.face;
          const L = Math.hypot(ux, uy);
          f.portal = { x: clampX(f.x + ux / L * d.dist, 1), y: Math.max(BH + 10, Math.min(G, f.y + uy / L * d.dist)), t: d.ttl };
          r.fx.push({ k: 'cos', x: f.portal.x, y: f.portal.y - 45, t: 0, life: 14 });
        }
      }
      else if (d.type === 'crys') f.crys = d.dur;
      else if (d.type === 'fire') r.fx.push({ k: 'fire', x: clampX(f.x + f.face * 80, 1), w: d.w, t: 0, o: i, d });
      else if (d.type === 'grap') { let ux = dx0, uy = dy0; if (!ux && !uy) ux = f.face; const L = Math.hypot(ux, uy); f.hf = { x: f.x, y: f.y - BH * z * .6, dx: ux / L, dy: uy / L, t: 0 }; }
      else if (d.type === 'tp') {
        let ux = dx0, uy = dy0;
        if (uy > 0 && f.y >= G) uy = 0;
        if (!ux && !uy) ux = f.face;
        const L = Math.hypot(ux, uy);
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
        f.x = clampX(f.x + ux / L * d.dist, z); f.y = Math.max(BH * z + 10, Math.min(G, f.y + uy / L * d.dist)); f.vx = 0; f.vy = 0;
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
      } else if (d.type === 'tpb') {
        const sg = o.x >= f.x ? 1 : -1;
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
        f.x = clampX(o.x + sg * 70, z); f.y = Math.min(G, o.y); f.vx = 0; f.vy = 0; f.face = o.x >= f.x ? 1 : -1;
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
      } else if (d.type === 'portals') {
        for (let q = 0; q < d.cnt; q++) {
          const ph = Math.PI * (q + 1) / (d.cnt + 1);
          r.fx.push({ k: 'por', o: i, d, x: Math.max(25, Math.min(W - 25, o.x + Math.cos(ph) * d.rad * 1.1)), y: Math.max(35, o.y - 50 - Math.sin(ph) * d.rad), t: -q * d.gap - 1 });
        }
      } else if (d.type === 'dk') {
        let ux, uy;
        if (d.tohook && f.hook) { ux = (f.hook.e ? o.x : f.hook.x) - f.x; uy = (f.hook.e ? o.y - BH * sz(o) / 2 : f.hook.y) - (f.y - BH * z / 2); f.hook = null; }
        else if (d.aim) { ux = o.x - f.x; uy = (o.y - BH * sz(o) / 2) - (f.y - BH * z / 2); } // visée automatique vers l'ennemi, même dans les airs
        else if (f.y < G || f.fly > 0) { ux = dx0; uy = dy0; } else { ux = f.face; uy = 0; }
        if (!ux && !uy) ux = f.face;
        const L = Math.hypot(ux, uy); a.dx = ux / L; a.dy = uy / L;
      } else if (d.type === 'sd') a.dx = dx0 || f.face;
      else if (d.type === 'zz') a.dir = f.face;
    }
    if (d.type === 'dk' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = a.dx * d.spd; f.vy = a.dy * d.spd; }
    if (d.type === 'sd' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = a.dx * d.spd; f.inv = 1; f.ghost = 1; }
    if (d.type === 'zz' && a.f > d.su && a.f <= d.su + d.ac) {
      const q = a.f - d.su - 1; a.dx = a.dir * (Math.floor(q / d.len) % 2 ? -1 : 1);
      f.vx = a.dx * d.spd; f.inv = 1; f.ghost = 1; if (q % d.len === 0) a.hit = 0;
    }
    if (d.type === 'rush' && a.f > d.su && a.f <= d.su + d.ac) { // Pas du Diable : passes successives autour de l'ennemi, toujours visées sur lui
      const q = a.f - d.su - 1, leg = Math.floor(q / d.len);
      if (q % d.len === 0) {
        const ang = (leg * 137 + 200) * Math.PI / 180;
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 12 });
        f.x = clampX(o.x + Math.cos(ang) * 150, z); f.y = Math.max(BH * z + 10, Math.min(G, o.y + Math.sin(ang) * 90));
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 12 });
        a.hit = 0;
      }
      const ux = o.x - f.x, uy = (o.y - BH * sz(o) / 2) - (f.y - BH * z / 2), L = Math.hypot(ux, uy) || 1;
      a.dx = ux / L; a.dy = uy / L; f.vx = a.dx * d.spd; f.vy = a.dy * d.spd; f.inv = 1; f.ghost = 1; a.fin = leg === d.legs - 1;
    }
    if (d.type === 'kunai6') { // ultime de Kaze : 5 kunaï à très longue portée, puis il fonce sur l'ennemi et plante le 6e
      const q = a.f - d.su - 1, tEnd = d.cnt * d.gap;
      if (q >= 0 && q < tEnd && q % d.gap === 0) { const j = q / d.gap; r.pj.push({ x: f.x + f.face * 30, y: f.y - BH * .62 + (j - 2) * 5, vx: f.face * d.vx, vy: (j - 2) * .25, r: d.r, o: i, d: d.kd }); }
      if (q >= tEnd + 4 && q < d.ac && !a.hit) {
        const ux = o.x - f.x; f.face = ux >= 0 ? 1 : -1; f.inv = 1; f.ghost = 1; a.dx = f.face; a.dy = 0;
        f.vx = Math.max(-d.spd, Math.min(d.spd, ux * .6 + Math.sign(ux) * 8));
        if (Math.abs(ux) < 50 && Math.abs(o.y - f.y) < BH) { a.hit = 1; a.dy = 1; f.vx = 0; hurt(o, d.fin * dm, d.finKb, d.finSt, d.lift, f.x, 1, f); r.fx.push({ k: 'cos', x: o.x, y: o.y - 45, t: 0, life: 14 }); }
      } else if (a.hit) f.vx *= .5;
    }
    const act = a.f > s0 && a.f <= s0 + d.ac, mel = d.type === 'm' || d.type === 'd' || d.type === 'dp' || d.type === 'dk' || d.type === 'zz' || d.type === 'rush';
    if (d.type === 'heal' && act) f.hp = Math.min(c.hp, f.hp + d.hps);
    a.b = act && mel ? box(f, d) : null;
    if (d.type === 'cut' && act) { // coupe les projectiles adverses, sans dégâts
      const bb = a.b = box(f, d);
      r.pj = r.pj.filter(p => p.o === i || p.x + p.r < bb[0] || p.x - p.r > bb[1] || p.y + p.r < bb[2] || p.y - p.r > bb[3]);
    }
    if (d.type === 'jam') {
      if (a.f === d.su + 1) { f.vy = -d.jv; f.vx = f.face * d.jx; a.air = 1; }
      else if (a.air && f.y >= G && a.f > d.su + 3) {
        a.air = 0; a.land = a.f; a.lb = 6; f.vx = 0;
        if (hit([f.x - d.aoe, f.x + d.aoe, G - 70, G], o)) hurt(o, d.dmg * dm, d.kb, d.st, d.lift, f.x, d.ub, f);
      }
      if (a.lb > 0) { a.lb--; a.b = [f.x - d.aoe, f.x + d.aoe, G - 70, G]; }
    }
    if (a.b && d.multi && a.f % d.multi === 0) a.hit = 0;
    if (a.b && !a.hit && d.type !== 'cut' && (!d.air || o.y < G - 15) && hit(a.b, o)) { a.hit = 1; hurt(o, d.pct ? CH[o.c].hp * d.pct : (a.fin ? d.fin : d.dmg) * dm, a.fin ? 22 : d.kb, a.fin ? 36 : d.st, d.lift, f.x, d.ub, f); }
    if (f.atk && (d.type === 'jam' ? (a.land && a.f >= a.land + d.rc) || a.f > 150 : a.f >= s0 + d.ac + d.rc)) f.atk = null;
  } else {
    f.face = o.x >= f.x ? 1 : -1;
    const spd = c.spd * (f.buff > 0 ? 1.4 : 1) * (f.form > 0 && c.fspd ? c.fspd : 1);
    if (k.d && gr && !(f.fly > 0)) { f.block = 1; f.vx *= 1 - M.acc; }
    else if (f.fly > 0) { f.vx += (dx0 * spd * 1.1 - f.vx) * .5; f.vy = dy0 * spd * 1.1; } // vol : déplacement libre dans les airs
    else { f.vx += (dx0 * spd - f.vx) * (gr ? M.acc : 1); if (k.u && gr) f.vy = -c.jmp; }
    for (let j = 0; j < 4; j++) if (k.a[j] && !f.cds[j] && !f.block) {
      let d = atks(f)[j];
      if (!d) continue;
      if (d.nohook && !f.hook) d = d.nohook;
      if (d.ult && f.ult < 100) continue;
      if (d.ult) f.ult = 0;
      f.atk = { k: j, f: 0, d }; f.cds[j] = d.cd + d.su + (d.dsh || 0) + d.ac + d.rc; break;
    }
  }
  f.x += f.vx; f.y += f.vy;
  if (f.y < G) { if (!(f.lz > 0)) f.vy += M.gr; } else { f.y = G; f.vy = 0; }
  const top = BH * z + 10; if (f.y < top) { f.y = top; if (f.vy < 0) f.vy = 0; }
  f.x = clampX(f.x, z);
}

function sep(r) {
  const [a, b] = r.f;
  if (a.ghost || b.ghost) return;
  const w = BW * (sz(a) + sz(b)) / 2, hh = BH * Math.max(sz(a), sz(b)) * .8;
  if (Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < hh) {
    const m = (w - Math.abs(a.x - b.x)) / 2, s = a.x < b.x ? -1 : 1;
    a.x += s * m; b.x -= s * m;
  }
}

function projs(r) {
  r.pj = r.pj.filter(p => {
    if (r.f[p.o].frozen > 0) return true; // projectile figé avec son lanceur
    p.x += p.vx; p.y += p.vy; if (p.d.grav) p.vy += p.d.grav;
    const t = r.f[1 - p.o], ow = r.f[p.o], tz = sz(t);
    if (Math.abs(p.x - t.x) < BW * tz / 2 + p.r && p.y > t.y - BH * tz - p.r && p.y < t.y + p.r) {
      hurt(t, p.d.dmg * (ow.buff > 0 ? 1.25 : 1), p.d.kb, p.d.st, 0, p.d.pull ? t.x + Math.sign(p.vx) * 50 : p.x - p.vx * 3, p.d.ub, ow); return false;
    }
    return p.x > -50 && p.x < W + 50 && p.y < G + 25;
  });
}

// effets au sol / dans l'air : foudre, vague de feu, portails à lasers, éclats cosmétiques
function fxs(r) {
  r.fx = r.fx.filter(e => {
    if (e.o != null && r.f[e.o].frozen > 0) return true; // les effets d'un combattant figé sont figés aussi
    e.t++;
    if (e.k === 'cos') return e.t <= e.life;
    const d = e.d, t = r.f[1 - e.o], ow = r.f[e.o], dm = ow.buff > 0 ? 1.25 : 1, tz = sz(t);
    if (e.k === 'fire') {
      if (t.y >= G - 2 && Math.abs(t.x - e.x) < e.w / 2 + 14 * tz && e.t % 12 === 0) burn(t, d.tick * dm);
      return e.t <= d.life;
    }
    if (e.k === 'echo') { // écho : la zone marquée explose après "warn" frames
      if (e.t === d.warn && !e.hit) {
        e.hit = 1;
        if (Math.hypot(t.x - e.x, t.y - BH * tz / 2 - e.y) < d.rad + 14 * tz) hurt(t, d.dmg * dm, d.kb, d.st, -4, e.x, d.ub, ow);
      }
      return e.t <= d.warn + 8;
    }
    if (e.k === 'beam') { // gros laser : visée affichée pendant "warn" frames, puis rayon épais
      if (e.t === d.warn && !e.hit) {
        e.hit = 1;
        if (segDist(e.x, e.y, e.x + (e.tx - e.x) * 4, e.y + (e.ty - e.y) * 4, t.x, t.y - BH * tz / 2) < d.wd / 2 + 14 * tz) hurt(t, d.dmg * dm, d.kb, d.st, 0, e.x, d.ub, ow);
      }
      return e.t <= d.warn + d.life;
    }
    if (e.k === 'por') { // le portail vise la position de l'ennemi à son ouverture, puis tire après "warn" frames
      if (e.t === 0) { e.tx = t.x; e.ty = t.y - BH * tz / 2; }
      if (e.t === d.warn && !e.hit) {
        e.hit = 1;
        if (segDist(e.x, e.y, e.x + (e.tx - e.x) * 3, e.y + (e.ty - e.y) * 3, t.x, t.y - BH * tz / 2) < 28 * tz) hurt(t, d.dmg * dm, d.kb, d.st, 0, e.x, d.ub, ow);
      }
      return e.t <= d.warn + 6;
    }
    if (e.t > d.warn && e.t <= d.warn + d.strike && !e.hit && Math.abs(t.x - e.x) < 45 * tz) {
      e.hit = 1; hurt(t, d.dmg * dm, d.kb, d.st, -8, e.x, d.ub, ow);
    }
    return e.t <= d.warn + d.strike;
  });
}

function start(r) { r.f = [nf(r.sel[0], 0), nf(r.sel[1], 1)]; r.pj = []; r.fx = []; rollMap(r); r.ph = 'cd'; r.t = 150; r.tm = ROUND; r.msg = ''; }

function startTraining(r, characterIndex, skin) {
  r.training = true;
  const dummyIndex = Math.max(0, CH.findIndex(c => c.name === 'Viking'));
  r.sel = [characterIndex, dummyIndex];
  r.sk = [String(skin || '').slice(0, 40), ''];
  r.f = [nf(characterIndex, 0), nf(dummyIndex, 1)];
  r.f[0].x = 250;
  r.f[1].x = 650;
  r.f[1].trainingDummy = true;
  r.f[1].totalDamage = 0;
  r.f[1].hitCount = 0;
  r.f[1].lastDamage = 0;
  r.pj = [];
  r.fx = [];
  r.mi = 0;
  r.ph = 'training';
  r.t = 0;
  r.tm = 0;
  r.msg = '';
}

// Niveaux des bots : 0 = facile, 1 = moyen (comportement d'origine), 2 = difficile
// act = chance d'agir par frame | blk = chance de bloquer | jmp = chance de sauter | lazy = chance d'hésiter | ult = bonus d'ultime | noise = imprécision du choix | punish = enchaîne quand l'adversaire est étourdi
const BOT = [
  { act: .05, blk: .06, jmp: .01, lazy: .4, ult: -25, noise: 40, punish: 0 },
  { act: 1, blk: .32, jmp: .035, lazy: 0, ult: 18, noise: 8, punish: 0 },
  { act: 1, blk: .65, jmp: .06, lazy: 0, ult: 30, noise: 3, punish: 1 }];
function thinkBot(r) {
  if (!r.bot || r.ph !== 'fight' || !r.f[1] || !r.f[0]) return;
  const f = r.f[1], o = r.f[0], c = CH[f.c];
  const dx = o.x - f.x, dist = Math.abs(dx), dy = o.y - f.y;
  const input = { l: 0, r: 0, u: 0, d: 0, a: [0, 0, 0, 0] }, P = BOT[r.lvl ?? 1];
  const attacks = atks(f);
  // Le bot adapte sa distance au personnage : il avance au corps-à-corps,
  // mais essaie de garder un peu d'espace avec les personnages à distance.
  const ranged = attacks.some(a => a.type === 'p' || a.type === 'sky' || a.type === 'fire' || a.type === 'beam');
  const ideal = ranged ? 245 : 62;
  if (Math.random() < P.lazy) { /* hésite */ } else if (dist > ideal + 24) input[dx < 0 ? 'l' : 'r'] = 1;
  else if (ranged && dist < 145) input[dx < 0 ? 'r' : 'l'] = 1;
  if (dy < -45 && f.y >= G - 2 && dist < 260 && Math.random() < P.jmp) input.u = 1;
  // Défense occasionnelle si l'adversaire prépare une attaque proche.
  if (o.atk && dist < 115 && Math.random() < P.blk) input.d = 1;
  if (!f.atk && f.stun <= 0 && Math.random() < P.act) {
    let choice = -1, best = -Infinity;
    for (let j = 0; j < attacks.length; j++) {
      const a = attacks[j];
      if (!a || f.cds[j] > 0 || (a.ult && f.ult < 100)) continue;
      let score = 0;
      if (a.type === 'buff' || a.type === 'shield' || a.type === 'form' || a.type === 'crys' || a.type === 'heal' || a.type === 'laserform') {
        score = (f.hp < c.hp * .72 || f.buff <= 0 || f.shield <= 0 || f.form <= 0) ? 75 : -10;
      } else if (a.type === 'rewind') score = f.hp < c.hp * .6 ? 70 : -10;
      else if (a.type === 'p') score = (dist < 520 ? 55 : 10) - Math.abs(dist - 260) * .04;
      else if (a.type === 'kunai6' || a.type === 'sky' || a.type === 'portals' || a.type === 'fire' || a.type === 'beam' || a.type === 'rush' || a.type === 'echo' || a.type === 'timestop') score = dist < 420 ? 58 : 5;
      else if (a.type === 'tp' || a.type === 'grap' || a.type === 'portal') score = dist > 180 ? 38 : 5;
      else score = dist < (a.rng || 75) + 45 ? 65 : -5;
      if (a.ult && f.ult >= 100) score += P.ult;
      score += Math.random() * P.noise; if (P.punish && o.stun > 0) score += 20;
      if (score > best) { best = score; choice = j; }
    }
    if (choice >= 0 && (best > 20 || dist < 95)) input.a[choice] = 1;
  }
  f.inp = input;
}

const atkPP = f => { const a = f.atk, d = a.d, s0 = d.su + (d.dsh || 0), v = a.f <= s0 ? a.f / (s0 || 1) : a.f <= s0 + d.ac ? (a.f - s0) / (d.ac || 1) : Math.min(1, (a.f - s0 - d.ac) / (d.rc || 1)); return Math.round(v * 100) / 100; };
function tick(r) {
  if (r.ph === 'training') {
    // L'ultime reste disponible pour tester librement toutes les capacités.
    r.f[0].ult = 100;
    step(r, 0);
    projs(r);
    fxs(r);

    // Le mannequin ne bouge pas et ne peut pas être éliminé.
    const dummy = r.f[1];
    dummy.x = 650;
    dummy.y = G;
    dummy.vx = 0;
    dummy.vy = 0;
    dummy.hp = 1000000000;
    dummy.stun = 0;
    dummy.atk = null;
    dummy.fl = 0;
    dummy.inv = 0;
    dummy.block = 0;
    dummy.fly = 0;
    dummy.hf = null;
    dummy.hook = null;
    if (dummy.frozen > 0) dummy.frozen--; else dummy.stored = 0;
  }
  else if (r.ph === 'cd') { if (--r.t <= 0) r.ph = 'fight'; }
  else if (r.ph === 'fight') {
    thinkBot(r);
    step(r, 0); step(r, 1); sep(r); projs(r); fxs(r); r.tm--;
    const [a, b] = r.f;
    if (a.hp <= 0 || b.hp <= 0 || r.tm <= 0) {
      const w = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
      if (w >= 0) r.wins[w]++;
      r.msg = w < 0 ? 'Égalité !' : CH[r.f[w].c].name + ' gagne la manche !';
      r.ph = 'rend'; r.t = 150;
      if (r.wins[0] >= 2 || r.wins[1] >= 2) { r.ph = 'end'; r.msg = '🏆 ' + CH[r.f[w].c].name + ' remporte le match !'; r.again = r.bot ? [0, 1] : [0, 0]; r.co = [0, 1].map(q => r.wins[q] * 10 + (r.wins[q] >= 2 ? 30 : 10)); }
    }
  }
  else if (r.ph === 'rend') {
    if (--r.t <= 0) { r.f = r.f.map((f, i) => nf(f.c, i, f.inp, f.ult)); r.pj = []; r.fx = []; rollMap(r); r.ph = 'cd'; r.t = 120; r.tm = ROUND; r.msg = ''; }
  }
  else if (r.ph === 'end') {
    if (r.again[0] && r.again[1]) { r.ph = 'select'; r.sel = [null, r.bot ? (Math.random() * CH.length | 0) : null]; r.wins = [0, 0]; r.msg = ''; r.f = []; }
  }
  const live = r.ph !== 'wait' && r.ph !== 'select';
  const s = { t: 's', p: r.ph, training: !!r.training, bot: !!r.bot,
    damage: r.training ? Math.round(r.f[1].totalDamage) : 0,
    hits: r.training ? r.f[1].hitCount : 0,
    lastDamage: r.training ? r.f[1].lastDamage : 0,
    n: Math.ceil(r.t / 60), tm: Math.ceil(r.tm / 60), w: r.wins, m: r.msg, sel: r.sel, mp: r.mi, co: r.ph === 'end' ? r.co : null, ag: r.again,
    f: live ? r.f.map((f, q) => {
      const d = f.atk && f.atk.d;
      return { c: f.c, sk: r.sk[q], x: Math.round(f.x), y: Math.round(f.y), hp: Math.max(0, Math.round(f.hp)), fc: f.face, bl: f.block, fl: f.fl > 0 ? 1 : 0,
        ul: Math.round(f.ult), bf: f.buff > 0 ? 1 : 0, sh: Math.round(f.shield), fm: f.form > 0 ? 1 : 0, iv: f.inv ? 1 : 0, sz: f.sz, cr: f.crys > 0 ? 1 : 0, fy: f.fly > 0 ? 1 : 0, lz: f.lz > 0 ? 1 : 0, fz: f.frozen > 0 ? 1 : 0, sd: Math.round(f.stored), vx: Math.round(f.vx * 10) / 10, vy: Math.round(f.vy * 10) / 10, pt: f.portal ? [Math.round(f.portal.x), Math.round(f.portal.y)] : null,
        hk: f.hook ? [Math.round(f.hook.x), Math.round(f.hook.y)] : f.hf ? [Math.round(f.hf.x), Math.round(f.hf.y)] : null,
        ad: f.atk && f.atk.dx !== undefined ? [Math.round(f.atk.dx * 10) / 10, Math.round((f.atk.dy || 0) * 10) / 10] : null,
        ak: f.atk ? f.atk.k : -1, ap: d ? (f.atk.f <= d.su + (d.dsh || 0) ? 0 : f.atk.f <= d.su + (d.dsh || 0) + d.ac ? 1 : 2) : -1, pp: d ? atkPP(f) : 0,
        b: f.atk && f.atk.b ? f.atk.b.map(Math.round) : null };
    }) : [],
    pj: live ? r.pj.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, o: p.o, k: p.d.vis || 0, v: Math.sign(p.vx) })) : [],
    fx: live ? r.fx.filter(e => e.k !== 'por' || e.t >= 0).map(e => e.k === 'cos' ? { p: 2, x: Math.round(e.x), y: Math.round(e.y), a: e.t / e.life }
      : e.k === 'fire' ? { p: 5, x: Math.round(e.x), w: e.w, a: e.t / e.d.life }
      : e.k === 'echo' ? { p: 6, x: Math.round(e.x), y: Math.round(e.y), a: Math.min(1, e.t / e.d.warn), r: e.d.rad, h: e.t >= e.d.warn ? 1 : 0 }
      : e.k === 'beam' ? { p: e.t >= e.d.warn ? 4 : 3, x: Math.round(e.x), y: Math.round(e.y), tx: Math.round(e.tx), ty: Math.round(e.ty), a: Math.min(1, e.t / e.d.warn), wd: e.d.wd, np: e.np }
      : e.k === 'por' ? { p: e.t >= e.d.warn ? 4 : 3, x: Math.round(e.x), y: Math.round(e.y), tx: Math.round(e.tx), ty: Math.round(e.ty), a: Math.min(1, e.t / e.d.warn) }
      : { p: e.t > e.d.warn ? 1 : 0, x: Math.round(e.x) }) : [] };
  r.ps.forEach(p => tx(p, s));
}

// ===== AMIS : profils publics (pseudo, icône, niveau, perso le plus joué), sauvegardés dans profiles.json =====
const PFILE = path.join(__dirname, 'profiles.json'); let profiles = {}, ptimer = null;
try { profiles = JSON.parse(fs.readFileSync(PFILE, 'utf8')); } catch (e) {}
const clean = (v, n) => String(v || '').replace(/[<>&"'`\\]/g, '').trim().slice(0, n);
function registerProfile(me) {
  me = me || {}; const code = String(me.code || '').toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) return;
  profiles[code] = { code, name: clean(me.name, 14) || 'Joueur', icon: clean(me.icon, 8) || '🥷', lvl: Math.max(1, Math.min(20, +me.lvl || 1)), top: clean(me.top, 20) || '—', ttl: clean(me.ttl, 12) };
  clearTimeout(ptimer); ptimer = setTimeout(() => fs.writeFile(PFILE, JSON.stringify(profiles), () => {}), 1000);
}
const tx = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
const rooms = new Map(), queue = [];
const newCode = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; };
const join = ws => tx(ws, { t: 'room', code: ws.room.code, idx: ws.idx, chars: CHARS, maps: MAPS.map(({ n, note }) => ({ n, note })) });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'hello' || m.t === 'friends') { // amis : enregistre le profil public, renvoie les profils demandés
      registerProfile(m.me);
      if (m.t === 'hello') return;
      const codes = (Array.isArray(m.list) ? m.list : []).slice(0, 50).map(c => String(c).toUpperCase());
      return tx(ws, { t: 'friends', list: codes.filter(c => profiles[c]).map(c => profiles[c]), missing: codes.filter(c => !profiles[c]) });
    }
    if (m.t === 'training_list' && !ws.room) {
      tx(ws, { t: 'chars', chars: CHARS });
    } else if (m.t === 'train' && !ws.room && CH[m.c]) {
      const roomCode = 'TRAIN_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const r = { code: roomCode, ps: [ws], ph: 'training', sel: [m.c, 0], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: 0, sk: ['', ''], again: [0, 0], co: [0, 0], training: true };
      rooms.set(r.code, r);
      ws.room = r; ws.idx = 0;
      startTraining(r, m.c, m.sk);
      join(ws);
    } else if (m.t === 'training_reset') {
      const r = ws.room;
      if (r && r.training && ws.idx === 0) startTraining(r, r.sel[0], r.sk[0]);
    } else if (m.t === 'bot' && !ws.room) {
      const r = { code: newCode(), ps: [ws], ph: 'select', sel: [null, Math.random() * CH.length | 0], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: -1, sk: ['', ''], again: [0, 1], co: [0, 0], bot: true, lvl: [0, 1, 2].includes(+m.lvl) ? +m.lvl : 1 };
      rooms.set(r.code, r); ws.room = r; ws.idx = 0; join(ws);
    } else if (m.t === 'create' && !ws.room) {
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
