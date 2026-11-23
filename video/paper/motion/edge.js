// Motion layer for "How to read an EDGE certificate" (GSAP, seeked frame by frame).
// One hero shape never cuts: a ring sweeps to 20%, then 40%, closes, becomes a sun (renewables),
// then a tick (the audited final certificate). Headlines are split into letters that rise out of a mask.
window.buildMotion = ({ gsap, SplitText, at, SC, T, fx, E }) => {
  const C = { ink: '#1F2A24', forest: '#1D4636', terra: '#C5623B', ochre: '#DDA53C', sand: '#F1D9A0', white: '#FBF7EE', moss: '#7F9C5C' };
  fx.innerHTML = `
  <style>
    #fx .gh{position:absolute;left:82px;top:300px;width:920px;font:900 150px/1.0 Fraunces;letter-spacing:-1px}
    #fx .gh i{display:block;font-style:italic}
    #fx .gh div{padding:0 .06em .22em 0;margin-bottom:-.22em}  /* room for descenders inside the line masks */
    #fx .on-art{color:${C.white};text-shadow:0 8px 30px rgba(8,22,15,.55)}
    #fx .on-art i{color:${C.sand}} #fx .on-paper{color:${C.forest}} #fx .on-paper i{color:${C.terra}}
    #fx .on-forest{color:${C.white}} #fx .on-forest i{color:${C.sand}}
  </style>
  <svg id="hsvg" width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;inset:0;overflow:visible">
    <defs><filter id="ps" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="4" dy="12" stdDeviation="12" flood-color="#0c1811" flood-opacity=".35"/></filter></defs>
    <g id="hero" filter="url(#ps)">
      <circle id="disc" r="176" fill="${C.forest}" fill-opacity=".9"/>
      <circle id="track" r="200" fill="none" stroke="${C.white}" stroke-opacity=".22" stroke-width="44"/>
      <circle id="ring" r="200" fill="none" stroke="${C.ochre}" stroke-width="44" stroke-linecap="round" transform="rotate(-90)"/>
      <path id="blob" d="M200,0 A200,200 0 1,1 -200,0 A200,200 0 1,1 200,0Z" fill="${C.ochre}"/>
      <text id="num" text-anchor="middle" y="44" font-family="Fraunces" font-weight="900" font-size="132" fill="${C.white}">≥0%</text>
    </g>
    <path id="u1" d="M92,668 C240,650 420,684 600,660 S820,652 880,664" fill="none" stroke="${C.terra}" stroke-width="10" stroke-linecap="round"/>
  </svg>`;
  const tl = gsap.timeline({ paused: true });
  const st = i => SC[i].t0c, end = i => (SC[i + 1] ? SC[i + 1].t0 : T.end) - .45;

  // headlines: letters rise out of a mask with a slight tilt, and leave the same way
  const heads = [[0, 'How to read', 'an EDGE certificate.', 'on-art'], [1, 'Three', 'savings.', 'on-paper'], [2, 'EDGE', 'Certified.', 'on-forest'],
    [3, '≥40%', 'energy.', 'on-art'], [4, 'Plus', 'renewables.', 'on-paper'], [5, 'Not just', 'the badge.', 'on-paper'], [6, 'Prediction', 'vs proof.', 'on-art']];
  for (const [i, a, b, cls] of heads) {
    const el = document.createElement('div'); el.className = 'gh ' + cls; el.innerHTML = `${a}<i>${b}</i>`; fx.appendChild(el);
    let fs = 150; el.style.fontSize = fs + 'px';
    for (const ln of [a, b]) { const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:italic 900 150px Fraunces'; m.textContent = ln; fx.appendChild(m); fs = Math.min(fs, 150 * 900 / m.offsetWidth); m.remove(); }
    el.style.fontSize = Math.floor(fs) + 'px';  // sized to the real width of the longest line
    const sp = SplitText.create(el, { type: 'lines,chars', mask: 'lines' });
    const t0 = Math.max(.15, st(i) + .1), t1 = end(i);
    tl.set(el, { autoAlpha: 0 }, 0).set(el, { autoAlpha: 1 }, t0 - .01)  // visible only inside its own scene
      .from(sp.chars, { yPercent: 115, opacity: 0, rotate: 7, duration: .6, ease: 'back.out(1.7)', stagger: .022 }, t0)
      .to(sp.chars, { yPercent: -115, opacity: 0, duration: .32, ease: 'power2.in', stagger: .008 }, t1)
      .set(el, { autoAlpha: 0 }, t1 + .5);
    E(t0, 'paper');
  }

  // the hero shape's journey
  const ring = '#ring', hero = '#hero', blob = '#blob', num = '#num', track = '#track';
  const P = { v: 0 }; let pct = 0;
  gsap.set(hero, { x: 540, y: 1010, scale: 0, transformOrigin: '50% 50%' }); gsap.set(ring, { drawSVG: '0% 0%' }); gsap.set(blob, { opacity: 0 }); gsap.set(num, { opacity: 0 });
  gsap.set('#u1', { drawSVG: '0% 0%' });
  const s2 = at('To be certified'), s3 = at('EDGE Advanced'), s4 = at('And EDGE Zero Carbon'), s5 = at('So read the three'), s6 = at('One more thing');
  tl.to(hero, { scale: 1, duration: .7, ease: 'back.out(1.8)' }, s2 + .1)
    .to(num, { opacity: 1, duration: .2 }, at('at least 20 percent') - .4)
    .to(ring, { drawSVG: '0% 20%', duration: 1.1, ease: 'power3.out' }, at('at least 20 percent') - .4)
    .to(P, { v: 20, duration: 1.1, ease: 'power3.out' }, '<')
    .to(hero, { x: 790, y: 1130, scale: .62, duration: .8, ease: 'power3.inOut' }, s3 - .3)
    .to(ring, { drawSVG: '0% 40%', stroke: C.terra, duration: 1.1, ease: 'power3.out' }, at('40 percent') - .3)
    .to(P, { v: 40, duration: 1.1, ease: 'power3.out' }, '<')
    .to(hero, { x: 540, y: 1060, scale: .9, duration: .8, ease: 'power3.inOut' }, s4 - .3)
    .to(ring, { drawSVG: '0% 100%', stroke: C.moss, duration: .9, ease: 'power2.inOut' }, at('renewable energy') - .2)
    .to(P, { v: 100, duration: .9, ease: 'power2.inOut' }, '<')
    .to([ring, track, num, '#disc'], { opacity: 0, duration: .3 }, '>-.05')
    .set(blob, { fill: C.ochre }, '<')
    .to(blob, { opacity: 1, duration: .25 }, '<')
    .to(blob, { morphSVG: sun(), rotate: 30, duration: .9, ease: 'back.out(1.4)' }, '<.1')
    .to(hero, { x: 870, y: 1170, scale: .45, duration: .8, ease: 'power3.inOut' }, s5 - .2)
    .to('#u1', { drawSVG: '0% 100%', duration: .7, ease: 'power2.out' }, at('not just the badge'))
    .to('#u1', { opacity: 0, duration: .3 }, end(5))
    .to(hero, { x: 820, y: 1170, scale: .7, duration: .8, ease: 'power3.inOut' }, s6 - .2)
    .to(blob, { morphSVG: tick(), rotate: 0, fill: C.forest, duration: .8, ease: 'back.out(1.6)' }, at('auditor checked') - .1)
    .to(hero, { scale: 0, duration: .4, ease: 'power2.in' }, T.end - .5);
  E(s2 + .1, 'tock'); E(at('at least 20 percent') + .7, 'chime'); E(at('40 percent') + .8, 'chime'); E(at('renewable energy') + .7, 'chime');
  E(at('auditor checked') + .2, 'chime'); E(at('not just the badge'), 'scratch', .6);

  function sun() { let d = ''; for (let k = 0; k < 24; k++) { const a = k / 24 * 2 * Math.PI, r = k % 2 ? 140 : 205; d += (k ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1); } return d + 'Z'; }
  function tick() { return 'M-170,10 L-105,-55 L-40,10 L115,-145 L180,-80 L-40,140 Z'; }
  return { tl, update() { const v = Math.round(P.v); if (v !== pct) { pct = v; document.getElementById('num').textContent = (v >= 100 ? '' : '≥') + v + '%'; } } };
};
