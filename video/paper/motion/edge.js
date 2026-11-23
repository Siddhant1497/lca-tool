// Motion layer for "How to read an EDGE certificate" (GSAP, seeked frame by frame), in the natural Paper Earth look:
// a twig wreath that grows leaves as the saving climbs (20% -> 40% -> 100%), a kraft-paper number tag,
// a layered paper sun for renewables, drifting paper leaves on the plain pages, and an auditor's ink stamp at the end.
// Every shape gets a hand-cut edge and paper grain from SVG filters.
window.buildMotion = ({ gsap, SplitText, at, SC, T, fx, E }) => {
  const C = { ink: '#1F2A24', forest: '#1D4636', terra: '#C5623B', ochre: '#DDA53C', sand: '#F1D9A0', white: '#FBF7EE', moss: '#7F9C5C',
    leaf1: '#6F9452', leaf2: '#4E7A4F', leaf3: '#A3B86C', twig: '#6B4F3A', kraft: '#E2CB9A' };
  const NL = 22, leafD = 'M0,0 C9,-13 27,-14 38,0 C27,14 9,13 0,0Z';
  let leaves = '';
  for (let i = 0; i < NL; i++) {
    const f = (i + .5) / NL, a = f * 360 - 90, out = i % 2 ? 1 : -1, col = [C.leaf1, C.leaf2, C.leaf3][i % 3];
    leaves += `<g transform="rotate(${a}) translate(200,0) rotate(${90 + out * 38})"><path class="lf" data-f="${f}" d="${leafD}" fill="${col}"/></g>`;
  }
  let drift = '';
  for (let i = 0; i < 5; i++) drift += `<path class="dl" d="M0,0 C14,-20 42,-21 58,0 C42,21 14,20 0,0Z M6,0 L52,0" fill="${[C.leaf1, C.leaf3, C.leaf2][i % 3]}" stroke="${C.forest}" stroke-opacity=".35" stroke-width="2"/>`;
  fx.innerHTML = `
  <style>
    #fx .gh{position:absolute;left:82px;top:300px;font:900 150px/1.0 Fraunces;letter-spacing:-1px;white-space:nowrap}
    #fx .gh i{display:block;font-style:italic}
    #fx .gh div{padding:0 .06em .22em 0;margin-bottom:-.22em}
    #fx .on-art{color:${C.white};text-shadow:0 8px 30px rgba(8,22,15,.55)} #fx .on-art i{color:${C.sand}}
    #fx .on-paper{color:${C.forest}} #fx .on-paper i{color:${C.terra}} #fx .on-forest{color:${C.white}} #fx .on-forest i{color:${C.sand}}
    #fx .card{position:absolute;top:740px;width:400px;height:340px;border-radius:14px;background:#FBF7EE;box-shadow:6px 18px 34px rgba(12,24,17,.28);padding:26px 28px;box-sizing:border-box;filter:url(#grain)}
    #fx .card h4{margin:0 0 18px;font:800 26px Inter;letter-spacing:5px;color:${C.white};background:${C.terra};padding:12px 16px;border-radius:8px}
    #fx .card p{margin:0;font:700 54px/1.1 Fraunces;color:${C.ink}} #fx .card em{font:600 46px Caveat;color:${C.terra};display:block;margin-top:14px}
    #fx .stamp{position:absolute;left:548px;top:962px;padding:14px 22px;border:7px double ${C.terra};border-radius:10px;font:900 58px Inter;letter-spacing:6px;color:${C.terra};filter:url(#ink);opacity:0;mix-blend-mode:multiply}
  </style>
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;inset:0;overflow:visible">
    <defs>
      <filter id="cut" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="w"/>
        <feDisplacementMap in="SourceGraphic" in2="w" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="9" result="g"/>
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 .25  0 0 0 0 .2  0 0 0 0 .12  0 0 0 .5 -.15" result="ga"/>
        <feComposite in="ga" in2="d" operator="in" result="gi"/>
        <feMerge result="tex"><feMergeNode in="d"/><feMergeNode in="gi"/></feMerge>
        <feDropShadow in="tex" dx="5" dy="12" stdDeviation="9" flood-color="#0c1811" flood-opacity=".33"/>
      </filter>
      <filter id="pencil" x="-5%" y="-50%" width="110%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="5"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="5" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .18  0 0 0 .35 -.1" result="ga"/><feComposite in="ga" in2="SourceGraphic" operator="in" result="gi"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge></filter>
      <filter id="ink" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.25" result="holes"/><feComposite in="SourceGraphic" in2="holes" operator="in" result="speck"/><feTurbulence type="fractalNoise" baseFrequency="0.05" seed="3" result="w"/><feDisplacementMap in="speck" in2="w" scale="4"/></filter>
    </defs>
    <g id="drift" opacity="0" filter="url(#cut)">${drift}</g>
    <g id="hero">
      <g id="wreath" filter="url(#cut)">
        <circle id="twig" r="200" fill="none" stroke="${C.twig}" stroke-width="13" stroke-linecap="round" transform="rotate(-90)"/>
        ${leaves}
      </g>
      <g id="tagg" filter="url(#cut)"><circle r="146" fill="${C.kraft}"/><circle r="146" fill="none" stroke="${C.twig}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="2 9"/>
        <text id="num" text-anchor="middle" y="42" font-family="Fraunces" font-weight="900" font-size="118" fill="${C.forest}">≥0%</text></g>
      <g id="sun" opacity="0" filter="url(#cut)"><path id="sunr" d="M200,0 A200,200 0 1,1 -200,0 A200,200 0 1,1 200,0Z" fill="${C.ochre}"/><circle id="sunc" r="0" fill="${C.sand}"/></g>
    </g>
    <path id="u1" d="M92,668 C240,650 420,684 600,660 S820,652 880,664" fill="none" stroke="${C.terra}" stroke-width="9" stroke-linecap="round" filter="url(#pencil)"/>
  </svg>
  <div class="card" id="c1" style="left:70px"><h4 style="background:${C.clay || '#8B5B45'}">DESIGN STAGE</h4><p>a prediction</p><em>from drawings and models</em></div>
  <div class="card" id="c2" style="left:520px"><h4 style="background:${C.forest}">FINAL</h4><p>checked on site</p><em>by an EDGE auditor</em></div>
  <div class="stamp" id="stamp">AUDITED ✓</div>`;
  const tl = gsap.timeline({ paused: true });
  const st = i => SC[i].t0c, end = i => (SC[i + 1] ? SC[i + 1].t0 : T.end) - .45;

  // headlines: letters rise out of a mask and leave the same way; sized to the real width of each line
  const heads = [[0, 'How to read', 'an EDGE certificate.', 'on-art'], [1, 'Three', 'savings.', 'on-paper'], [2, 'EDGE', 'Certified.', 'on-forest'],
    [3, '≥40%', 'energy.', 'on-art'], [4, 'Plus', 'renewables.', 'on-paper'], [5, 'Not just', 'the badge.', 'on-paper'], [6, 'Prediction', 'vs proof.', 'on-paper']];
  for (const [i, a, b, cls] of heads) {
    const el = document.createElement('div'); el.className = 'gh ' + cls; el.innerHTML = `${a}<i>${b}</i>`; fx.appendChild(el);
    let fs = 150;
    for (const [ln, it] of [[a, ''], [b, 'italic ']]) { const m = document.createElement('span'); m.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${it}900 150px Fraunces;letter-spacing:-1px`; m.textContent = ln; fx.appendChild(m); fs = Math.min(fs, 150 * 880 / m.offsetWidth); m.remove(); }
    el.style.fontSize = Math.floor(fs) + 'px';
    const sp = SplitText.create(el, { type: 'lines,chars', mask: 'lines' });
    const t0 = Math.max(.15, st(i) + .1), t1 = end(i);
    tl.set(el, { autoAlpha: 0 }, 0).set(el, { autoAlpha: 1 }, t0 - .01)
      .from(sp.chars, { yPercent: 110, opacity: 0, duration: .7, ease: 'back.out(1.4)', stagger: .02 }, t0)
      .to(sp.chars, { yPercent: -110, opacity: 0, duration: .32, ease: 'power2.in', stagger: .008 }, t1)
      .set(el, { autoAlpha: 0 }, t1 + .5);
    E(t0, 'paper');
  }

  // the hero: a twig wreath that grows leaves with the saving, then a paper sun
  const P = { p: 0, v: 0 }; let shown = -1;
  gsap.set('#hero', { x: 540, y: 1010, scale: 0, transformOrigin: '50% 50%' }); gsap.set('#twig', { drawSVG: '0% 0%' }); gsap.set('#num', { opacity: 0 });
  gsap.set('#u1', { drawSVG: '0% 0%' }); gsap.set(['#c1', '#c2'], { autoAlpha: 0 });
  const s2 = at('To be certified'), s3 = at('EDGE Advanced'), s4 = at('And EDGE Zero Carbon'), s5 = at('So read the three'), s6 = at('One more thing');
  const grow = (pct, t, dur) => tl.to('#twig', { drawSVG: `0% ${pct}%`, duration: dur, ease: 'power2.out' }, t).to(P, { p: pct / 100, v: pct, duration: dur, ease: 'power2.out' }, t);
  tl.to('#hero', { scale: 1, duration: .8, ease: 'back.out(1.6)' }, s2 + .1).to('#num', { opacity: 1, duration: .25 }, at('at least 20 percent') - .4);
  grow(20, at('at least 20 percent') - .4, 1.2);
  tl.to('#hero', { x: 800, y: 1120, scale: .6, duration: .9, ease: 'power3.inOut' }, s3 - .3);
  grow(40, at('40 percent') - .3, 1.2);
  tl.to('#hero', { x: 540, y: 1060, scale: .88, duration: .9, ease: 'power3.inOut' }, s4 - .3);
  grow(100, at('renewable energy') - .2, 1.0);
  tl.to(['#wreath', '#tagg'], { opacity: 0, scale: .9, duration: .35, transformOrigin: '50% 50%' }, '>-.05')
    .to('#sun', { opacity: 1, duration: .3 }, '<')
    .to('#sunr', { morphSVG: sunPath(), duration: 1, ease: 'back.out(1.3)' }, '<.05')
    .to('#sunc', { attr: { r: 118 }, duration: .8, ease: 'back.out(1.8)' }, '<.25')
    .to('#hero', { x: 880, y: 1180, scale: .42, duration: .8, ease: 'power3.inOut' }, s5 - .2)
    .to('#u1', { drawSVG: '0% 100%', duration: .75, ease: 'power2.out' }, at('not just the badge'))
    .to('#u1', { opacity: 0, duration: .3 }, end(5))
    .to('#hero', { scale: 0, duration: .45, ease: 'power2.in' }, s6 - .3)
    // the end: two paper cards are set down, then the auditor's stamp lands on "final"
    .fromTo('#c1', { autoAlpha: 0, y: 70, rotate: -6 }, { autoAlpha: 1, y: 0, rotate: -2, duration: .7, ease: 'back.out(1.6)' }, at('A design-stage') - .1)
    .fromTo('#c2', { autoAlpha: 0, y: 70, rotate: 6 }, { autoAlpha: 1, y: 0, rotate: 2, duration: .7, ease: 'back.out(1.6)' }, at('final certificate') - .1)
    .fromTo('#stamp', { opacity: 0, scale: 2.6, rotate: -4 }, { opacity: 1, scale: 1, rotate: -12, duration: .2, ease: 'power4.in' }, at('auditor checked'))
    .to('#c2', { y: 8, duration: .08, yoyo: true, repeat: 1, ease: 'power1.out' }, '>')
    .to(['#c1', '#c2', '#stamp'], { autoAlpha: 0, y: -30, duration: .35, ease: 'power2.in' }, T.end - .5);
  E(s2 + .1, 'tock'); E(at('at least 20 percent') + .8, 'chime'); E(at('40 percent') + .9, 'chime'); E(at('renewable energy') + .8, 'chime');
  E(at('not just the badge'), 'scratch', .6); E(at('A design-stage'), 'tock'); E(at('final certificate'), 'tock'); E(at('auditor checked') + .2, 'thump');

  // drifting paper leaves on the plain paper pages (deterministic: positions are functions of time)
  const pages = [[st(1), end(1) + .4], [st(4), end(5) + .4]];
  const dls = [...fx.querySelectorAll('.dl')], lfs = [...fx.querySelectorAll('.lf')];
  function sunPath() { let d = ''; for (let k = 0; k < 28; k++) { const a = k / 28 * 2 * Math.PI, r = k % 2 ? 150 : 205; d += (k ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1); } return d + 'Z'; }
  return { tl, update(t) {
    const v = Math.round(P.v); if (v !== shown) { shown = v; document.getElementById('num').textContent = (v >= 100 ? '' : '≥') + v + '%'; }
    lfs.forEach(l => { const k = Math.max(0, Math.min(1, (P.p - +l.dataset.f) * NL * 1.2)); const s = k < 1 ? k * (1 + .5 * Math.sin(k * Math.PI)) : 1; l.setAttribute('transform', `scale(${s.toFixed(3)})`); });
    document.getElementById('sun').setAttribute('transform', `rotate(${(t * 6) % 360})`);
    let vis = 0; for (const [a, b] of pages) vis = Math.max(vis, Math.min(1, (t - a) / .8, (b - t) / .6));
    document.getElementById('drift').setAttribute('opacity', Math.max(0, vis).toFixed(3));
    dls.forEach((d, i) => { const ph = i * 1.7, y = ((t * (38 + i * 7) + i * 410) % 1420) - 120, /* stays above the caption strip */ x = 140 + i * 190 + Math.sin(t * .7 + ph) * 70;
      d.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(Math.sin(t * .9 + ph) * 40 + i * 30).toFixed(1)}) scale(${(.8 + (i % 3) * .2).toFixed(2)})`); });
  } };
};
