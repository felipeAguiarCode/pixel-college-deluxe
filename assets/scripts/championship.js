const championshipKey = 'pcb-championship-v1';
const championshipTeams = (league) => league === 'national' ? BASE_TEAMS.map((team) => team.id) : teamIdsInConf(league);
const championshipName = (league) => league === 'national' ? 'NCAA FBS' : CONFERENCES.find((conf) => conf.id === league)?.name;

function createChampionship(league, teamId, seed = Date.now()) {
  const ids = championshipTeams(league);
  if (!ids.includes(teamId) || ids.length < 2) return null;
  const rounds = roundRobin(ids, makeRng(seed)).slice(0, ids.length % 2 ? ids.length : 6);
  return {
    league, teamId, seed, week: 0, championId: null, bracket: [], seeds: [],
    regular: rounds.map((pairs, week) => pairs.map(([homeId, awayId], i) => ({
      id: 'regular-' + week + '-' + i, homeId, awayId, stage: 'regular',
    }))),
  };
}

function loadChampionship() {
  try {
    const c = JSON.parse(store.get(championshipKey));
    if (!c || !championshipName(c.league) || !championshipTeams(c.league).includes(c.teamId)) return null;
    if (!Array.isArray(c.regular) || !Array.isArray(c.bracket) || !Array.isArray(c.seeds)) return null;
    const league = new Set(championshipTeams(c.league));
    const validTeams = (round) => Array.isArray(round) && round.every((g) =>
      g && (g.homeId === null || league.has(g.homeId)) && (g.awayId === null || league.has(g.awayId)));
    return Number.isInteger(c.week) && c.week >= 0 && c.week <= c.regular.length
      && c.regular.every(validTeams) && c.bracket.every(validTeams) && c.seeds.every((id) => league.has(id)) ? c : null;
  } catch { return null; }
}

function championshipStandings(c) {
  const table = recordTable({ schedule: c.regular.flat() });
  return championshipTeams(c.league).map((id) => table.get(id))
    .sort((a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf || a.teamId.localeCompare(b.teamId));
}

function seedBracket(seeds) {
  let slots = [1, 2];
  while (slots.length < seeds.length) {
    const sum = slots.length * 2 + 1;
    slots = slots.flatMap((seed) => [seed, sum - seed]);
  }
  return slots.map((seed) => seeds[seed - 1] ?? null);
}

function championshipPairings(ids, round) {
  const games = [];
  for (let i = 0; i < ids.length; i += 2) {
    games.push({ id: 'playoff-' + round + '-' + i, homeId: ids[i], awayId: ids[i + 1], neutral: true });
  }
  return games;
}
const currentChampionshipRound = (c) => c.championId ? [] : c.regular[c.week] || c.bracket.at(-1) || [];
const ownChampionshipGame = (c) => currentChampionshipRound(c).find((g) => g.homeId && g.awayId && isMine(c, g));

function advanceChampionship(c, result = null, matchId = null) {
  const round = currentChampionshipRound(c);
  if (!round.length) return false;
  const own = ownChampionshipGame(c);
  if (result && (!own || own.id !== matchId)) return false;
  for (const g of round) {
    if (g.played || !g.homeId || !g.awayId) continue;
    let score;
    if (result && g === own) {
      const home = g.homeId === c.teamId;
      score = { homeScore: home ? result.homeScore : result.awayScore, awayScore: home ? result.awayScore : result.homeScore };
    } else {
      score = simulateScore(getTeam(g.homeId).power + (g.neutral ? 0 : 0.15), getTeam(g.awayId).power, makeRng(c.seed ^ hashSmall(g.id)));
    }
    Object.assign(g, score, { played: true });
  }
  if (c.week < c.regular.length) {
    c.week++;
    if (c.week === c.regular.length) {
      c.seeds = championshipStandings(c).slice(0, c.league === 'national' ? 12 : 8).map((row) => row.teamId);
      c.bracket.push(championshipPairings(seedBracket(c.seeds), 0));
    }
  } else {
    const winners = round.map((g) => g.homeId && g.awayId ? winnerOf(g) : g.homeId || g.awayId);
    if (winners.length === 1) c.championId = winners[0];
    else c.bracket.push(championshipPairings(winners, c.bracket.length));
  }
  store.set(championshipKey, JSON.stringify(c));
  return true;
}

function championshipRoundName(total) {
  return ({ 1: 'FINAL', 2: 'SEMIFINAIS', 4: 'QUARTAS DE FINAL' })[total] || 'PRIMEIRA RODADA';
}

function championshipSetupScreen() {
  const { league, teamId } = app.championshipSetup;
  const leagues = [['national', 'NCAA FBS'], ...CONFERENCES.filter((conf) => championshipTeams(conf.id).length > 1).map((conf) => [conf.id, conf.name])];
  const teams = championshipTeams(league).map(getTeam).sort((a, b) => a.name.localeCompare(b.name));
  const team = getTeam(teamId);
  return `<section class="screen championship-screen">${screenHead('NOVO CAMPEONATO')}
    <div class="split"><div class="box">
      <label class="field"><span>LIGA OU CONFERÊNCIA</span>${selectHtml('championship-league', leagues, league)}</label>
      <label class="field"><span>SEU TIME</span>${selectHtml('championship-team', teams.map((t) => [t.id, fullName(t)]), teamId)}</label>
      <p class="muted">Cada vitória vale 3 pontos. Saldo e pontos marcados desempatarão a classificação.</p>
      <button class="btn primary big" data-action="championship-start">INICIAR CAMPEONATO</button>
    </div><div class="box championship-team" style="${teamTheme(team)}">
      ${crest(team, 'xl')}<h3>${esc(fullName(team))}</h3><p>${esc(championshipName(league))} · ${teams.length} EQUIPES</p>${starsHtml(team.power)}
    </div></div></section>`;
}

function championshipScreen() {
  const c = app.championship;
  if (!c) return championshipSetupScreen();
  const active = currentChampionshipRound(c), own = ownChampionshipGame(c);
  const opponent = own ? getTeam(own.homeId === c.teamId ? own.awayId : own.homeId) : null;
  const team = getTeam(c.teamId), champion = c.championId ? getTeam(c.championId) : null;
  const regular = c.week < c.regular.length;
  const stage = regular ? 'RODADA ' + (c.week + 1) + '/' + c.regular.length : championshipRoundName(active.length);
  const teamLine = (id, score, won) => {
    if (!id) return '<span class="bracket-team">' + (id === null ? 'FOLGA' : 'A DEFINIR') + '</span>';
    const t = getTeam(id);
    return `<span class="bracket-team ${id === c.teamId ? 'mine' : ''} ${won ? 'win' : ''}"><small>${c.seeds.indexOf(id) + 1}</small>${crest(t, 'sm')}${esc(t.short)}<b>${score ?? ''}</b></span>`;
  };
  const columns = [...c.bracket];
  for (let size = (columns.at(-1)?.length ?? 1) / 2; size >= 1; size /= 2) columns.push(Array.from({ length: size }, () => ({})));
  const bracket = columns.map((games) => `<div class="bracket-round"><div class="eyebrow">${championshipRoundName(games.length)}</div>
    ${games.map((g) => `<div class="bracket-game">${teamLine(g.homeId, g.homeScore, g.played && g.homeId === winnerOf(g))}${teamLine(g.awayId, g.awayScore, g.played && g.awayId === winnerOf(g))}</div>`).join('')}</div>`).join('');
  const previous = regular || c.bracket.length === 1 && !c.championId ? c.regular[c.week - 1]
    : c.bracket.at(c.championId ? -1 : -2);
  const results = previous?.filter((g) => g.played).map((g) => `<tr${isMine(c, g) ? ' class="own"' : ''}>
    <td>${esc(getTeam(g.homeId).short)}</td><td><b>${g.homeScore} × ${g.awayScore}</b></td><td>${esc(getTeam(g.awayId).short)}</td></tr>`).join('');
  return `<section class="screen championship-screen">${screenHead('CAMPEONATO', { right: '<button class="btn ghost small" data-action="championship-new">NOVO CAMPEONATO</button>' })}
    <section class="box championship-match" style="${teamTheme(team)}">
      <div><span class="eyebrow">${esc(championshipName(c.league))}</span><h3>${champion ? 'CAMPEÃO' : stage}</h3></div>
      <div class="championship-matchup">${champion ? crest(champion, 'lg') + esc(fullName(champion)) : crest(team, 'lg') + (opponent ? '<b>VS</b>' + crest(opponent, 'lg') + esc(fullName(opponent)) : '<span>SEM PARTIDA NESTA RODADA</span>')}</div>
      ${champion ? '' : `<div class="actions">${own ? '<button class="btn primary" data-action="championship-play" data-autofocus>JOGAR</button>' : ''}<button class="btn ghost" data-action="championship-sim">SIMULAR RODADA</button></div>`}
    </section>
    <section class="box"><h3>CLASSIFICAÇÃO</h3><div class="table-scroll championship-table"><table class="table">
      <thead><tr><th>#</th><th>TIME</th><th>${app.settings.language === 'en' ? 'W' : 'V'}</th><th>${app.settings.language === 'en' ? 'L' : 'D'}</th><th>PF</th><th>PC</th><th>SALDO</th><th>PTS</th></tr></thead>
      <tbody>${championshipStandings(c).map((r, i) => { const t = getTeam(r.teamId); return `<tr class="${r.teamId === c.teamId ? 'own' : ''}"><td>${i + 1}</td><td><span class="team-cell">${crest(t, 'sm')}${esc(t.name)}</span></td><td>${r.wins}</td><td>${r.losses}</td><td>${r.pf}</td><td>${r.pa}</td><td>${r.pf - r.pa}</td><td><b>${r.wins * 3}</b></td></tr>`; }).join('')}</tbody>
    </table></div></section>
    <section class="box"><h3>CHAVEAMENTO</h3>${bracket ? '<div class="bracket">' + bracket + '</div>' : '<p class="muted">O chaveamento abre depois da fase classificatória.</p>'}</section>
    ${results ? '<section class="box"><h3>RESULTADOS DA ÚLTIMA RODADA</h3><div class="table-scroll championship-table"><table class="table"><tbody>' + results + '</tbody></table></div></section>' : ''}
  </section>`;
}
