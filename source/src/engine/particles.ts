// Partikel-Objekt zeichnen: Zehntausende feiner, leuchtender Staubkörner auf der Oberfläche eines Körpers, die auf
// den Beat auseinanderfliegen. Ein instanzierter Aufruf; jedes Korn ist ein kleines, zur Kamera gedrehtes Quadrat
// mit weichem (gaußförmigem) Licht. Die Körner addieren ihr Licht in einem Zwischenbild mit hoher Genauigkeit;
// beim Übertragen ins Ziel läuft Helles weich aus statt hart weiß auszufressen. Dichte Stellen (der Rand einer
// Kugel) leuchten so heller, wie bei echtem Staub im Licht. Eigene Formeln, keine Fremdshader.
import {
  PARTICLE_DEFAULT_COUNT, PARTICLE_MAX, PARTICLE_MODES, PARTICLE_CLIP_PREFIX, PARTICLE_OBJECTS, BassEnvelope, bassTarget, builtinMesh, explodeState, isModelClip, modelIdOf,
  particleAngles, particleRandoms, particleSolid, sampleSurface, defaultParticles, type ParticleObject, type ParticleSettings,
} from "../core/particles";
import { decodePointCloud } from "../core/meshfile";
import { buildRenderMesh, meshParts, type RenderMesh } from "../core/rendermesh";

const VS = `#version 300 es
layout(location=0) in vec2 aC;
layout(location=1) in vec3 aP0; layout(location=2) in vec3 aN0;
layout(location=3) in vec3 aP1; layout(location=4) in vec3 aN1;
layout(location=5) in vec4 aR;
layout(location=6) in vec4 aK0; layout(location=7) in vec4 aK1;
uniform mat4 uProj; uniform mat3 uRot; uniform float uDist, uScale;
uniform vec4 uRegion;
uniform vec2 uOff;
uniform float uMorph, uHitT, uHitAmp, uHitRet, uPulseT, uPulseAmp, uHold, uHoldVel, uScatter, uRad;
/** Höhe des ganzen Ziels in Pixeln und kleinster Radius in Pixeln. */
uniform float uVpH, uMinPx;
/** Form deckend (1) und Durchgang: 0 = deckende Fläche (nur ruhende Körner), 1 = Staub (der Rest). */
uniform highp int uSolid, uPass;
/** Der Körper wird als echtes Netz gezeichnet (dann zeichnen ruhende Körner nichts); Formwechsel: alles Staub. */
uniform int uHasMesh, uMorphing;
/** Radius, mit dem ruhende Körner die Oberfläche lückenlos decken (Welt-Einheiten vor uScale). */
uniform float uCoverR;
/** Verhalten: 0 Partikel, 1 Schmelzen, 2 Jelly, 3 Auflösen, 4 Verdrehen, 5 Zersplittern, 6 ohne. Anstieg in Beats, Zeit in s. */
uniform highp int uMode;
uniform float uAtk, uTime;
out vec2 vQ;
flat out float vShade;
/** Fläche: Normale im Bild-Raum, Glanz (nass, Jelly) und Glut (Kante beim Auflösen). */
flat out vec3 vN;
flat out float vGloss, vEmber;
flat out float vEnergy;
flat out float vFog;
flat out vec4 vCol;
flat out float vR;
float env(float t, float ret){
  const float a = 0.12;
  if (t < 0.0) return 0.0;
  if (t < a) { float x = 1.0 - t / a; return 1.0 - x*x*x; }
  float r = clamp((t - a) / ret, 0.0, 1.0); return 1.0 - r*r*(3.0 - 2.0*r);
}
float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// Zerfall wie in Profi-Werkzeugen: ein Rauschfeld über dem Körper (dazu ein Verlauf von oben links), eine Kante
// wandert hindurch. Körper (Fragment) und Körner (Ecke) rechnen dasselbe Feld, darum kommen die Körner genau
// dort heraus, wo sich die Fläche auflöst.
float dfield(vec3 P){
  float n = vnoise(P * 1.5) * 0.72 + vnoise(P * 4.2 + 3.1) * 0.28;
  float s = 0.5 - dot(P.xy, normalize(vec2(-0.5, 0.85))) * 0.42;
  return n * 0.45 + s * 0.55;
}
// Explosion: nur Rauschen (kein Verlauf), der Körper bricht überall zugleich in Brocken auf
float bfield(vec3 P){ return vnoise(P * 1.8) * 0.7 + vnoise(P * 4.6 + 7.0) * 0.3; }

// Wirbelnde Strömung (aus Sinus-Feldern, ähnlich Curl-Noise): treibt die Körner nach dem Ablösen davon
vec3 swirl(vec3 p){
  return vec3(sin(p.y * 2.1 + cos(p.z * 1.7)) + 0.5 * sin(p.z * 3.7 + p.x),
              sin(p.z * 2.3 + cos(p.x * 1.9)) + 0.5 * sin(p.x * 3.1 + p.y),
              sin(p.x * 1.9 + cos(p.y * 2.2)) + 0.5 * sin(p.y * 3.3 + p.z));
}
// Weite je Korn: die meisten wenig, wenige weit (sonst verdeckt die Wolke die Form)
float reach(){ return 0.3 + pow(fract(aR.x * 13.37 + aR.w * 7.91), 10.0) * 5.0; }
/** Weite durch Sprengen (Auslöser, Halten, Bass), ohne den kleinen Puls auf den Zwischen-Beats. */
float burst(){ return (uHitAmp * env(uHitT - aR.x * 0.12, uHitRet) + max(0.0, uHold)) * reach() * 0.7; }
/** Hüllkurve mit weichem Anstieg (atk Beats) und Rückkehr (ret Beats). */
float env2(float t, float atk, float ret){
  if (t < 0.0) return 0.0;
  if (t < atk) { float x = t / atk; return x * x * (3.0 - 2.0 * x); }
  float r = clamp((t - atk) / ret, 0.0, 1.0); return 1.0 - r * r * (3.0 - 2.0 * r);
}
/** Stärke eines Effekts 0–1 für dieses Korn (versetzt um lag Beats), aus Auslöser, Halten oder Bass. */
float amount(float lag){ return clamp(uHitAmp * env2(uHitT - lag, uAtk, uHitRet) + max(0.0, uHold), 0.0, 1.5); }
// Verlauf der Explosion 0…1 unabhängig von der Weite (die Weite bestimmt nur, wie weit die Körner fliegen)
float bprog(float lag){ return max(uHitAmp > 0.0 ? env2(uHitT - lag, uAtk, uHitRet) : 0.0, clamp(uHold * 2.5, 0.0, 1.0)); }
vec2 rot2(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
vec3 disp(vec3 D){
  float e = uHitAmp * env(uHitT - aR.x * 0.12, uHitRet) * reach()
          + uPulseAmp * env(uPulseT - aR.x * 0.06, 0.55) * (0.4 + aR.z * 0.8)
          + max(0.0, uHold) * reach();
  return D * e * 0.7;
}
void main(){
  float m = smoothstep(0.0, 1.0, clamp((uMorph - aR.w * 0.45) / 0.55, 0.0, 1.0));
  vec3 P = mix(aP0, aP1, m);
  vec3 Nn = mix(aN0, aN1, m); Nn = length(Nn) < 1e-3 ? normalize(aN1 + vec3(1e-3)) : normalize(Nn);
  P += Nn * sin(3.14159 * m) * (0.2 + aR.y * 0.4);
  vec3 J = aR.yzw * 2.0 - 1.0;
  vec3 D = normalize(Nn * (1.0 - uScatter * 0.6) + J * uScatter + vec3(1e-4));
  // Verhalten: Partikel zerfällt zu Staub (Körper-Raum, entlang der Oberfläche); alle anderen verformen den Körper
  // als Ganzes (glatte Felder über die Lage, kein Zufall je Korn), damit die Fläche zusammenhängend bleibt.
  float fly = 0.0, stretch = 1.0;
  vGloss = 0.25; vEmber = 0.0;
  vec3 Po = P;
  vec3 No = Nn;
  if (uMode == 5) {
    // Zersplittern: Körper in Stücke (Zellen im Körper-Raum); jedes Stück dreht sich um seine Mitte und fliegt fest davon
    float m = min(amount(0.0), 1.2);
    vec3 cell = floor(P * 2.2 + 0.5);
    vec3 hs = fract(sin(vec3(dot(cell, vec3(12.99, 78.23, 37.72)), dot(cell, vec3(39.35, 11.13, 83.15)), dot(cell, vec3(73.16, 52.24, 9.15)))) * 43758.55);
    vec3 cen = cell / 2.2;
    vec3 ax = normalize(hs - 0.5 + vec3(1e-3));
    float ang = m * (hs.x - 0.5) * 5.0;
    vec3 rel = P - cen;
    // Drehung um die Achse ax (Rodrigues)
    rel = rel * cos(ang) + cross(ax, rel) * sin(ang) + ax * dot(ax, rel) * (1.0 - cos(ang));
    No = No * cos(ang) + cross(ax, No) * sin(ang) + ax * dot(ax, No) * (1.0 - cos(ang));
    Po = cen + rel + normalize(cen + (hs - 0.5) * 0.7 + vec3(1e-3)) * m * (0.6 + hs.y * 1.1);
    vGloss = 0.4;
  }
  vec3 Q = uRot * Po * uScale;
  vec3 Nv = normalize(uRot * No);
  // Partikel: die Kante wandert durch den Körper; jedes Korn löst sich, wenn sie es erreicht, glüht kurz auf und
  // treibt mit der Strömung davon (wird dabei kleiner und blasser). Rückweg: alles in umgekehrter Reihenfolge.
  float relAge = 0.0;
  if (uMode == 0) {
    // Partikel (Explosion): der Körper bricht in Brocken auf (Rauschfeld), die Körner schießen heraus, werden
    // langsamer, wirbeln in der Strömung und kehren mit der Rückkehr an ihren Platz zurück
    float rel = clamp((bprog(aR.x * 0.06) * 1.5 - 0.2 - bfield(P)) / 0.2, 0.0, 1.0);
    if (rel > 0.0) {
      float b = burst();
      vec3 flow = swirl(P * 1.4 + vec3(0.0, uTime * 0.3, 0.0) + aR.xyz * 0.7);
      Q += uRot * (disp(D) + flow * 0.22 * b) * uScale * rel;
      fly = max(rel, 0.06);
    }
  } else if (uMode == 7) {
    float a = clamp(amount(0.0), 0.0, 1.0);
    float thr = a * 1.25 + 0.08;
    relAge = clamp((thr - dfield(P)) / 0.45, 0.0, 1.0);
    if (relAge > 0.0) {
      float k = relAge * relAge * (0.9 + fract(aR.y * 7.7) * 1.4);
      vec3 flow = swirl(P * 1.6 + vec3(0.0, uTime * 0.25, 0.0) + aR.xyz * 0.6);
      vec3 offO = (Nn * 0.45 + flow * 0.55 + (aR.yzw - 0.5) * 0.5) * k * 1.6;
      Q += uRot * offO * uScale;
      Q.y += k * 0.6 * uScale;
      fly = 1.0;
    }
  }
  float rnd = fract(aR.y * 3.17 + aR.w * 5.31);
  float yN = clamp(Q.y / max(uScale, 1e-3), -1.3, 1.3);
  // glattes Rauschen über die Lage (für Tropfen und die Kante beim Auflösen)
  float nz = sin(P.x * 5.1 + 1.3) * sin(P.y * 4.3 + P.z * 3.7) * 0.5 + sin(P.z * 6.7 - P.x * 2.9) * 0.25;
  if (uMode == 1) {
    // Schmelzen: der Körper gibt von oben nach, sackt zu einer dicken Masse zusammen, tropft an einzelnen Stellen
    // herab und zerfließt unten zu einer Pfütze (leicht von oben gesehen); beim Zurückkehren wächst er wieder auf
    float m = min(amount(0.0), 1.0);
    float floorY = -1.1 * uScale;
    float h = max(Q.y - floorY, 0.0);
    float hn = clamp(h / (2.2 * uScale), 0.0, 1.0);
    float drip = smoothstep(0.2, 0.7, nz + 0.35);
    // oben sinkt es mehr als unten; Tropfstellen hängen tiefer nach unten durch
    float sag = m * (0.35 + 0.5 * hn);
    float newH = h * (1.0 - sag);
    newH -= drip * m * (1.0 - m * 0.6) * 0.6 * uScale * (0.3 + hn);
    newH = max(newH, 0.0);
    // unten breiter (die Masse läuft aus), stärker, je tiefer und je weiter geschmolzen
    float low = 1.0 - clamp(newH / (1.3 * uScale), 0.0, 1.0);
    float spread = 1.0 + m * m * 1.1 * low * low;
    stretch = 1.0 + m * 0.5 + (spread - 1.0) * 0.8;
    Q.xz *= spread;
    Q.y = floorY + newH;
    // Pfütze leicht von oben: was vorne liegt, rückt im Bild nach unten
    Q.y -= Q.z * 0.35 * m * low;
    // Nasse Fläche: oben glatt nach oben gerichtet, Glanz steigt
    Nv = normalize(mix(Nv, vec3(0.0, 1.0, 0.2), m * (0.4 + 0.5 * low)));
    vGloss = 0.4 + m * 1.0;
  } else if (uMode == 2) {
    // Jelly: geschlossen wabbeln, stauchen und nachschwingen (1,5 Schwinger je Beat, klingt mit der Rückkehr ab)
    float t = max(uHitT, 0.0);
    float A = uHitAmp * exp(-t * 1.1 / max(uHitRet, 0.25)) + uPulseAmp * 2.5 * exp(-max(uPulseT, 0.0) * 4.0);
    float osc = cos(t * 6.2832 * 1.5);
    if (uHold > 0.0) { A += uHold; osc = cos(uTime * 6.2832 * 1.4); }
    float sq = A * osc * 0.45;
    // Stauchen von unten (der Boden bleibt, oben schwingt es), dazu Wellen über die Oberfläche
    float base = -1.0 * uScale;
    Q.y = base + (Q.y - base) * (1.0 - sq); Q.xz *= 1.0 + sq * 0.55;
    stretch = 1.0 + abs(sq) * 0.6;
    Q += Nv * uScale * 0.09 * A * sin(dot(P, vec3(4.1, 5.3, 3.7)) - (uHold > 0.0 ? uTime * 9.0 : t * 18.0));
    vGloss = 1.0;
  } else if (uMode == 3) {
    // Auflösen: eine Kante wandert von oben nach unten durch den Körper; darüber steigt er als Rauch auf, an der Kante glüht es
    float m = min(amount(0.0), 1.0);
    float d = (yN + nz * 0.35) - (1.45 - 2.9 * m);
    if (d > 0.0) {
      float a = clamp(d, 0.0, 1.2);
      Q.y += a * a * (1.0 + rnd * 1.3) * uScale;
      Q.xz = rot2(Q.xz, a * (1.2 + rnd * 2.0));
      Q.x += sin(uTime * 0.9 + rnd * 12.0 + Q.y * 2.0) * 0.3 * a * uScale;
      fly = 1.0;
    }
    vEmber = m > 0.0 ? smoothstep(-0.16, 0.0, d) * step(d, 0.0) : 0.0;
  } else if (uMode == 4) {
    // Verdrehen: der Körper verwindet sich wie ein ausgewrungenes Tuch (oben gegen unten), Fläche bleibt zu
    float m = min(amount(0.0), 1.2);
    float ang = m * 2.6 * yN;
    Q.xz = rot2(Q.xz, ang);
    Nv.xz = rot2(Nv.xz, ang);
    Q.x += m * sin(yN * 1.6) * 0.15 * uScale;
    stretch = 1.0 + m * 0.25;
    vGloss = 0.45;
  }
  Q.z -= uDist;
  // Deckend: ruhende Körner bilden die Fläche, erst weggeflogene werden Staub (jedes Korn für sich)
  bool solid = uSolid == 1 && fly < 0.05 && uMorphing == 0;
  if ((uPass == 0) != solid || (solid && uHasMesh == 1)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vN = Nv;
  vShade = 0.38 + 0.62 * max(dot(Nv, normalize(vec3(-0.5, 0.8, 0.9))), 0.0);
  if (solid) {
    float r = max(uRad, uCoverR) * uScale * stretch;
    vEnergy = 1.0; vFog = 1.0;
    vQ = vec2(aC.x, aC.y * 2.0 - 1.0);
    vCol = mix(aK0, aK1, m); vR = aR.x;
    vec4 c = uProj * vec4(Q + vec3(vQ * r, 0.0), 1.0);
    c.xy += uOff * c.w;
    c.xy = (c.xy - uRegion.xy * c.w) / uRegion.zw;
    gl_Position = c;
    return;
  }
  // Größe je Korn: viele feine, wenige größere; etwa 2 % weiche große Körner, dafür schwächer
  float rr = fract(aR.y * 5.73 + aR.z * 2.11);
  float big = step(0.98, fract(aR.w * 9.17 + aR.x * 3.31));
  float r = uRad * uScale * (0.45 + 1.1 * rr * rr) * (1.0 + big * 2.5) * (uMode == 7 ? mix(1.0, 0.45, relAge) : 1.0);
  // Kleiner als ein Pixel: nicht größer, sondern schwächer zeichnen (gleiche Lichtmenge, kein Flimmern beim Drehen)
  float px = r * uProj[1][1] / max(-Q.z, 1e-3) * uVpH * 0.5;
  float grow = max(1.0, uMinPx / max(px, 1e-4));
  vEnergy = (1.0 - big * 0.7) / (grow * grow) * (uMode == 3 ? 1.0 - 0.5 * fly : 1.0);
  // gerade abgelöst: hell (Glut der Kante), dann blasser und kleiner
  if (uMode == 7 && relAge > 0.0) vEnergy *= mix(1.7, 0.3, relAge);
  // Explosion: im Moment des Aufbrechens hell (Blitz), dann normal
  if (uMode == 0 && fly > 0.0) vEnergy *= 1.0 + 1.3 * exp(-max(uHitT, 0.0) * 5.0);
  r *= grow;
  // Tiefe: hinten etwas blasser
  vFog = mix(1.0, 0.55, clamp((-Q.z - (uDist - 1.1 * uScale)) / (2.2 * uScale + 1e-3), 0.0, 1.0));
  vQ = vec2(aC.x, aC.y * 2.0 - 1.0);
  vec3 w = Q + vec3(vQ * r, 0.0);
  vCol = mix(aK0, aK1, m); vR = aR.x;
  vec4 c = uProj * vec4(w, 1.0);
  c.xy += uOff * c.w;
  // Nur den Ausschnitt um das Objekt rechnen (spart Speicher bei breiten Leinwänden)
  c.xy = (c.xy - uRegion.xy * c.w) / uRegion.zw;
  gl_Position = c;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vQ;
flat in float vEnergy;
flat in float vFog;
flat in vec4 vCol;
flat in float vR;
flat in float vShade;
flat in vec3 vN;
flat in float vGloss, vEmber;
uniform highp int uPass;
uniform int uColorMode; uniform vec3 uColA, uColB, uBase; uniform vec3 uPal[5]; uniform int uPalN;
uniform float uHue, uGain;
out vec4 o;
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
void main(){
  float d2 = dot(vQ, vQ);
  if (d2 >= 1.0) discard;
  // Weiches Licht, am Rand genau 0
  float g = (exp(-d2 * 4.0) - 0.0183) / 0.9817;
  vec3 b = uBase;
  if (uColorMode == 0) { if (vCol.a > 0.5) b = vCol.rgb; }
  else if (uColorMode == 1) b = uColA;
  else if (uColorMode == 2) b = mix(uColA, uColB, vR);
  else if (uColorMode == 3) b = hue(vR + uHue);
  else { int i = int(floor(vR * float(uPalN))); b = uPal[clamp(i, 0, 4)]; }
  if (uPass == 0) {
    // Deckende Fläche: Farbe des Modells (bzw. Farbmodus), beleuchtet nach der Ausrichtung der Fläche
    vec3 sb = uColorMode == 0 && vCol.a <= 0.5 ? vec3(0.82, 0.84, 0.88) : b;
    // Licht der Fläche: diffus, Glanz und Randlicht je nach Material (nass beim Schmelzen, Jelly), Glut beim Auflösen
    vec3 n = normalize(vN), L = normalize(vec3(-0.5, 0.8, 0.9));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 24.0) * vGloss;
    float rim = pow(1.0 - max(n.z, 0.0), 3.0) * vGloss * 0.5;
    vec3 c = sb * (0.3 + 0.7 * diff) + vec3(spec * 0.7) + sb * rim + vec3(1.0, 0.42, 0.1) * vEmber * 2.2;
    o = vec4(c, 1.0);
    return;
  }
  float bright = 0.5 + 0.5 * fract(vR * 7.31 + 0.13);
  o = vec4(b * (g * bright * vEnergy * vFog * uGain), 0.0);
}`;

/** Zwischenbild an seinen Platz im Ziel: Helles weich auslaufen lassen; Overlay: Deckkraft aus der Helligkeit. */
const CVS = `#version 300 es
void main(){ gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0); }`;
const CFS = `#version 300 es
precision highp float;
uniform sampler2D uC;
uniform vec2 uO;
uniform int uKey;
out vec4 o;
float sh(float x){ return x < 0.75 ? x : 0.75 + 0.25 * (1.0 - exp(-(x - 0.75) / 0.25)); }
void main(){
  vec4 t = texelFetch(uC, ivec2(gl_FragCoord.xy - uO), 0);
  vec3 c = vec3(sh(t.r), sh(t.g), sh(t.b));
  // Overlay: deckende Fläche voll (Alpha 1 aus dem Zwischenbild), Staub nach seiner Helligkeit
  float a = uKey == 1 ? clamp(max(t.a, max(c.r, max(c.g, c.b))), 0.0, 1.0) : 1.0;
  o = vec4(c, a);
}`;

// ---- Der Körper als echtes Netz -------------------------------------------------------------------------
// Gleiche Verhalten wie bei den Körnern, aber auf den Ecken des Modells; Licht im Fragment-Shader: weiches
// Hauptlicht, Fülllicht, Gegenlicht, Himmel/Boden und eine Studio-Spiegelung, Glanz nach GGX mit Fresnel
// (eigene Umsetzung der üblichen Formeln). Partikel und Auflösen schneiden Löcher, Zersplittern trennt Stücke.
const MVS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol; layout(location=3) in vec2 aUv;
layout(location=4) in vec4 aCell; layout(location=5) in vec4 aPart;
uniform mat4 uProj; uniform mat3 uRot; uniform float uDist, uScale;
uniform vec4 uRegion; uniform vec2 uOff;
uniform highp int uMode;
uniform float uHitT, uHitAmp, uHitRet, uPulseT, uPulseAmp, uHold, uAtk, uTime;
out vec3 vObj; out vec3 vN; out vec3 vV; out vec4 vColM; out vec2 vUvM; out float vYN; out float vMelt;
flat out vec3 vCell;
float env2(float t, float atk, float ret){
  if (t < 0.0) return 0.0;
  if (t < atk) { float x = t / atk; return x * x * (3.0 - 2.0 * x); }
  float r = clamp((t - atk) / ret, 0.0, 1.0); return 1.0 - r * r * (3.0 - 2.0 * r);
}
float amount(){ return clamp(uHitAmp * env2(uHitT, uAtk, uHitRet) + max(0.0, uHold), 0.0, 1.5); }
vec2 rot2(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
void main(){
  vec3 P = aPos, Po = aPos, No = aNrm;
  // Stück aus der Mitte des eigenen Dreiecks (beim Laden festgelegt): Dreiecke bleiben beim Zersplittern ganz
  vec3 cell = aCell.xyz;
  if (uMode == 5) {
    float m = min(amount(), 1.2);
    // Teilobjekte (Buchstaben, Schmetterling …) fliegen als Ganzes; nur ein großer Hauptkörper bricht in Zellen
    bool part = aPart.w >= 0.0;
    vec3 seed = part ? vec3(aPart.w * 97.0, aPart.w * 31.0, aPart.w * 57.0) : cell;
    vec3 hs = fract(sin(vec3(dot(seed, vec3(12.99, 78.23, 37.72)), dot(seed, vec3(39.35, 11.13, 83.15)), dot(seed, vec3(73.16, 52.24, 9.15)))) * 43758.55);
    vec3 cen = part ? aPart.xyz : cell / 2.2, ax = normalize(hs - 0.5 + vec3(1e-3));
    if (part) cell = vec3(floor(aPart.w * 1000.0), 0.0, 0.0);
    float ang = m * (hs.x - 0.5) * (part ? 3.2 : 5.0);
    vec3 rel = P - cen;
    rel = rel * cos(ang) + cross(ax, rel) * sin(ang) + ax * dot(ax, rel) * (1.0 - cos(ang));
    No = No * cos(ang) + cross(ax, No) * sin(ang) + ax * dot(ax, No) * (1.0 - cos(ang));
    Po = cen + rel + normalize(cen + (hs - 0.5) * 0.7 + vec3(1e-3)) * m * (0.6 + hs.y * 1.1);
  }
  vec3 Q = uRot * Po * uScale, Nv = normalize(uRot * No);
  float yN = clamp(Q.y / max(uScale, 1e-3), -1.3, 1.3);
  float nz = sin(P.x * 5.1 + 1.3) * sin(P.y * 4.3 + P.z * 3.7) * 0.5 + sin(P.z * 6.7 - P.x * 2.9) * 0.25;
  vMelt = 0.0;
  if (uMode == 1) {
    float m = min(amount(), 1.0);
    float floorY = -1.1 * uScale, h = max(Q.y - floorY, 0.0), hn = clamp(h / (2.2 * uScale), 0.0, 1.0);
    float drip = smoothstep(0.2, 0.7, nz + 0.35);
    float newH = h * (1.0 - m * (0.35 + 0.5 * hn)) - drip * m * (1.0 - m * 0.6) * 0.6 * uScale * (0.3 + hn);
    newH = max(newH, 0.0);
    float low = 1.0 - clamp(newH / (1.3 * uScale), 0.0, 1.0);
    Q.xz *= 1.0 + m * m * 1.1 * low * low;
    Q.y = floorY + newH - Q.z * 0.35 * m * low;
    Nv = normalize(mix(Nv, vec3(0.0, 1.0, 0.2), m * (0.4 + 0.5 * low)));
    vMelt = m;
  } else if (uMode == 2) {
    float t = max(uHitT, 0.0);
    float A = uHitAmp * exp(-t * 1.1 / max(uHitRet, 0.25)) + uPulseAmp * 2.5 * exp(-max(uPulseT, 0.0) * 4.0);
    float osc = cos(t * 6.2832 * 1.5);
    if (uHold > 0.0) { A += uHold; osc = cos(uTime * 6.2832 * 1.4); }
    float sq = A * osc * 0.45, base = -1.0 * uScale;
    Q.y = base + (Q.y - base) * (1.0 - sq); Q.xz *= 1.0 + sq * 0.55;
    Q += Nv * uScale * 0.09 * A * sin(dot(P, vec3(4.1, 5.3, 3.7)) - (uHold > 0.0 ? uTime * 9.0 : t * 18.0));
  } else if (uMode == 4) {
    float m = min(amount(), 1.2), ang = m * 2.6 * yN;
    Q.xz = rot2(Q.xz, ang); Nv.xz = rot2(Nv.xz, ang);
    Q.x += m * sin(yN * 1.6) * 0.15 * uScale;
  }
  vObj = P; vN = Nv; vCell = cell; vYN = yN;
  vColM = aCol; vUvM = aUv;
  vec3 V = Q - vec3(0.0, 0.0, uDist);
  vV = V;
  vec4 c = uProj * vec4(V, 1.0);
  c.xy += uOff * c.w;
  c.xy = (c.xy - uRegion.xy * c.w) / uRegion.zw;
  gl_Position = c;
}`;

const MFS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec3 vObj; in vec3 vN; in vec3 vV; in vec4 vColM; in vec2 vUvM; in float vYN; in float vMelt;
flat in vec3 vCell;
uniform highp int uMode;
uniform int uHasCol, uHasTex, uColorMode, uPalN;
uniform sampler2DArray uTex;
uniform vec3 uColA, uColB; uniform vec3 uPal[5];
uniform float uHue, uHitT, uHitAmp, uHitRet, uHold, uAtk;
out vec4 o;
float env2(float t, float atk, float ret){
  if (t < 0.0) return 0.0;
  if (t < atk) { float x = t / atk; return x * x * (3.0 - 2.0 * x); }
  float r = clamp((t - atk) / ret, 0.0, 1.0); return 1.0 - r * r * (3.0 - 2.0 * r);
}
float amount(){ return clamp(uHitAmp * env2(uHitT, uAtk, uHitRet) + max(0.0, uHold), 0.0, 1.5); }
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// GGX-Verteilung und Schlick-Fresnel
float dfield(vec3 P){
  float n = vnoise(P * 1.5) * 0.72 + vnoise(P * 4.2 + 3.1) * 0.28;
  float s = 0.5 - dot(P.xy, normalize(vec2(-0.5, 0.85))) * 0.42;
  return n * 0.45 + s * 0.55;
}
// Explosion: nur Rauschen (kein Verlauf), der Körper bricht überall zugleich in Brocken auf
float bfield(vec3 P){ return vnoise(P * 1.8) * 0.7 + vnoise(P * 4.6 + 7.0) * 0.3; }
// Verlauf der Explosion 0…1 unabhängig von der Weite (die Weite bestimmt nur, wie weit die Körner fliegen)
float bprog(float lag){ return max(uHitAmp > 0.0 ? env2(uHitT - lag, uAtk, uHitRet) : 0.0, clamp(uHold * 2.5, 0.0, 1.0)); }
float ggx(float nh, float a){ float a2 = a * a, d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }
float fres(float c, float f0){ return f0 + (1.0 - f0) * pow(1.0 - c, 5.0); }
void main(){
  float ember = 0.0;
  if (uMode == 3) {
    // Auflösen: Kante wandert von oben nach unten, darüber ist der Körper weg (steigt als Staub auf), an der Kante Glut
    float m = min(amount(), 1.0);
    float nz = sin(vObj.x * 5.1 + 1.3) * sin(vObj.y * 4.3 + vObj.z * 3.7) * 0.5 + sin(vObj.z * 6.7 - vObj.x * 2.9) * 0.25 + (vnoise(vObj * 9.0) - 0.5) * 0.25;
    float d = (vYN + nz * 0.35) - (1.45 - 2.9 * m);
    if (m > 0.0 && d > 0.0) discard;
    ember = m > 0.0 ? smoothstep(-0.14, 0.0, d) : 0.0;
  }
  float glowEdge = 0.0;
  if (uMode == 0) {
    // Partikel (Explosion): wo die Körner herausschießen, bricht der Körper auf; die Bruchkanten glühen kurz
    float pr = bprog(0.0);
    if (pr > 0.001) {
      float thr = pr * 1.5 - 0.2, d = bfield(vObj);
      if (d < thr) discard;
      glowEdge = (1.0 - smoothstep(0.0, 0.03, d - thr)) * 0.8;
    }
  }
  if (uMode == 7) {
    // Verwehen: dieselbe wandernde Kante wie bei den Körnern; davor ist der Körper weg, an der Kante glüht er
    float a = clamp(amount(), 0.0, 1.0);
    if (a > 0.001) {
      float thr = a * 1.25 + 0.08, d = dfield(vObj);
      if (d < thr) discard;
      glowEdge = 1.0 - smoothstep(0.0, 0.035, d - thr);
    }
  }
  // Grundfarbe: Textur, Modellfarbe oder die Farbquelle der Ebene
  vec3 al = vec3(0.8, 0.81, 0.84);
  if (uColorMode == 0) {
    if (uHasCol == 1) al = vColM.rgb;
    // OBJ zählt v von unten, die Textur liegt mit der obersten Zeile zuerst: v umdrehen
    if (uHasTex == 1 && vColM.a < 0.99) al *= texture(uTex, vec3(vUvM.x, 1.0 - vUvM.y, floor(vColM.a * 255.0 + 0.5))).rgb;
  } else if (uColorMode == 1) al = uColA;
  else if (uColorMode == 2) al = mix(uColB, uColA, clamp(vYN * 0.5 + 0.5, 0.0, 1.0));
  else if (uColorMode == 3) al = hue(vYN * 0.35 + uHue);
  else { int i = int(floor(vnoise(vObj * 2.0) * float(uPalN) * 0.999)); al = uPal[clamp(i, 0, 4)]; }
  // Material je Verhalten: Rauheit und Durchscheinen
  // eher matt (satiniert): Glanz nur weich und schwach; nass beim Schmelzen, Jelly etwas glatter
  float rough = 0.62, wrap = 0.15;
  if (uMode == 1) rough = mix(0.62, 0.32, clamp(vMelt * 1.5, 0.0, 1.0));
  if (uMode == 2) { rough = 0.3; wrap = 0.5; }
  if (uMode == 5) rough = 0.55;
  vec3 N = normalize(vN), V = normalize(-vV);
  if (dot(N, V) < 0.0) N = -N;
  float nv = max(dot(N, V), 1e-3);
  vec3 c = vec3(0.0);
  // Licht: Haupt (warm), Füll (kühl), Gegenlicht
  vec3 Ld[3]; Ld[0] = normalize(vec3(-0.45, 0.55, 0.85)); Ld[1] = normalize(vec3(0.8, 0.15, 0.5)); Ld[2] = normalize(vec3(0.1, 0.45, -1.0));
  vec3 Lc[3]; Lc[0] = vec3(1.0, 0.97, 0.93) * 3.0; Lc[1] = vec3(0.75, 0.85, 1.0) * 0.7; Lc[2] = vec3(1.0) * 1.6;
  float a2 = rough * rough;
  for (int i = 0; i < 3; i++) {
    vec3 L = Ld[i], H = normalize(L + V);
    float nl = max((dot(N, L) + wrap) / (1.0 + wrap), 0.0), nh = max(dot(N, H), 0.0);
    float F = fres(max(dot(H, V), 0.0), 0.04);
    float spec = min(ggx(nh, max(a2, 0.02)) * F / (4.0 * max(nv, 0.15) * max(dot(N, L), 0.15)) * max(dot(N, L), 0.0), 1.2) * 0.6;
    c += Lc[i] * (al * (1.0 - F) * nl / 3.14159 + spec);
  }
  // Himmel und Boden, dazu die Spiegelung eines Studios (helles Dachfenster, Horizont)
  float up = N.y * 0.5 + 0.5;
  c += al * mix(vec3(0.08, 0.075, 0.07), vec3(0.26, 0.27, 0.3), up);
  vec3 R = reflect(-V, N);
  vec3 envc = mix(vec3(0.03), vec3(0.18, 0.2, 0.24), smoothstep(-0.2, 0.6, R.y)) + vec3(1.4) * smoothstep(0.75, 0.95, R.y) + vec3(0.5) * exp(-abs(R.y) * 12.0);
  c += envc * fres(nv, 0.04) * (1.0 - rough) * 0.45;
  if (uMode == 2) c += al * 0.18 * pow(1.0 - nv, 2.0);
  c += vec3(1.0, 0.42, 0.1) * ember * 3.0;
  // glühende Kante beim Zerfall: in der Farbe des Körpers, zur Mitte hin fast weiß
  c += (al * 2.6 + vec3(0.12)) * glowEdge * glowEdge;
  o = vec4(c, 1.0);
}`;

interface GpuMesh { vao: WebGLVertexArrayObject; n: number; bufs: WebGLBuffer[]; tex: WebGLTexture | null; hasCol: boolean }
interface PObj { pts: WebGLBuffer; col: WebGLBuffer | null; n: number; mesh: GpuMesh | null }
/** Zwischenbild für das Licht der Körner (Gleitkomma, wenn die Grafikkarte es kann). */
interface Glow {
  /** Mehrfach abgetastet (geglättete Kanten des Körpers): Farbe und Tiefe; aufgelöst in fb/tex. */
  msFb: WebGLFramebuffer; msColor: WebGLRenderbuffer; msDepth: WebGLRenderbuffer;
  fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number; used: number;
}
/** Ziel der Engine (Textur + Framebuffer). */
export interface PTarget { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number }

export interface ParticleFrame {
  /** Zeit der Ebene in Sekunden (mit Ebenen-Tempo). */
  time: number;
  beat: number;
  /** Farbmodus wie bei den Generatoren: 0 Original, 1 Slot, 2 Verlauf, 3 Regenbogen, 4 mehrere Slots. */
  colorMode: number;
  colA: readonly number[]; colB: readonly number[];
  pal: readonly (readonly number[])[];
  /** Overlay-Ebene: Hintergrund durchsichtig. Basis: schwarz. */
  key: boolean;
  /** Lage wie bei allen Visuals (Laser-Regler): Verschiebung -1…1, Größe, Drehung in Grad. */
  x: number; y: number; size: number; rot: number;
  /** Bass-Pegel 0–1 aus echtem Audio (Eingang oder LJ-Link), 0 ohne Audio. */
  bass: number;
  /** Tempo (für die Rückkehrzeit beim Bass-Auslöser). */
  bpm: number;
}

const FOV = 32 * Math.PI / 180, DIST = 5.6;

function persp(asp: number): Float32Array {
  const f = 1 / Math.tan(FOV / 2), n = 0.3, far = 30;
  return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, 2 * far * n / (n - far), 0]);
}

/** Drehung Y (Drehteller), dann Neigung X, dann Rollen Z (Spalten-Major für uniformMatrix3fv). */
function rotation(ay: number, ax: number, az: number): Float32Array {
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az);
  // R = Rz * Rx * Ry
  const rxy = [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy];
  const out = new Float32Array(9);
  for (let c = 0; c < 3; c++) {
    const x = rxy[c * 3]!, y = rxy[c * 3 + 1]!, z = rxy[c * 3 + 2]!;
    out[c * 3] = cz * x - sz * y; out[c * 3 + 1] = sz * x + cz * y; out[c * 3 + 2] = z;
  }
  return out;
}

export class ParticleRenderer {
  private prog: WebGLProgram;
  private u = new Map<string, WebGLUniformLocation | null>();
  private quad: WebGLBuffer;
  private rand: WebGLBuffer;
  private objs = new Map<string, PObj | "loading" | "failed">();
  private vaos = new Map<string, WebGLVertexArrayObject>();
  private glow: Glow[] = [];
  private morph = new Map<string, { cur: string; prev: string; since: number }>();
  /** Bass-Hüllkurve je Ebene bzw. Vorschau. */
  private bassEnv = new Map<string, BassEnvelope>();
  /** Gleitkomma-Zwischenbild möglich (sonst 8 Bit: Licht wird bei 1 abgeschnitten). */
  private floatOk: boolean;
  /** Punktwolke eines eigenen Modells laden (Standard: aus der Bibliothek über vjmedia://model/<id>). */
  loadModel: (id: string) => Promise<ArrayBuffer | null> = async id => {
    try { const r = await fetch(`vjmedia://model/${id}`); return r.ok ? await r.arrayBuffer() : null; } catch { return null; }
  };
  /** Wird aufgerufen, wenn ein Modell geladen ist (z. B. um Vorschaubilder neu zu zeichnen). */
  onLoaded: () => void = () => {};

  constructor(private gl: WebGL2RenderingContext) {
    const vs = gl.createShader(gl.VERTEX_SHADER)!, fs = gl.createShader(gl.FRAGMENT_SHADER)!, p = gl.createProgram()!;
    gl.shaderSource(vs, VS); gl.compileShader(vs);
    gl.shaderSource(fs, FS); gl.compileShader(fs);
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    this.prog = p;
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, 1, 0, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.rand = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rand);
    gl.bufferData(gl.ARRAY_BUFFER, particleRandoms(PARTICLE_MAX), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.floatOk = !!gl.getExtension("EXT_color_buffer_float");
    const cvs = gl.createShader(gl.VERTEX_SHADER)!, cfs = gl.createShader(gl.FRAGMENT_SHADER)!, cp = gl.createProgram()!;
    gl.shaderSource(cvs, CVS); gl.compileShader(cvs);
    gl.shaderSource(cfs, CFS); gl.compileShader(cfs);
    gl.attachShader(cp, cvs); gl.attachShader(cp, cfs); gl.linkProgram(cp);
    this.comp = cp;
    this.emptyVao = gl.createVertexArray()!;
    const mvs = gl.createShader(gl.VERTEX_SHADER)!, mfs = gl.createShader(gl.FRAGMENT_SHADER)!, mp = gl.createProgram()!;
    gl.shaderSource(mvs, MVS); gl.compileShader(mvs);
    gl.shaderSource(mfs, MFS); gl.compileShader(mfs);
    gl.attachShader(mp, mvs); gl.attachShader(mp, mfs); gl.linkProgram(mp);
    this.mprog = mp;
    if (!gl.getProgramParameter(mp, gl.LINK_STATUS)) console.error("Körper-Shader:", gl.getShaderInfoLog(mvs), gl.getShaderInfoLog(mfs), gl.getProgramInfoLog(mp));
    this.samples = Math.max(1, Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number));
  }
  private mprog: WebGLProgram;
  private mu = new Map<string, WebGLUniformLocation | null>();
  private mloc(name: string): WebGLUniformLocation | null {
    if (!this.mu.has(name)) this.mu.set(name, this.gl.getUniformLocation(this.mprog, name));
    return this.mu.get(name)!;
  }
  private samples: number;
  /** Körper als Netz hochladen (Lage+Normale, Farbe/Ebene, UV, Indizes, Texturen als Textur-Array). */
  private uploadMesh(m: RenderMesh): GpuMesh {
    const gl = this.gl, vao = gl.createVertexArray()!, bufs: WebGLBuffer[] = [];
    gl.bindVertexArray(vao);
    const attr = (data: ArrayBufferView, loc: number, size: number, type: number, norm: boolean) => {
      const b = gl.createBuffer()!; bufs.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0);
    };
    attr(m.pos, 0, 3, gl.FLOAT, false);
    attr(m.nrm, 1, 3, gl.FLOAT, false);
    if (m.col) attr(m.col, 2, 4, gl.UNSIGNED_BYTE, true); else gl.disableVertexAttribArray(2);
    if (m.uv) attr(m.uv, 3, 2, gl.FLOAT, false); else gl.disableVertexAttribArray(3);
    attr(m.cell, 4, 4, gl.BYTE, false);
    attr(meshParts(m), 5, 4, gl.FLOAT, false);
    const ib = gl.createBuffer()!; bufs.push(ib);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    let tex: WebGLTexture | null = null;
    if (m.tex.length && m.texSize) {
      tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
      gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, m.texSize, m.texSize, m.tex.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      m.tex.forEach((t, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, m.texSize, m.texSize, 1, gl.RGBA, gl.UNSIGNED_BYTE, t));
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    }
    return { vao, n: m.idx.length, bufs, tex, hasCol: !!m.col };
  }
  private comp: WebGLProgram;
  private emptyVao: WebGLVertexArrayObject;

  private ok: boolean | null = null;
  /** Shader übersetzt? (Fehler einmal melden.) */
  private ready(): boolean {
    if (this.ok !== null) return this.ok;
    const gl = this.gl;
    this.ok = !!gl.getProgramParameter(this.prog, gl.LINK_STATUS) && !!gl.getProgramParameter(this.comp, gl.LINK_STATUS) && !!gl.getProgramParameter(this.mprog, gl.LINK_STATUS);
    if (!this.ok) console.error("Partikel-Shader:", gl.getProgramInfoLog(this.prog), gl.getProgramInfoLog(this.comp));
    return this.ok;
  }

  private loc(name: string): WebGLUniformLocation | null {
    if (!this.u.has(name)) this.u.set(name, this.gl.getUniformLocation(this.prog, name));
    return this.u.get(name)!;
  }

  /** Schlüssel des Körpers zu einem Clip („pobj-cross“ bzw. „mdl:<id>“). */
  private obj(clip: string): PObj | null {
    const have = this.objs.get(clip);
    if (have === "loading" || have === "failed") return null;
    if (have) return have;
    const gl = this.gl;
    const upload = (pts: Float32Array, col: Uint8Array | null, n: number, mesh: RenderMesh | null | undefined): PObj => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
      let c: WebGLBuffer | null = null;
      if (col) { c = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, c); gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW); }
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      return { pts: b, col: c, n, mesh: mesh ? this.uploadMesh(mesh) : null };
    };
    if (isModelClip(clip)) {
      this.objs.set(clip, "loading");
      void this.loadModel(modelIdOf(clip)).then(buf => {
        const pc = buf ? decodePointCloud(buf) : null;
        if (!pc) { this.objs.set(clip, "failed"); return; }
        // Ältere Modelle (vor Version 2) haben kein Netz: dann zeigen die Körner die Fläche wie bisher
        this.objs.set(clip, upload(pc.pts, pc.col, pc.n, pc.mesh));
        this.onLoaded();
      });
      return null;
    }
    const o = clip.slice(PARTICLE_CLIP_PREFIX.length) as ParticleObject;
    if (!PARTICLE_OBJECTS.includes(o)) return null;
    const pts = sampleSurface(builtinMesh(o), PARTICLE_MAX);
    if (!pts) { this.objs.set(clip, "failed"); return null; }
    const p = upload(pts, null, PARTICLE_MAX, buildRenderMesh({ pos: builtinMesh(o).pos }));
    this.objs.set(clip, p);
    return p;
  }

  /** Ist der Körper geladen (bzw. endgültig nicht ladbar)? Startet das Laden, falls nötig. */
  objectReady(clip: string): boolean {
    if (this.obj(clip)) return true;
    return this.objs.get(clip) === "failed";
  }

  /** Eigenes Modell vergessen (gelöscht oder ersetzt). */
  forget(clip: string): void {
    const o = this.objs.get(clip);
    if (o && typeof o === "object") {
      this.gl.deleteBuffer(o.pts); if (o.col) this.gl.deleteBuffer(o.col);
      if (o.mesh) { this.gl.deleteVertexArray(o.mesh.vao); for (const b of o.mesh.bufs) this.gl.deleteBuffer(b); if (o.mesh.tex) this.gl.deleteTexture(o.mesh.tex); }
      for (const [k, v] of this.vaos) if (k.split("|").includes(clip)) { this.gl.deleteVertexArray(v); this.vaos.delete(k); }
    }
    this.objs.delete(clip);
  }

  /** Zeichenzustand für ein Paar (Formwechsel von → zu). */
  private vao(a: string, A: PObj, b: string, B: PObj): WebGLVertexArrayObject {
    const key = `${a}|${b}`;
    const have = this.vaos.get(key);
    if (have) return have;
    const gl = this.gl, v = gl.createVertexArray()!;
    gl.bindVertexArray(v);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const pts = (buf: WebGLBuffer, lp: number, ln: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(lp, 1);
      gl.enableVertexAttribArray(ln); gl.vertexAttribPointer(ln, 3, gl.FLOAT, false, 24, 12); gl.vertexAttribDivisor(ln, 1);
    };
    pts(A.pts, 1, 2); pts(B.pts, 3, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rand);
    gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(5, 1);
    const col = (buf: WebGLBuffer | null, l: number) => {
      if (buf) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.UNSIGNED_BYTE, true, 0, 0); gl.vertexAttribDivisor(l, 1);
      } else gl.disableVertexAttribArray(l);
    };
    col(A.col, 6); col(B.col, 7);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // Höchstens einige Paare behalten
    if (this.vaos.size > 24) { const [k0, v0] = this.vaos.entries().next().value as [string, WebGLVertexArrayObject]; gl.deleteVertexArray(v0); this.vaos.delete(k0); }
    this.vaos.set(key, v);
    return v;
  }

  /** Zwischenbild in passender Größe (wenige im Speicher): mehrfach abgetastet zum Zeichnen, aufgelöst zum Übertragen. */
  private target(w: number, h: number): Glow {
    const gl = this.gl;
    let m = this.glow.find(x => x.w === w && x.h === h);
    if (m) { m.used = performance.now(); return m; }
    const fmt = this.floatOk ? gl.RGBA16F : gl.RGBA8;
    // Große Flächen: weniger Abtastungen (Speicher)
    const samples = w * h > 4.2e6 ? Math.min(2, this.samples) : this.samples;
    const make = (f: number) => {
      const msFb = gl.createFramebuffer()!, msColor = gl.createRenderbuffer()!, msDepth = gl.createRenderbuffer()!;
      gl.bindRenderbuffer(gl.RENDERBUFFER, msColor); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, f, w, h);
      gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, msFb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);
      return { msFb, msColor, msDepth, ok: gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE };
    };
    let ms = make(fmt), useFmt = fmt;
    if (!ms.ok && fmt !== gl.RGBA8) {
      gl.deleteFramebuffer(ms.msFb); gl.deleteRenderbuffer(ms.msColor); gl.deleteRenderbuffer(ms.msDepth);
      ms = make(gl.RGBA8); useFmt = gl.RGBA8;
    }
    const tex = gl.createTexture()!, fb = gl.createFramebuffer()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, useFmt, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    m = { msFb: ms.msFb, msColor: ms.msColor, msDepth: ms.msDepth, fb, tex, w, h, used: performance.now() };
    this.glow.push(m);
    // Alte Größen freigeben (Fenster verkleinert, Vorschau gewechselt)
    if (this.glow.length > 3) {
      this.glow.sort((a, b) => b.used - a.used);
      for (const x of this.glow.splice(3)) { gl.deleteFramebuffer(x.msFb); gl.deleteRenderbuffer(x.msColor); gl.deleteRenderbuffer(x.msDepth); gl.deleteFramebuffer(x.fb); gl.deleteTexture(x.tex); }
    }
    return m;
  }

  /**
   * Ebene mit Partikel-Objekt in `dst` zeichnen. `fbKey` unterscheidet Ebenen und Vorschauen (Formwechsel).
   * Gibt false zurück, solange das Objekt noch lädt.
   */
  render(dst: PTarget, clip: string, fbKey: string, settings: ParticleSettings | undefined, f: ParticleFrame): boolean {
    if (!this.ready()) return false;
    const cur = this.obj(clip);
    if (!cur) return false;
    const gl = this.gl, p = settings ?? defaultParticles();
    // Formwechsel: Clip der Ebene wechselt von einem Partikel-Objekt zum nächsten
    let st = this.morph.get(fbKey);
    if (!st) { st = { cur: clip, prev: clip, since: -1e9 }; this.morph.set(fbKey, st); }
    if (st.cur !== clip) { st.prev = st.cur; st.cur = clip; st.since = f.beat; }
    let morphAmt = Math.min(1, Math.max(0, (f.beat - st.since) / 1.5));
    let prevKey = st.prev, prev = prevKey === clip ? cur : this.obj(prevKey);
    if (!prev || morphAmt >= 1) { prev = cur; prevKey = clip; morphAmt = 1; }
    const n = Math.min(cur.n, prev.n, Math.round(p.count * 1000));
    if (n <= 0) return false;

    const { w, h } = dst;
    // Ausschnitt um das Objekt (in Pixeln): Höhe bzw. Breite nach Größe, mit Rand für die Explosion
    const scale = Math.max(0.05, f.size);
    // Schmelzen läuft unten aus, Auflösen steigt auf, Splitter fliegen weit: dafür mehr Rand
    const span = Math.ceil(h * Math.min(3, (p.mode === "melt" || p.mode === "dissolve" || p.mode === "shatter" ? 2.6 : 1.75) * scale));
    const cx = (0.5 + f.x * 0.5) * w, cy = (0.5 + f.y * 0.5) * h;
    const x0 = Math.max(0, Math.floor(cx - span / 2)), x1 = Math.min(w, Math.ceil(cx + span / 2));
    const y0 = Math.max(0, Math.floor(cy - span / 2)), y1 = Math.min(h, Math.ceil(cy + span / 2));
    // Ziel leeren (durchsichtig bei Overlay, sonst schwarz)
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, f.key ? 0 : 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const rw = x1 - x0, rh = y1 - y0;
    if (rw < 2 || rh < 2) return true;
    const ms = this.target(rw, rh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, ms.msFb);
    gl.viewport(0, 0, rw, rh);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.loc("uProj"), false, persp(w / h));
    // Drehung je Achse: feste Lage plus Drehtempo; dazu Rollen aus dem Regler „Drehung“ der Lage
    const an = particleAngles(p, f.time);
    gl.uniformMatrix3fv(this.loc("uRot"), false, rotation(an.y, an.x, an.z + f.rot * Math.PI / 180));
    gl.uniform1f(this.loc("uDist"), DIST);
    gl.uniform1f(this.loc("uScale"), scale);
    gl.uniform2f(this.loc("uOff"), f.x, f.y);
    // Ausschnitt in NDC: Mitte und halbe Größe
    gl.uniform4f(this.loc("uRegion"), ((x0 + x1) / w) - 1, ((y0 + y1) / h) - 1, rw / w, rh / h);
    gl.uniform1f(this.loc("uMorph"), morphAmt);
    const ex = explodeState(p, f.beat);
    gl.uniform1f(this.loc("uHitT"), ex.since); gl.uniform1f(this.loc("uHitAmp"), ex.amp); gl.uniform1f(this.loc("uHitRet"), ex.ret);
    gl.uniform1f(this.loc("uPulseT"), ex.pulseSince); gl.uniform1f(this.loc("uPulseAmp"), ex.pulseAmp);
    gl.uniform1i(this.loc("uMode"), Math.max(0, PARTICLE_MODES.indexOf(p.mode ?? "burst")));
    gl.uniform1f(this.loc("uAtk"), Math.max(0.05, ex.atk));
    gl.uniform1f(this.loc("uTime"), f.time);
    let hold = ex.hold;
    if (p.trigger === "bass") {
      let env = this.bassEnv.get(fbKey);
      if (!env) { env = new BassEnvelope(); this.bassEnv.set(fbKey, env); }
      const b = env.step(bassTarget(p, f.bass), performance.now(), p.ret, f.bpm);
      hold = b.value;
    }
    gl.uniform1f(this.loc("uHold"), hold);
    gl.uniform1f(this.loc("uScatter"), Math.min(1, Math.max(0, p.scatter)));
    gl.uniform1f(this.loc("uRad"), 0.0115 * p.size);
    gl.uniform1f(this.loc("uVpH"), h);
    gl.uniform1f(this.loc("uMinPx"), 1.0);
    // Mehr Körner = feiner, nicht greller: Helligkeit je Korn mit der Anzahl ausgleichen (Vorgabe 40 Tsd. = 1)
    gl.uniform1f(this.loc("uGain"), Math.min(1.6, Math.sqrt(PARTICLE_DEFAULT_COUNT / Math.max(5, p.count))));
    gl.uniform1i(this.loc("uColorMode"), f.colorMode);
    gl.uniform3f(this.loc("uColA"), f.colA[0]!, f.colA[1]!, f.colA[2]!);
    gl.uniform3f(this.loc("uColB"), f.colB[0]!, f.colB[1]!, f.colB[2]!);
    // Ohne Farbe: kühles Weiß wie Staub im Scheinwerfer
    gl.uniform3f(this.loc("uBase"), 0.78, 0.88, 1.0);
    const pal = new Float32Array(15);
    f.pal.slice(0, 5).forEach((c, i) => pal.set(c.slice(0, 3), i * 3));
    gl.uniform3fv(this.loc("uPal"), pal);
    gl.uniform1i(this.loc("uPalN"), Math.max(1, Math.min(5, f.pal.length)));
    gl.uniform1f(this.loc("uHue"), f.time * 0.05);
    // Ohne Farben im Modell: feste Vorgabe (gilt nur für abgeschaltete Attribute, Zustand des Kontexts)
    gl.vertexAttrib4f(6, 0, 0, 0, 0); gl.vertexAttrib4f(7, 0, 0, 0, 0);
    const solid = particleSolid(p, clip);
    gl.uniform1i(this.loc("uSolid"), solid ? 1 : 0);
    // Ruhende Körner decken die Oberfläche lückenlos: Abstand der Körner aus ihrer Anzahl (Körper auf Radius 1 normiert)
    gl.uniform1f(this.loc("uCoverR"), 2.4 / Math.sqrt(n));
    // Der Körper als echtes Netz (nicht beim Formwechsel zwischen zwei Körpern: der läuft über die Körner)
    const morphing = morphAmt < 1;
    const mesh = solid && !morphing ? cur.mesh : null;
    gl.uniform1i(this.loc("uHasMesh"), mesh ? 1 : 0);
    gl.uniform1i(this.loc("uMorphing"), morphing ? 1 : 0);
    if (mesh) {
      gl.useProgram(this.mprog);
      const M = (n: string) => this.mloc(n);
      gl.uniformMatrix4fv(M("uProj"), false, persp(w / h));
      gl.uniformMatrix3fv(M("uRot"), false, rotation(an.y, an.x, an.z + f.rot * Math.PI / 180));
      gl.uniform1f(M("uDist"), DIST); gl.uniform1f(M("uScale"), scale); gl.uniform2f(M("uOff"), f.x, f.y);
      gl.uniform4f(M("uRegion"), ((x0 + x1) / w) - 1, ((y0 + y1) / h) - 1, rw / w, rh / h);
      gl.uniform1i(M("uMode"), Math.max(0, PARTICLE_MODES.indexOf(p.mode ?? "burst")));
      gl.uniform1f(M("uHitT"), ex.since); gl.uniform1f(M("uHitAmp"), ex.amp); gl.uniform1f(M("uHitRet"), ex.ret);
      gl.uniform1f(M("uPulseT"), ex.pulseSince); gl.uniform1f(M("uPulseAmp"), ex.pulseAmp);
      gl.uniform1f(M("uHold"), hold); gl.uniform1f(M("uAtk"), Math.max(0.05, ex.atk)); gl.uniform1f(M("uTime"), f.time);
      gl.uniform1i(M("uColorMode"), f.colorMode);
      gl.uniform3f(M("uColA"), f.colA[0]!, f.colA[1]!, f.colA[2]!); gl.uniform3f(M("uColB"), f.colB[0]!, f.colB[1]!, f.colB[2]!);
      gl.uniform3fv(M("uPal"), pal); gl.uniform1i(M("uPalN"), Math.max(1, Math.min(5, f.pal.length))); gl.uniform1f(M("uHue"), f.time * 0.05);
      gl.uniform1i(M("uHasCol"), mesh.hasCol ? 1 : 0); gl.uniform1i(M("uHasTex"), mesh.tex ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, mesh.tex); gl.uniform1i(M("uTex"), 0);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND);
      gl.bindVertexArray(mesh.vao);
      if (!mesh.hasCol) gl.vertexAttrib4f(2, 1, 1, 1, 1);
      gl.drawElements(gl.TRIANGLES, mesh.n, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
      gl.useProgram(this.prog);
    }
    gl.bindVertexArray(this.vao(prevKey, prev, clip, cur));
    if (solid && !mesh) {
      // 1. Durchgang: deckende Fläche mit Tiefe
      gl.uniform1i(this.loc("uPass"), 0);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    // 2. Durchgang: Staub addiert sein Licht (hinter der Fläche verdeckt, untereinander durchscheinend)
    gl.uniform1i(this.loc("uPass"), 1);
    if (solid) { gl.enable(gl.DEPTH_TEST); gl.depthMask(false); } else gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    gl.depthMask(true); gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    // Glättung auflösen
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, ms.msFb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, ms.fb);
    gl.blitFramebuffer(0, 0, rw, rh, 0, 0, rw, rh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    // An seinen Platz im Ziel (Overlay: Deckkraft aus der Helligkeit)
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(x0, y0, rw, rh);
    gl.useProgram(this.comp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ms.tex);
    gl.uniform1i(gl.getUniformLocation(this.comp, "uC"), 0);
    gl.uniform1i(gl.getUniformLocation(this.comp, "uKey"), f.key ? 1 : 0);
    gl.uniform2f(gl.getUniformLocation(this.comp, "uO"), x0, y0);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.viewport(0, 0, w, h);
    return true;
  }

  /** Formwechsel-Zustand einer Vorschau vergessen. */
  reset(fbKey: string): void { this.morph.delete(fbKey); }
}
