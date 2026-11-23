const CHALLENGE_KEY = 'pcb-challenges-v1';
const CHALLENGE_TEAMS = Object.freeze({
  coastguard: { id: 'coastguard', name: 'Coast Guard', mascot: 'Bears', short: 'CGA', city: 'New London, CT', primary: '#18365e', secondary: '#f58b46', helmet: '#15253d', power: 2.5 },
  merchantmarine: { id: 'merchantmarine', name: 'Merchant Marine', mascot: 'Mariners', short: 'USMM', city: 'Kings Point, NY', primary: '#142c65', secondary: '#bbc9de', helmet: '#f0eee3', power: 2.5 },
});
const CHALLENGE_ACADEMIES = Object.freeze({
  army: [
    { id: 'army-west-point', en: 'West Point Rally', pt: 'Virada em West Point', level: 'bronze', opponent: 'navy', quarter: 3, clock: 72, homeScore: 7, awayScore: 14, weather: 'clear', los: 45 },
    { id: 'army-snow', en: 'The Snow Line', pt: 'A Linha de Neve', level: 'silver', opponent: 'airforce', quarter: 4, clock: 61, homeScore: 13, awayScore: 17, weather: 'snow', los: 63 },
    { id: 'army-storm', en: 'Through the Storm', pt: 'Através do Temporal', level: 'silver', opponent: 'coastguard', quarter: 3, clock: 32, homeScore: 10, awayScore: 21, weather: 'storm', los: 39 },
    { id: 'army-last-drive', en: 'One Last Drive', pt: 'A Última Campanha', level: 'gold', opponent: 'navy', quarter: 4, clock: 32, homeScore: 21, awayScore: 27, weather: 'wind', los: 82, down: 3, yardsToGo: 5 },
  ],
  navy: [
    { id: 'navy-bridge', en: 'Annapolis Turnaround', pt: 'Virada em Annapolis', level: 'bronze', opponent: 'coastguard', quarter: 3, clock: 68, homeScore: 6, awayScore: 13, weather: 'clear', los: 42 },
    { id: 'navy-fog', en: 'Through the Fog', pt: 'Através da Neblina', level: 'silver', opponent: 'merchantmarine', quarter: 4, clock: 64, homeScore: 10, awayScore: 16, weather: 'fog', los: 61 },
    { id: 'navy-rain', en: 'The Tide Turns', pt: 'A Maré Virou', level: 'silver', opponent: 'airforce', quarter: 3, clock: 29, homeScore: 13, awayScore: 24, weather: 'rain', los: 50 },
    { id: 'navy-final', en: 'Against the Clock', pt: 'Contra o Relógio', level: 'gold', opponent: 'army', quarter: 4, clock: 31, homeScore: 22, awayScore: 29, weather: 'clear', los: 87, down: 2, yardsToGo: 7 },
  ],
  airforce: [
    { id: 'airforce-rally', en: 'Homefield Rally', pt: 'Reação em Casa', level: 'bronze', opponent: 'merchantmarine', quarter: 3, clock: 67, homeScore: 10, awayScore: 17, weather: 'clear', los: 44 },
    { id: 'airforce-wind', en: 'Crosswind', pt: 'Vento Lateral', level: 'silver', opponent: 'army', quarter: 4, clock: 73, homeScore: 14, awayScore: 20, weather: 'wind', los: 54 },
    { id: 'airforce-snow', en: 'Frozen Drive', pt: 'Campanha no Gelo', level: 'silver', opponent: 'navy', quarter: 3, clock: 23, homeScore: 7, awayScore: 21, weather: 'snow', los: 57 },
    { id: 'airforce-final', en: 'Final Approach', pt: 'Aproximação Final', level: 'gold', opponent: 'coastguard', quarter: 4, clock: 34, homeScore: 24, awayScore: 30, weather: 'rain', los: 79, down: 3, yardsToGo: 6 },
  ],
  coastguard: [
    { id: 'coastguard-cup', en: 'Cup Comeback', pt: 'Virada na Copa', level: 'bronze', opponent: 'merchantmarine', quarter: 3, clock: 76, homeScore: 7, awayScore: 14, weather: 'clear', los: 43 },
    { id: 'coastguard-rain', en: 'Heavy Seas', pt: 'Mar Agitado', level: 'silver', opponent: 'navy', quarter: 4, clock: 79, homeScore: 13, awayScore: 20, weather: 'storm', los: 59 },
    { id: 'coastguard-fog', en: 'New London Fog', pt: 'Neblina em New London', level: 'silver', opponent: 'army', quarter: 3, clock: 19, homeScore: 10, awayScore: 20, weather: 'fog', los: 49 },
    { id: 'coastguard-final', en: 'The Last Crossing', pt: 'A Última Travessia', level: 'gold', opponent: 'merchantmarine', quarter: 4, clock: 30, homeScore: 20, awayScore: 26, weather: 'snow', los: 86, down: 3, yardsToGo: 4 },
  ],
  merchantmarine: [
    { id: 'merchant-kings', en: 'Kings Point Rally', pt: 'Virada em Kings Point', level: 'bronze', opponent: 'coastguard', quarter: 3, clock: 81, homeScore: 7, awayScore: 13, weather: 'clear', los: 46 },
    { id: 'merchant-rain', en: 'Into the Rain', pt: 'Debaixo da Chuva', level: 'silver', opponent: 'navy', quarter: 4, clock: 70, homeScore: 10, awayScore: 17, weather: 'rain', los: 58 },
    { id: 'merchant-wind', en: 'Against the Wind', pt: 'Contra o Vento', level: 'silver', opponent: 'airforce', quarter: 3, clock: 28, homeScore: 14, awayScore: 24, weather: 'wind', los: 47 },
    { id: 'merchant-final', en: 'Closing In', pt: 'Reta Final', level: 'gold', opponent: 'coastguard', quarter: 4, clock: 36, homeScore: 21, awayScore: 28, weather: 'fog', los: 81, down: 2, yardsToGo: 6 },
  ],
});
const CHALLENGE_LEVELS = Object.freeze({
  bronze: { name: 'BRONZE', difficulty: 'easy' },
  silver: { name: 'PRATA', difficulty: 'normal' },
  gold: { name: 'OURO', difficulty: 'hard' },
});
const CHALLENGE_IDS = new Set(Object.values(CHALLENGE_ACADEMIES).flatMap((scenarios) => scenarios.map(({ id }) => id)));
const challengeTeam = (id) => CHALLENGE_TEAMS[id] || getTeam(id);
const challengeName = (scenario) => app.settings.language === 'en' ? scenario.en : scenario.pt;

function loadChallengeTrophies() {
  try {
    const ids = JSON.parse(store.get(CHALLENGE_KEY) || '[]');
    return new Set(Array.isArray(ids) ? ids.filter((id) => CHALLENGE_IDS.has(id)) : []);
  } catch { return new Set(); }
}

function challengeProgress(academyId) {
  const scenarios = CHALLENGE_ACADEMIES[academyId];
  const earned = scenarios.filter(({ id }) => app.challengeTrophies.has(id)).length;
  return `<div class="challenge-progress"><progress max="${scenarios.length}" value="${earned}" aria-label="Troféus conquistados"></progress>
    <span>${earned}/${scenarios.length} TROFÉUS</span></div>`;
}

function challengeAcademyScreen() {
  return `<section class="screen challenge-screen">
    ${screenHead('CHALLENGE', { back: false, right: '<button class="btn ghost small" data-action="to-title">MENU PRINCIPAL</button>' })}
    <div class="challenge-picker"><h3>ESCOLHA UMA ACADEMIA</h3>
    <div class="challenge-academy-grid">${Object.entries(CHALLENGE_ACADEMIES).map(([id, scenarios]) => {
      const team = challengeTeam(id);
      return `<button class="challenge-academy" data-action="challenge-open" data-id="${id}" style="${teamTheme(team)}">
        <canvas data-challenge-helmet="${id}" width="68" height="48" aria-hidden="true"></canvas>
        <div class="challenge-academy-info"><strong>${esc(team.name)}</strong><small>${scenarios.length} DESAFIOS</small></div>
        ${challengeProgress(id)}
      </button>`;
    }).join('')}</div></div>
  </section>`;
}

const challengeCup = (level, earned) => `<span class="challenge-cup ${level}${earned ? ' earned' : ''}" aria-hidden="true"></span>`;

function challengeScreen() {
  const id = app.challengeAcademy;
  const team = challengeTeam(id);
  return `<section class="screen challenge-screen">
    ${screenHead('CHALLENGE', { back: false, right: '<button class="btn ghost small" data-action="challenges">VOLTAR ÀS ACADEMIAS</button>' })}
    <header class="challenge-banner" style="${teamTheme(team)}">
      ${crest(team, 'lg')}<div><h3>${esc(fullName(team))}</h3><p>Vire o jogo e conquiste o troféu da partida.</p></div>
      ${challengeProgress(id)}
    </header>
    <div class="challenge-grid">${CHALLENGE_ACADEMIES[id].map((scenario) => {
      const opponent = challengeTeam(scenario.opponent);
      const earned = app.challengeTrophies.has(scenario.id);
      const level = CHALLENGE_LEVELS[scenario.level];
      return `<article class="challenge-card${earned ? ' earned' : ''}" style="${teamTheme(team)}">
        <header>${challengeCup(scenario.level, earned)}<div><span class="eyebrow">${level.name} · ${earned ? 'CONQUISTADO' : 'A CONQUISTAR'}</span>
          <h3>${esc(challengeName(scenario))}</h3></div></header>
        <div class="challenge-score" aria-label="Placar inicial">
          <span>${crest(team, 'sm')}${esc(team.short)}</span><b>${scenario.homeScore} – ${scenario.awayScore}</b><span>${esc(opponent.short)}${crest(opponent, 'sm')}</span>
        </div>
        <div class="challenge-condition"><span>Q${scenario.quarter} · ${clockText(scenario.clock)}</span><span>${WEATHER[scenario.weather].label}</span></div>
        <button class="btn ${earned ? 'ghost' : 'primary'}" data-action="challenge-play" data-id="${scenario.id}">${earned ? 'JOGAR DE NOVO' : 'JOGAR DESAFIO'}</button>
      </article>`;
    }).join('')}</div>
  </section>`;
}

function drawChallengeHelmets() {
  $$('canvas[data-challenge-helmet]').forEach((canvas) => drawHelmetPreview(canvas, challengeTeam(canvas.dataset.challengeHelmet), false));
}

function startChallenge(id) {
  const homeId = app.challengeAcademy;
  const scenario = CHALLENGE_ACADEMIES[homeId].find((entry) => entry.id === id);
  if (!scenario) return;
  startMatch({
    mode: 'challenge', matchId: id, scenario, home: challengeTeam(homeId), away: challengeTeam(scenario.opponent),
    difficulty: CHALLENGE_LEVELS[scenario.level].difficulty, quarterSeconds: 120, weather: scenario.weather,
  });
}

function awardChallengeTrophy(id, won) {
  if (!won || !CHALLENGE_IDS.has(id) || app.challengeTrophies.has(id)) return false;
  app.challengeTrophies.add(id);
  store.set(CHALLENGE_KEY, JSON.stringify([...app.challengeTrophies]));
  return true;
}
