/**
 * MTG Top 8 Calculator
 * Calculates the probability of making Top 8 in Magic: The Gathering Swiss tournaments
 * Includes in-progress tournament analysis with draw/play recommendations
 */

(function () {
    'use strict';

    // =====================
    // DOM Elements
    // =====================
    var playersInput = document.getElementById('players');
    var roundsDisplay = document.getElementById('rounds-display');
    var inProgressToggle = document.getElementById('in-progress');
    var winsInput = document.getElementById('wins');
    var lossesInput = document.getElementById('losses');
    var drawsInput = document.getElementById('draws');
    var recordDisplay = document.getElementById('record-display');
    var pointsDisplay = document.getElementById('points-display');
    var roundsPlayedDisplay = document.getElementById('rounds-played-display');
    var calculateBtn = document.getElementById('calculate-btn');
    var resultsSection = document.getElementById('results-section');
    var strategySection = document.getElementById('strategy-section');
    var summaryRecord = document.getElementById('summary-record');
    var summaryInfo = document.getElementById('summary-info');
    var summaryVerdict = document.getElementById('summary-verdict');
    var thresholdsBody = document.getElementById('thresholds-body');
    var strategyTitle = document.getElementById('strategy-title');
    var strategySubtitle = document.getElementById('strategy-subtitle');
    var strategyVerdict = document.getElementById('strategy-verdict');
    var scenariosDescription = document.getElementById('scenarios-description');
    var scenariosBody = document.getElementById('scenarios-body');

    // =====================
    // Tournament Math
    // =====================

    function getRounds(players) {
        if (players < 2) return 0;
        return Math.ceil(Math.log2(players));
    }

    function getMatchPoints(wins, draws) {
        return wins * 3 + draws * 1;
    }

    function generateAllRecords(rounds) {
        var records = [];
        for (var w = rounds; w >= 0; w--) {
            for (var d = rounds - w; d >= 0; d--) {
                var l = rounds - w - d;
                records.push({ wins: w, losses: l, draws: d });
            }
        }
        return records;
    }

    /**
     * Estimate the probability of making Top 8 for a given final record
     */
    function estimateTop8Probability(wins, losses, draws, totalRounds, numPlayers) {
        var points = getMatchPoints(wins, draws);

        if (numPlayers <= 8) return 100;

        var thresholdPoints;
        if (numPlayers <= 16) {
            thresholdPoints = 9;
        } else if (numPlayers <= 32) {
            thresholdPoints = 12;
        } else if (numPlayers <= 64) {
            thresholdPoints = 15;
        } else if (numPlayers <= 128) {
            thresholdPoints = 16;
        } else if (numPlayers <= 256) {
            thresholdPoints = 18;
        } else if (numPlayers <= 512) {
            thresholdPoints = 21;
        } else if (numPlayers <= 1024) {
            thresholdPoints = 24;
        } else {
            thresholdPoints = (totalRounds - 2) * 3;
        }

        var diff = points - thresholdPoints;

        if (diff >= 6) return 100;
        if (diff >= 3) return 98;
        if (diff >= 1) return 92;
        if (diff === 0) return 75;
        if (diff === -1) return 50;
        if (diff === -2) return 25;
        if (diff === -3) return 10;
        if (diff === -4) return 3;
        if (diff === -5) return 1;
        return 0;
    }

    function getProbClass(prob) {
        if (prob >= 85) return 'prob-high';
        if (prob >= 60) return 'prob-likely';
        if (prob >= 30) return 'prob-medium';
        if (prob >= 5) return 'prob-low';
        return 'prob-none';
    }

    function getStatusInfo(prob) {
        if (prob >= 90) return { text: 'Locked In', class: 'status-safe' };
        if (prob >= 60) return { text: 'Likely', class: 'status-likely' };
        if (prob >= 25) return { text: 'Possible', class: 'status-possible' };
        if (prob >= 3) return { text: 'Unlikely', class: 'status-unlikely' };
        return { text: 'Out', class: 'status-out' };
    }

    function getVerdict(prob) {
        if (prob >= 90) return { text: 'You are almost certainly making Top 8!', class: 'verdict-safe' };
        if (prob >= 60) return { text: 'Good chances! Keep it up to lock in Top 8.', class: 'verdict-likely' };
        if (prob >= 25) return { text: 'You have a shot, but tiebreakers will matter.', class: 'verdict-possible' };
        if (prob >= 3) return { text: 'It will be tough, but not impossible.', class: 'verdict-unlikely' };
        return { text: 'Unfortunately, with this record the chances are very low.', class: 'verdict-eliminated' };
    }

    // =====================
    // Scenario Generator
    // Generate all possible outcomes for remaining rounds
    // =====================

    /**
     * Generate all combinations of W/L/D for a given number of remaining rounds
     */
    function generateRemainingScenarios(remaining) {
        var scenarios = [];
        for (var w = remaining; w >= 0; w--) {
            for (var d = remaining - w; d >= 0; d--) {
                var l = remaining - w - d;
                scenarios.push({ extraWins: w, extraLosses: l, extraDraws: d });
            }
        }
        return scenarios;
    }

    // =====================
    // UI Functions
    // =====================

    function updateRoundsDisplay() {
        var players = parseInt(playersInput.value) || 0;
        if (players >= 2) {
            var rounds = getRounds(players);
            roundsDisplay.textContent = rounds + ' round' + (rounds !== 1 ? 's' : '');
            roundsDisplay.style.display = 'inline-block';
        } else {
            roundsDisplay.style.display = 'none';
        }
    }

    function updateRecordDisplay() {
        var w = parseInt(winsInput.value) || 0;
        var l = parseInt(lossesInput.value) || 0;
        var d = parseInt(drawsInput.value) || 0;
        var pts = getMatchPoints(w, d);
        var played = w + l + d;
        recordDisplay.textContent = w + '-' + l + '-' + d;
        pointsDisplay.textContent = '(' + pts + ' points)';

        if (inProgressToggle.checked) {
            roundsPlayedDisplay.textContent = '| Round ' + played + ' played';
            roundsPlayedDisplay.classList.remove('hidden');
        } else {
            roundsPlayedDisplay.classList.add('hidden');
        }
    }

    function onToggleChange() {
        updateRecordDisplay();
    }

    /**
     * Build a probability bar cell HTML string
     */
    function buildProbBarHTML(prob) {
        var probClass = getProbClass(prob);
        return '<div class="prob-bar-container">' +
            '<div class="prob-bar-bg">' +
            '<div class="prob-bar-fill ' + probClass + '" style="width: 0%"></div>' +
            '</div>' +
            '<span class="prob-value ' + probClass + '">' + prob + '%</span>' +
            '</div>';
    }

    /**
     * Animate all probability bars in a given tbody
     */
    function animateBars(tbody) {
        var bars = tbody.querySelectorAll('.prob-bar-fill');
        requestAnimationFrame(function () {
            bars.forEach(function (bar) {
                bar.style.width = bar.parentElement.nextElementSibling.textContent;
            });
        });
    }

    // =====================
    // Main Calculation
    // =====================

    function calculate() {
        var numPlayers = parseInt(playersInput.value) || 0;

        if (numPlayers < 8) {
            alert('Minimum number of players is 8.');
            return;
        }

        var totalRounds = getRounds(numPlayers);
        var currentWins = parseInt(winsInput.value) || 0;
        var currentLosses = parseInt(lossesInput.value) || 0;
        var currentDraws = parseInt(drawsInput.value) || 0;
        var currentPoints = getMatchPoints(currentWins, currentDraws);
        var roundsPlayed = currentWins + currentLosses + currentDraws;
        var isInProgress = inProgressToggle.checked;

        // Highlight that in progress mode uses current (partial) record
        if (isInProgress) {
            if (roundsPlayed >= totalRounds) {
                alert('You have already played all ' + totalRounds + ' rounds. Disable "Tournament in progress" to see final standings.');
                return;
            }
            if (roundsPlayed === 0) {
                alert('Enter your current record (at least 1 round played) to analyze the tournament in progress.');
                return;
            }
        } else {
            if (roundsPlayed > totalRounds) {
                alert('This tournament has only ' + totalRounds + ' rounds! Your record has ' + roundsPlayed + ' matches.');
                return;
            }
        }

        // === STRATEGY SECTION (in-progress only) ===
        if (isInProgress) {
            var remaining = totalRounds - roundsPlayed;
            strategySection.classList.remove('hidden');

            // Analyze the "draw all remaining" scenario
            var drawAllFinalW = currentWins;
            var drawAllFinalL = currentLosses;
            var drawAllFinalD = currentDraws + remaining;
            var drawAllProb = estimateTop8Probability(drawAllFinalW, drawAllFinalL, drawAllFinalD, totalRounds, numPlayers);

            // Analyze the "win all remaining" scenario
            var winAllFinalW = currentWins + remaining;
            var winAllFinalL = currentLosses;
            var winAllFinalD = currentDraws;
            var winAllProb = estimateTop8Probability(winAllFinalW, winAllFinalL, winAllFinalD, totalRounds, numPlayers);

            // Find minimum wins needed for safe Top 8 (>= 75%)
            var minWinsNeeded = -1;
            for (var testW = 0; testW <= remaining; testW++) {
                var testDraws = remaining - testW;
                var testProb = estimateTop8Probability(
                    currentWins + testW, currentLosses, currentDraws + testDraws, totalRounds, numPlayers
                );
                if (testProb >= 75) {
                    minWinsNeeded = testW;
                    break;
                }
            }

            // Set strategy card content
            strategyTitle.textContent = 'Current: ' + currentWins + '-' + currentLosses + '-' + currentDraws +
                ' (' + currentPoints + ' pts) — ' + remaining + ' round' + (remaining !== 1 ? 's' : '') + ' left';
            strategySubtitle.textContent = 'Round ' + roundsPlayed + ' of ' + totalRounds + ' completed';

            if (drawAllProb >= 90) {
                strategyVerdict.textContent = 'You can safely draw all ' + remaining + ' remaining round' + (remaining !== 1 ? 's' : '') +
                    '. Drawing into ' + drawAllFinalW + '-' + drawAllFinalL + '-' + drawAllFinalD +
                    ' gives you ' + drawAllProb + '% probability of Top 8.';
                strategyVerdict.className = 'strategy-verdict strategy-draw';
            } else if (drawAllProb >= 60) {
                strategyVerdict.textContent = 'Drawing all remaining rounds gives you ' + drawAllProb + '% chance — likely enough, ' +
                    'but winning would make it safer. Consider your tiebreakers.';
                strategyVerdict.className = 'strategy-verdict strategy-mixed';
            } else if (minWinsNeeded > 0 && minWinsNeeded <= remaining) {
                strategyVerdict.textContent = 'You need to win at least ' + minWinsNeeded + ' more round' + (minWinsNeeded !== 1 ? 's' : '') +
                    ' to have a solid shot at Top 8. Drawing alone (' + drawAllProb + '%) is not enough. Play to win.';
                strategyVerdict.className = 'strategy-verdict strategy-play';
            } else if (winAllProb < 25) {
                strategyVerdict.textContent = 'Even winning all remaining rounds gives only ' + winAllProb + '% chance. ' +
                    'Top 8 is very unlikely from this position.';
                strategyVerdict.className = 'strategy-verdict strategy-must-win';
            } else {
                strategyVerdict.textContent = 'You need to win your remaining rounds. Drawing is not safe (' + drawAllProb + '%). ' +
                    'Winning all gives ' + winAllProb + '% chance.';
                strategyVerdict.className = 'strategy-verdict strategy-play';
            }

            // Build scenarios table for remaining rounds
            var scenarios = generateRemainingScenarios(remaining);
            scenariosDescription.textContent = 'All possible outcomes for your ' + remaining + ' remaining round' + (remaining !== 1 ? 's' : '') + ':';
            scenariosBody.innerHTML = '';

            scenarios.forEach(function (sc) {
                var finalW = currentWins + sc.extraWins;
                var finalL = currentLosses + sc.extraLosses;
                var finalD = currentDraws + sc.extraDraws;
                var pts = getMatchPoints(finalW, finalD);
                var prob = estimateTop8Probability(finalW, finalL, finalD, totalRounds, numPlayers);
                var probClass = getProbClass(prob);
                var status = getStatusInfo(prob);

                // Build remaining results label
                var parts = [];
                if (sc.extraWins > 0) parts.push(sc.extraWins + 'W');
                if (sc.extraLosses > 0) parts.push(sc.extraLosses + 'L');
                if (sc.extraDraws > 0) parts.push(sc.extraDraws + 'D');
                var remainingLabel = parts.length > 0 ? parts.join(' ') : '—';

                var isAllDraw = (sc.extraDraws === remaining && sc.extraWins === 0 && sc.extraLosses === 0);
                var isAllWin = (sc.extraWins === remaining && sc.extraLosses === 0 && sc.extraDraws === 0);

                var tr = document.createElement('tr');
                if (isAllDraw) tr.classList.add('scenario-draw');
                if (isAllWin) tr.classList.add('scenario-best');

                tr.innerHTML =
                    '<td class="record-cell">' + remainingLabel + '</td>' +
                    '<td class="record-cell">' + finalW + '-' + finalL + '-' + finalD + '</td>' +
                    '<td class="points-cell">' + pts + '</td>' +
                    '<td class="prob-cell">' + buildProbBarHTML(prob) + '</td>' +
                    '<td><span class="status-badge ' + status.class + '">' + status.text + '</span></td>';

                scenariosBody.appendChild(tr);
            });

            animateBars(scenariosBody);

            // Scroll to strategy section
            setTimeout(function () {
                strategySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            strategySection.classList.add('hidden');
        }

        // === FULL THRESHOLDS TABLE (always shown) ===
        resultsSection.classList.remove('hidden');

        // Summary
        summaryRecord.textContent = currentWins + '-' + currentLosses + '-' + currentDraws;
        var currentProb;
        if (isInProgress) {
            currentProb = estimateTop8Probability(currentWins, currentLosses, currentDraws, totalRounds, numPlayers);
            summaryInfo.innerHTML =
                '<div>' + currentPoints + ' match points (partial)</div>' +
                '<div>' + totalRounds + ' rounds / ' + numPlayers + ' players</div>';
        } else {
            currentProb = estimateTop8Probability(currentWins, currentLosses, currentDraws, totalRounds, numPlayers);
            summaryInfo.innerHTML =
                '<div>' + currentPoints + ' match points</div>' +
                '<div>' + totalRounds + ' rounds / ' + numPlayers + ' players</div>';
        }

        var verdict = getVerdict(currentProb);
        summaryVerdict.textContent = verdict.text;
        summaryVerdict.className = 'summary-verdict ' + verdict.class;

        // Build full thresholds table
        var allRecords = generateAllRecords(totalRounds);
        thresholdsBody.innerHTML = '';

        allRecords.forEach(function (rec) {
            var pts = getMatchPoints(rec.wins, rec.draws);
            var prob = estimateTop8Probability(rec.wins, rec.losses, rec.draws, totalRounds, numPlayers);
            var probClass = getProbClass(prob);
            var status = getStatusInfo(prob);

            var isCurrent = (
                rec.wins === currentWins &&
                rec.losses === currentLosses &&
                rec.draws === currentDraws
            );

            var tr = document.createElement('tr');
            if (isCurrent) tr.classList.add('current-row');

            tr.innerHTML =
                '<td class="record-cell">' + rec.wins + '-' + rec.losses + '-' + rec.draws + '</td>' +
                '<td class="points-cell">' + pts + '</td>' +
                '<td class="prob-cell">' + buildProbBarHTML(prob) + '</td>' +
                '<td><span class="status-badge ' + status.class + '">' + status.text + '</span></td>';

            thresholdsBody.appendChild(tr);
        });

        animateBars(thresholdsBody);

        // If not in progress, scroll to results
        if (!isInProgress) {
            setTimeout(function () {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    // =====================
    // Event Listeners
    // =====================
    playersInput.addEventListener('input', updateRoundsDisplay);
    inProgressToggle.addEventListener('change', onToggleChange);
    winsInput.addEventListener('input', updateRecordDisplay);
    lossesInput.addEventListener('input', updateRecordDisplay);
    drawsInput.addEventListener('input', updateRecordDisplay);
    calculateBtn.addEventListener('click', calculate);

    document.querySelectorAll('.number-input').forEach(function (el) {
        el.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') calculate();
        });
    });

    // Initialize
    updateRoundsDisplay();
    updateRecordDisplay();
})();
