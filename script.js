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
    var recordInputs = document.getElementById('record-inputs');
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
    var omwDisplay = document.getElementById('omw-display');
    var scenariosDescription = document.getElementById('scenarios-description');
    var scenariosBody = document.getElementById('scenarios-body');
    var roundTracker = document.getElementById('round-tracker');
    var roundTrackerGrid = document.getElementById('round-tracker-grid');

    // Round tracker state: array of 'W', 'L', 'D', or null for each round
    var roundResults = [];

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

    // =====================
    // OMW% Estimation
    // =====================

    /**
     * Estimate OMW% from round-by-round results.
     * For each round, we estimate the opponent's final match-win %
     * based on the player's cumulative record at that point (pairing bracket).
     * Opponents faced at higher brackets tend to finish with higher win rates.
     */
    function estimateOMW(results, totalRounds) {
        if (!results || results.length === 0) return null;

        var filledResults = results.filter(function (r) { return r !== null; });
        if (filledResults.length === 0) return null;

        var cumWins = 0;
        var cumLosses = 0;
        var opponentMWs = [];

        for (var i = 0; i < results.length; i++) {
            if (results[i] === null) continue;

            // Estimate opponent's final match-win % based on pairing bracket
            // At record (cumWins - cumLosses), paired against similar record
            var bracketStrength = 0.5 + (cumWins - cumLosses) / (2 * totalRounds);

            var opponentMW;
            if (results[i] === 'W') {
                // We won: opponent lost this match, slight penalty to their final record
                opponentMW = bracketStrength - 0.04;
                cumWins++;
            } else if (results[i] === 'L') {
                // We lost: opponent won this match, slight bonus to their final record
                opponentMW = bracketStrength + 0.04;
                cumLosses++;
            } else {
                // Draw: neutral
                opponentMW = bracketStrength;
            }

            // OMW% minimum floor is 33% per WotC rules
            opponentMWs.push(Math.max(0.33, Math.min(1, opponentMW)));
        }

        var sum = 0;
        for (var j = 0; j < opponentMWs.length; j++) {
            sum += opponentMWs[j];
        }
        return sum / opponentMWs.length;
    }

    /**
     * Estimate the probability of making Top 8 for a given final record.
     * Optional omwEstimate adjusts probability at the tiebreaker threshold.
     */
    function estimateTop8Probability(wins, losses, draws, totalRounds, numPlayers, omwEstimate) {
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

        // Base probabilities
        var baseProb;
        if (diff >= 6) baseProb = 100;
        else if (diff >= 3) baseProb = 98;
        else if (diff >= 1) baseProb = 92;
        else if (diff === 0) baseProb = 75;
        else if (diff === -1) baseProb = 50;
        else if (diff === -2) baseProb = 25;
        else if (diff === -3) baseProb = 10;
        else if (diff === -4) baseProb = 3;
        else if (diff === -5) baseProb = 1;
        else baseProb = 0;

        // Apply OMW% adjustment in the tiebreaker-sensitive zone
        if (omwEstimate !== undefined && omwEstimate !== null && diff >= -2 && diff <= 0) {
            var adjustment = 0;
            if (omwEstimate > 0.55) {
                // Good tiebreakers: boost probability
                if (diff === 0) adjustment = 10;
                else if (diff === -1) adjustment = 10;
                else adjustment = 5;
            } else if (omwEstimate < 0.40) {
                // Poor tiebreakers: reduce probability
                if (diff === 0) adjustment = -15;
                else if (diff === -1) adjustment = -10;
                else adjustment = -8;
            } else if (omwEstimate > 0.50) {
                // Slightly above average
                if (diff === 0) adjustment = 5;
                else if (diff === -1) adjustment = 4;
                else adjustment = 2;
            } else if (omwEstimate < 0.45) {
                // Slightly below average
                if (diff === 0) adjustment = -8;
                else if (diff === -1) adjustment = -5;
                else adjustment = -3;
            }
            baseProb = Math.max(0, Math.min(100, baseProb + adjustment));
        }

        return baseProb;
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
        // Rebuild round tracker if in progress mode
        if (inProgressToggle.checked) {
            buildRoundTracker();
        }
    }

    function getRecordFromTracker() {
        var w = 0, l = 0, d = 0;
        for (var i = 0; i < roundResults.length; i++) {
            if (roundResults[i] === 'W') w++;
            else if (roundResults[i] === 'L') l++;
            else if (roundResults[i] === 'D') d++;
        }
        return { wins: w, losses: l, draws: d };
    }

    function updateRecordDisplay() {
        var w, l, d;
        if (inProgressToggle.checked) {
            var rec = getRecordFromTracker();
            w = rec.wins;
            l = rec.losses;
            d = rec.draws;
            // Sync hidden inputs for compatibility
            winsInput.value = w;
            lossesInput.value = l;
            drawsInput.value = d;
        } else {
            w = parseInt(winsInput.value) || 0;
            l = parseInt(lossesInput.value) || 0;
            d = parseInt(drawsInput.value) || 0;
        }
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

    // =====================
    // Round Tracker
    // =====================

    function buildRoundTracker() {
        var players = parseInt(playersInput.value) || 0;
        if (players < 2) return;
        var totalRounds = getRounds(players);

        // Resize roundResults array
        while (roundResults.length < totalRounds) roundResults.push(null);
        while (roundResults.length > totalRounds) roundResults.pop();

        roundTrackerGrid.innerHTML = '';

        for (var r = 0; r < totalRounds; r++) {
            var row = document.createElement('div');
            row.className = 'round-row';
            if (roundResults[r] !== null) row.classList.add('round-filled');

            // Check if this round should be enabled (sequential: only if previous are filled)
            var enabled = (r === 0 || roundResults[r - 1] !== null || roundResults[r] !== null);
            if (!enabled) row.classList.add('round-disabled');

            var label = document.createElement('span');
            label.className = 'round-number';
            label.textContent = 'R' + (r + 1);

            var buttons = document.createElement('div');
            buttons.className = 'round-buttons';

            var results = ['W', 'L', 'D'];
            var classes = ['selected-win', 'selected-loss', 'selected-draw'];

            for (var b = 0; b < results.length; b++) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'round-btn';
                btn.textContent = results[b];
                btn.setAttribute('data-round', r);
                btn.setAttribute('data-result', results[b]);
                if (roundResults[r] === results[b]) {
                    btn.classList.add(classes[b]);
                }
                btn.addEventListener('click', onRoundBtnClick);
                buttons.appendChild(btn);
            }

            // Clear button
            var clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'round-btn-clear';
            clearBtn.textContent = 'clear';
            clearBtn.setAttribute('data-round', r);
            clearBtn.addEventListener('click', onRoundClear);

            row.appendChild(label);
            row.appendChild(buttons);
            if (roundResults[r] !== null) row.appendChild(clearBtn);

            roundTrackerGrid.appendChild(row);
        }
    }

    function onRoundBtnClick(e) {
        var round = parseInt(e.target.getAttribute('data-round'));
        var result = e.target.getAttribute('data-result');
        roundResults[round] = result;
        buildRoundTracker();
        updateRecordDisplay();
    }

    function onRoundClear(e) {
        var round = parseInt(e.target.getAttribute('data-round'));
        // Clear this round and all subsequent rounds
        for (var i = round; i < roundResults.length; i++) {
            roundResults[i] = null;
        }
        buildRoundTracker();
        updateRecordDisplay();
    }

    function onToggleChange() {
        if (inProgressToggle.checked) {
            recordInputs.classList.add('hidden');
            roundTracker.classList.remove('hidden');
            buildRoundTracker();
        } else {
            recordInputs.classList.remove('hidden');
            roundTracker.classList.add('hidden');
        }
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

            // Calculate OMW% from round tracker
            var omwEstimate = estimateOMW(roundResults, totalRounds);

            // Analyze the "draw all remaining" scenario
            var drawAllFinalW = currentWins;
            var drawAllFinalL = currentLosses;
            var drawAllFinalD = currentDraws + remaining;
            var drawAllProb = estimateTop8Probability(drawAllFinalW, drawAllFinalL, drawAllFinalD, totalRounds, numPlayers, omwEstimate);

            // Analyze the "win all remaining" scenario
            var winAllFinalW = currentWins + remaining;
            var winAllFinalL = currentLosses;
            var winAllFinalD = currentDraws;
            var winAllProb = estimateTop8Probability(winAllFinalW, winAllFinalL, winAllFinalD, totalRounds, numPlayers, omwEstimate);

            // Find minimum wins needed for safe Top 8 (>= 75%)
            var minWinsNeeded = -1;
            for (var testW = 0; testW <= remaining; testW++) {
                var testDraws = remaining - testW;
                var testProb = estimateTop8Probability(
                    currentWins + testW, currentLosses, currentDraws + testDraws, totalRounds, numPlayers, omwEstimate
                );
                if (testProb >= 75) {
                    minWinsNeeded = testW;
                    break;
                }
            }

            // Set strategy card content
            strategyTitle.textContent = 'Current: ' + currentWins + '-' + currentLosses + '-' + currentDraws +
                ' (' + currentPoints + ' pts) \u2014 ' + remaining + ' round' + (remaining !== 1 ? 's' : '') + ' left';
            strategySubtitle.textContent = 'Round ' + roundsPlayed + ' of ' + totalRounds + ' completed';

            // Show OMW% estimate
            if (omwEstimate !== null) {
                var omwPercent = Math.round(omwEstimate * 100);
                var omwClass = omwEstimate > 0.50 ? 'omw-good' : (omwEstimate < 0.45 ? 'omw-bad' : 'omw-average');
                omwDisplay.innerHTML = 'Estimated OMW%: <span class="omw-value ' + omwClass + '">' + omwPercent + '%</span>' +
                    (omwEstimate > 0.50 ? ' \u2014 good tiebreakers' : (omwEstimate < 0.45 ? ' \u2014 weak tiebreakers' : ' \u2014 average tiebreakers'));
                omwDisplay.classList.remove('hidden');
            } else {
                omwDisplay.classList.add('hidden');
            }

            if (drawAllProb >= 90) {
                strategyVerdict.textContent = 'You can safely draw all ' + remaining + ' remaining round' + (remaining !== 1 ? 's' : '') +
                    '. Drawing into ' + drawAllFinalW + '-' + drawAllFinalL + '-' + drawAllFinalD +
                    ' gives you ' + drawAllProb + '% probability of Top 8.';
                strategyVerdict.className = 'strategy-verdict strategy-draw';
            } else if (drawAllProb >= 60) {
                strategyVerdict.textContent = 'Drawing all remaining rounds gives you ' + drawAllProb + '% chance \u2014 likely enough, ' +
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
                var prob = estimateTop8Probability(finalW, finalL, finalD, totalRounds, numPlayers, omwEstimate);
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
