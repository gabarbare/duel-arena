const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const html = fs.readFileSync(path.join(__dirname, 'index (6).html'));
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
const wss = new WebSocketServer({ server }); 

const W = 1200, // largeur de l'arène (doit être égale à WW dans index (6).html)
  G = 380, BW = 44, BH = 90, GR = 0.65, ROUND = 5400; // 5400 frames = 1 min 30
// type: m = mêlée, p = projectile, d = dash, sky = foudre du ciel, buff = bonus temporaire
// ult:1 = ultime (barre pleine requise), ub:1 = ne peut pas être bloqué, multi = touche plusieurs fois
const CH = [
  { name: 'Bruno', desc: 'Bagarreur, corps à corps', hp: 110, spd: 4.0, jmp: 13.5, color: '#e74c3c', atk: [
    { n: 'Direct', type: 'm', su: 4, ac: 4, rc: 8, cd: 6, dmg: 7, rng: 68, h: 30, kb: 4, st: 14 },
    { n: 'Crochet', type: 'm', su: 8, ac: 5, rc: 14, cd: 35, dmg: 13, rng: 74, h: 40, kb: 9, st: 20 },
    { n: 'Uppercut', type: 'm', su: 12, ac: 6, rc: 24, cd: 100, dmg: 21, rng: 55, h: 80, kb: 12, st: 32, lift: -11 },
    { n: 'Charge rageuse', ult: 1, ub: 1, type: 'd', su: 10, ac: 14, rc: 20, cd: 0, dmg: 30, rng: 50, h: 90, kb: 18, st: 50, lift: -9, spd: 18 }] },
  { name: 'Zéphyr', desc: 'Mage, attaques à distance', hp: 90, spd: 3.6, jmp: 13, color: '#9b59b6', atk: [
    { n: 'Éclair', type: 'p', su: 6, ac: 1, rc: 8, cd: 23, dmg: 5, vx: 12, r: 7, kb: 3, st: 12, vis: 18 },
    { n: 'Boule de feu', type: 'p', su: 12, ac: 1, rc: 36, cd: 70, dmg: 14, vx: 7, r: 16, kb: 10, st: 24, vis: 19 },
    { n: 'Orbes de vent (x3)', type: 'p', su: 10, ac: 1, rc: 34, cd: 110, dmg: 6, vx: 9, r: 8, kb: 5, st: 14, cnt: 3, vis: 20 },
    { n: 'Foudre céleste', ult: 1, ub: 1, type: 'sky', su: 20, ac: 1, rc: 22, cd: 0, dmg: 36, kb: 12, st: 36, warn: 28, strike: 8 }] },
  { name: 'Kaze', desc: 'Ninja, rapide avec dash', hp: 85, spd: 5.6, jmp: 14.5, color: '#2ecc71', atk: [
    { n: 'Kunai au corps à corps', type: 'm', su: 3, ac: 3, rc: 6, cd: 4, dmg: 4, rng: 55, h: 35, kb: 3, st: 11 },
    { n: 'Dash', type: 'd', su: 4, ac: 10, rc: 14, cd: 60, dmg: 11, rng: 34, h: 60, kb: 10, st: 22, spd: 15 },
    { n: 'Lancer de kunai', type: 'p', su: 5, ac: 1, rc: 10, cd: 70, dmg: 8, vx: 14, r: 6, kb: 4, st: 5, vis: 21 },
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
    { n: 'Masque d’Hollow (bonus)', type: 'buff', su: 8, ac: 1, rc: 10, cd: 420, dur: 300 }] },
  // Frieren (Sōsō no Frieren) : barrière défensive (ttl = durée) | Zoltraak = rayon qui perce toute défense (ub:2 ignore blocage, Infini et cristallisation)
  // storm = Judradjim, tempête de foudre (cnt éclairs à des décalages offs, espacés de gap frames) | sorg = Sorganeil : lie l'ennemi (bind frames) puis Zoltraak géant (bd = paramètres du rayon, dl = délai)
  { name: 'Frieren', desc: 'Mage elfe millénaire : barrière, Zoltraak, Judradjim, Sorganeil', hp: 95, spd: 4.0, jmp: 13, color: '#7dcfb6', atk: [
    { n: 'Barrière défensive', type: 'shield', su: 6, ac: 1, rc: 10, cd: 300, val: 30, ttl: 240 },
    { n: 'Zoltraak (perce toute défense)', type: 'beam', ub: 2, cl: 1, su: 8, ac: 1, rc: 16, cd: 50, dmg: 13, kb: 10, st: 22, warn: 10, life: 6, wd: 16, ox: 106 },
    { n: 'Judradjim (tempête de foudre)', type: 'storm', su: 12, ac: 1, rc: 22, cd: 140, offs: [0, 62, -62, 0], gap: 11, dmg: 8, kb: 5, st: 14, warn: 20, strike: 6, cl: 1 },
    { n: 'Sorganeil + Zoltraak', ult: 1, ub: 2, type: 'sorg', su: 14, ac: 40, rc: 20, cd: 0, bind: 62, dl: 10, bd: { dmg: 38, kb: 18, st: 40, warn: 14, life: 10, wd: 44, ub: 2, cl: 1, ox: 106 } }] },
  // ===== MODE AVENTURE : adversaires créés pour les histoires (adv: 1 = jamais sélectionnables, jamais tirés au hasard) =====
  // Chapitre 1 (Bruno, « Le Poing de la Rue ») : 4 boxeurs, mêmes animations que Bruno (le client les dessine avec une palette à part)
  { name: 'Tommy', adv: 1, desc: 'Sparring du port', hp: 85, spd: 3.9, jmp: 12.5, color: '#2e86de', atk: [
    { n: 'Direct', type: 'm', su: 5, ac: 4, rc: 10, cd: 10, dmg: 7, rng: 64, h: 30, kb: 4, st: 13 },
    { n: 'Crochet', type: 'm', su: 9, ac: 5, rc: 16, cd: 45, dmg: 11, rng: 70, h: 40, kb: 8, st: 18 },
    { n: 'Uppercut', type: 'm', su: 13, ac: 6, rc: 26, cd: 120, dmg: 17, rng: 52, h: 80, kb: 10, st: 26, lift: -9 }] },
  { name: 'La Machine', adv: 1, desc: 'Jabs mécaniques', hp: 115, spd: 3.5, jmp: 11.5, color: '#636e72', atk: [
    { n: 'Jab éclair', type: 'm', su: 3, ac: 3, rc: 5, cd: 3, dmg: 6, rng: 66, h: 30, kb: 3, st: 11 },
    { n: 'Rafale de jabs', type: 'm', su: 8, ac: 24, rc: 16, cd: 90, dmg: 4, rng: 70, h: 40, kb: 2, st: 9, multi: 6 },
    { n: 'Uppercut piston', type: 'm', su: 14, ac: 6, rc: 26, cd: 130, dmg: 20, rng: 52, h: 80, kb: 12, st: 28, lift: -10 }] },
  { name: 'Rosa', adv: 1, desc: 'Rosa « Tornade », reine de l’esquive', hp: 95, spd: 5.3, jmp: 14.5, color: '#e84393', atk: [
    { n: 'Direct vif', type: 'm', su: 4, ac: 4, rc: 8, cd: 6, dmg: 7, rng: 66, h: 30, kb: 4, st: 13 },
    { n: 'Crochet tournoyant', type: 'm', su: 7, ac: 5, rc: 13, cd: 40, dmg: 13, rng: 74, h: 40, kb: 9, st: 20 },
    { n: 'Esquive', type: 'bd', su: 2, ac: 10, rc: 8, cd: 85, spd: 11 }] },
  { name: 'El Fantasma', adv: 1, desc: 'Champion masqué de La Cage', hp: 140, spd: 4.5, jmp: 13.5, color: '#d4af37', atk: [
    { n: 'Direct fantôme', type: 'm', su: 4, ac: 4, rc: 8, cd: 5, dmg: 9, rng: 70, h: 30, kb: 5, st: 14 },
    { n: 'Crochet du masque', type: 'm', su: 8, ac: 5, rc: 14, cd: 35, dmg: 16, rng: 76, h: 40, kb: 10, st: 22 },
    { n: 'Uppercut de la Cage', type: 'm', su: 12, ac: 6, rc: 22, cd: 95, dmg: 26, rng: 56, h: 80, kb: 13, st: 32, lift: -11 }] },
  // Chapitre 2 (Zéphyr, « La Foudre Fêlée ») : bz = taille de base (1.3 = golem plus grand que les autres)
  { name: 'Golem', adv: 1, desc: 'Golem de pierre, gardien de la forêt', hp: 150, spd: 2.3, jmp: 9.5, color: '#7f8c8d', bz: 1.3, atk: [
    { n: 'Poing de pierre', type: 'm', su: 14, ac: 6, rc: 18, cd: 20, dmg: 13, rng: 78, h: 60, kb: 10, st: 22 },
    { n: 'Balayage rocheux', type: 'm', both: 1, su: 18, ac: 7, rc: 24, cd: 80, dmg: 17, rng: 70, h: 70, kb: 13, st: 26 },
    { n: 'Saut sismique', type: 'jam', su: 12, ac: 0, rc: 26, cd: 150, dmg: 16, jv: 10, jx: 2.5, aoe: 95, kb: 12, st: 28 }] },
  { name: 'Morgane', adv: 1, desc: 'Sorcière du marais', hp: 75, spd: 3.7, jmp: 13, color: '#27ae60', atk: [
    { n: 'Trait maudit', type: 'p', su: 7, ac: 1, rc: 10, cd: 50, dmg: 5, vx: 11, r: 8, kb: 4, st: 13, vis: 18 },
    { n: 'Boule de feu verte', type: 'p', su: 12, ac: 1, rc: 30, cd: 90, dmg: 13, vx: 7, r: 16, kb: 10, st: 22, vis: 19 },
    { n: 'Foudre des marais', type: 'sky', su: 14, ac: 1, rc: 22, cd: 160, dmg: 14, kb: 9, st: 26, warn: 34, strike: 8 }] },
  { name: 'Lysandre', adv: 1, desc: 'Ancien élève de Zéphyr, mage en robe blanche', hp: 115, spd: 4.1, jmp: 13.5, color: '#ecf0f1', atk: [
    { n: 'Lame de lumière', type: 'p', su: 8, ac: 1, rc: 12, cd: 60, dmg: 6, vx: 12, r: 18, kb: 8, st: 18, vis: 3 },
    { n: 'Orbes de vent (x3)', type: 'p', su: 10, ac: 1, rc: 30, cd: 110, dmg: 6, vx: 9, r: 8, kb: 5, st: 14, cnt: 3, vis: 20 },
    { n: 'Foudre blanche', type: 'sky', su: 14, ac: 1, rc: 20, cd: 170, dmg: 14, kb: 11, st: 30, warn: 28, strike: 8 },
    { n: 'Tempête de l’élève', ult: 1, ub: 1, type: 'storm', su: 14, ac: 1, rc: 22, cd: 0, offs: [0, 70, -70, 0], gap: 10, dmg: 9, kb: 6, st: 16, warn: 22, strike: 6, cl: 1 }] },
  // Chapitre 3 (Kaze, « L’Ombre du Clan ») : ninjas dessinés avec le corps de Kaze
  { name: 'Garde Ren', adv: 1, desc: 'Garde du clan du Vent', hp: 80, spd: 4.4, jmp: 14, color: '#c0392b', atk: [
    { n: 'Coup de sabre', type: 'm', su: 6, ac: 4, rc: 12, cd: 10, dmg: 8, rng: 78, h: 40, kb: 6, st: 15 },
    { n: 'Charge', type: 'd', su: 6, ac: 10, rc: 16, cd: 80, dmg: 10, rng: 34, h: 60, kb: 10, st: 20, spd: 12 },
    { n: 'Shuriken', type: 'p', su: 7, ac: 1, rc: 12, cd: 90, dmg: 3, vx: 12, r: 6, kb: 4, st: 8, vis: 21 }] },
  { name: 'Garde Sora', adv: 1, desc: 'Garde des toits du clan du Vent', hp: 75, spd: 4.8, jmp: 14.5, color: '#2980b9', atk: [
    { n: 'Coup de sabre', type: 'm', su: 5, ac: 4, rc: 10, cd: 8, dmg: 8, rng: 80, h: 40, kb: 6, st: 15 },
    { n: 'Charge', type: 'd', su: 5, ac: 10, rc: 14, cd: 65, dmg: 9, rng: 34, h: 60, kb: 10, st: 21, spd: 14 },
    { n: 'Shuriken (x2)', type: 'p', su: 6, ac: 1, rc: 12, cd: 60, dmg: 5, vx: 13, r: 6, kb: 4, st: 8, cnt: 2, vis: 21 }] },
  { name: 'Hibana', adv: 1, desc: 'Kunoichi de feu, très rapide', hp: 85, spd: 6.0, jmp: 15, color: '#ff7a1a', atk: [
    { n: 'Kunaï enflammé', type: 'm', su: 3, ac: 3, rc: 6, cd: 4, dmg: 4, rng: 56, h: 35, kb: 3, st: 11 },
    { n: 'Ruée de flammes', type: 'd', su: 4, ac: 10, rc: 12, cd: 55, dmg: 10, rng: 34, h: 60, kb: 10, st: 22, spd: 17, trail: { tick: 1.2, life: 120, w: 120 } },
    { n: 'Kunaï de feu (x3)', type: 'p', su: 8, ac: 1, rc: 20, cd: 130, dmg: 2, vx: 12, r: 8, kb: 5, st: 1, cnt: 3, vis: 19 }] },
  { name: 'Renard masqué', adv: 1, desc: 'Le voleur du rouleau sacré', hp: 130, spd: 5.4, jmp: 14.5, color: '#e8e4da', atk: [
    { n: 'Lame du renard', type: 'm', su: 4, ac: 4, rc: 8, cd: 6, dmg: 8, rng: 72, h: 40, kb: 6, st: 14 },
    { n: 'Pas du renard (derrière toi)', type: 'tpb', su: 3, ac: 1, rc: 9, cd: 130 },
    { n: 'Kunaï de l’ombre (x2)', type: 'p', su: 5, ac: 1, rc: 10, cd: 70, dmg: 6, vx: 15, r: 6, kb: 5, st: 10, cnt: 2, vis: 21 },
    { n: 'Mille kunaï du renard', ult: 1, ub: 1, type: 'kunai6', su: 10, ac: 76, rc: 14, cd: 0, cnt: 5, gap: 8, vx: 22, r: 6, spd: 32, fin: 16, finKb: 14, finSt: 34, lift: -6, kd: { dmg: 6, kb: 4, st: 12, vis: 21, ub: 1 } }] },
  // Chapitre 4 (Viking, « Le Dernier Drakkar ») : morts-vivants et géant dessinés avec le corps du Viking, louveteau dessiné à part
  { name: 'Draugr', adv: 1, desc: 'Guerrier mort-vivant des tertres', hp: 95, spd: 3.2, jmp: 11.5, color: '#7f9c8a', atk: [
    { n: 'Hache rouillée', type: 'm', su: 10, ac: 5, rc: 14, cd: 12, dmg: 11, rng: 85, h: 50, kb: 8, st: 18 },
    { n: 'Coup de bouclier', type: 'm', su: 8, ac: 4, rc: 14, cd: 40, dmg: 8, rng: 50, h: 85, kb: 15, st: 26 },
    { n: 'Charge d’outre-tombe', type: 'd', su: 10, ac: 12, rc: 18, cd: 110, dmg: 13, rng: 40, h: 70, kb: 12, st: 22, spd: 10 }] },
  { name: 'Draugr hurleur', adv: 1, desc: 'Draugr qui glace le sang', hp: 105, spd: 3.6, jmp: 12, color: '#6a8fb0', atk: [
    { n: 'Griffes gelées', type: 'm', su: 6, ac: 4, rc: 10, cd: 8, dmg: 9, rng: 70, h: 45, kb: 6, st: 15 },
    { n: 'Hurlement (bonus)', type: 'buff', su: 12, ac: 1, rc: 14, cd: 400, dur: 240 },
    { n: 'Saut d’outre-tombe', type: 'jam', su: 10, ac: 0, rc: 22, cd: 120, dmg: 15, jv: 12, jx: 3, aoe: 85, kb: 12, st: 26 }] },
  { name: 'Louveteau géant', adv: 1, desc: 'Louveteau du géant, très rapide', hp: 90, spd: 6.6, jmp: 15, color: '#9aa7b4', atk: [
    { n: 'Morsure', type: 'm', su: 4, ac: 4, rc: 8, cd: 6, dmg: 7, rng: 62, h: 40, by: .6, kb: 4, st: 12 },
    { n: 'Bond', type: 'd', su: 5, ac: 12, rc: 14, cd: 50, dmg: 12, rng: 34, h: 60, kb: 10, st: 22, spd: 16 },
    { n: 'Hurlement', type: 'buff', su: 10, ac: 1, rc: 14, cd: 400, dur: 300 }] },
  { name: 'Géant de givre', adv: 1, desc: 'Voleur du cor sacré, deux fois plus grand', hp: 330, spd: 2.7, jmp: 9, color: '#7fc4e0', bz: 2, atk: [
    { n: 'Poing de glace', type: 'm', su: 16, ac: 6, rc: 20, cd: 18, dmg: 16, rng: 70, h: 80, kb: 14, st: 26 },
    { n: 'Balayage glacé', type: 'm', both: 1, su: 20, ac: 7, rc: 24, cd: 80, dmg: 18, rng: 80, h: 90, kb: 15, st: 28 },
    { n: 'Piétinement', type: 'jam', su: 14, ac: 0, rc: 26, cd: 140, dmg: 18, jv: 8, jx: 1, aoe: 150, kb: 14, st: 30 }] },
  // Chapitre 5 (Chevalier, « Le Serment Brisé ») : le dragon (dessiné à part) et le Chevalier Noir (corps du Chevalier)
  { name: 'Dragon', adv: 1, desc: 'Dragon du pic, crache le feu', hp: 220, spd: 3.2, jmp: 12, color: '#c0392b', bz: 1.7, atk: [
    { n: 'Morsure', type: 'm', su: 10, ac: 5, rc: 16, cd: 14, dmg: 13, rng: 70, h: 60, kb: 10, st: 20 },
    { n: 'Boule de feu', type: 'p', su: 14, ac: 1, rc: 22, cd: 70, dmg: 14, vx: 7, r: 18, kb: 10, st: 22, vis: 19 },
    { n: 'Souffle de flammes', type: 'fire', su: 16, ac: 1, rc: 24, cd: 170, w: 200, life: 150, tick: 2 },
    { n: 'Envol', type: 'fly', su: 4, ac: 1, rc: 6, cd: 320, dur: 150 }] },
  { name: 'Chevalier Noir', adv: 1, desc: 'Frère d’armes maudit', hp: 140, spd: 3.4, jmp: 12, color: '#5b2c6f', blk: 0.05, atk: [
    { n: 'Estoc noir', type: 'm', su: 6, ac: 4, rc: 11, cd: 8, dmg: 9, rng: 88, h: 26, kb: 6, st: 15 },
    { n: 'Coup de bouclier', type: 'm', su: 9, ac: 4, rc: 15, cd: 22, dmg: 10, rng: 50, h: 85, kb: 18, st: 30 },
    { n: 'Taillade maudite', type: 'm', su: 13, ac: 5, rc: 22, cd: 70, dmg: 19, rng: 95, h: 110, kb: 11, st: 26 },
    { n: 'Lame des ténèbres', ult: 1, ub: 1, type: 'p', su: 20, ac: 1, rc: 24, cd: 0, dmg: 32, vx: 13, r: 26, kb: 16, st: 34, vis: 3 }] },
  // Jumelles (perso original) : 2 sœurs en 1. J et K sont différents pour chaque sœur (atk = Luma, alt = Nox), L = changer de sœur, ultime = emprise psychique (l'ennemi est soulevé et contrôlé 4 s)
  { name: 'Jumelles', twin: 1, hidden: 1, desc: 'Deux sœurs psychiques en un perso : Luma (télékinésie) et Nox (esprit). Emprise psychique', hp: 95, spd: 4.4, jmp: 13.5, color: '#9f8cff', atk: [
    { n: 'Luma · Onde psychique', type: 'p', su: 6, ac: 1, rc: 8, cd: 20, dmg: 5, vx: 13, r: 8, kb: 3, st: 12, vis: 23 },
    { n: 'Luma · Cube psychique (encaisse 1 coup)', type: 'cube', su: 8, ac: 1, rc: 12, cd: 240, dur: 420 },
    { n: 'Changer de sœur', type: 'swap', su: 6, ac: 1, rc: 8, cd: 60 },
    { n: 'Emprise psychique (contrôle l’ennemi 4 s)', ult: 1, ub: 1, type: 'mindctrl', su: 16, ac: 1, rc: 14, cd: 0, rng: 480, dur: 240 }], alt: [
    { n: 'Nox · Orbe mental', type: 'p', su: 9, ac: 1, rc: 12, cd: 45, dmg: 12, vx: 6, r: 16, kb: 9, st: 22, vis: 24 },
    { n: 'Nox · Météore psychique (tombe du ciel)', type: 'orbfall', su: 12, ac: 1, rc: 20, cd: 150, dmg: 18, kb: 14, st: 26, warn: 36, rad: 70 },
    { n: 'Changer de sœur', type: 'swap', su: 6, ac: 1, rc: 8, cd: 60 },
    { n: 'Emprise psychique (contrôle l’ennemi 4 s)', ult: 1, ub: 1, type: 'mindctrl', su: 16, ac: 1, rc: 14, cd: 0, rng: 480, dur: 240 }] },
  // Bryan (perso original, admin seulement) : combattant aux coups de pied. J = combo de 3 coups de pied enchaînés (appuyer à nouveau pendant la récupération), K = coup de pied plongeant, L = projection arrière, ultime = chemise déchirée (cadence d'attaque très rapide pendant 4 s)
  { name: 'Bryan', hidden: 1, desc: 'Combattant aux coups de pied : combo à 3, plongeon, projection, chemise déchirée', hp: 100, spd: 4.8, jmp: 14, color: '#cfd2dc', atk: [
    { n: 'Combo de pieds (jusqu’à 3)', type: 'm', su: 5, ac: 3, rc: 8, cd: 0, dmg: 6, rng: 64, h: 44, by: .62, kb: 3, st: 14, combo: [
      { n: 'Coup de pied direct', su: 5, ac: 3, rc: 8, cd: 0, dmg: 6, rng: 64, h: 44, by: .62, kb: 3, st: 15 },
      { n: 'Coup de pied retourné', su: 5, ac: 3, rc: 9, cd: 0, dmg: 7, rng: 72, h: 56, by: .85, kb: 3, st: 15 },
      { n: 'Coup de pied sauté', su: 7, ac: 4, rc: 14, cd: 26, dmg: 11, rng: 78, h: 74, by: .95, kb: 12, st: 22, lift: -5 }] },
    { n: 'Coup de pied plongeant', type: 'dk', fix: [.7, .72], jump: 11, su: 14, ac: 26, rc: 14, cd: 70, spd: 15, dmg: 14, kb: 8, st: 26 },
    { n: 'Projection arrière', type: 'm', su: 12, ac: 5, rc: 22, cd: 90, dmg: 13, rng: 84, h: 72, by: .8, kb: 28, st: 28, lift: -9 },
    { n: 'Chemise déchirée (cadence x3 pendant 4 s)', ult: 1, type: 'rage', su: 14, ac: 1, rc: 12, cd: 0, dur: 240 }] },
  // Odile « la Pie » (perso original, admin seulement) : voleuse de techniques. K = larcin (si ça touche, elle copie la dernière technique de l'ennemi),
  // L = utilise la technique volée (une seule fois, dans les 12 s), ultime = grand cambriolage (vole la jauge d'ultime, les bonus et les projectiles de l'ennemi)
  { name: 'Odile', hidden: 1, desc: 'Voleuse de techniques : copie l’attaque de l’ennemi, vole sa jauge d’ultime et ses bonus', hp: 90, spd: 5.4, jmp: 14.5, color: '#3fb8c9', atk: [
    { n: 'Griffes de pie', type: 'm', su: 4, ac: 3, rc: 8, cd: 4, dmg: 6, rng: 66, h: 42, kb: 4, st: 13 },
    { n: 'Larcin (copie la technique ennemie)', type: 'm', steal: 1, su: 6, ac: 5, rc: 14, cd: 150, dmg: 5, rng: 82, h: 60, kb: 3, st: 16, spd0: 9 },
    { n: 'Technique volée (1 utilisation)', type: 'stolen', su: 0, ac: 0, rc: 0, cd: 20 },
    { n: 'Grand cambriolage (vole ultime, bonus et projectiles)', ult: 1, ub: 1, type: 'heist', su: 12, ac: 1, rc: 18, cd: 0, rng: 560, dmg: 14, st: 40 }] },
  // Silas, le jardinier des cendres (perso original, admin seulement) : K = plante une graine (mûrit en 1,3 s, puis des ronces immobilisent l'ennemi qui marche dessus ; 3 max),
  // L = floraison (toutes ses graines éclosent d'un coup et le soignent), ultime = forêt renaissante (ennemis ralentis, racines qui jaillissent, régénération)
  { name: 'Silas', hidden: 1, desc: 'Jardinier des cendres : graines-pièges qui poussent, floraison à distance, forêt qui ralentit l’ennemi', hp: 115, spd: 3.9, jmp: 12.5, color: '#7cb342', atk: [
    { n: 'Coup de bêche', type: 'm', su: 7, ac: 4, rc: 12, cd: 8, dmg: 9, rng: 84, h: 50, kb: 7, st: 16 },
    { n: 'Graine de ronce (piège, 3 max)', type: 'seed', su: 8, ac: 1, rc: 10, cd: 70, dist: 130, grow: 80, life: 900, dmg: 5, root: 75, max: 3 },
    { n: 'Floraison (fait éclore les graines)', type: 'bloom', su: 10, ac: 1, rc: 16, cd: 120, rad: 95, dmg: 10, kb: 9, st: 20, heal: 5 },
    { n: 'Forêt renaissante (ralentit, racines, régénère)', ult: 1, ub: 1, type: 'forest', su: 16, ac: 1, rc: 16, cd: 0, life: 330, every: 55, warn: 26, dmg: 7, root: 40, regen: .06 }] },
  // Aster, la Gardienne du Sceau (perso original, admin seulement) : chaque coup pose des sceaux (marques) sur l'ennemi ; à 5 sceaux, il est réduit au silence
  // (seul J reste utilisable). L = rempart de lumière (bloque les projectiles et le passage), ultime = grand scellement (plus il y a de sceaux, plus c'est fort)
  { name: 'Aster', hidden: 1, desc: 'Gardienne du Sceau : marque l’ennemi de sceaux, le réduit au silence, dresse des remparts de lumière', hp: 100, spd: 4.7, jmp: 13.5, color: '#d4af37', atk: [
    { n: 'Lame d’aube (+1 sceau)', type: 'm', mark: 1, su: 5, ac: 3, rc: 10, cd: 6, dmg: 7, rng: 74, h: 46, kb: 5, st: 14 },
    { n: 'Sceau lancé (+2 sceaux)', type: 'p', mark: 2, su: 8, ac: 1, rc: 12, cd: 60, dmg: 6, vx: 11, r: 11, kb: 3, st: 12, vis: 30 },
    { n: 'Rempart de lumière', type: 'wall', su: 8, ac: 1, rc: 12, cd: 300, life: 240, dist: 72 },
    { n: 'Grand Scellement (silence selon les sceaux)', ult: 1, ub: 1, type: 'seal', su: 14, ac: 1, rc: 16, cd: 0, rng: 650, base: 6, per: 7, sil0: 90, silk: 45, st: 30 }] },
  // Malik, le Briseur de chaînes (perso original, admin seulement) : K = chaîne harpon (attache l'ennemi, qui ne peut plus s'éloigner), L = arrachement brise-garde
  // (tire l'ennemi attaché jusqu'à lui ; ignore la garde, les boucliers, les cubes et les remparts), ultime = les chaînes tombent (insensible aux étourdissements, vol de vie, efface silence et sceaux)
  { name: 'Malik', hidden: 1, desc: 'Briseur de chaînes : enchaîne l’ennemi, brise toutes les gardes, devient inarrêtable', hp: 110, spd: 4.9, jmp: 13.5, color: '#e8692b', atk: [
    { n: 'Maillons', type: 'm', su: 4, ac: 3, rc: 9, cd: 5, dmg: 7, rng: 96, h: 44, kb: 5, st: 13 },
    { n: 'Chaîne harpon (attache l’ennemi)', type: 'p', teth: 1, tt: 360, len: 230, su: 9, ac: 1, rc: 14, cd: 130, dmg: 5, vx: 15, r: 8, kb: 0, st: 18, vis: 31 },
    { n: 'Arrachement (brise-garde)', type: 'm', gb: 1, yank: 1, su: 9, ac: 4, rc: 16, cd: 110, dmg: 11, rng: 82, h: 60, kb: 12, st: 24 },
    { n: 'Les chaînes tombent (inarrêtable, vol de vie)', ult: 1, ub: 1, type: 'lib', su: 12, ac: 1, rc: 12, cd: 0, dur: 360 }] }
  // Kairos (perso original) : echo = frappe différée sur la position marquée | rewind = retour 2 s en arrière (rend une partie des PV perdus) | timestop = fige l'ennemi, ses dégâts sont mis de côté puis infligés d'un coup
];
// Chapitre 6 (Kairos, « Les Heures Perdues ») : les échos des cinq héros (copies figées dans le temps) et l'Horloger Noir (reflet de Kairos)
[['Bruno', 'Écho de Bruno'], ['Zéphyr', 'Écho de Zéphyr'], ['Kaze', 'Écho de Kaze'], ['Viking', 'Écho du Viking'], ['Chevalier', 'Écho du Chevalier']].forEach(([nm, en]) => {
  const c = CH.find(q => q.name === nm); CH.push({ ...c, name: en, adv: 1, desc: 'Souvenir de ' + nm + ', figé dans le temps', color: '#8fb8e8' });
});
CH.push({ ...CH.find(q => q.name === 'Kairos'), name: 'Horloger Noir', adv: 1, desc: 'Reflet de Kairos, maître des secondes volées', hp: 100, color: '#b0182a' });
// ===== SAISON 2 de l'aventure =====
// Chapitre 7 (Jumelles, « Deux Esprits, Un Cœur ») : adversaires de l'Académie Prisme
{
  const J = CH.find(q => q.name === 'Jumelles'), G = CH.find(q => q.name === 'Golem'), B = CH.find(q => q.name === 'Bryan');
  CH.push(
    { name: 'Drone gardien', adv: 1, desc: 'Drone de surveillance de l’Académie Prisme', hp: 90, spd: 4.2, jmp: 12, color: '#7fd6e8', atk: [
      { n: 'Laser', type: 'p', su: 5, ac: 1, rc: 8, cd: 18, dmg: 5, vx: 15, r: 6, kb: 3, st: 10, vis: 23 },
      { n: 'Rafale laser (x3)', type: 'p', su: 9, ac: 1, rc: 18, cd: 90, dmg: 5, vx: 13, r: 6, kb: 4, st: 12, cnt: 3, vis: 23 },
      { n: 'Charge', type: 'd', su: 8, ac: 10, rc: 16, cd: 75, dmg: 11, rng: 34, h: 60, kb: 10, st: 20, spd: 13 }] },
    { ...G, name: 'Golem de livres', adv: 1, desc: 'Gardien de la bibliothèque interdite', hp: 140, color: '#c9a66b' },
    { name: 'Iris', adv: 1, desc: 'Meilleure élève de Vesper, copie les pouvoirs', hp: 100, spd: 4.6, jmp: 13.5, color: '#2ecc9a', atk: [
      { ...J.atk[0], n: 'Onde copiée' }, { ...J.alt[0], n: 'Orbe copié' }, { ...J.alt[1], n: 'Météore copié', cd: 170 },
      { n: 'Pas éclair', type: 'tpb', su: 3, ac: 1, rc: 9, cd: 160 }] },
    { name: 'Cauchemar', adv: 1, desc: 'L’ombre des peurs de Nox', hp: 110, spd: 4.4, jmp: 13.5, color: '#3a1f5c', atk: [
      { ...J.alt[0], n: 'Orbe de peur' }, { ...J.alt[1], n: 'Chute de cauchemar', cd: 140 },
      { n: 'Ruée d’ombre', type: 'd', su: 6, ac: 10, rc: 14, cd: 70, dmg: 11, rng: 34, h: 60, kb: 9, st: 20, spd: 14 }] },
    { name: 'Pr Vesper', adv: 1, desc: 'Directeur de l’Académie Prisme, casque amplificateur', hp: 150, spd: 3.7, jmp: 12.5, color: '#8e44ad', atk: [
      { ...J.atk[0], n: 'Onde amplifiée', dmg: 7 }, { ...J.alt[1], n: 'Météore amplifié', cd: 130, dmg: 20 },
      { ...J.atk[0], n: 'Rafale mentale (x3)', cd: 100, cnt: 3 }, { ...J.atk[3], n: 'Emprise du directeur' }] },
  // Chapitre 8 (Bryan, « Action ! ») : adversaires des Studios Silver
    { name: 'Rick', adv: 1, desc: 'Cascadeur rival, jaloux de Bryan', hp: 100, spd: 4.6, jmp: 14, color: '#e74c3c', atk: [
      { n: 'Direct', type: 'm', su: 5, ac: 4, rc: 9, cd: 8, dmg: 7, rng: 64, h: 40, kb: 4, st: 13 },
      { n: 'Coup de pied retourné', type: 'm', su: 8, ac: 4, rc: 14, cd: 40, dmg: 11, rng: 76, h: 56, by: .85, kb: 9, st: 19 },
      { n: 'Coup de pied sauté', type: 'm', su: 11, ac: 5, rc: 20, cd: 90, dmg: 15, rng: 78, h: 74, by: .95, kb: 12, st: 24, lift: -6 },
      { n: 'Glissade', type: 'd', su: 5, ac: 10, rc: 14, cd: 70, dmg: 9, rng: 34, h: 40, kb: 8, st: 18, spd: 13 }] },
    { name: 'Shérif robot', adv: 1, desc: 'Robot du plateau western', hp: 115, spd: 3.6, jmp: 12, color: '#b9770e', atk: [
      { n: 'Coup de crosse', type: 'm', su: 8, ac: 4, rc: 14, cd: 14, dmg: 10, rng: 70, h: 50, kb: 8, st: 18 },
      { n: 'Double tir', type: 'p', su: 7, ac: 1, rc: 12, cd: 50, dmg: 6, vx: 16, r: 5, kb: 4, st: 10, cnt: 2, vis: 21 },
      { n: 'Tir chargé', type: 'p', su: 16, ac: 1, rc: 20, cd: 120, dmg: 15, vx: 12, r: 12, kb: 12, st: 24, vis: 19 }] },
    { name: 'Capitaine Boulon', adv: 1, desc: 'Robot pirate du plateau du galion', hp: 125, spd: 3.5, jmp: 12, color: '#7f8c8d', atk: [
      { n: 'Coup de sabre', type: 'm', su: 7, ac: 4, rc: 12, cd: 10, dmg: 9, rng: 84, h: 44, kb: 6, st: 15 },
      { n: 'Boulet de canon', type: 'p', su: 16, ac: 1, rc: 22, cd: 110, dmg: 16, vx: 7, r: 16, kb: 13, st: 24, vis: 19 },
      { n: 'À l’abordage !', type: 'd', su: 8, ac: 12, rc: 16, cd: 90, dmg: 12, rng: 40, h: 70, kb: 11, st: 22, spd: 12 }] },
    { ...B, name: 'Bryan-X', adv: 1, desc: 'Doublure robot de Bryan', hp: 120, color: '#c0c6d0' },
    { name: 'Max Silver', adv: 1, desc: 'Le producteur, aux commandes de son robot de tournage', hp: 240, spd: 2.6, jmp: 9.5, color: '#d4af37', bz: 1.8, atk: [
      { n: 'Poing hydraulique', type: 'm', su: 14, ac: 6, rc: 18, cd: 18, dmg: 15, rng: 74, h: 80, kb: 13, st: 24 },
      { n: 'Rayon du projecteur', type: 'p', su: 12, ac: 1, rc: 18, cd: 70, dmg: 12, vx: 14, r: 12, kb: 9, st: 20, vis: 3 },
      { n: 'Chute de projecteur', type: 'sky', su: 14, ac: 1, rc: 22, cd: 150, dmg: 16, kb: 10, st: 26, warn: 34, strike: 8 },
      { n: 'Piétinement', type: 'jam', su: 14, ac: 0, rc: 26, cd: 130, dmg: 17, jv: 8, jx: 1, aoe: 140, kb: 13, st: 28 }] }
  );
}
// Événement Frieren : dispo du dimanche soir à 00h01 (heure de Paris, soit lundi 16/11/2026 00:01) ensuite définitivement. Modifier FRIEREN_FROM pour changer la date.
const FRIEREN_FROM = Date.parse('2026-11-16T00:01:00+01:00');
// Mode aventure : visible tout de suite, jouable à partir du lundi 16/11/2026 00:01 (heure de Paris). Modifier ADV_FROM pour changer la date.
const ADV_FROM = Date.parse('2026-11-16T00:01:00+01:00');
const h53 = (s, seed = 0) => { let a = 0xdeadbeef ^ seed, b = 0x41c6ce57 ^ seed; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return 4294967296 * (2097151 & b) + (a >>> 0); }, ADM_H = 574438982976814;
const avail = (c, adm) => !CH[c] || (!CH[c].adv && (adm || (!CH[c].hidden && (CH[c].name !== 'Frieren' || (Date.now() >= FRIEREN_FROM))))); // hidden : caché pour tous, seul l'admin peut le choisir
const admOk = (ws, m) => (m.adm && h53(String(m.adm)) === ADM_H && (ws.adm = 1), !!ws.adm);
// les bots ne prennent jamais un perso caché ou pas encore disponible
const rndC = () => { const ok = CH.map((_, i) => i).filter(i => avail(i)); return ok[Math.random() * ok.length | 0]; };
const getChars = () => CH.map(({ name, desc, hp, color, atk, alt }, i) => ({ name, desc, hp, color, atk: atk.map(a => a.n), alt: alt ? alt.map(a => a.n) : null, hid: avail(i) ? 0 : 1, adv: CH[i].adv ? 1 : 0 }));
// ===== MODE AVENTURE : combats de l'histoire (p = héros, o = adversaire, lvl = niveau du bot, map = arène fixe, noUlt = ultimes désactivés, 1 seule manche) =====
// lvl : 1 = moyen pour les combats d'histoire, 2 = difficile pour le boss de chaque chapitre (b3, z2, k3, v3, c1, t5)
const ADV = {
  b0: { p: 'Bruno', o: 'Tommy', lvl: 1, map: 0, noUlt: 1 },
  b1: { p: 'Bruno', o: 'La Machine', lvl: 1, map: 2, noUlt: 1 },
  b2: { p: 'Bruno', o: 'Rosa', lvl: 1, map: 2, noUlt: 1 },
  b3: { p: 'Bruno', o: 'El Fantasma', lvl: 2, map: 2, noUlt: 1 },
  z0: { p: 'Zéphyr', o: 'Golem', lvl: 1, map: 5, noUlt: 1 },
  z1: { p: 'Zéphyr', o: 'Morgane', lvl: 1, map: 6, noUlt: 1 },
  z2: { p: 'Zéphyr', o: 'Lysandre', lvl: 2, map: 7, noUlt: 0 },
  k0: { p: 'Kaze', o: 'Garde Ren', lvl: 1, map: 2, noUlt: 1 },
  k1: { p: 'Kaze', o: 'Garde Sora', lvl: 1, map: 2, noUlt: 1 },
  k2: { p: 'Kaze', o: 'Hibana', lvl: 1, map: 8, noUlt: 1 },
  k3: { p: 'Kaze', o: 'Renard masqué', lvl: 2, map: 9, noUlt: 0 },
  v0: { p: 'Viking', o: 'Draugr', lvl: 1, map: 10, noUlt: 1 },
  v1: { p: 'Viking', o: 'Draugr hurleur', lvl: 1, map: 3, noUlt: 1 },
  v2: { p: 'Viking', o: 'Louveteau géant', lvl: 1, map: 10, noUlt: 1 },
  v3: { p: 'Viking', o: 'Géant de givre', lvl: 2, map: 11, noUlt: 0 },
  c0: { p: 'Chevalier', o: 'Dragon', lvl: 1, map: 12, noUlt: 1 },
  c1: { p: 'Chevalier', o: 'Chevalier Noir', lvl: 2, map: 13, noUlt: 0 },
  t0: { p: 'Kairos', o: 'Écho de Bruno', lvl: 1, map: 2, noUlt: 1 },
  t1: { p: 'Kairos', o: 'Écho de Zéphyr', lvl: 1, map: 7, noUlt: 1 },
  t2: { p: 'Kairos', o: 'Écho de Kaze', lvl: 1, map: 8, noUlt: 1 },
  t3: { p: 'Kairos', o: 'Écho du Viking', lvl: 1, map: 10, noUlt: 1 },
  t4: { p: 'Kairos', o: 'Écho du Chevalier', lvl: 1, map: 13, noUlt: 1 },
  t5: { p: 'Kairos', o: 'Horloger Noir', lvl: 2, map: 14, noUlt: 0 }, // boss final : duel de deux arrêts du temps
  // Saison 2
  j0: { p: 'Jumelles', o: 'Drone gardien', lvl: 1, map: 15, noUlt: 1 },
  j1: { p: 'Jumelles', o: 'Golem de livres', lvl: 1, map: 15, noUlt: 1 },
  j2: { p: 'Jumelles', o: 'Iris', lvl: 1, map: 15, noUlt: 1 },
  j3: { p: 'Jumelles', o: 'Cauchemar', lvl: 1, map: 16, noUlt: 1 },
  j4: { p: 'Jumelles', o: 'Pr Vesper', lvl: 2, map: 16, noUlt: 0 }, // boss : emprise psychique autorisée
  y0: { p: 'Bryan', o: 'Rick', lvl: 1, map: 18, noUlt: 1 },
  y1: { p: 'Bryan', o: 'Shérif robot', lvl: 1, map: 17, noUlt: 1 },
  y2: { p: 'Bryan', o: 'Capitaine Boulon', lvl: 1, map: 18, noUlt: 1 },
  y3: { p: 'Bryan', o: 'Bryan-X', lvl: 1, map: 18, noUlt: 1 },
  y4: { p: 'Bryan', o: 'Max Silver', lvl: 2, map: 18, noUlt: 0 },
  p0: { p: 'Odile', o: 'Douanier', lvl: 1, map: 19, noUlt: 1 },
  p1: { p: 'Odile', o: 'Madame Velours', lvl: 1, map: 19, noUlt: 1 },
  p2: { p: 'Odile', o: 'Le Molosse', lvl: 1, map: 19, noUlt: 1 },
  p3: { p: 'Odile', o: 'Bruno', lvl: 1, map: 0, noUlt: 1 },
  p4: { p: 'Odile', o: 'Le Corbeau', lvl: 2, map: 2, noUlt: 0 },
  r0: { p: 'Silas', o: 'Loup de cendre', lvl: 1, map: 20, noUlt: 1 },
  r1: { p: 'Silas', o: 'Bûcheron mécanique', lvl: 1, map: 20, noUlt: 1 },
  r2: { p: 'Silas', o: 'Baron Vautrin', lvl: 1, map: 20, noUlt: 1 },
  r3: { p: 'Silas', o: 'Dragonneau de braise', lvl: 1, map: 12, noUlt: 1 },
  r4: { p: 'Silas', o: 'Mère-Racine', lvl: 2, map: 20, noUlt: 0 },
  a0: { p: 'Aster', o: 'Brûleur des Fosses', lvl: 1, map: 21, noUlt: 1 },
  a1: { p: 'Aster', o: 'Le Colosse enchaîné', lvl: 1, map: 23, noUlt: 1 },
  a2: { p: 'Aster', o: 'Sœur Cendre', lvl: 1, map: 23, noUlt: 1 },
  a3: { p: 'Aster', o: 'Écho de la Bête', lvl: 1, map: 22, noUlt: 1 },
  a4: { p: 'Aster', o: 'Malik', lvl: 2, map: 22, noUlt: 0 },
  q0: { p: 'Malik', o: 'Inquisiteur', lvl: 1, map: 23, noUlt: 1 },
  q1: { p: 'Malik', o: 'Sentinelle de cristal', lvl: 1, map: 21, noUlt: 1 },
  q2: { p: 'Malik', o: 'Grand Inquisiteur Varn', lvl: 1, map: 21, noUlt: 1 },
  q3: { p: 'Malik', o: 'L’Ombre blanche', lvl: 1, map: 21, noUlt: 1 },
  q4: { p: 'Malik', o: 'Aster', lvl: 2, map: 22, noUlt: 0 } // boss : chemise déchirée autorisée
};

// gr = gravité, acc = adhérence du sol (1 = normal, petit = glissant)
const MAPS = [
  { n: 'Dojo', note: '', gr: GR, acc: 1 },
  { n: 'Volcan', note: '', gr: GR, acc: 1 },
  { n: 'Ville de nuit', note: '', gr: GR, acc: 1 },
  { n: 'Banquise', note: 'sol glissant', gr: GR, acc: 0.1 },
  { n: 'Lune', note: 'gravité réduite', gr: 0.42, acc: 1 },
  { n: 'Prairie d’Himmel', note: 'saison Frieren', gr: GR, acc: 1 }, // map de la saison Frieren : jouable à partir de FRIEREN_FROM
  // arènes réservées au mode aventure (adv: 1 = jamais tirées au hasard)
  { n: 'Marais brumeux', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Sommet de la Tour des Orages', note: 'gravité réduite', gr: .55, acc: 1, adv: 1 },
  { n: 'Forêt de bambous', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Sanctuaire du renard', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Forêt enneigée', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Trône de givre', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Pic du dragon', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Salle du trône maudite', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Cœur de la Grande Horloge', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Couloirs de l’Académie Prisme', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Monde des rêves', note: 'gravité réduite', gr: GR * .75, acc: 1, adv: 1 },
  { n: 'Plateau western', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Grand plateau des Studios Silver', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Docks du Vieux-Port', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Forêt des Cendres', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Parvis de Solenne', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Chambre du Sceau', note: 'aventure', gr: GR, acc: 1, adv: 1 },
  { n: 'Les Fosses', note: 'aventure', gr: GR, acc: 1, adv: 1 }
];
function rollMap(r) {
  if (r.fixMap != null) { r.mi = r.fixMap; return; }
  const ok = MAPS.map((_, i) => i).filter(i => !MAPS[i].adv && (i !== 5 || Date.now() >= FRIEREN_FROM)); let m;
  do { m = ok[Math.random() * ok.length | 0]; } while (m === r.mi && ok.length > 1); r.mi = m;
}

const atks = f => CH[f.c].twin ? (f.sis ? CH[f.c].alt : CH[f.c].atk) : (f.form > 0 && CH[f.c].alt) || CH[f.c].atk;
const nf = (c, i, inp, ult, two) => ({ c, i, tm: two ? i >> 1 : i, dead: 0, x: two ? [170, 330, W - 330, W - 170][i] : (i ? W - 250 : 250), y: G, vx: 0, vy: 0, hp: CH[c].hp, face: (two ? i >> 1 : i) ? -1 : 1, stun: 0, atk: null, cds: [0, 0, 0, 0],
  block: 0, fl: 0, buff: 0, shield: 0, form: 0, inv: 0, fly: 0, crys: 0, hf: null, hook: null, hkt: 0, sz: 1, ghost: 0, portal: null, lz: 0, lzcd: 0, lzd: null, hist: [], sis: 0, cube: 0, cstep: 0, cwin: 0, rage: 0, ctl: 0, held: 0, heldBy: 0, cdAlt: [0, 0], frozen: 0, stored: 0, fzm: 1, stolen: null, slow: 0, mk: 0, mkt: 0, sil: 0, lib: 0, teth: null, ult: ult || 0, inp: inp || { l: 0, r: 0, u: 0, d: 0, a: [0, 0, 0, 0] } });

// ===== SAISON 2 · chapitres 3 à 6 : Odile, Silas, Aster, Malik =====
{
  const F = n => CH.find(q => q.name === n), rn = (b, names) => b.atk.map((a, k) => ({ ...a, n: names[k] || a.n }));
  const Br = F('Bruno'), Vk = F('Viking'), Kz = F('Kaze'), Ch = F('Chevalier'), Go = F('Golem'), Lp = F('Louveteau géant'), Dr = F('Dragon'), Od = F('Odile'), Ma = F('Malik'), As = F('Aster');
  CH.push(
    // Chapitre 3 · Odile — La Pie et le Corbeau
    { ...Br, name: 'Douanier', adv: 1, desc: 'Douanier corrompu du Vieux-Port', hp: 65, color: '#2c3e66', atk: rn(Br, ['Matraque', 'Coup de sifflet', 'Fouille au corps']) },
    { ...Od, name: 'Madame Velours', adv: 1, hidden: 0, desc: 'Receleuse du Vieux-Port, elle vole aussi', hp: 95, color: '#7d3c98', atk: rn(Od, ['Coup d’éventail', 'Marchandage (copie ta technique)', 'Article d’occasion', 'Liquidation totale']) },
    { ...Vk, name: 'Le Molosse', adv: 1, desc: 'Garde du corps de la Guilde du Sel', hp: 150, bz: 1.25, color: '#4a3a2e', atk: rn(Vk, ['Mandale', 'Charge de taureau', 'Écrasement']) },
    { ...Od, name: 'Le Corbeau', adv: 1, hidden: 0, desc: 'Le maître des Pies. Mort depuis deux ans.', hp: 135, spd: 5.7, color: '#2b2140', atk: rn(Od, ['Serres', 'Leçon n°1 (copie ta technique)', 'Ce que je t’ai appris', 'Le Grand Envol']) },
    // Chapitre 4 · Silas — Ce qui repousse
    { ...Lp, name: 'Loup de cendre', adv: 1, desc: 'Loup né des braises de la forêt', hp: 80, color: '#5d6873', atk: rn(Lp, ['Morsure brûlante', 'Bond de braise', 'Hurlement des cendres']) },
    { ...Go, name: 'Bûcheron mécanique', adv: 1, desc: 'Machine à abattre du Baron Vautrin', hp: 130, color: '#8a6a3e' },
    { ...Ch, name: 'Baron Vautrin', adv: 1, desc: 'Marchand de bois, veut raser ce qui repousse', hp: 115, color: '#2e4a3a', atk: rn(Ch, ['Coup de canne', 'Contrat signé', 'Garde rapprochée', 'Expropriation']) },
    { ...Dr, name: 'Dragonneau de braise', adv: 1, desc: 'Le petit du dragon, né dans les cendres', hp: 105, bz: .72, color: '#e67e22' },
    { ...Go, name: 'Mère-Racine', adv: 1, desc: 'L’esprit de la forêt, fou de chagrin', hp: 220, bz: 1.55, color: '#3e6b2a' },
    // Chapitre 5 · Aster — Le Sceau
    { ...Ma, name: 'Brûleur des Fosses', adv: 1, hidden: 0, desc: 'Fanatique de Malik', hp: 85, color: '#6a4a3a', atk: rn(Ma, ['Chaîne rouillée', 'Harpon', 'Torche', 'Feu des Fosses']) },
    { ...Go, name: 'Le Colosse enchaîné', adv: 1, desc: 'Une montagne de fers et de cicatrices', hp: 170, bz: 1.4, color: '#4a4e55' },
    { ...Kz, name: 'Sœur Cendre', adv: 1, desc: 'Lieutenante de Malik', hp: 95, color: '#8a2a1f' },
    { ...Lp, name: 'Écho de la Bête', adv: 1, desc: 'Ce qui suinte des fissures du Sceau', hp: 140, bz: 1.4, color: '#1a1424', atk: rn(Lp, ['Griffe d’ombre', 'Bond du fond', 'Plainte']) },
    // Chapitre 6 · Malik — Les Chaînes
    { ...As, name: 'Inquisiteur', adv: 1, hidden: 0, desc: 'Inquisiteur de l’Ordre du Sceau', hp: 90, color: '#7a1f2a', atk: rn(As, ['Lame de l’Ordre', 'Sceau d’aveu', 'Mur de la Foi', 'Sentence']) },
    { ...Go, name: 'Sentinelle de cristal', adv: 1, desc: 'Gardienne taillée dans le cristal du Sceau', hp: 140, color: '#9fd3e8' },
    { ...Ch, name: 'Grand Inquisiteur Varn', adv: 1, desc: 'Celui qui tient les registres de la dîme', hp: 145, color: '#e8e4d8', atk: rn(Ch, ['Masse de jugement', 'Registre', 'Bouclier de l’Ordre', 'Purification']) },
    { ...Kz, name: 'L’Ombre blanche', adv: 1, desc: 'La lame secrète du Grand Prêtre', hp: 110, color: '#dcdde1' }
  );
}

const sz = f => f.sz || 1;
// ===== 2v2 : équipes. tm = équipe (1v1 : tm = index). enemies = adversaires vivants, foe = le plus proche =====
const enemies = (r, i) => r.f.filter(e => e.tm !== r.f[i].tm && !e.dead);
const foe = (r, i) => {
  const f = r.f[i], l = enemies(r, i), pool = l.length ? l : r.f.filter(e => e.tm !== f.tm);
  let b = pool[0], bd = Infinity;
  for (const e of pool) { const d = Math.abs(e.x - f.x); if (d < bd) { bd = d; b = e; } }
  return b;
};
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
  if (t.cube > 0) { t.cube = 0; t.fl = 3; return; } // cube psychique : absorbe un seul coup, sans dégâts ni recul
  if (t.frozen > 0) { t.stored += dmg * (t.fzm || 1); t.fl = 3; recordTrainingHit(t, dmg); return; }
  if (t.shield > 0 && ub !== 2) { // Infini : la 2e barre de vie absorbe tout, sans recul ni étourdissement
    t.shield = Math.max(0, t.shield - dmg); t.fl = 3;
    if (a && !ub) a.ult = Math.min(100, a.ult + dmg * .75);
    return;
  }
  if (t.crys > 0 && ub !== 2) dmg *= .4; // cristallisation
  if (!ub && t.block && t.stun <= 0 && t.y >= G) { t.hp -= dmg * (CH[t.c].blk ?? .15); t.vx = dir * kb * .3; t.fl = 4; return; }
  recordTrainingHit(t, dmg);
  if (t.lib > 0) dmg *= .75; // Malik libéré : encaisse moins
  if (a && a.lib > 0 && a !== t) a.hp = Math.min(CH[a.c].hp, a.hp + dmg * .3); // vol de vie
  if (t.lib > 0) { recordTrainingHit(t, dmg); t.hp -= dmg; t.fl = 4; if (!ub) { t.ult = Math.min(100, t.ult + dmg * 1.2); if (a) a.ult = Math.min(100, a.ult + dmg * 1.5); } return; } // inarrêtable : ni recul ni étourdissement
  t.hp -= dmg; t.stun = st; t.bound = 0; t.vx = dir * kb; if (lift) t.vy = lift; t.atk = null; t.fl = 6; t.fly = 0; t.hf = null; t.hook = null;
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

// combo de Bryan : choisit le coup suivant ; rage : cadence très rapide (départ et récupération raccourcis, pas de délai)
// avant chaque coup qui touche : brise-garde, sceaux d'Aster, chaîne de Malik
function addMarks(e, n, r) {
  if (e.lib > 0) return; // les chaînes sont tombées : les sceaux n'accrochent plus
  e.mk += n; e.mkt = 360;
  if (e.mk >= 5) { e.mk = 0; e.mkt = 0; e.sil = Math.max(e.sil, 100); r.fx.push({ k: 'sealfx', x: e.x, y: e.y - 60, t: 0, life: 26 }); }
}
function preHit(f, e, d, r) {
  if (e.inv || e.frozen > 0) return;
  if (d.gb) { if (e.cube > 0 || e.shield > 0) r.fx.push({ k: 'cos', x: e.x, y: e.y - 50, t: 0, life: 14 }); e.cube = 0; e.shield = 0; e.crys = 0; e.block = 0; }
  if (e.cube > 0) return;
  if (d.mark) addMarks(e, d.mark, r);
  if (d.teth) f.teth = { o: r.f.indexOf(e), t: d.tt, len: d.len };
}
const NOSTEAL = ['swap', 'stolen', 'heist', 'forest', 'mindctrl']; // techniques qu'Odile ne peut pas copier
// Odile : copie une technique de la victime (la dernière qu'elle a utilisée, sinon une au hasard), utilisable une fois dans les 12 s
function stealFrom(f, e, r) {
  const pool = atks(e).filter(q => q && !q.ult && !NOSTEAL.includes(q.type) && !q.steal), d = (e.last && pool.includes(e.last)) ? e.last : pool[Math.random() * pool.length | 0];
  if (!d) return;
  f.stolen = { d, n: d.n.replace(/\s*\(.*\)$/, ''), t: 720 }; f.cds[2] = 0;
  r.fx.push({ k: 'cos', x: e.x, y: e.y - 60, t: 0, life: 14 }); r.fx.push({ k: 'loot', x: e.x, y: e.y - 70, tx: f.x, ty: f.y - 70, t: 0, life: 22, n: 3 });
}
const comboDef = (f, d0) => { const st = f.cwin > 0 ? f.cstep : 0; f.cstep = st >= 2 ? 0 : st + 1; return { ...d0, ...d0.combo[st], combo: null, comb: st }; };
const rageScale = (f, d) => f.rage > 0 && !d.ult && d.type !== 'swap' ? { ...d, su: d.jump ? d.su : Math.max(1, d.su * .4 | 0), rc: Math.max(2, d.rc * .3 | 0), cd: 0 } : d;
function step(r, i) {
  const f = r.f[i], o = foe(r, i), c = CH[f.c], k = f.inp, dm = f.buff > 0 ? 1.25 : 1, M = MAPS[r.mi];
  if (f.dead) return;
  if (f.held > 0) { // contrôlé par l'emprise psychique : l'adversaire le déplace avec ses touches, il peut subir des dégâts
    const cf = r.f[f.heldBy], ci = cf.inp, z0 = sz(f);
    f.held--; f.atk = null; f.block = 0; f.inv = 0; f.ghost = 0; f.fly = 0; f.stun = 0; f.hf = null; f.hook = null; f.face = cf.x >= f.x ? 1 : -1;
    f.vx = (ci.r - ci.l) * 6; f.vy = cf.ctl > 220 ? -6 : (ci.d - ci.u) * 5; // les 20 premières images : il est soulevé dans les airs
    f.x = clampX(f.x + f.vx, z0); f.y = Math.max(BH * z0 + 10, Math.min(G, f.y + f.vy));
    if (f.fl > 0) f.fl--;
    if (cf.ctl <= 0 || cf.dead) f.held = 0;
    if (f.held === 0) { f.vx = 0; f.vy = 0; f.stun = 10; }
    return;
  }
  if (f.frozen > 0) { // temps arrêté : figé, les dégâts reçus sont mis de côté puis infligés d'un coup à la reprise
    if (--f.frozen === 0 && f.stored > 0) { f.hp -= f.stored; f.stored = 0; f.fl = 8; f.stun = 25; f.atk = null; f.vx = (f.x < o.x ? -1 : 1) * 8; }
    return;
  }
  f.hist.push([f.x, f.y, f.hp]); if (f.hist.length > 130) f.hist.shift(); // mémoire des ~2 dernières secondes (rembobinage)
  f.cds = f.cds.map(v => v > 0 ? v - 1 : 0); f.cdAlt = f.cdAlt.map(v => v > 0 ? v - 1 : 0); if (f.cube > 0) f.cube--; if (f.cwin > 0 && --f.cwin === 0) f.cstep = 0; if (f.rage > 0) f.rage--; if (f.slow > 0) f.slow--; if (f.stolen && --f.stolen.t <= 0) f.stolen = null;
  if (f.sil > 0) f.sil--; if (f.mkt > 0 && --f.mkt === 0) f.mk = 0; if (f.lib > 0) f.lib--;
  if (f.teth) { // chaîne de Malik : l'ennemi attaché ne peut pas s'éloigner au-delà de la longueur de la chaîne
    const e = r.f[f.teth.o];
    if (--f.teth.t <= 0 || !e || e.dead || f.dead) f.teth = null;
    else { const dx = e.x - f.x; if (Math.abs(dx) > f.teth.len) { e.x = f.x + Math.sign(dx) * f.teth.len; if (Math.sign(e.vx) === Math.sign(dx)) e.vx = 0; } }
  }
  if (f.ctl > 0) { // emprise psychique : toutes les secondes la sœur perd 1/10 de ses PV max (jamais mortel)
    f.ctl--;
    if (f.ctl % 60 === 0) { f.hp = Math.max(1, f.hp - c.hp * .1); f.fl = 3; }
    if (o.hp <= 0 || o.dead) f.ctl = 0;
  }
  if (f.fl > 0) f.fl--;
  if (f.buff > 0) f.buff--;
  if (f.form > 0) f.form--;
  if (f.fly > 0) f.fly--;
  if (f.crys > 0) f.crys--;
  if (f.hook && --f.hkt <= 0) f.hook = null;
  if (f.sht > 0 && --f.sht === 0) f.shield = 0; // la barrière de Frieren se dissipe
  if (f.bound > 0) f.bound--;
  if (f.portal && --f.portal.t <= 0) f.portal = null;
  f.inv = 0; f.ghost = 0; f.sz = (f.form > 0 && c.big) || c.bz || 1;
  f.ult = Math.min(100, f.ult + 0.008);
  const z = f.sz, dx0 = k.r - k.l, dy0 = k.d - k.u;
  if (f.hf) { // grappin en vol : s'accroche à l'ennemi ou aux bords de l'arène
    const h = f.hf, oz = sz(o), tb = o.y - BH * oz / 2;
    h.x += h.dx * 18; h.y += h.dy * 18; h.t++;
    if (Math.abs(h.x - o.x) < BW * oz / 2 + 8 && Math.abs(h.y - tb) < BH * oz / 2 + 8) { f.hook = { x: o.x, y: tb, e: 1 }; f.hkt = 180; f.hf = null; }
    else if (h.x <= 0 || h.x >= W || h.y <= 40 || h.y >= G) { f.hook = { x: Math.max(0, Math.min(W, h.x)), y: Math.max(40, Math.min(G, h.y)) }; f.hkt = 180; f.hf = null; }
    else if (h.t > 28) f.hf = null;
  }
  if (f.atk && !f.stun && f.atk.d.comb !== undefined && f.atk.d.comb < 2 && f.cwin > 0 && k.a[f.atk.k] && f.atk.f > f.atk.d.su + f.atk.d.ac) { // enchaînement fluide : le coup suivant annule la récupération
    const nd = rageScale(f, comboDef(f, atks(f)[f.atk.k])); f.cwin = nd.rc + 26; f.cds[f.atk.k] = nd.cd + nd.su + nd.ac + nd.rc; f.atk = { k: f.atk.k, f: 0, d: nd };
  }
  const gr = f.y >= G; f.block = 0;
  if (f.lz > 0) { // forme laser (ultime de Yugo) : vol libre, invulnérable, blesse l'ennemi au contact
    const d = f.lzd, L = Math.hypot(dx0, dy0);
    f.lz--; f.inv = 1; f.ghost = 1; f.atk = null; f.stun = 0; f.block = 0;
    if (L) { f.vx = dx0 / L * d.spd; f.vy = dy0 / L * d.spd; } else { f.vx *= .85; f.vy *= .85; }
    if (f.lzcd > 0) f.lzcd--;
    if (!f.lzcd) for (const e of enemies(r, i)) if (hit([f.x - 34, f.x + 34, f.y - 66, f.y + 8], e)) { hurt(e, d.dmg * dm, d.kb, d.st, d.lift, f.x, d.ub, f); f.lzcd = d.tick; }
  }
  else if (f.stun > 0) { f.stun--; f.vx *= .9 + (1 - M.acc) * .08; }
  else if (f.atk) {
    const a = f.atk, d = a.d, s0 = d.su + (d.dsh || 0); a.f++;
    if (d.jump) { if (a.f === 1 && gr) f.vy = -d.jump; if (a.f <= d.su) f.vx = f.face * 4; if (a.f > d.su + 2 && f.y >= G - 1) a.f = Math.max(a.f, s0 + d.ac); } // plongeon : saute puis retombe en diagonale
    if ((d.type === 'd' && a.f > d.su && a.f <= d.su + d.ac) || (d.type === 'dp' && a.f > d.su && a.f <= s0)) f.vx = f.face * d.spd; else if (gr) f.vx *= .6 + (1 - M.acc) * .35;
    if (f.fly > 0) f.vy = 0; // en vol, on reste en l'air pendant une attaque
    if (d.type === 'bd' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = -f.face * d.spd; f.inv = 1; }
    if (d.spd0 && a.f > d.su && a.f <= d.su + d.ac) f.vx = f.face * d.spd0; // larcin : elle se faufile vers l'ennemi
    if ((d.type === 'tp' || d.type === 'tpb' || (d.type === 'portal' && a.tp) || d.type === 'rewind' || d.type === 'swap') && a.f <= d.su + (d.type === 'rewind' ? 10 : 6)) f.inv = 1;
    if (a.f === d.su + 1) {
      if (d.trail && f.y >= G - 2) r.fx.push({ k: 'fire', x: f.x, w: d.trail.w, t: 0, o: i, d: d.trail });
      if (d.yank && f.teth) { // arrachement : Malik tire d'un coup sec l'ennemi enchaîné jusque devant lui
        const e = r.f[f.teth.o];
        if (e && !e.dead && !e.inv && !(e.frozen > 0)) { r.fx.push({ k: 'cos', x: e.x, y: e.y - 45, t: 0, life: 14 }); e.x = clampX(f.x + f.face * 54, sz(e)); e.vx = 0; e.atk = null; if (e.lib <= 0) e.stun = Math.max(e.stun, 16); }
        f.teth = null;
      }
      if (d.type === 'p') {
        for (let j = 0; j < (d.cnt || 1); j++)
          r.pj.push({ x: f.x + f.face * (30 - (d.clone ? j * 45 : 0)), y: f.y - (d.cy || (d.low ? 18 : BH * .6)), vx: f.face * d.vx, vy: d.vy0 || (d.cnt && !d.clone ? (j - 1) * 1.8 : 0), r: d.r, o: i, d });
      } else if (d.type === 'sky') r.fx.push({ x: o.x, t: 0, o: i, d });
      else if (d.type === 'storm') { // Judradjim : plusieurs éclairs successifs autour de l'ennemi
        d.offs.forEach((off, j) => r.fx.push({ x: clampX(o.x + off, 1), t: -j * d.gap, o: i, d }));
      } else if (d.type === 'sorg') { // Sorganeil : les ennemis sont immobilisés
        for (const e of enemies(r, i)) { e.stun = Math.max(e.stun, d.bind); e.atk = null; e.vx = 0; e.fly = 0; e.hf = null; e.hook = null; e.bound = d.bind; }
      }
      else if (d.type === 'buff') f.buff = d.dur;
      else if (d.type === 'shield') { f.shield = d.val; f.sht = d.ttl || 0; }
      else if (d.type === 'form') f.form = d.dur;
      else if (d.type === 'fly') f.fly = d.dur;
      else if (d.type === 'echo') r.fx.push({ k: 'echo', x: o.x, y: o.y - BH * sz(o) / 2, t: 0, o: i, d });
      else if (d.type === 'timestop') { for (const e of enemies(r, i)) { e.frozen = d.dur; e.stored = 0; e.fzm = d.mult; } }
      else if (d.type === 'rage') { f.rage = d.dur; f.buff = d.dur; r.fx.push({ k: 'cos', x: f.x, y: f.y - 55, t: 0, life: 14 }); } // chemise déchirée : cadence très rapide + vitesse et dégâts accrus
      else if (d.type === 'cube') { f.cube = d.dur; r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 }); } // champ psychique en cube autour de la sœur
      else if (d.type === 'orbfall') r.fx.push({ k: 'psyorb', x: o.x, t: 0, o: i, d }); // boule psychique qui tombe du ciel sur la position visée
      else if (d.type === 'swap') { // changer de sœur : J et K deviennent ceux de l'autre jumelle (recharges conservées séparément)
        f.sis ^= 1; const tmp = [f.cds[0], f.cds[1]]; f.cds[0] = f.cdAlt[0]; f.cds[1] = f.cdAlt[1]; f.cdAlt = tmp;
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
      }
      else if (d.type === 'mindctrl') { // emprise psychique : l'ennemi est soulevé et contrôlé 4 s, la sœur ne peut plus bouger
        if (Math.abs(o.x - f.x) <= d.rng && !o.inv && o.held <= 0 && !o.dead) { o.held = d.dur; o.heldBy = i; o.atk = null; o.stun = 0; f.ctl = d.dur; r.fx.push({ k: 'cos', x: o.x, y: o.y - 45, t: 0, life: 14 }); }
      }
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
        r.fx.push({ k: 'beam', o: i, d, np: f.portal ? 0 : 1, x: f.portal ? f.portal.x : f.x + f.face * Math.min(d.ox || 18, Math.max(18, Math.abs(o.x - f.x) - 24)), y: f.portal ? f.portal.y - 45 : f.y - BH * z * .6, tx: o.x, ty: o.y - BH * sz(o) / 2, t: 0 });
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
      else if (d.type === 'seed') { // Silas : plante une graine devant lui (la plus ancienne disparaît s'il y en a déjà 3)
        const mine = r.fx.filter(e => e.k === 'seed' && e.o === i);
        if (mine.length >= d.max) r.fx.splice(r.fx.indexOf(mine[0]), 1);
        r.fx.push({ k: 'seed', x: clampX(f.x + f.face * d.dist, 1), sx: f.x, t: 0, o: i, d });
      } else if (d.type === 'bloom') { // floraison : chaque graine éclot et blesse autour d'elle, Silas récupère des PV
        const mine = r.fx.filter(e => e.k === 'seed' && e.o === i);
        for (const sd of mine) {
          for (const t of enemies(r, i)) if (Math.abs(t.x - sd.x) < d.rad + 14 * sz(t) && t.y > G - 150) hurt(t, d.dmg * dm, d.kb, d.st, -7, sd.x, d.ub, f);
          f.hp = Math.min(c.hp, f.hp + d.heal); r.fx.push({ k: 'bloomfx', x: sd.x, t: 0, life: 22 });
        }
        r.fx = r.fx.filter(e => !(e.k === 'seed' && e.o === i));
      } else if (d.type === 'forest') r.fx.push({ k: 'forest', t: 0, o: i, d });
      else if (d.type === 'wall') { r.fx = r.fx.filter(e => !(e.k === 'wall' && e.o === i)); r.fx.push({ k: 'wall', x: clampX(f.x + f.face * d.dist, 1), t: 0, o: i, life: d.life }); }
      else if (d.type === 'seal') { // grand scellement : dégâts et silence selon le nombre de sceaux
        if (Math.abs(o.x - f.x) <= d.rng && !o.dead && !o.inv) {
          const n = o.mk; o.mk = 0; o.mkt = 0;
          hurt(o, d.base + d.per * n, 4, d.st, -4, f.x, 1, f);
          if (o.lib <= 0) o.sil = Math.max(o.sil, Math.min(320, d.sil0 + d.silk * n));
          r.fx.push({ k: 'sealfx', x: o.x, y: o.y - 60, t: 0, life: 30, big: 1 });
        }
      } else if (d.type === 'lib') { f.lib = d.dur; f.sil = 0; f.mk = 0; f.mkt = 0; f.stun = 0; f.bound = 0; r.fx.push({ k: 'cos', x: f.x, y: f.y - 55, t: 0, life: 14 }); r.fx.push({ k: 'sealfx', x: f.x, y: f.y - 60, t: 0, life: 26, brk: 1 }); } // les chaînes tombent
      else if (d.type === 'heist') { // grand cambriolage : vole la jauge d'ultime, les bonus actifs et les projectiles de l'ennemi, et un peu de PV
        if (Math.abs(o.x - f.x) <= d.rng && !o.dead && !o.inv) {
          f.ult = Math.min(100, o.ult); o.ult = 0;
          if (o.buff > 0) { f.buff = Math.max(f.buff, o.buff); o.buff = 0; }
          if (o.shield > 0) { f.shield = o.shield; f.sht = o.sht || 300; o.shield = 0; o.sht = 0; }
          if (o.crys > 0) { f.crys = o.crys; o.crys = 0; }
          if (o.rage > 0) { f.rage = o.rage; o.rage = 0; }
          if (o.cube > 0) { f.cube = o.cube; o.cube = 0; }
          o.form = 0; o.fly = 0; o.lz = 0;
          for (const p of r.pj) if (r.f[p.o].tm !== f.tm) { p.o = i; p.vx = -p.vx; } // ses projectiles changent de camp
          hurt(o, d.dmg, 2, d.st, -5, f.x, 1, f); f.hp = Math.min(c.hp, f.hp + d.dmg);
          r.fx.push({ k: 'loot', x: o.x, y: o.y - 60, tx: f.x, ty: f.y - 70, t: 0, life: 30, n: 8 });
        }
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 14 });
      }
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
        else if (d.fix) { ux = d.fix[0] * f.face; uy = d.fix[1]; }
        else if (d.aim) { ux = o.x - f.x; uy = (o.y - BH * sz(o) / 2) - (f.y - BH * z / 2); } // visée automatique vers l'ennemi, même dans les airs
        else if (f.y < G || f.fly > 0) { ux = dx0; uy = dy0; } else { ux = f.face; uy = 0; }
        if (!ux && !uy) ux = f.face;
        const L = Math.hypot(ux, uy); a.dx = ux / L; a.dy = uy / L;
      } else if (d.type === 'sd') a.dx = dx0 || f.face;
      else if (d.type === 'zz') a.dir = f.face;
    }
    if (d.type === 'sorg' && a.f === d.su + 1 + d.dl) { // ... puis le Zoltraak géant part sur chaque ennemi lié
      for (const e of enemies(r, i)) if (e.bound > 0) r.fx.push({ k: 'beam', o: i, d: d.bd, np: 1, x: f.x + f.face * Math.min(d.bd.ox || 18, Math.max(18, Math.abs(e.x - f.x) - 24)), y: f.y - BH * z * .6, tx: e.x, ty: e.y - BH * sz(e) / 2, t: 0 });
    }
    if (d.type === 'dk' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = a.dx * d.spd; f.vy = a.dy * d.spd; }
    if (d.type === 'sd' && a.f > d.su && a.f <= d.su + d.ac) { f.vx = a.dx * d.spd; f.inv = 1; f.ghost = 1; }
    if (d.type === 'zz' && a.f > d.su && a.f <= d.su + d.ac) {
      const q = a.f - d.su - 1; a.dx = a.dir * (Math.floor(q / d.len) % 2 ? -1 : 1);
      f.vx = a.dx * d.spd; f.inv = 1; f.ghost = 1; if (q % d.len === 0) a.hit = a.hm = 0;
    }
    if (d.type === 'rush' && a.f > d.su && a.f <= d.su + d.ac) { // Pas du Diable : passes successives autour de l'ennemi, toujours visées sur lui
      const q = a.f - d.su - 1, leg = Math.floor(q / d.len);
      if (q % d.len === 0) {
        const ang = (leg * 137 + 200) * Math.PI / 180;
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 12 });
        f.x = clampX(o.x + Math.cos(ang) * 150, z); f.y = Math.max(BH * z + 10, Math.min(G, o.y + Math.sin(ang) * 90));
        r.fx.push({ k: 'cos', x: f.x, y: f.y - 45, t: 0, life: 12 });
        a.hit = a.hm = 0;
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
        for (const e of enemies(r, i)) if (hit([f.x - d.aoe, f.x + d.aoe, G - 70, G], e)) hurt(e, d.dmg * dm, d.kb, d.st, d.lift, f.x, d.ub, f);
      }
      if (a.lb > 0) { a.lb--; a.b = [f.x - d.aoe, f.x + d.aoe, G - 70, G]; }
    }
    if (a.b && d.multi && a.f % d.multi === 0) a.hit = a.hm = 0;
    if (a.b && d.type !== 'cut') for (const e of enemies(r, i)) { const bit = 1 << e.i; if (!(a.hm & bit) && (!d.air || e.y < G - 15) && hit(a.b, e)) { a.hm |= bit; a.hit = 1; preHit(f, e, d, r); if (d.steal && !e.inv && !(e.cube > 0)) stealFrom(f, e, r); hurt(e, d.pct ? CH[e.c].hp * d.pct : (a.fin ? d.fin : d.dmg) * dm, a.fin ? 22 : d.kb, a.fin ? 36 : d.st, d.lift, f.x, d.ub, f); } }
    if (f.atk && (d.type === 'jam' ? (a.land && a.f >= a.land + d.rc) || a.f > 150 : a.f >= s0 + d.ac + d.rc)) f.atk = null;
  } else {
    f.face = o.x >= f.x ? 1 : -1;
    const spd = c.spd * (f.buff > 0 ? 1.4 : 1) * (f.form > 0 && c.fspd ? c.fspd : 1) * (f.slow > 0 ? .5 : 1); // forêt de Silas : ralenti
    if (f.ctl > 0) { f.vx *= .6; } // emprise psychique : la sœur ne peut pas bouger
    else if (k.d && gr && !(f.fly > 0)) { f.block = 1; f.vx *= 1 - M.acc; }
    else if (f.fly > 0) { f.vx += (dx0 * spd * 1.1 - f.vx) * .5; f.vy = dy0 * spd * 1.1; } // vol : déplacement libre dans les airs
    else { f.vx += (dx0 * spd - f.vx) * (gr ? M.acc : 1); if (k.u && gr) f.vy = -c.jmp; }
    for (let j = 0; j < 4; j++) if (k.a[j] && !f.cds[j] && !f.block) {
      let d = atks(f)[j];
      if (!d) continue;
      if (f.sil > 0 && j >= 1) continue; // réduit au silence par les sceaux d'Aster
      if (d.type === 'stolen') { if (!f.stolen) continue; d = { ...f.stolen.d }; f.stolen = null; } // Odile : la technique volée part, une seule fois
      if (d.nohook && !f.hook) d = d.nohook;
      if (d.ult && f.ult < 100) continue;
      if (d.ult) f.ult = 0;
      if (d.combo) d = comboDef(f, d);
      d = rageScale(f, d);
      if (d.comb !== undefined) f.cwin = d.rc + 26;
      f.atk = { k: j, f: 0, d }; f.cds[j] = d.cd + d.su + (d.dsh || 0) + d.ac + d.rc;
      if (!d.ult && !NOSTEAL.includes(d.type) && !d.steal) f.last = atks(f)[j]; // dernière technique utilisée (c'est elle qu'Odile peut copier)
      break;
    }
  }
  f.x += f.vx; f.y += f.vy;
  if (f.y < G) { if (!(f.lz > 0)) f.vy += M.gr; } else { f.y = G; f.vy = 0; }
  const top = BH * z + 10; if (f.y < top) { f.y = top; if (f.vy < 0) f.vy = 0; }
  f.x = clampX(f.x, z);
}

function sep(r) {
  const F = r.f.filter(q => !q.dead);
  for (let m = 0; m < F.length; m++) for (let n = m + 1; n < F.length; n++) {
    const a = F[m], b = F[n];
    if (a.ghost || b.ghost) continue;
    const w = BW * (sz(a) + sz(b)) / 2, hh = BH * Math.max(sz(a), sz(b)) * .8;
    if (Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < hh) {
      const mv = (w - Math.abs(a.x - b.x)) / 2, sg = a.x < b.x ? -1 : 1;
      a.x += sg * mv; b.x -= sg * mv;
    }
  }
}

function projs(r) {
  r.pj = r.pj.filter(p => {
    const ow = r.f[p.o];
    if (ow.frozen > 0) return true; // projectile figé avec son lanceur
    p.x += p.vx; p.y += p.vy; if (p.d.grav) p.vy += p.d.grav;
    for (const w of r.fx) if (w.k === 'wall' && r.f[w.o].tm !== ow.tm && Math.abs(p.x - w.x) < 14 + p.r && p.y > G - 215) { r.fx.push({ k: 'cos', x: p.x, y: p.y, t: 0, life: 10 }); return false; } // rempart d'Aster
    for (const t of enemies(r, p.o)) {
      const tz = sz(t);
      if (Math.abs(p.x - t.x) < BW * tz / 2 + p.r && p.y > t.y - BH * tz - p.r && p.y < t.y + p.r) {
        preHit(ow, t, p.d, r); hurt(t, p.d.dmg * (ow.buff > 0 ? 1.25 : 1), p.d.kb, p.d.st, 0, p.d.pull ? t.x + Math.sign(p.vx) * 50 : p.x - p.vx * 3, p.d.ub, ow); return false;
      }
    }
    return p.x > -50 && p.x < W + 50 && p.y < G + 25;
  });
}

// effets au sol / dans l'air : foudre, vague de feu, portails à lasers, éclats cosmétiques
function fxs(r) {
  const add = r.fxAdd = []; // effets créés pendant la boucle (racines, éclosions) : ajoutés après
  r.fx = r.fx.filter(e => {
    if (e.o != null && r.f[e.o].frozen > 0) return true; // les effets d'un combattant figé sont figés aussi
    e.t++;
    if (e.k === 'cos' || e.k === 'bloomfx' || e.k === 'loot' || e.k === 'sealfx') return e.t <= e.life;
    if (e.k === 'wall') { // rempart d'Aster : les ennemis ne passent pas ; un coup brise-garde le fait voler en éclats
      for (const t of enemies(r, e.o)) {
        if (t.atk && t.atk.d.gb && t.atk.b && t.atk.b[0] < e.x + 12 && t.atk.b[1] > e.x - 12) { add.push({ k: 'cos', x: e.x, y: G - 100, t: 0, life: 14 }); return false; }
        if (t.y > G - 215 && Math.abs(t.x - e.x) < 22 * sz(t) + 8) { const sd = Math.sign(t.x - e.x) || 1; t.x = e.x + sd * (22 * sz(t) + 8); if (Math.sign(t.vx) === -sd) t.vx = 0; }
      }
      return e.t <= e.life;
    }
    if (e.k === 'seed') { // graine : mûrit, puis des ronces immobilisent le premier ennemi qui marche dessus
      if (e.t >= e.d.grow) for (const t of enemies(r, e.o)) if (!t.inv && t.y >= G - 4 && Math.abs(t.x - e.x) < 22 + 14 * sz(t)) {
        hurt(t, e.d.dmg, 0, e.d.root, 0, e.x, 1, r.f[e.o]); t.bound = e.d.root; t.vx = 0; t.fly = 0; add.push({ k: 'bloomfx', x: e.x, t: 0, life: 22 }); return false;
      }
      return e.t <= e.d.life;
    }
    if (e.k === 'forest') { // forêt renaissante : ennemis au sol ralentis, Silas régénère, graines mûres d'un coup, racines toutes les ~0,9 s
      const ow2 = r.f[e.o], d2 = e.d;
      if (!ow2.dead) ow2.hp = Math.min(CH[ow2.c].hp, ow2.hp + d2.regen);
      for (const fx2 of r.fx) if (fx2.k === 'seed' && fx2.o === e.o) fx2.t = Math.max(fx2.t, fx2.d.grow);
      for (const t of enemies(r, e.o)) { if (t.y >= G - 4) t.slow = Math.max(t.slow, 4); if (e.t % d2.every === 10) add.push({ k: 'root', x: t.x, t: 0, o: e.o, d: d2 }); }
      return e.t <= d2.life;
    }
    if (e.k === 'root') { // racine : le sol se fissure, puis elle jaillit
      if (e.t === e.d.warn) for (const t of enemies(r, e.o)) if (Math.abs(t.x - e.x) < 40 * sz(t) && t.y > G - 120) { hurt(t, e.d.dmg, 3, e.d.root, -4, e.x, 1, r.f[e.o]); t.bound = e.d.root; }
      return e.t <= e.d.warn + 16;
    }
    const d = e.d, ow = r.f[e.o], dm = ow.buff > 0 ? 1.25 : 1, T = enemies(r, e.o), f0 = foe(r, e.o);
    if (e.k === 'fire') {
      if (e.t % 12 === 0) for (const t of T) if (t.y >= G - 2 && Math.abs(t.x - e.x) < e.w / 2 + 14 * sz(t)) burn(t, d.tick * dm);
      return e.t <= d.life;
    }
    if (e.k === 'psyorb') { // météore psychique : visée au sol, la boule tombe puis explose à l'impact
      if (e.t === d.warn && !e.hit) { e.hit = 1; for (const t of T) { const tz = sz(t); if (Math.hypot(t.x - e.x, t.y - BH * tz / 2 - (G - 30)) < d.rad + 14 * tz) hurt(t, d.dmg * dm, d.kb, d.st, -6, e.x, d.ub, ow); } }
      return e.t <= d.warn + 12;
    }
    if (e.k === 'echo') { // écho : la zone marquée explose après "warn" frames
      if (e.t === d.warn && !e.hit) {
        e.hit = 1;
        for (const t of T) { const tz = sz(t); if (Math.hypot(t.x - e.x, t.y - BH * tz / 2 - e.y) < d.rad + 14 * tz) hurt(t, d.dmg * dm, d.kb, d.st, -4, e.x, d.ub, ow); }
      }
      return e.t <= d.warn + 8;
    }
    if (e.k === 'beam') { // gros laser : visée affichée pendant "warn" frames, puis rayon épais
      if (e.t === d.warn && !e.hit) {
        e.hit = 1;
        for (const t of T) { const tz = sz(t); if (segDist(e.x, e.y, e.x + (e.tx - e.x) * 4, e.y + (e.ty - e.y) * 4, t.x, t.y - BH * tz / 2) < d.wd / 2 + 14 * tz) hurt(t, d.dmg * dm, d.kb, d.st, 0, e.x, d.ub, ow); }
      }
      return e.t <= d.warn + d.life;
    }
    if (e.k === 'por') { // le portail vise la position de l'ennemi à son ouverture, puis tire après "warn" frames
      if (e.t === 0) { e.tx = f0.x; e.ty = f0.y - BH * sz(f0) / 2; }
      if (e.t === d.warn && !e.hit) {
        e.hit = 1;
        for (const t of T) { const tz = sz(t); if (segDist(e.x, e.y, e.x + (e.tx - e.x) * 3, e.y + (e.ty - e.y) * 3, t.x, t.y - BH * tz / 2) < 28 * tz) hurt(t, d.dmg * dm, d.kb, d.st, 0, e.x, d.ub, ow); }
      }
      return e.t <= d.warn + 6;
    }
    if (e.t > d.warn && e.t <= d.warn + d.strike) // foudre : touche chaque ennemi sous l'impact (une seule fois)
      for (const t of T) { const bit = 1 << t.i; if (!(e.hm & bit) && Math.abs(t.x - e.x) < 45 * sz(t)) { e.hm |= bit; hurt(t, d.dmg * dm, d.kb, d.st, -8, e.x, d.ub, ow); } }
    return e.t <= d.warn + d.strike;
  });
  if (add.length) r.fx.push(...add);
}

function start(r) { r.f = r.sel.map((c, i) => nf(c, i, null, 0, !!r.two)); r.pj = []; r.fx = []; rollMap(r); r.ph = 'cd'; r.t = 150; r.tm = ROUND; r.msg = ''; }

function startTraining(r, characterIndex, skin) {
  r.training = true;
  const dummyIndex = Math.max(0, CH.findIndex(c => c.name === 'Viking'));
  r.sel = [characterIndex, dummyIndex];
  r.sk = [String(skin || '').slice(0, 40), ''];
  r.f = [nf(characterIndex, 0), nf(dummyIndex, 1)];
  r.f[0].x = 250;
  r.f[1].x = W - 250;
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
function thinkBot(r) { // r.bots[i] = true : le combattant i est piloté par l'IA (1v1 contre bot, ou 2v2)
  if (r.ph !== 'fight' || !r.bots) return;
  r.bots.forEach((b, i) => { if (b && r.f[i] && !r.f[i].dead) thinkOne(r, i); });
}
function thinkOne(r, i) {
  const f = r.f[i], o = foe(r, i), c = CH[f.c];
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
      if (a.type === 'buff' || (a.type === 'shield' && !a.ttl) || a.type === 'form' || a.type === 'crys' || a.type === 'heal' || a.type === 'laserform') {
        score = (f.hp < c.hp * .72 || f.buff <= 0 || f.shield <= 0 || f.form <= 0) ? 75 : -10;
      } else if (a.type === 'rewind') score = f.hp < c.hp * .6 ? 70 : -10;
      else if (a.type === 'swap') score = Math.random() < .06 ? 45 : -10;
      else if (a.type === 'stolen') score = f.stolen ? 66 : -99;
      else if (a.type === 'seed') score = r.fx.filter(e => e.k === 'seed' && e.o === i).length < 3 && dist < 420 ? 50 : -10;
      else if (a.type === 'bloom') score = r.fx.some(e => e.k === 'seed' && e.o === i && Math.abs(e.x - o.x) < 100) ? 78 : -20;
      else if (a.type === 'heist' || a.type === 'forest') score = dist < 500 ? 60 : 5;
      else if (a.steal && !f.stolen && dist < 130) score = 70;
      else if (a.type === 'seal') score = o.mk >= 2 ? 82 : o.mk >= 1 ? 50 : 20;
      else if (a.type === 'wall') score = (r.pj.some(p => p.o !== i && Math.sign(f.x - p.x) === Math.sign(p.vx) && Math.abs(p.x - f.x) < 300) || (dist < 110 && f.hp < c.hp * .5)) ? 70 : -10;
      else if (a.type === 'lib') score = f.sil > 0 || f.hp < c.hp * .7 ? 80 : 40;
      else if (a.yank) score = f.teth ? 85 : (o.block || o.shield > 0 || o.cube > 0) && dist < 100 ? 70 : -5;
      else if (a.teth && f.teth) score = -20;
      else if (a.type === 'cube') score = f.cube <= 0 && o.atk && dist < 320 ? 62 : -10;
      else if (a.type === 'p') score = (dist < 520 ? 55 : 10) - Math.abs(dist - 260) * .04;
      else if (a.type === 'shield' && a.ttl) score = f.shield <= 0 && ((o.atk && dist < 300) || f.hp < c.hp * .6) ? 72 : -10; // barrière : quand l'ennemi attaque
      else if (a.type === 'storm' || a.type === 'sorg') score = dist < 520 ? 58 : 8;
      else if (a.type === 'kunai6' || a.type === 'orbfall' || a.type === 'sky' || a.type === 'portals' || a.type === 'fire' || a.type === 'beam' || a.type === 'rush' || a.type === 'echo' || a.type === 'timestop') score = dist < 420 ? 58 : 5;
      else if (a.type === 'tp' || a.type === 'grap' || a.type === 'portal') score = dist > 180 ? 38 : 5;
      else score = dist < (a.rng || 75) + 45 ? 65 : -5;
      if (a.ult && f.ult >= 100) score += P.ult;
      score += Math.random() * P.noise; if (P.punish && o.stun > 0) score += 20;
      if (score > best) { best = score; choice = j; }
    }
    if (choice >= 0 && (best > 20 || dist < 95)) input.a[choice] = 1;
  }
  if (f.ctl > 0) { // emprise psychique : le bot ramène l'ennemi vers lui et le fait descendre pour le toucher
    input.l = input.r = input.u = input.d = 0; const ex = o.x - f.x;
    if (Math.abs(ex) > 60) input[ex > 0 ? 'l' : 'r'] = 1; if (o.y < f.y - 40) input.d = 1;
  }
  f.inp = input;
}

const atkPP = f => { const a = f.atk, d = a.d, s0 = d.su + (d.dsh || 0), v = a.f <= s0 ? a.f / (s0 || 1) : a.f <= s0 + d.ac ? (a.f - s0) / (d.ac || 1) : Math.min(1, (a.f - s0 - d.ac) / (d.rc || 1)); return Math.round(v * 100) / 100; };
function tick(r) {
  if (r.ph === 'training') {
    // L'ultime reste disponible pour tester librement toutes les capacités.
    r.f[0].ult = 100;
    step(r, 0);
    if (r.f[1].held > 0) step(r, 1); // le mannequin peut être contrôlé par l'emprise psychique
    projs(r);
    fxs(r);

    // Le mannequin ne bouge pas et ne peut pas être éliminé.
    // Le mannequin est indestructible mais subit désormais recul, projection, étourdissement et effets (immobilisation, gel...), puis revient à sa place.
    const dummy = r.f[1], home = W - 250;
    if (!(dummy.held > 0)) {
      if (dummy.stun > 0) dummy.stun--;
      if (dummy.bound > 0) dummy.bound--;
      if (dummy.fl > 0) dummy.fl--;
      if (!(dummy.frozen > 0)) {
        dummy.x += dummy.vx; dummy.y += dummy.vy;
        if (dummy.y < G) dummy.vy += GR; else { dummy.y = G; dummy.vy = 0; dummy.vx *= .86; }
        dummy.x = Math.max(40, Math.min(W - 40, dummy.x));
        if (dummy.stun <= 0 && dummy.y >= G && Math.abs(dummy.vx) < .6) { dummy.vx = 0; dummy.x += (home - dummy.x) * .08; if (Math.abs(home - dummy.x) < 1) dummy.x = home; }
      }
    }
    dummy.hp = 1000000000;
    dummy.atk = null;
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
    r.f.forEach((_, q) => step(r, q)); if (r.noUlt) r.f.forEach(f => { f.ult = 0; }); sep(r); projs(r); fxs(r); r.tm--;
    let over, w;
    if (r.two) { // 2v2 : un combattant à 0 PV est éliminé ; la manche finit quand une équipe est éliminée (ou au temps : PV cumulés)
      r.f.forEach(f => { if (f.hp <= 0 && !f.dead) { f.hp = 0; f.dead = 1; f.atk = null; f.hf = null; f.hook = null; f.vx = 0; } });
      const hp = [0, 0], alive = [0, 0];
      r.f.forEach(f => { hp[f.tm] += Math.max(0, f.hp); if (!f.dead) alive[f.tm]++; });
      over = !alive[0] || !alive[1] || r.tm <= 0;
      w = hp[0] === hp[1] ? -1 : hp[0] > hp[1] ? 0 : 1;
    } else {
      const [a, b] = r.f;
      over = a.hp <= 0 || b.hp <= 0 || r.tm <= 0;
      w = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
    }
    if (over) {
      const tn = q => r.two ? (q ? '🔴 L’équipe Rouge' : '🔵 L’équipe Bleue') : CH[r.f[q].c].name;
      if (w >= 0) r.wins[w]++;
      r.msg = w < 0 ? 'Égalité !' : tn(w) + (r.two ? ' gagne la manche !' : ' gagne la manche !');
      r.ph = 'rend'; r.t = 150;
      if (r.wins[0] >= (r.need || 2) || r.wins[1] >= (r.need || 2)) {
        r.ph = 'end'; r.msg = '🏆 ' + tn(w) + ' remporte le match !';
        if (r.two) { r.again = r.bots.map(b => b ? 1 : 0); r.co = r.f.map(f => r.wins[f.tm] * 10 + (r.wins[f.tm] >= 2 ? 30 : 10)); }
        else { r.again = r.bot ? [0, 1] : [0, 0]; r.co = [0, 1].map(q => r.wins[q] * 10 + (r.wins[q] >= 2 ? 30 : 10)); }
      }
    }
  }
  else if (r.ph === 'rend') {
    if (--r.t <= 0) { r.f = r.f.map((f, i) => nf(f.c, i, f.inp, f.ult, !!r.two)); r.pj = []; r.fx = []; rollMap(r); r.ph = 'cd'; r.t = 120; r.tm = ROUND; r.msg = ''; }
  }
  else if (r.ph === 'end') {
    if (r.again.every(Boolean)) { r.ph = 'select'; r.sel = r.two ? r.bots.map(b => b ? (rndC()) : null) : [null, r.bot ? (rndC()) : null]; r.wins = [0, 0]; r.msg = ''; r.f = []; r.selT = 0; }
  }
  else if (r.ph === 'select' && r.two) { // 2v2 : tout le monde a choisi (bots inclus) -> début ; au bout de 40 s, choix aléatoire pour les indécis
    if (++r.selT > 2400) r.sel.forEach((v, q) => { if (v == null) r.sel[q] = rndC(); });
    if (r.sel.every(v => v != null)) { r.wins = [0, 0]; start(r); }
  }
  const live = r.ph !== 'wait' && r.ph !== 'select';
  const s = { t: 's', p: r.ph, training: !!r.training, adv: r.adv ? 1 : 0, bot: !!r.bot, two: r.two ? 1 : 0,
    damage: r.training ? Math.round(r.f[1].totalDamage) : 0,
    hits: r.training ? r.f[1].hitCount : 0,
    lastDamage: r.training ? r.f[1].lastDamage : 0,
    n: Math.ceil(r.t / 60), tm: Math.ceil(r.tm / 60), w: r.two ? [r.wins[0], r.wins[0], r.wins[1], r.wins[1]] : r.wins, m: r.msg, sel: r.sel, mp: r.mi, co: r.ph === 'end' ? r.co : null, ag: r.again,
    f: live ? r.f.map((f, q) => {
      const d = f.atk && f.atk.d;
      return { c: f.c, sk: r.sk[q], te: f.tm, dd: f.dead ? 1 : 0, bo: r.bots && r.bots[q] ? 1 : 0, x: Math.round(f.x), y: Math.round(f.y), hp: Math.max(0, Math.round(f.hp)), fc: f.face, bl: f.block, fl: f.fl > 0 ? 1 : 0,
        ul: Math.round(f.ult), bf: f.buff > 0 ? 1 : 0, sh: Math.round(f.shield), fm: f.form > 0 ? 1 : 0, iv: f.inv ? 1 : 0, sz: f.sz, cr: f.crys > 0 ? 1 : 0, fy: f.fly > 0 ? 1 : 0, lz: f.lz > 0 ? 1 : 0, fz: f.frozen > 0 ? 1 : 0, bd: f.bound > 0 ? 1 : 0, sis: f.sis | 0, ct: f.ctl > 0 ? 1 : 0, cb: f.cube > 0 ? 1 : 0, rg: f.rage > 0 ? 1 : 0, stl: f.stolen ? f.stolen.n : '', slw: f.slow > 0 ? 1 : 0, mk: f.mk, sil: f.sil > 0 ? 1 : 0, lib: f.lib > 0 ? 1 : 0, th: f.teth ? f.teth.o : -1, cm: d && d.comb !== undefined ? d.comb : -1, hd: f.held > 0 ? 1 : 0, sd: Math.round(f.stored), vx: Math.round(f.vx * 10) / 10, vy: Math.round(f.vy * 10) / 10, pt: f.portal ? [Math.round(f.portal.x), Math.round(f.portal.y)] : null,
        hk: f.hook ? [Math.round(f.hook.x), Math.round(f.hook.y)] : f.hf ? [Math.round(f.hf.x), Math.round(f.hf.y)] : null,
        ad: f.atk && f.atk.dx !== undefined ? [Math.round(f.atk.dx * 10) / 10, Math.round((f.atk.dy || 0) * 10) / 10] : null,
        ak: f.atk ? f.atk.k : -1, ap: d ? (f.atk.f <= d.su + (d.dsh || 0) ? 0 : f.atk.f <= d.su + (d.dsh || 0) + d.ac ? 1 : 2) : -1, pp: d ? atkPP(f) : 0,
        b: f.atk && f.atk.b ? f.atk.b.map(Math.round) : null };
    }) : [],
    pj: live ? r.pj.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, o: p.o, k: p.d.vis || 0, v: Math.sign(p.vx) })) : [],
    fx: live ? r.fx.filter(e => e.t >= 0).map(e => e.k === 'cos' ? { p: 2, x: Math.round(e.x), y: Math.round(e.y), a: e.t / e.life }
      : e.k === 'fire' ? { p: 5, x: Math.round(e.x), w: e.w, a: e.t / e.d.life }
      : e.k === 'echo' ? { p: 6, x: Math.round(e.x), y: Math.round(e.y), a: Math.min(1, e.t / e.d.warn), r: e.d.rad, h: e.t >= e.d.warn ? 1 : 0 }
      : e.k === 'beam' ? { p: e.t >= e.d.warn ? 4 : 3, x: Math.round(e.x), y: Math.round(e.y), tx: Math.round(e.tx), ty: Math.round(e.ty), a: Math.min(1, e.t / e.d.warn), wd: e.d.wd, np: e.np, cl: e.d.cl || 0 }
      : e.k === 'por' ? { p: e.t >= e.d.warn ? 4 : 3, x: Math.round(e.x), y: Math.round(e.y), tx: Math.round(e.tx), ty: Math.round(e.ty), a: Math.min(1, e.t / e.d.warn) }
      : e.k === 'wall' ? { p: 13, x: Math.round(e.x), a: e.t / e.life, o: e.o }
      : e.k === 'sealfx' ? { p: 14, x: Math.round(e.x), y: Math.round(e.y), a: e.t / e.life, b: e.big ? 1 : 0, k: e.brk ? 1 : 0 }
      : e.k === 'seed' ? { p: 8, x: Math.round(e.x), sx: Math.round(e.sx), a: Math.min(1, e.t / e.d.grow), o: e.o }
      : e.k === 'bloomfx' ? { p: 9, x: Math.round(e.x), a: e.t / e.life }
      : e.k === 'forest' ? { p: 10, a: e.t / e.d.life, o: e.o }
      : e.k === 'root' ? { p: 11, x: Math.round(e.x), a: Math.min(1, e.t / e.d.warn), h: e.t >= e.d.warn ? 1 : 0, u: Math.max(0, e.t - e.d.warn) }
      : e.k === 'loot' ? { p: 12, x: Math.round(e.x), y: Math.round(e.y), tx: Math.round(e.tx), ty: Math.round(e.ty), a: e.t / e.life, n: e.n }
      : e.k === 'psyorb' ? { p: 7, x: Math.round(e.x), a: Math.min(1, e.t / e.d.warn), h: e.t >= e.d.warn ? 1 : 0, u: Math.max(0, e.t - e.d.warn), r: e.d.rad }
      : { p: e.t > e.d.warn ? 1 : 0, x: Math.round(e.x), c: e.d.cl || 0 }) : [] };
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
const rooms = new Map(), queue = [], queue2 = [];
// ===== INVITATIONS D'AMIS (2v2) : presence = code ami -> socket de présence ; invites = invitations en attente ; duos = paires acceptées qui rejoignent la partie =====
const presence = new Map(), invites = new Map(), duos = new Map();
const INV_TTL = 30000, DUO_TTL = 12000;
const rid = () => Math.random().toString(36).slice(2, 10);
const Q2_WAIT = 15000; // 2v2 : attente max (ms) avant de compléter avec des bots
const newCode = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; };
const join = ws => tx(ws, { t: 'room', code: ws.room.code, idx: ws.idx, chars: getChars(), maps: MAPS.map(({ n, note }) => ({ n, note })), two: ws.room.two ? 1 : 0 });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'hello' && m.pres) { // socket de présence : permet de recevoir les invitations d'amis
      registerProfile(m.me);
      const pc = String((m.me || {}).code || '').toUpperCase();
      if (/^[A-Z2-9]{6}$/.test(pc)) { ws.pcode = pc; presence.set(pc, ws); }
      return;
    }
    if (m.t === 'invite' && ws.pcode) {
      const to = String(m.to || '').toUpperCase(), tw = presence.get(to), me = profiles[ws.pcode];
      if (!tw || tw.readyState !== 1 || to === ws.pcode) return tx(ws, { t: 'invite_res', ok: 0, m: 'Cet ami est hors ligne' });
      for (const v of [...invites.values()]) if (v.from === ws.pcode) { invites.delete(v.id); tx(v.tw, { t: 'invite_end', id: v.id }); } // une seule invitation à la fois
      const id = rid();
      invites.set(id, { id, from: ws.pcode, to, fw: ws, tw, exp: Date.now() + INV_TTL });
      tx(tw, { t: 'invited', id, name: me ? me.name : 'Un ami', icon: me ? me.icon : '🥷', lvl: me ? me.lvl : 1 });
      return tx(ws, { t: 'invite_res', ok: 1, id, to: (profiles[to] || {}).name || 'ton ami' });
    }
    if (m.t === 'invite_cancel' && ws.pcode) {
      const v = invites.get(m.id); if (v && v.from === ws.pcode) { invites.delete(v.id); tx(v.tw, { t: 'invite_end', id: v.id }); }
      return;
    }
    if (m.t === 'invite_answer' && ws.pcode) {
      const v = invites.get(m.id); if (!v || v.to !== ws.pcode) return;
      invites.delete(v.id);
      const nm = (profiles[v.to] || {}).name || 'Ton ami';
      if (!m.yes) return tx(v.fw, { t: 'invite_res', ok: 0, m: nm + (m.busy ? ' est occupé' : ' a refusé l’invitation') });
      const token = rid() + rid();
      duos.set(token, { a: null, b: null, exp: Date.now() + DUO_TTL, done: false });
      tx(v.fw, { t: 'invite_go', token }); tx(v.tw, { t: 'invite_go', token });
      return;
    }
    if (m.t === 'duo' && !ws.room) { // les deux amis rejoignent avec le jeton : ils forment une équipe en 2v2
      const d = duos.get(String(m.token || ''));
      if (!d || d.done || (d.a && d.b)) return tx(ws, { t: 'err', m: 'Invitation expirée' });
      d[d.a ? 'b' : 'a'] = ws; ws.duo = d;
      if (d.a && d.b) {
        d.done = true; duos.delete(m.token);
        const opp = queue2.splice(0, 2).filter(w => w.readyState === 1); // des joueurs aléatoires en attente deviennent leurs adversaires, sinon des bots
        makeRoom2([d.a, d.b, ...opp], true);
      }
      return;
    }
    if (m.t === 'hello' || m.t === 'friends') { // amis : enregistre le profil public, renvoie les profils demandés
      registerProfile(m.me);
      if (m.t === 'hello') return;
      const codes = (Array.isArray(m.list) ? m.list : []).slice(0, 50).map(c => String(c).toUpperCase());
      return tx(ws, { t: 'friends', list: codes.filter(c => profiles[c]).map(c => ({ ...profiles[c], on: !!(presence.get(c) && presence.get(c).readyState === 1) })), missing: codes.filter(c => !profiles[c]) });
    }
    if (m.t === 'training_list' && !ws.room) {
      tx(ws, { t: 'chars', chars: getChars() });
    } else if (m.t === 'train' && !ws.room && CH[m.c] && avail(m.c, admOk(ws, m))) {
      const roomCode = 'TRAIN_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const r = { code: roomCode, ps: [ws], ph: 'training', sel: [m.c, 0], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: 0, sk: ['', ''], again: [0, 0], co: [0, 0], training: true };
      rooms.set(r.code, r);
      ws.room = r; ws.idx = 0;
      startTraining(r, m.c, m.sk);
      join(ws);
    } else if (m.t === 'training_reset') {
      const r = ws.room;
      if (r && r.training && ws.idx === 0) startTraining(r, r.sel[0], r.sk[0]);
    } else if (m.t === 'adv' && !ws.room) { // mode aventure : combat de l'histoire contre un bot, lancé directement
      if (Date.now() < ADV_FROM && !admOk(ws, m)) return tx(ws, { t: 'err', m: 'Le mode aventure ouvre lundi à 00h01 !' });
      const F = ADV[String(m.f || '')]; if (!F) return tx(ws, { t: 'err', m: 'Combat inconnu' });
      const pc = CH.findIndex(c => c.name === F.p), oc = CH.findIndex(c => c.name === F.o);
      const r = { code: newCode(), ps: [ws], ph: 'select', sel: [pc, oc], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: -1, sk: [String(m.sk || '').slice(0, 40), ''], again: [0, 1], co: [0, 0], bot: true, bots: [false, true], lvl: F.lvl, adv: 1, need: 1, noUlt: F.noUlt, fixMap: F.map };
      rooms.set(r.code, r); ws.room = r; ws.idx = 0; join(ws); start(r);
    } else if (m.t === 'bot' && !ws.room) {
      const r = { code: newCode(), ps: [ws], ph: 'select', sel: [null, rndC()], wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: -1, sk: ['', ''], again: [0, 1], co: [0, 0], bot: true, bots: [false, true], lvl: [0, 1, 2].includes(+m.lvl) ? +m.lvl : 1 };
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
    } else if (m.t === 'queue2' && !ws.room && !queue2.includes(ws)) { // 2v2 aléatoire
      ws.qt = Date.now(); queue2.push(ws); pumpQ2();
    } else if (m.t === 'join' && !ws.room) {
      const r = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!r || r.ps.length > 1) return tx(ws, { t: 'err', m: 'Code invalide ou partie pleine' });
      r.ps.push(ws); ws.room = r; ws.idx = 1; r.ph = 'select'; join(ws); tx(r.ps[0], { t: 'room', code: r.code, idx: 0, chars: getChars(), maps: MAPS.map(({ n, note }) => ({ n, note })) });
    } else if (m.t === 'pick') {
      const r = ws.room;
      if (r && r.ph === 'select' && CH[m.c] && avail(m.c, admOk(ws, m))) { r.sel[ws.idx] = m.c; r.sk[ws.idx] = String(m.sk || '').slice(0, 40); if (r.sel.every(v => v != null)) { r.wins = [0, 0]; start(r); } }
    } else if (m.t === 'again') {
      const r = ws.room; if (r && r.ph === 'end') r.again[ws.idx] = 1;
    } else if (m.t === 'in') {
      const r = ws.room;
      if (r && r.f[ws.idx]) r.f[ws.idx].inp = { l: +!!m.l, r: +!!m.r, u: +!!m.u, d: +!!m.d, a: [0, 1, 2, 3].map(k => +!!(m.a && m.a[k])) };
    }
  });
  ws.on('close', () => {
    const qi = queue.indexOf(ws); if (qi >= 0) queue.splice(qi, 1);
    const q2i = queue2.indexOf(ws); if (q2i >= 0) queue2.splice(q2i, 1);
    if (ws.pcode && presence.get(ws.pcode) === ws) presence.delete(ws.pcode);
    for (const v of [...invites.values()]) {
      if (v.fw === ws) { invites.delete(v.id); tx(v.tw, { t: 'invite_end', id: v.id }); }
      else if (v.tw === ws) { invites.delete(v.id); tx(v.fw, { t: 'invite_res', ok: 0, m: 'Cet ami s’est déconnecté' }); }
    }
    if (ws.duo && !ws.duo.done) { const o = ws.duo.a === ws ? ws.duo.b : ws.duo.a; ws.duo.done = true; if (o) tx(o, { t: 'err', m: 'Ton ami s’est déconnecté' }); }
    const r = ws.room; if (!r) return;
    if (r.two) { // 2v2 : le joueur qui part est remplacé par un bot, la partie continue pour les autres
      r.ps = r.ps.filter(p => p !== ws); r.bots[ws.idx] = true; r.again[ws.idx] = 1;
      if (r.sel[ws.idx] == null) r.sel[ws.idx] = rndC();
      if (!r.ps.length) rooms.delete(r.code);
      return;
    }
    rooms.delete(r.code);
    r.ps.forEach(p => { if (p !== ws) { tx(p, { t: 'err', m: 'Adversaire déconnecté' }); p.room = null; } });
  });
});

// ===== MATCHMAKING 2v2 : 4 joueurs -> départ immédiat ; sinon, après 15 s d'attente, les places libres sont prises par des bots =====
function makeRoom2(humans, fixed) {
  if (!fixed) for (let k = humans.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [humans[k], humans[j]] = [humans[j], humans[k]]; } // équipes au hasard
  const bots = [true, true, true, true], sel = [0, 1, 2, 3].map(() => rndC());
  humans.forEach((w, k) => { bots[k] = false; sel[k] = null; w.idx = k; }); // 1-2 joueurs : même équipe (bleue) contre 2 bots
  const r = { code: newCode(), ps: humans.slice(), two: true, bots, ph: 'select', sel, wins: [0, 0], f: [], pj: [], fx: [], t: 0, tm: 0, msg: '', mi: -1, sk: ['', '', '', ''], again: bots.map(b => b ? 1 : 0), co: [0, 0, 0, 0], lvl: 1, selT: 0 };
  rooms.set(r.code, r);
  humans.forEach(w => { w.room = r; join(w); });
}
function pumpQ2() {
  for (let k = queue2.length - 1; k >= 0; k--) if (queue2[k].readyState !== 1) queue2.splice(k, 1);
  while (queue2.length >= 4) makeRoom2(queue2.splice(0, 4));
  if (queue2.length && Date.now() - queue2[0].qt >= Q2_WAIT) makeRoom2(queue2.splice(0, 4));
  queue2.forEach(w => tx(w, { t: 'queued2', n: queue2.length, left: Math.max(0, Math.ceil((Q2_WAIT - (Date.now() - queue2[0].qt)) / 1000)) }));
}
setInterval(pumpQ2, 1000);
setInterval(() => { // nettoyage : invitations sans réponse, paires qui n'ont pas pu se rejoindre
  const now = Date.now();
  for (const v of [...invites.values()]) if (v.exp < now) { invites.delete(v.id); tx(v.fw, { t: 'invite_res', ok: 0, m: 'Pas de réponse à ton invitation' }); tx(v.tw, { t: 'invite_end', id: v.id }); }
  for (const [k, d] of [...duos]) if (d.exp < now) { duos.delete(k); d.done = true; [d.a, d.b].forEach(w => w && tx(w, { t: 'err', m: 'Ton ami n’a pas pu rejoindre la partie' })); }
}, 1000);

setInterval(() => rooms.forEach(tick), 1000 / 60);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Duel Arena sur http://localhost:' + PORT));
