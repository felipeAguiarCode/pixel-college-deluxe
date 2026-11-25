/* Rules for the manual defensive clash. Time is measured in real seconds. */
const TackleBattle = (() => {
  const limit = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const ramp = (value, target, dt, rate) => value + (target - value) * (1 - Math.exp(-dt * rate));
  const states = {
    normal:      { force: 1.00, time: [0.44, 1.20], drain: 0.09, label: 'PRESSÃO NORMAL', color: '#f5d591' },
    burst:       { force: 1.70, time: [0.23, 0.50], drain: 0.29, label: 'EXPLOSÃO!', color: '#ffaf78', threat: true },
    surge:       { force: 2.00, time: [0.23, 0.49], drain: 0.38, label: 'PICO DE FORÇA!', color: '#ff916e', threat: true },
    recovery:    { force: 0.50, time: [0.33, 0.70], drain: -0.22, label: 'RECUPERANDO', color: '#94e5be', opening: true },
    exhausted:   { force: 0.35, time: [0.43, 0.83], drain: -0.12, label: 'EXAUSTO!', color: '#a7e6d8', opening: true },
    counter:     { force: 1.50, time: [0.40, 0.64], drain: 0.23, label: 'CONTRA-ATAQUE!', color: '#ff9f7e', threat: true },
    fake:        { force: 0.40, time: [0.42, 0.62], drain: -0.04, label: 'BRECHA?', color: '#f3da8c' },
    desperation: { force: 2.20, time: [0.25, 0.49], drain: 0.47, label: 'ÚLTIMO ESFORÇO!', color: '#ff8275', threat: true },
  };
  const postures = [
    { label: 'CAUTELOSA', force: 0.85, cost: 0.60, color: '#9dd7ec' },
    { label: 'EQUILIBRADA', force: 1.00, cost: 1.00, color: '#f3e1ae' },
    { label: 'AGRESSIVA', force: 1.60, cost: 2.20, color: '#ffc397' },
  ];
  const events = {
    surge:   { label: 'RESISTA À EXPLOSÃO!', mode: 'charge', key: 'enter', time: 0.63 },
    counter: { label: 'RESPONDA AO CONTRA-ATAQUE!', mode: 'press', key: 'x', time: 0.55 },
    balance: { label: 'RECUPERE O EQUILÍBRIO!', mode: 'timing', time: 0.68 },
    escape:  { label: 'CORTE A FUGA!', mode: 'direction', time: 0.54 },
    clash:   { label: 'AGUENTE FIRME!', mode: 'hold', key: 'space', time: 0.70 },
    wind:    { label: 'SEGUNDO FÔLEGO!', mode: 'timing', time: 0.72 },
    chance:  { label: 'CHANCE DE DERRUBAR!', mode: 'timing', time: 0.69 },
    last:    { label: 'ÚLTIMA CHANCE!', mode: 'press', key: 'x', time: 0.46 },
    fake:    { label: 'BRECHA SUSPEITA!', mode: 'wait', key: 'enter', time: 0.46 },
    strip:   { label: 'ARRANQUE A BOLA?', mode: 'timing', time: 0.68, optional: true },
    finish:  { label: 'FINALIZE!', mode: 'timing', time: 0.63 },
  };
  const outcomes = {
    perfect: 'TACKLE PERFEITO!', dominant: 'TACKLE DOMINANTE!', tackle: 'TACKLE!',
    assisted: 'TACKLE COM AJUDA!', drag: 'TACKLE COM AVANÇO!', weak: 'TACKLE FRACO!',
    fumble: 'FUMBLE FORÇADO!', broken: 'TACKLE QUEBRADO!', missed: 'TACKLE PERDIDO!',
    breakthrough: 'BLOQUEIO ROMPIDO!', advance: 'AVANÇO PARCIAL!', contained: 'BLOQUEIO MANTEVE!', offBalance: 'DEFENSOR DESEQUILIBRADO!',
  };
  // Positional strength and mass proxies for teams without a detailed roster.
  const builds = { QB: [0.47, 0.51], RB: [0.73, 0.65], WR: [0.55, 0.45], TE: [0.79, 0.80],
    OL: [0.86, 0.95], DL: [0.84, 0.91], LB: [0.71, 0.68], DB: [0.57, 0.49] };
  // Bias the odds, not the order of states. The same athlete keeps its profile.
  const profiles = {
    power:       { label: 'POTENTE', force: 1.10, spend: 0.92, rhythm: 1.10, bias: { normal: 2.6, surge: 1.9, counter: 1.4 } },
    explosive:   { label: 'EXPLOSIVO', force: 1.00, spend: 1.15, rhythm: 0.86, bias: { burst: 2.4, surge: 2.5, recovery: 1.9 } },
    speed:       { label: 'VELOZ', force: 1.02, spend: 1.35, rhythm: 0.87, bias: { burst: 2.3, exhausted: 1.7, desperation: 0.65 } },
    technical:   { label: 'TÉCNICO', force: 0.99, spend: 0.94, rhythm: 0.93, bias: { counter: 2.3, fake: 1.7, burst: 0.75 } },
    relentless:  { label: 'INCANSÁVEL', force: 1.00, spend: 1.02, rhythm: 1.04, bias: { normal: 1.5, desperation: 2.6, surge: 1.5 } },
    deceptive:   { label: 'FINTADOR', force: 0.98, spend: 0.99, rhythm: 0.87, bias: { fake: 3.2, counter: 2.1, recovery: 0.75 } },
    endurance:   { label: 'RESISTENTE', force: 1.04, spend: 0.66, rhythm: 1.16, bias: { normal: 2.8, counter: 1.1, exhausted: 0.42 } },
    unpredictable: { label: 'IMPREVISÍVEL', force: 1.00, spend: 1.03, rhythm: 0.83, bias: { normal: 0.62, fake: 1.3, surge: 1.2, recovery: 1.2 } },
  };
  const rules = {
    length: { easy: [2.55, 3.30], normal: [2.70, 3.48], hard: [2.80, 3.58] },
    span: [1.5, 4], tell: [0.20, 0.35], eventLimit: 2, eventGap: 0.34, eventStart: 0.43, reaction: [0.35, 0.80],
    pressure: [0.35, 2.20], noise: 0.10, response: 16,
    eligibility: 0.49, cleanContact: 0.78, minPulseGap: 0.16, pulseLength: 0.22,
    defenderDrain: 0.20, defenderRecovery: 0.23, balanceRate: 0.72, balanceResponse: 13,
    holdRatio: 0.40, fullHold: 0.58, timingPerfect: 0.13, timingPartial: 0.24,
    critical: 0.16, finishAt: 0.79, staleBand: 0.075, overtime: 0.34,
    forceFumble: { perfect: 0.82, partial: 0.26 },
  };
  const level = (rng, [min, max]) => min + (max - min) * rng();
  const weightPick = (rng, choices) => {
    let draw = rng() * choices.reduce((sum, [, weight]) => sum + weight, 0);
    return choices.find(([, weight]) => (draw -= weight) < 0)?.[0] ?? choices.at(-1)[0];
  };

  function profileFor(a, identityRng) {
    return weightPick(identityRng, [
      ['power', a.strength ** 2 * 2.4], ['explosive', a.speed * a.strength * 2.1],
      ['speed', a.speed ** 2 * (1.6 - a.stamina)], ['technical', a.skill ** 2 * 2.5],
      ['relentless', a.strength * a.stamina * 1.7], ['deceptive', a.skill * 0.86],
      ['endurance', a.stamina ** 2 * 2.25], ['unpredictable', 0.56],
    ]);
  }

  function contact({ defender, rival, angle, impact, momentum, importance, traction, block, difficulty }) {
    const leverage = limit(0.47 + angle * 0.24 + impact * 0.22 + (defender.skill - rival.skill) * 0.26 + (traction - 1) * 0.24);
    const resistance = rival.strength * 0.34 + rival.mass * 0.20 + rival.skill * 0.25 +
      rival.energy * 0.15 + momentum * 0.09 + importance * 0.05;
    const eligible = resistance >= rules.eligibility && (block || leverage < rules.cleanContact);
    return { eligible, leverage, momentum, importance, traction, block, difficulty, defender, rival };
  }

  function start(context, profile, rng) {
    const { defender, rival, leverage, momentum, importance, traction, difficulty } = context;
    const stance = profiles[profile];
    const q = {
      t: 0, duration: level(rng, rules.length[difficulty] || rules.length.normal), context, profile, rng,
      balance: limit(0.48 + (leverage - 0.5) * 0.34 + (defender.mass - rival.mass) * 0.18, 0.30, 0.69),
      posture: 1, stamina: defender.energy, opposingStamina: rival.energy,
      stability: limit(0.56 + leverage * 0.29 + defender.skill * 0.15 + (traction - 1) * 0.20),
      opposingStability: limit(0.73 + rival.skill * 0.17 - (leverage - 0.5) * 0.21),
      defenseForce: 1.02 + defender.strength * 0.25 + defender.skill * 0.22 + defender.mass * 0.10,
      rivalForce: (0.78 + rival.strength * 0.25 + rival.skill * 0.14 + rival.mass * 0.15 +
        momentum * 0.19 + importance * 0.08) * stance.force * ({ easy: 0.89, hard: 1.12 }[difficulty] || 1),
      pressure: 1, velocity: 0, held: false, lastPulse: -Infinity, effort: 0.35, events: 0, eventAfter: rules.eventStart,
      eventAllowance: Math.min(rules.eventLimit, weightPick(rng, [[0, 0.15], [1, 0.54], [2, 0.31]])),
      state: 'normal', stateUntil: level(rng, states.normal.time) * stance.rhythm,
      drift: 1 + level(rng, [-rules.noise, rules.noise]), advantageAt: 0.5,
    };
    return q;
  }

  function chooseState(q) {
    const { state, opposingStamina: energy, opposingStability: balance, profile, t, duration } = q;
    const gaining = limit((q.balance - q.advantageAt) * 8);
    const late = limit((t / duration - 0.53) * 2.3);
    const spent = Number(Boolean(states[state].threat));
    const surprised = limit((q.balance - 0.53) * 3.5) + gaining;
    const options = [
      ['normal', 2.45 + energy],
      ['burst', Math.max(0.10, energy * 2.6 - spent * 1.4)],
      ['surge', Math.max(0.08, energy * (0.85 + late) - spent * 0.55)],
      ['recovery', 0.50 + spent * 2.9 + (1 - energy) * 1.55],
      ['exhausted', Math.max(0.02, (0.61 - energy) * 7.5 + Math.max(0, 0.4 - balance))],
      ['counter', 0.16 + surprised * 1.55 + (state === 'fake' ? 4.1 : 0)],
      ['fake', state === 'recovery' ? 0.31 : 0.50 + energy * 0.62],
      ['desperation', 0.02 + late * (q.balance > 0.56 ? 2.2 : 0.20) * (0.32 + energy)],
    ].filter(([id]) => id !== state && (energy > 0.19 || !states[id].threat));
    if (state === 'fake' && energy > 0.19) return weightPick(q.rng, [['counter', 0.77], ['burst', 0.17], ['normal', 0.06]]);
    const bias = profiles[profile].bias;
    return weightPick(q.rng, options.map(([id, weight]) => [id, weight * (bias[id] ?? 1)]));
  }

  function advancePressure(q, dt, signal) {
    // Plan before changing state so every abrupt push can be read in advance.
    if (!q.planned && q.t >= q.stateUntil - rules.tell[1]) {
      const name = chooseState(q);
      q.planned = { name, tellAt: q.stateUntil - level(q.rng, rules.tell) };
    }
    if (q.planned && !q.cue && q.t >= q.planned.tellAt && states[q.planned.name].threat) {
      q.cue = q.planned.name;
      signal('tell');
    }
    if (q.t >= q.stateUntil) {
      q.state = q.planned.name;
      q.cue = q.planned = null;
      q.advantageAt = q.balance;
      const next = states[q.state];
      q.stateUntil = q.t + Math.max(rules.tell[0] + 0.03, level(q.rng, next.time) * profiles[q.profile].rhythm);
      q.drift = 1 + level(q.rng, [-rules.noise, rules.noise]);
      if (next.threat) {
        q.opposingStamina = limit(q.opposingStamina - 0.025 * next.force);
        signal('impact', next.force);
      }
    }
    const next = states[q.state];
    const elapsed = q.t / q.duration;
    const trend = q.profile === 'relentless' ? 0.90 + elapsed * 0.25 : q.profile === 'speed' ? 1.13 - elapsed * 0.32 : 1;
    q.pressure = ramp(q.pressure, limit(next.force * q.drift * trend, ...rules.pressure), dt, rules.response);
  }

  function eventCandidates(q) {
    const { state, balance, stamina, stability, opposingStability, opposingStamina, context } = q;
    const opening = states[state].opening || opposingStability < 0.44;
    if (balance <= rules.critical && !q.lastStand) return [['last', 4]];
    const list = [];
    if (state === 'surge' || state === 'burst') list.push(['surge', 1.8]);
    if (state === 'counter') list.push(['counter', 2.2]);
    if (!context.block && (state === 'desperation' || q.profile === 'technical' && states[state].threat)) list.push(['escape', 2.0]);
    if (q.pressure > 1.30 && Math.abs(balance - 0.5) < 0.24) list.push(['clash', 1.25]);
    if (stamina < 0.61) list.push(['wind', 1.5 + (1 - stamina)]);
    if (stability < 0.61) list.push(['balance', 1.4 + (1 - stability)]);
    if (opening && balance > 0.46) list.push(['chance', 2.5]);
    if (state === 'fake') list.push(['fake', 3.6]);
    if (!context.block && opening && (opposingStamina < 0.65 || opposingStability < 0.60) && balance > 0.52) list.push(['strip', 1.7]);
    if (balance >= rules.finishAt && state !== 'fake') list.push(['finish', 3]);
    return list.filter(([id]) => !q.answered?.has(id));
  }

  function offerEvent(q, signal) {
    if (q.finisher || q.event || q.events >= q.eventAllowance || q.t < q.eventAfter) return;
    q.eventAfter = q.t + rules.eventGap;
    const options = eventCandidates(q);
    if (!options.length || q.rng() > 0.81) return;
    const id = weightPick(q.rng, options);
    const def = events[id];
    const time = limit(def.time * ({ easy: 1.12, hard: 0.88 }[q.context.difficulty] || 1), ...rules.reaction);
    if (q.t + time > q.duration - 0.035) return;
    const key = def.mode === 'timing' ? (q.rng() < 0.5 ? 'q' : 'e') :
      def.mode === 'direction' ? (q.rng() < 0.5 ? 'arrowleft' : 'arrowright') : def.key;
    const label = q.context.block && id === 'chance' ? 'CHANCE DE ROMPER!' :
      q.context.block && id === 'finish' ? 'ROMPA O BLOQUEIO!' : def.label;
    q.event = { ...def, label, id, key, time, start: q.t, center: level(q.rng, [0.49, 0.68]), charge: 0 };
    q.events++;
    if (id === 'last') q.lastStand = true;
    signal('event');
  }

  function judge(q, grade, signal) {
    const { event } = q;
    q.event = null;
    q.eventAfter = q.t + rules.eventGap;
    (q.answered ??= new Set()).add(event.id);
    q.grade = { grade, at: q.t };
    const good = grade === 'perfect' || grade === 'partial';
    const strength = grade === 'perfect' ? 1 : 0.51;
    if (!good && !(grade === 'miss' && event.optional)) {
      q.balance = limit(q.balance - (event.id === 'fake' ? 0.17 : event.id === 'last' ? 0.09 : 0.057));
      q.stability = limit(q.stability - (event.id === 'fake' ? 0.26 : event.optional ? 0.21 : 0.12));
      if (event.optional) q.stamina = limit(q.stamina - 0.15);
    }
    if (good) {
      const gain = { surge: 0.16, counter: 0.21, balance: 0.07, escape: 0.16, clash: 0.14,
        wind: 0.06, chance: 0.22, last: 0.24, fake: 0.11, strip: 0.13, finish: 0.25 };
      q.balance = limit(q.balance + gain[event.id] * strength);
      if (event.id === 'wind') q.stamina = limit(q.stamina + 0.30 * strength);
      if (event.id === 'balance' || event.id === 'last') q.stability = limit(q.stability + 0.32 * strength);
      if (event.id === 'surge' || event.id === 'escape') q.reliefUntil = q.t + 0.40 * strength;
      if (event.id === 'chance' || event.id === 'finish') {
        q.opposingStability = limit(q.opposingStability - 0.26 * strength);
        if (grade === 'perfect' && q.balance >= rules.finishAt) q.finisher = 'perfect';
      }
      if (event.id === 'strip') {
        q.stamina = limit(q.stamina - 0.13);
        if (q.rng() < rules.forceFumble[grade] * (1 - q.opposingStability * 0.36)) q.finisher = 'fumble';
      }
    }
    if (grade !== 'miss' || !event.optional) signal(good ? 'good' : 'bad');
  }

  function timingGrade(event, time) {
    const distance = Math.abs((time - event.start) / event.time - event.center);
    return distance <= rules.timingPerfect ? 'perfect' : distance <= rules.timingPartial ? 'partial' : 'fail';
  }

  function command(q, action, signal) {
    if (action === 'release') { q.held = false; return true; }
    if (action === 'arrowup' || action === 'arrowdown') {
      q.posture = limit(q.posture + (action === 'arrowup' ? 1 : -1), 0, postures.length - 1);
      signal('posture');
      return true;
    }
    const event = q.event;
    if (action === 'space' || action === 'hold') {
      if (action === 'hold') q.held = true;
      if (q.t - q.lastPulse >= rules.minPulseGap) {
        q.lastPulse = q.t;
        q.lastInput = { key: 'space', t: q.t };
        signal('press');
      }
      return true;
    }
    if (!event || event.mode === 'hold') return false;
    if (event.mode === 'timing') {
      if (action !== 'q' && action !== 'e') return false;
      judge(q, action === event.key ? timingGrade(event, q.t) : 'fail', signal);
      return true;
    }
    if (!['enter', 'x', 'arrowleft', 'arrowright'].includes(action)) return false;
    const progress = (q.t - event.start) / event.time;
    if (action !== event.key || event.mode === 'wait') judge(q, 'fail', signal);
    else if (event.mode === 'charge') {
      if (event.lastHit === undefined || q.t - event.lastHit >= rules.minPulseGap * 0.68) {
        event.lastHit = q.t;
        event.charge += 0.38;
        if (event.charge >= 1) judge(q, 'perfect', signal);
        else signal('press');
      }
    } else judge(q, progress < 0.82 ? 'perfect' : 'partial', signal);
    return true;
  }

  function applyForces(q, dt) {
    const posture = postures[q.posture], state = states[q.state], traction = q.context.traction;
    const pulse = limit(1 - (q.t - q.lastPulse) / rules.pulseLength);
    q.effort = ramp(q.effort, limit((q.held ? 1 : 0.26) + pulse * (q.held ? 0.08 : 0.66)), dt, 22);
    const exposed = q.posture === 2 && !state.opening;
    const vulnerability = state.opening ? 1.21 : q.state === 'fake' ? 0.82 : 1;
    const staminaUse = rules.defenderDrain * posture.cost * q.effort;
    const respite = rules.defenderRecovery * (1 - q.effort) * (q.posture === 0 ? 1.33 : 0.77);
    q.stamina = limit(q.stamina + dt * (respite - staminaUse));
    q.opposingStamina = limit(q.opposingStamina - dt * state.drain * profiles[q.profile].spend);
    const stabilityCost = exposed ? (0.15 + Math.max(0, q.pressure - 1) * 0.43) * q.effort / traction : 0;
    const stabilityGain = (q.posture === 0 ? 0.23 : 0.10) * (state.threat ? 0.25 : 1) + (1 - q.effort) * 0.09;
    q.stability = limit(q.stability + dt * (stabilityGain - stabilityCost));
    const guard = q.posture === 0 && (state.threat || q.cue) ? 0.68 + 0.12 * q.effort : 1;
    const swing = (q.reliefUntil ?? 0) > q.t ? 0.71 : 1;
    const defense = q.defenseForce * q.effort * posture.force * (0.40 + 0.60 * q.stamina) *
      (0.44 + 0.56 * q.stability) * vulnerability;
    const attack = q.rivalForce * q.pressure * (0.59 + 0.41 * q.opposingStamina) *
      (0.56 + 0.44 * q.opposingStability) * swing * guard;
    q.opposingStability = limit(q.opposingStability + dt * (state.opening ? 0.09 : 0.045) -
      dt * Math.max(0, defense - attack) * (q.posture === 2 ? 0.28 : 0.19));
    q.velocity = ramp(q.velocity, (defense - attack) * rules.balanceRate, dt, rules.balanceResponse);
    q.balance = limit(q.balance + q.velocity * dt);
  }

  function update(q, dt, signal) {
    dt = Math.min(dt, q.duration - q.t);
    q.t += dt;
    advancePressure(q, dt, signal);
    applyForces(q, dt);
    const event = q.event;
    if (event) {
      if (event.mode === 'timing' && !event.signaled && timingGrade(event, q.t) === 'perfect') {
        event.signaled = true;
        signal('ready');
      }
      if (event.mode === 'hold' || event.mode === 'charge' && q.held) {
        if (q.held) event.charge += dt / (event.time * rules.fullHold);
        if (event.charge >= 1) judge(q, 'perfect', signal);
      }
      if (q.event && q.t - event.start >= event.time) {
        const grade = event.mode === 'wait' ? 'perfect' : event.charge >= rules.holdRatio ? 'partial' : event.charge > 0 ? 'fail' : 'miss';
        judge(q, grade, signal);
      }
    }
    offerEvent(q, signal);
    if (q.t < rules.span[0]) return false;
    if (q.finisher || q.balance >= 1 && q.opposingStability < 0.53) return true;
    if (q.balance <= 0.015 && q.stability < 0.22 && !q.event) return true;
    if (q.t < q.duration - 1e-6) return false;
    if (!q.stalemate && Math.abs(q.balance - 0.5) < rules.staleBand) {
      q.stalemate = true;
      q.duration = Math.min(rules.span[1], q.duration + rules.overtime);
      signal('stalemate');
      return false;
    }
    return true;
  }

  function result(q, assisted) {
    const { balance, stability, opposingStability, finisher } = q;
    if (q.context.block) {
      if (finisher === 'perfect' || balance >= 0.72) return 'breakthrough';
      if (balance >= 0.49) return 'advance';
      return stability < 0.40 || balance < 0.27 ? 'offBalance' : 'contained';
    }
    if (finisher === 'fumble') return 'fumble';
    if (finisher === 'perfect') return 'perfect';
    if (balance >= 0.80 || balance >= 0.66 && opposingStability < 0.42) return 'dominant';
    if (balance >= 0.62) return 'tackle';
    if (assisted && balance >= 0.37) return 'assisted';
    if (balance >= 0.51) return 'drag';
    if (balance >= 0.37) return 'weak';
    return balance < 0.21 || stability < 0.30 ? 'missed' : 'broken';
  }

  return { rules, states, postures, profiles, outcomes, builds, profileFor, contact, start, command, timingGrade, update, result };
})();
