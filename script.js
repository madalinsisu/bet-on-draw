// Draw Betting Strategy Tracker
class DrawBettingTracker {
    constructor() {
        this.competitions = [];
        this.teams = [];
        this.games = [];
        this.bets = [];
        this.currentView = 'competitions';
        this.selectedCompetition = null;
        this.selectedTeam = null;

        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderAll();
        this.initializeForm();
    }

    // Local Storage Operations
    saveData() {
        localStorage.setItem('drawBetting_competitions', JSON.stringify(this.competitions));
        localStorage.setItem('drawBetting_teams', JSON.stringify(this.teams));
        localStorage.setItem('drawBetting_games', JSON.stringify(this.games));
        localStorage.setItem('drawBetting_bets', JSON.stringify(this.bets));
    }

    loadData() {
        this.competitions = JSON.parse(localStorage.getItem('drawBetting_competitions') || '[]');
        this.teams = JSON.parse(localStorage.getItem('drawBetting_teams') || '[]');
        this.games = JSON.parse(localStorage.getItem('drawBetting_games') || '[]');
        this.bets = JSON.parse(localStorage.getItem('drawBetting_bets') || '[]');
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Competition Management
    addCompetition(competitionData) {
        const competition = {
            id: this.generateId(),
            name: competitionData.name.trim(),
            country: competitionData.country.trim(),
            createdAt: new Date().toISOString()
        };

        this.competitions.push(competition);
        this.saveData();
        this.renderAll();
        this.showNotification('Competition added successfully!', 'success');
    }

    deleteCompetition(competitionId) {
        if (confirm('Are you sure? This will also delete all teams and games in this competition.')) {
            this.competitions = this.competitions.filter(c => c.id !== competitionId);
            this.teams = this.teams.filter(t => t.competitionId !== competitionId);
            this.games = this.games.filter(g => g.competitionId !== competitionId);
            this.bets = this.bets.filter(b => b.competitionId !== competitionId);
            this.saveData();
            this.renderAll();
            this.showNotification('Competition deleted successfully!', 'success');
        }
    }

    // Team Management
    addTeam(teamData) {
        if (!this.selectedCompetition) {
            this.showNotification('Please select a competition first', 'error');
            return;
        }

        const team = {
            id: this.generateId(),
            competitionId: this.selectedCompetition,
            name: teamData.name.trim(),
            createdAt: new Date().toISOString(),
            favorite: false
        };

        this.teams.push(team);
        this.teams = this.teams.sort((a, b) => {
            if (a.favorite && !b.favorite) {
                return -1;
            } else if (!a.favorite && b.favorite) {
                return 1;
            }
            return a.name.localeCompare(b.name)
        });
        this.saveData();
        this.renderAll();
        this.showNotification('Team added successfully!', 'success');
    }

    deleteTeam(teamId) {
        if (confirm('Are you sure? This will also delete all games and bets for this team.')) {
            this.teams = this.teams.filter(t => t.id !== teamId);
            this.games = this.games.filter(g => g.homeTeamId !== teamId && g.awayTeamId !== teamId);
            this.bets = this.bets.filter(b => b.teamId !== teamId);
            this.saveData();
            this.renderAll();
            this.showNotification('Team deleted successfully!', 'success');
        }
    }

    toggleFavorite(teamId) {
        this.teams.filter(t => t.id === teamId).forEach(t => {
            t.favorite = !t.favorite;
        });
        this.teams = this.teams.sort((a, b) => {
            if (a.favorite && !b.favorite) {
                return -1;
            } else if (!a.favorite && b.favorite) {
                return 1;
            }
            return a.name.localeCompare(b.name)
        });
        this.saveData();
        this.renderAll();
        this.showNotification('Team updated successfully!', 'success');
    }

    // Game Management
    addGame(gameData) {
        if (!this.selectedCompetition) {
            this.showNotification('Please select a competition first', 'error');
            return;
        }

        const game = {
            id: this.generateId(),
            competitionId: this.selectedCompetition,
            homeTeamId: gameData.homeTeamId,
            awayTeamId: gameData.awayTeamId,
            gameDate: gameData.gameDate,
            drawOdds: gameData.drawOdds ? parseFloat(gameData.drawOdds) : null,
            result: null,
            createdAt: new Date().toISOString()
        };

        this.games.push(game);
        this.saveData();
        this.renderAll();
        this.showNotification('Game added successfully!', 'success');
    }

    // Bet Management
    addBet(betData) {
        const bet = {
            id: this.generateId(),
            gameId: betData.gameId,
            teamId: betData.teamId,
            competitionId: betData.competitionId,
            amount: parseFloat(betData.amount),
            odds: parseFloat(betData.odds),
            result: null,
            createdAt: new Date().toISOString()
        };

        this.bets.push(bet);
        this.saveData();
        this.renderAll();
        this.showNotification('Bet placed successfully!', 'success');
    }

    // Calculate next bet amount based on new strategy
    calculateNextBetAmount(teamId, currentOdds = null) {
    const teamBets = this.bets
        .filter(b => b.teamId === teamId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (teamBets.length === 0) {
        return 1; // ✅ no previous bets → start with 1
    }

    const lastBet = teamBets[teamBets.length - 1];
    if (lastBet.result === 'win') {
        return 1; // ✅ reset after a win
    }

    // Find the last win index
    const lastWinIndex = teamBets.map(b => b.result).lastIndexOf('win');

    // Bets after the last win
    let betsAfterLastWin = lastWinIndex === -1
        ? teamBets
        : teamBets.slice(lastWinIndex + 1);

    // Exclude the last (current) bet — we’re calculating the *next* one
    betsAfterLastWin = betsAfterLastWin.slice(0, -1);

    if (betsAfterLastWin.length === 0) {
        return 1; // ✅ no losing streak yet → start with 1
    }

    // Total losses in the current losing streak
    const totalLosses = betsAfterLastWin.reduce((sum, bet) => sum + bet.amount, 0);

    // ✅ Calculate next bet to recover all losses + 25% profit
    if (currentOdds && currentOdds > 0) {
        const targetReturn = totalLosses * 1.25; // recover +25%
        const requiredBet = targetReturn / currentOdds;
        return requiredBet + 1; // ✅ add 1 only when there is a losing streak
    }

    // If no odds provided, just return the target total (fallback)
    return totalLosses * 1.25 + 1;
}

    // Calculate current drawdown for a team
    calculateDrawdown(teamId) {
    const teamBets = this.bets.filter(b => b.teamId === teamId);
    const completedBets = teamBets.filter(b => b.result !== null);
    if (completedBets.length === 0) return 0;

    // Find index of the last winning bet
    const lastWinIndex = completedBets.map(b => b.result).lastIndexOf('win');
    // Consider only bets after the last win
    const betsAfterLastWin = lastWinIndex === -1
        ? completedBets
        : completedBets.slice(lastWinIndex + 1);

    if (betsAfterLastWin.length === 0) return 0;

    // Drawdown is the total of all bet amounts after the last win
    return betsAfterLastWin.reduce((sum, bet) => sum + bet.amount, 0);
}

    // Calculate total winnings for a team
    calculateTotalWinnings(teamId) {
        const teamBets = this.bets.filter(b => b.teamId === teamId);
        const completedBets = teamBets.filter(b => b.result !== null);

        return completedBets
            .filter(b => b.result === 'win')
            .reduce((sum, bet) => sum + (bet.amount * bet.odds), 0);
    }

    // Delete game
    deleteGame(gameId) {
        if (confirm('Are you sure? This will also delete any bets for this game.')) {
            this.games = this.games.filter(g => g.id !== gameId);
            this.bets = this.bets.filter(b => b.gameId !== gameId);
            this.saveData();
            this.renderAll();
            this.showNotification('Game deleted successfully!', 'success');
        }
    }

    // Delete bet
    deleteBet(betId) {
        if (confirm('Are you sure you want to delete this bet?')) {
            this.bets = this.bets.filter(b => b.id !== betId);
            this.saveData();
            this.renderAll();
            this.showNotification('Bet deleted successfully!', 'success');
        }
    }

    // Update game result
    updateGameResult(gameId, result) {
        const gameIndex = this.games.findIndex(g => g.id === gameId);
        if (gameIndex !== -1) {
            this.games[gameIndex].result = result;

            // Update corresponding bet results
            this.bets.forEach(bet => {
                if (bet.gameId === gameId) {
                    bet.result = result === 'draw' ? 'win' : 'loss';
                }
            });

            this.saveData();
            this.renderAll();
            this.showNotification('Result updated successfully!', 'success');
        }
    }

    // Get team name by ID
    getTeamName(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        return team ? team.name : 'Unknown Team';
    }

    // Get competition name by ID
    getCompetitionName(competitionId) {
        const competition = this.competitions.find(c => c.id === competitionId);
        return competition ? competition.name : 'Unknown Competition';
    }

    // Render all views
    renderAll() {
        this.renderCompetitions();
        this.renderTeams();
        this.renderGames();
        this.renderBets();
        this.renderStats();
        this.updateSelectors();
    }

    // Render competitions view
    renderCompetitions() {
        const container = document.getElementById('competitionsList');

        if (this.competitions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No competitions yet</h3>
                    <p>Add your first competition to get started!</p>
                </div>
            `;
            return;
        }

        const competitionsHTML = this.competitions.map(competition => `
            <div class="game-card">
                <div class="game-header">
                    <div class="game-teams">
                        <strong>${competition.name}</strong>
                    </div>
                    <div class="result-status result-pending">
                        ${competition.country}
                    </div>
                </div>
                <div class="game-details">
                    <div class="detail-item">
                        <div class="detail-label">Teams</div>
                        <div class="detail-value">${this.teams.filter(t => t.competitionId === competition.id).length}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Games</div>
                        <div class="detail-value">${this.games.filter(g => g.competitionId === competition.id).length}</div>
                    </div>
                </div>
                <div class="game-actions">
                    <button class="btn btn-danger delete-competition-btn" data-competition-id="${competition.id}">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = competitionsHTML;
    }

    // Render teams view
    renderTeams() {
        const container = document.getElementById('teamsList');
        const competitionName = document.getElementById('currentCompetitionName');

        if (this.selectedCompetition) {
            const competition = this.competitions.find(c => c.id === this.selectedCompetition);
            competitionName.textContent = competition ? competition.name : 'Unknown';
        } else {
            competitionName.textContent = 'Select Competition';
        }

        const teamsInCompetition = this.teams.filter(t => t.competitionId === this.selectedCompetition);

        if (!this.selectedCompetition) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Select a competition</h3>
                    <p>Choose a competition to view its teams</p>
                </div>
            `;
            return;
        }

        if (teamsInCompetition.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No teams yet</h3>
                    <p>Add teams to this competition to start betting!</p>
                </div>
            `;
            return;
        }

        const teamsHTML = teamsInCompetition
            .map(team => {
                const teamBets = this.bets.filter(b => b.teamId === team.id);
                // Find next upcoming game for this team in this competition
                const now = new Date();
                const teamGames = this.games.filter(g =>
                    g.competitionId === team.competitionId &&
                    (g.homeTeamId === team.id || g.awayTeamId === team.id)
                );
                let odds = null;
                // Try to get odds from the next future game
                const nextGame = teamGames
                    .filter(g => new Date(g.gameDate) > now && g.drawOdds)
                    .sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate))[0];
                if (nextGame) {
                    odds = nextGame.drawOdds;
                } else {
                    // Fallback: use the most recent game with odds
                    const lastGame = teamGames
                        .filter(g => g.drawOdds)
                        .sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate))[0];
                    if (lastGame) odds = lastGame.drawOdds;
                }
                const nextBetAmount = this.calculateNextBetAmount(team.id, odds);
                const drawdown = this.calculateDrawdown(team.id);
                const totalWinnings = this.calculateTotalWinnings(team.id);
                const totalBet = teamBets.filter(b => b.result !== null).reduce((sum, bet) => sum + bet.amount, 0);
                const profit = totalWinnings - totalBet;
                return {
                    team,
                    teamBets,
                    nextBetAmount,
                    drawdown,
                    totalWinnings,
                    profit
                };
            })
            .sort((a, b) => {
                if (a.team.favorite && !b.team.favorite) {
                    return -1;
                } else if (!a.team.favorite && b.team.favorite) {
                    return 1;
                }
                if (b.profit !== a.profit) {
                    return b.profit - a.profit;
                }
                return a.team.name.localeCompare(b.team.name);
            })
            .map(({ team, teamBets, nextBetAmount, drawdown, totalWinnings, profit }) => `
                <div class="game-card">
                    <div class="game-header">
                        <div class="game-teams">
                            <span class="favorite-icon"
                                data-team-id="${team.id}"
                                data-favorite="${!!team.favorite}"
                                style="cursor:pointer; margin-right:5px;">
                                ${!!team.favorite ? '⭐' : '☆'}
                            </span>
                            <strong>${team.name}</strong>
                        </div>
                        <div class="result-status ${profit >= 0 ? 'result-win' : 'result-loss'}">
                            ${profit >= 0 ? 'PROFIT' : 'LOSS'}
                        </div>
                    </div>
                    <div class="game-details">
                        <div class="detail-item">
                            <div class="detail-label">Current Drawdown</div>
                            <div class="detail-value">$${drawdown.toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Profit</div>
                            <div class="detail-value">$${profit.toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Total Bets</div>
                            <div class="detail-value">${teamBets.length}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Wins</div>
                            <div class="detail-value">${teamBets.filter(b => b.result === 'win').length}</div>
                        </div>
                    </div>
                    <div class="game-actions">
                        <button class="btn btn-danger delete-team-btn" data-team-id="${team.id}">
                            Delete
                        </button>
                    </div>
                </div>
            `)
            .join('');

        container.innerHTML = teamsHTML;
    }

    // Render games view
    renderGames() {
        const container = document.getElementById('gamesList');

        let filteredGames = this.games;

        if (this.selectedCompetition) {
            filteredGames = filteredGames.filter(g => g.competitionId === this.selectedCompetition);
        }

        // Sort games: pending first, then with result; within each group, future games first, then past games by date
        filteredGames.sort((a, b) => {
            // Pending games first
            const aPending = !a.result;
            const bPending = !b.result;
            if (aPending && !bPending) return -1;
            if (!aPending && bPending) return 1;
            // Both pending or both with result: sort by future/past and date
            const now = new Date();
            const aDate = new Date(a.gameDate);
            const bDate = new Date(b.gameDate);
            const aIsFuture = aDate > now;
            const bIsFuture = bDate > now;
            if (aIsFuture && !bIsFuture) return -1;
            if (!aIsFuture && bIsFuture) return 1;
            return aDate - bDate;
        });

        if (filteredGames.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No games</h3>
                    <p>Add games to start tracking matches!</p>
                </div>
            `;
            return;
        }

        const gamesHTML = filteredGames.map(game => {
            const homeTeam = this.teams.find(t => t.id === game.homeTeamId);
            const awayTeam = this.teams.find(t => t.id === game.awayTeamId);
            const gameDate = new Date(game.gameDate).toLocaleDateString();
            const isUpcoming = new Date(game.gameDate) > new Date();
            const hasBet = this.bets.some(b => b.gameId === game.id);

            return `
                <div class="game-card">
                    <div class="game-header">
                        <div class="game-teams">
                            ${homeTeam ? homeTeam.name : 'Unknown'} <span class="game-vs">vs</span> ${awayTeam ? awayTeam.name : 'Unknown'}
                        </div>
                        <div class="result-status ${game.result ? (game.result === 'draw' ? 'result-win' : 'result-loss') : 'result-pending'}">
                            ${game.result ? (game.result === 'draw' ? 'DRAW' : 'NO DRAW') : 'PENDING'}
                        </div>
                    </div>
                    <div class="game-details">
                        <div class="detail-item">
                            <div class="detail-label">Date</div>
                            <div class="detail-value">${gameDate} ${isUpcoming ? '📅' : '🏁'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Draw Odds</div>
                            <div class="detail-value">${game.drawOdds ? game.drawOdds : 'Not set'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Status</div>
                            <div class="detail-value">${hasBet ? 'Bet Placed' : 'No Bet'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Result</div>
                            <div class="detail-value">${game.result ? (game.result === 'draw' ? 'Draw' : 'No Draw') : 'Pending'}</div>
                        </div>
                    </div>
                    <div class="game-actions">
                        ${!game.result ? `
                            <button class="btn btn-warning update-result-btn" data-game-id="${game.id}">
                                Update Result
                            </button>
                        ` : `
                            <button class="btn btn-secondary update-result-btn" data-game-id="${game.id}">
                                Change Result
                            </button>
                        `}
                        ${!hasBet ? `
                            <button class="btn btn-primary place-bet-btn" data-game-id="${game.id}">
                                Place Bet
                            </button>
                        ` : ''}
                        <button class="btn btn-danger delete-game-btn" data-game-id="${game.id}">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = gamesHTML;
    }

    // Render bets view
    renderBets() {
        const container = document.getElementById('betsList');

        let filteredBets = this.bets;

        if (this.selectedCompetition) {
            filteredBets = filteredBets.filter(b => b.competitionId === this.selectedCompetition);
        }

        if (this.selectedTeam) {
            filteredBets = filteredBets.filter(b => b.teamId === this.selectedTeam);
        }

        if (filteredBets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No bets yet</h3>
                    <p>Add games and place bets to see them here!</p>
                </div>
            `;
            return;
        }

        const betsHTML = filteredBets
            .map(bet => {
                const game = this.games.find(g => g.id === bet.gameId);
                const team = this.teams.find(t => t.id === bet.teamId);
                const homeTeam = this.teams.find(t => t.id === game.homeTeamId);
                const awayTeam = this.teams.find(t => t.id === game.awayTeamId);
                const isPending = bet.result === null;

                return {
                    bet,
                    game,
                    team,
                    homeTeam,
                    awayTeam,
                    isPending
                };
            })
            .sort((a, b) => {
                // Sort pending bets first, then by date (newest first)
                if (a.isPending !== b.isPending) {
                    return b.isPending - a.isPending;
                }
                return new Date(b.game.gameDate) - new Date(a.game.gameDate);
            })
            .map(({ bet, game, team, homeTeam, awayTeam }) => `
                <div class="game-card">
                    <div class="game-header">
                        <div class="game-teams">
                            ${homeTeam.name} <span class="game-vs">vs</span> ${awayTeam.name}
                        </div>
                        <div class="result-status ${bet.result ? (bet.result === 'win' ? 'result-win' : 'result-loss') : 'result-pending'}">
                            ${bet.result ? (bet.result === 'win' ? 'WIN' : 'LOSS') : 'PENDING'}
                        </div>
                    </div>
                    <div class="game-details">
                        <div class="detail-item">
                            <div class="detail-label">Team</div>
                            <div class="detail-value">${team.name}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Bet Amount</div>
                            <div class="detail-value">$${bet.amount.toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Odds</div>
                            <div class="detail-value">${bet.odds}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Potential Win</div>
                            <div class="detail-value">$${(bet.amount * bet.odds).toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="game-actions">
                        ${!game.result ? `
                            <button class="btn btn-warning update-result-btn" data-game-id="${game.id}">
                                Update Result
                            </button>
                        ` : `
                            <button class="btn btn-secondary update-result-btn" data-game-id="${game.id}">
                                Change Result
                            </button>
                        `}
                        <button class="btn btn-danger delete-bet-btn" data-bet-id="${bet.id}">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');

        container.innerHTML = betsHTML;
    }

    // Render stats view
    renderStats() {
        const container = document.getElementById('statsContent');

        let filteredBets = this.bets;
        let filteredTeams = this.teams;

        if (this.selectedCompetition) {
            filteredBets = filteredBets.filter(b => b.competitionId === this.selectedCompetition);
            filteredTeams = filteredTeams.filter(t => t.competitionId === this.selectedCompetition);
        }

        if (this.selectedTeam) {
            filteredBets = filteredBets.filter(b => b.teamId === this.selectedTeam);
        }

        const totalBets = filteredBets.length;
        const completedBets = filteredBets.filter(b => b.result !== null);
        const wins = completedBets.filter(b => b.result === 'win').length;
        const losses = completedBets.filter(b => b.result === 'loss').length;
        const totalBetAmount = completedBets.reduce((sum, bet) => sum + bet.amount, 0);
        const totalWinnings = completedBets
            .filter(b => b.result === 'win')
            .reduce((sum, bet) => sum + (bet.amount * bet.odds), 0);
        const netProfit = totalWinnings - totalBetAmount;
        const winRate = completedBets.length > 0 ? ((wins / completedBets.length) * 100).toFixed(1) : 0;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h3>📊 Overall Statistics</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        <div><strong>Total Bets:</strong> ${totalBets}</div>
                        <div><strong>Completed Bets:</strong> ${completedBets.length}</div>
                        <div><strong>Wins:</strong> ${wins}</div>
                        <div><strong>Losses:</strong> ${losses}</div>
                        <div><strong>Win Rate:</strong> ${winRate}%</div>
                        <div><strong>Total Bet:</strong> $${totalBetAmount.toFixed(2)}</div>
                        <div><strong>Total Winnings:</strong> $${totalWinnings.toFixed(2)}</div>
                        <div><strong>Net Profit:</strong> $${netProfit.toFixed(2)}</div>
                    </div>
                </div>
                <div>
                    <h3>👥 Team Statistics</h3>
                    ${filteredTeams.map(team => {
            const teamBets = filteredBets.filter(b => b.teamId === team.id);
            const teamWins = teamBets.filter(b => b.result === 'win').length;
            const teamLosses = teamBets.filter(b => b.result === 'loss').length;
            const teamTotalBet = teamBets.reduce((sum, bet) => sum + bet.amount, 0);
            const teamWinnings = teamBets
                .filter(b => b.result === 'win')
                .reduce((sum, bet) => sum + (bet.amount * bet.odds), 0);
            const teamProfit = teamWinnings - teamTotalBet;

            return `
                            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                                <strong>${team.name}</strong><br>
                                Bets: ${teamBets.length} | Wins: ${teamWins} | Losses: ${teamLosses}<br>
                                Profit: $${teamProfit.toFixed(2)}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    // Update selectors
    updateSelectors() {
        // Update competition selectors
        const competitionSelectors = [
            'competitionSelector',
            'betCompetitionSelector',
            'statsCompetitionSelector',
            'gameCompetitionSelector'
        ];

        competitionSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '<option value="">Select Competition</option>';
                this.competitions.forEach(competition => {
                    const option = document.createElement('option');
                    option.value = competition.id;
                    option.textContent = competition.name;
                    selector.appendChild(option);
                });
                selector.value = currentValue;
            }
        });

        // Update team selectors
        const teamSelectors = ['betTeamSelector', 'statsTeamSelector'];
        teamSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '<option value="">Select Team</option>';
                const teamsInCompetition = this.teams.filter(t => t.competitionId === this.selectedCompetition);
                teamsInCompetition.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    selector.appendChild(option);
                });
                selector.value = currentValue;
            }
        });

        // Update game team selectors
        const gameTeamSelectors = ['gameHomeTeam', 'gameAwayTeam'];
        gameTeamSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                selector.innerHTML = '<option value="">Select Team</option>';
                const teamsInCompetition = this.teams.filter(t => t.competitionId === this.selectedCompetition);
                teamsInCompetition.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    selector.appendChild(option);
                });
            }
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchView(tab.dataset.view);
            });
        });

        // Competition management
        document.getElementById('addCompetitionBtn').addEventListener('click', () => {
            document.getElementById('competitionModal').style.display = 'block';
        });

        document.getElementById('competitionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCompetition();
        });

        // Team management
        document.getElementById('addTeamBtn').addEventListener('click', () => {
            document.getElementById('teamModal').style.display = 'block';
            // Default to single team tab
            document.getElementById('singleTeamTab').classList.add('active');
            document.getElementById('multiTeamTab').classList.remove('active');
            document.getElementById('singleTeamForm').style.display = 'block';
            document.getElementById('multiTeamForm').style.display = 'none';
        });
        // Tab/toggle logic
        document.getElementById('singleTeamTab').addEventListener('click', () => {
            document.getElementById('singleTeamTab').classList.add('active');
            document.getElementById('multiTeamTab').classList.remove('active');
            document.getElementById('singleTeamForm').style.display = 'block';
            document.getElementById('multiTeamForm').style.display = 'none';
        });
        document.getElementById('multiTeamTab').addEventListener('click', () => {
            document.getElementById('multiTeamTab').classList.add('active');
            document.getElementById('singleTeamTab').classList.remove('active');
            document.getElementById('multiTeamForm').style.display = 'block';
            document.getElementById('singleTeamForm').style.display = 'none';
        });
        // Single team form
        document.getElementById('singleTeamForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddSingleTeam();
        });
        // Multi team form
        document.getElementById('multiTeamForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddMultipleTeams();
        });

        // Game management
        document.getElementById('addGameBtn').addEventListener('click', () => {
            document.getElementById('gameModal').style.display = 'block';
        });

        document.getElementById('gameForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddGame();
        });

        // Bet management
        document.getElementById('betForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePlaceBet();
        });

        // Auto-fill bet amount when team is selected
        document.getElementById('betTeam').addEventListener('change', (e) => {
            const selectedTeamId = e.target.value;
            if (selectedTeamId) {
                const team = this.teams.find(t => t.id === selectedTeamId);
                const drawdown = this.calculateDrawdown(selectedTeamId);
                const currentOdds = parseFloat(document.getElementById('betOdds').value) || null;
                const nextBetAmount = this.calculateNextBetAmount(selectedTeamId, currentOdds);

                document.getElementById('betAmount').value = nextBetAmount.toFixed(2);
                document.getElementById('betStrategyInfo').innerHTML = `
                    <strong>Current Drawdown:</strong> $${drawdown.toFixed(2)}<br>
                    <strong>Calculated Amount:</strong> $${nextBetAmount.toFixed(2)}
                `;
            } else {
                document.getElementById('betAmount').value = '';
                document.getElementById('betStrategyInfo').innerHTML = '';
            }
        });

        // Update bet amount when odds change
        document.getElementById('betOdds').addEventListener('input', (e) => {
            const selectedTeamId = document.getElementById('betTeam').value;
            if (selectedTeamId) {
                const team = this.teams.find(t => t.id === selectedTeamId);
                const drawdown = this.calculateDrawdown(selectedTeamId);
                const currentOdds = parseFloat(e.target.value) || null;
                const nextBetAmount = this.calculateNextBetAmount(selectedTeamId, currentOdds);

                document.getElementById('betAmount').value = nextBetAmount.toFixed(2);
                document.getElementById('betStrategyInfo').innerHTML = `
                    <strong>Current Drawdown:</strong> $${drawdown.toFixed(2)}<br>
                    <strong>Calculated Amount:</strong> $${nextBetAmount.toFixed(2)}
                `;
            }
        });

        // Selector changes
        document.getElementById('competitionSelector').addEventListener('change', (e) => {
            this.selectedCompetition = e.target.value || null;
            this.renderAll();
        });

        document.getElementById('betCompetitionSelector').addEventListener('change', (e) => {
            this.selectedCompetition = e.target.value || null;
            this.renderAll();
        });

        document.getElementById('gameCompetitionSelector').addEventListener('change', (e) => {
            this.selectedCompetition = e.target.value || null;
            this.renderAll();
        });

        document.getElementById('betTeamSelector').addEventListener('change', (e) => {
            this.selectedTeam = e.target.value || null;
            this.renderAll();
        });

        document.getElementById('statsCompetitionSelector').addEventListener('change', (e) => {
            this.selectedCompetition = e.target.value || null;
            this.renderAll();
        });

        document.getElementById('statsTeamSelector').addEventListener('change', (e) => {
            this.selectedTeam = e.target.value || null;
            this.renderAll();
        });

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest('.modal').style.display = 'none';
            });
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Delegate events for dynamic content
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-competition-btn')) {
                this.deleteCompetition(e.target.dataset.competitionId);
            } else if (e.target.classList.contains('delete-team-btn')) {
                this.deleteTeam(e.target.dataset.teamId);
            } else if (e.target.classList.contains('delete-game-btn')) {
                this.deleteGame(e.target.dataset.gameId);
            } else if (e.target.classList.contains('delete-bet-btn')) {
                this.deleteBet(e.target.dataset.betId);
            } else if (e.target.classList.contains('update-result-btn')) {
                this.openResultModal(e.target.dataset.gameId);
            } else if (e.target.classList.contains('place-bet-btn')) {
                this.openBetModal(e.target.dataset.gameId);
            } else if (e.target.classList.contains('favorite-icon')) {
                this.toggleFavorite(e.target.dataset.teamId);
            }
        });

        // Result modal
        const resultForm = document.getElementById('resultForm');
        const resultBtns = document.querySelectorAll('.result-btn');

        resultBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        resultForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpdateResult();
        });
    }

    // Switch view
    switchView(view) {
        this.currentView = view;

        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update active view
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${view}View`).classList.add('active');

        // copy to clipboard

        this.copyToClipboard();
    }

    copyToClipboard() {
        var objectToCopy = {
            drawBetting_competitions: this.competitions,
            drawBetting_teams: this.teams,
            drawBetting_games: this.games,
            drawBetting_bets: this.bets
        };
        navigator.clipboard.writeText(JSON.stringify(objectToCopy));
    }

    // Handle add competition
    handleAddCompetition() {
        const formData = {
            name: document.getElementById('competitionName').value,
            country: document.getElementById('competitionCountry').value
        };

        if (!formData.name || !formData.country) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        this.addCompetition(formData);
        document.getElementById('competitionForm').reset();
        document.getElementById('competitionModal').style.display = 'none';
    }

    // Handle add single team
    handleAddSingleTeam() {
        const name = document.getElementById('teamName').value.trim();
        if (!name) {
            this.showNotification('Please enter a team name', 'error');
            return;
        }
        this.addTeam({ name });
        document.getElementById('singleTeamForm').reset();
        document.getElementById('teamModal').style.display = 'none';
    }
    handleAddMultipleTeams() {
        const bulkTeams = document.getElementById('bulkTeams').value;
        if (!bulkTeams.trim()) {
            this.showNotification('Please enter at least one team name', 'error');
            return;
        }
        const teamNames = bulkTeams.split(',').map(name => name.trim()).filter(name => name);
        if (teamNames.length === 0) {
            this.showNotification('Please enter valid team names', 'error');
            return;
        }
        teamNames.forEach(teamName => {
            this.addTeam({ name: teamName });
        });
        this.showNotification(`${teamNames.length} teams added successfully!`, 'success');
        document.getElementById('multiTeamForm').reset();
        document.getElementById('teamModal').style.display = 'none';
    }

    // Handle add game
    handleAddGame() {
        const formData = {
            homeTeamId: document.getElementById('gameHomeTeam').value,
            awayTeamId: document.getElementById('gameAwayTeam').value,
            gameDate: document.getElementById('gameDate').value,
            drawOdds: document.getElementById('drawOdds').value
        };

        if (!formData.homeTeamId || !formData.awayTeamId || !formData.gameDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (formData.homeTeamId === formData.awayTeamId) {
            this.showNotification('Home and away teams cannot be the same', 'error');
            return;
        }

        this.addGame(formData);
        document.getElementById('gameForm').reset();
        document.getElementById('gameModal').style.display = 'none';
    }

    // Handle place bet
    handlePlaceBet() {
        const formData = {
            amount: document.getElementById('betAmount').value,
            odds: document.getElementById('betOdds').value,
            teamId: document.getElementById('betTeam').value
        };

        if (!formData.amount || !formData.odds || !formData.teamId) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (parseFloat(formData.amount) <= 0) {
            this.showNotification('Bet amount must be greater than 0', 'error');
            return;
        }

        if (parseFloat(formData.odds) < 1) {
            this.showNotification('Odds must be 1 or greater', 'error');
            return;
        }

        const game = this.games.find(g => g.id === this.currentGameId);
        if (!game) {
            this.showNotification('Game not found', 'error');
            return;
        }

        const selectedTeam = this.teams.find(t => t.id === formData.teamId);
        if (!selectedTeam) {
            this.showNotification('Selected team not found', 'error');
            return;
        }

        const betData = {
            gameId: this.currentGameId,
            teamId: selectedTeam.id,
            competitionId: game.competitionId,
            amount: parseFloat(formData.amount),
            odds: parseFloat(formData.odds)
        };

        this.addBet(betData);
        document.getElementById('betForm').reset();
        document.getElementById('betModal').style.display = 'none';
    }

    // Open result modal
    openResultModal(gameId) {
        this.currentGameId = gameId;
        const game = this.games.find(g => g.id === gameId);

        if (game && game.result) {
            const currentResultBtn = document.querySelector(`[data-result="${game.result}"]`);
            if (currentResultBtn) {
                currentResultBtn.classList.add('selected');
            }
        }

        document.getElementById('resultModal').style.display = 'block';
    }

    // Open bet modal
    openBetModal(gameId) {
        this.currentGameId = gameId;
        const game = this.games.find(g => g.id === gameId);

        if (!game) return;

        const homeTeam = this.teams.find(t => t.id === game.homeTeamId);
        const awayTeam = this.teams.find(t => t.id === game.awayTeamId);
        const gameDate = new Date(game.gameDate).toLocaleDateString();

        // Display game info
        document.getElementById('betGameInfo').innerHTML = `
            <strong>${homeTeam ? homeTeam.name : 'Unknown'} vs ${awayTeam ? awayTeam.name : 'Unknown'}</strong><br>
            Date: ${gameDate}<br>
            Current Draw Odds: ${game.drawOdds ? game.drawOdds : 'Not set'}
        `;

        // Populate team selector
        const betTeamSelector = document.getElementById('betTeam');
        betTeamSelector.innerHTML = '<option value="">Select Team</option>';

        const teamsInGame = [homeTeam, awayTeam].filter(t => t);
        teamsInGame.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            betTeamSelector.appendChild(option);
        });

        // Clear bet amount initially
        document.getElementById('betAmount').value = '';
        document.getElementById('betStrategyInfo').innerHTML = '';

        // Pre-fill odds if available
        if (game.drawOdds) {
            document.getElementById('betOdds').value = game.drawOdds;
        }

        document.getElementById('betModal').style.display = 'block';
    }

    // Handle update result
    handleUpdateResult() {
        const selectedResult = document.querySelector('.result-btn.selected');
        if (!selectedResult) {
            this.showNotification('Please select a result', 'error');
            return;
        }

        this.updateGameResult(this.currentGameId, selectedResult.dataset.result);
        document.getElementById('resultModal').style.display = 'none';
        document.querySelectorAll('.result-btn').forEach(btn => btn.classList.remove('selected'));
    }

    // Initialize form
    initializeForm() {
        document.getElementById('gameDate').value = new Date().toISOString().split('T')[0];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DrawBettingTracker();
}); 