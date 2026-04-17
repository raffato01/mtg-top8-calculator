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
    var prizePositionInput = document.getElementById('prize-position');
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
    // Widget & Quick Actions
    // =====================

    function getUrlParameter(name) {
        var url = window.location.search;
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regex = new RegExp("[\\?&]"+name+"=([^&#]*)");
        var results = regex.exec(url);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function quickAddResult(resultType) {
        // resultType: 'win', 'loss', or 'draw'
        if (inProgressToggle.checked) {
            var totalRounds = getRounds(parseInt(playersInput.value) || 64);
            var currentPlayed = roundResults.filter(r => r !== null).length;
            
            if (currentPlayed < totalRounds) {
                roundResults[currentPlayed] = resultType === 'win' ? 'W' : (resultType === 'loss' ? 'L' : 'D');
                buildRoundTracker();
                updateRecordDisplay();
                scheduleRecalculate();
                
                // Show toast notification
                showToast(resultType.toUpperCase() + ' logged successfully!');
            }
        }
    }

    function showToast(message) {
        var toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function updateBadge() {
        // Display current points on app icon (Badging API)
        if ('setAppBadge' in navigator) {
            var w = parseInt(winsInput.value) || 0;
            var d = parseInt(drawsInput.value) || 0;
            var points = w * 3 + d * 1;
            
            if (points > 0) {
                navigator.setAppBadge(points).catch(err => console.log('Badge API not available'));
            } else {
                navigator.clearAppBadge().catch(err => console.log('Badge API not available'));
            }
        }
    }

    function addQuickActionButtons() {
        // Add quick action buttons to the UI
        var inProgressSection = document.getElementById('input-section');
        
        // Check if buttons already exist
        if (document.getElementById('quick-actions')) return;
        
        var quickActionsDiv = document.createElement('div');
        quickActionsDiv.id = 'quick-actions';
        quickActionsDiv.className = 'quick-actions hidden';
        
        quickActionsDiv.innerHTML = `
            <h3 class="card-title">Quick Log Round Result</h3>
            <div class="quick-action-buttons">
                <button class="quick-btn quick-btn-win" data-result="win">
                    <span class="quick-btn-icon">W</span>
                    <span class="quick-btn-label">Win</span>
                </button>
                <button class="quick-btn quick-btn-loss" data-result="loss">
                    <span class="quick-btn-icon">L</span>
                    <span class="quick-btn-label">Loss</span>
                </button>
                <button class="quick-btn quick-btn-draw" data-result="draw">
                    <span class="quick-btn-icon">D</span>
                    <span class="quick-btn-label">Draw</span>
                </button>
            </div>
        `;
        
        inProgressSection.appendChild(quickActionsDiv);
        
        // Add event listeners to quick action buttons
        quickActionsDiv.querySelectorAll('.quick-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var resultType = this.getAttribute('data-result');
                quickAddResult(resultType);
            });
        });
    }
    const STORAGE_KEY = 'mtg_tournament_data';
    var inMemoryStorage = {};
    var storageMode = 'local';
    var recalcTimer = null;

    function isStorageAvailable() {
        var testKey = '__mtg_storage_test__';
        try {
            localStorage.setItem(testKey, '1');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    function getStorageValue(key) {
        if (storageMode === 'local') {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                storageMode = 'memory';
            }
        }
        return Object.prototype.hasOwnProperty.call(inMemoryStorage, key) ? inMemoryStorage[key] : null;
    }

    function setStorageValue(key, value) {
        if (storageMode === 'local') {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                storageMode = 'memory';
            }
        }
        inMemoryStorage[key] = value;
        return false;
    }

    function removeStorageValue(key) {
        if (storageMode === 'local') {
            try {
                localStorage.removeItem(key);
                return;
            } catch (e) {
                storageMode = 'memory';
            }
        }
        delete inMemoryStorage[key];
    }

    function sanitizeInt(value, fallback, min, max) {
        var parsed = parseInt(value, 10);
        if (!isFinite(parsed)) return fallback;
        if (min !== undefined && parsed < min) return min;
        if (max !== undefined && parsed > max) return max;
        return parsed;
    }

    function sanitizeRoundResults(raw) {
        if (!Array.isArray(raw)) return [];
        return raw.map(function (item) {
            return (item === 'W' || item === 'L' || item === 'D' || item === null) ? item : null;
        });
    }

    function getDefaultTournamentData() {
        return {
            players: 64,
            prizePosition: 8,
            inProgress: false,
            roundResults: [],
            wins: 0,
            losses: 0,
            draws: 0
        };
    }

    function normalizeTournamentData(data) {
        if (!data || typeof data !== 'object') return null;

        return {
            players: sanitizeInt(data.players, 64, 8, 10000),
            prizePosition: sanitizeInt(data.prizePosition, 8, 1, 10000),
            inProgress: Boolean(data.inProgress),
            roundResults: sanitizeRoundResults(data.roundResults),
            wins: sanitizeInt(data.wins, 0, 0, 1000),
            losses: sanitizeInt(data.losses, 0, 0, 1000),
            draws: sanitizeInt(data.draws, 0, 0, 1000)
        };
    }

    function applyTournamentData(data) {
        playersInput.value = data.players;
        prizePositionInput.value = data.prizePosition;
        inProgressToggle.checked = data.inProgress;
        roundResults = data.roundResults;
        winsInput.value = data.wins;
        lossesInput.value = data.losses;
        drawsInput.value = data.draws;
    }

    function getScrollBehavior() {
        if (window.matchMedia('(max-width: 768px)').matches) {
            return 'auto';
        }
        return 'smooth';
    }

    function scheduleRecalculate() {
        if (resultsSection.classList.contains('hidden') && strategySection.classList.contains('hidden')) {
            return;
        }
        if (recalcTimer !== null) {
            clearTimeout(recalcTimer);
        }
        recalcTimer = setTimeout(function () {
            recalcTimer = null;
            calculate();
        }, 80);
    }

    function saveTournamentData() {
        var data = {
            players: playersInput.value,
            prizePosition: prizePositionInput.value,
            inProgress: inProgressToggle.checked,
            roundResults: roundResults,
            wins: winsInput.value,
            losses: lossesInput.value,
            draws: drawsInput.value,
            savedAt: new Date().toISOString()
        };
        var serialized;
        try {
            serialized = JSON.stringify(data);
        } catch (e) {
            return;
        }

        setStorageValue(STORAGE_KEY, serialized);
    }

    function loadTournamentData() {
        var raw = getStorageValue(STORAGE_KEY);
        if (!raw) return false;
        
        try {
            var parsed = JSON.parse(raw);
            var normalized = normalizeTournamentData(parsed);
            if (!normalized) {
                removeStorageValue(STORAGE_KEY);
                return false;
            }

            applyTournamentData(normalized);
            return true;
        } catch (e) {
            console.log('Error loading tournament data:', e);
            removeStorageValue(STORAGE_KEY);
            return false;
        }
    }

    function clearTournamentData() {
        if (confirm('Are you sure you want to clear all saved tournament data? This cannot be undone.')) {
            removeStorageValue(STORAGE_KEY);
            applyTournamentData(getDefaultTournamentData());
            updateRoundsDisplay();
            onToggleChange();
            updateRecordDisplay();
            resultsSection.classList.add('hidden');
            strategySection.classList.add('hidden');
        }
    }

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

    /**
     * Calculate the threshold points needed for a specific prize position
     * @param {number} numPlayers - Total number of players
     * @param {number} prizePosition - The desired prize position (8, 16, 32, etc.)
     * @param {number} totalRounds - Total number of rounds
     * @returns {number} Minimum match points needed
     */
    function getThresholdPoints(numPlayers, prizePosition, totalRounds) {
        if (numPlayers <= prizePosition) return 0; // Everyone makes the prize
        
        // Calculate the percentage of players who make the prize
        var prizePercentage = prizePosition / numPlayers;
        
        // Maximum possible points in the tournament
        var maxPoints = totalRounds * 3;
        
        // Base threshold: proportional to prize percentage
        // Higher percentage = lower threshold needed
        var baseThreshold;
        
        if (prizePercentage >= 0.5) {
            // Top 50% or better: need minimum points
            baseThreshold = Math.ceil(maxPoints * 0.4);
        } else if (prizePercentage >= 0.25) {
            // Top 25-50%: need moderate points
            baseThreshold = Math.ceil(maxPoints * 0.5);
        } else if (prizePercentage >= 0.125) {
            // Top 8-25%: need good points
            baseThreshold = Math.ceil(maxPoints * 0.65);
        } else if (prizePercentage >= 0.0625) {
            // Top 4-8%: need very good points
            baseThreshold = Math.ceil(maxPoints * 0.75);
        } else {
            // Top 2-4%: need excellent points
            baseThreshold = Math.ceil(maxPoints * 0.83);
        }
        
        return baseThreshold;
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
     * Estimate the probability of making a prize position for a given final record.
     * Optional omwEstimate adjusts probability at the tiebreaker threshold.
     */
    function estimatePrizePositionProbability(wins, losses, draws, totalRounds, numPlayers, prizePosition, omwEstimate) {
        var points = getMatchPoints(wins, draws);

        if (numPlayers <= prizePosition) return 100;

        var thresholdPoints = getThresholdPoints(numPlayers, prizePosition, totalRounds);
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

    function getVerdict(prob, prizePosition) {
        var prizeLabel = 'Top ' + prizePosition;
        if (prob >= 90) return { text: 'You are almost certainly making ' + prizeLabel + '!', class: 'verdict-safe' };
        if (prob >= 60) return { text: 'Good chances! Keep it up to lock in ' + prizeLabel + '.', class: 'verdict-likely' };
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
        // Update threshold display
        updateThresholdDisplay();
    }

    function updateThresholdDisplay() {
        var players = parseInt(playersInput.value) || 0;
        var prizePosition = parseInt(prizePositionInput.value) || 8;
        
        var thresholdInfo = document.getElementById('threshold-info');
        
        if (players < 2) {
            thresholdInfo.classList.add('hidden');
            document.getElementById('draw-advice').classList.add('hidden');
            return;
        }
        
        var totalRounds = getRounds(players);
        var threshold = getThresholdPoints(players, prizePosition, totalRounds);
        
        document.getElementById('threshold-prize').textContent = 'Top ' + prizePosition;
        document.getElementById('threshold-value').textContent = threshold + '+';
        thresholdInfo.classList.remove('hidden');
        
        // Check and display draw advantage
        checkDrawAdvantage(threshold);
    }

    function checkDrawAdvantage(threshold) {
        var currentPoints = (parseInt(winsInput.value) || 0) * 3 + (parseInt(drawsInput.value) || 0);
        var drawAdviceEl = document.getElementById('draw-advice');
        var adviceText = document.getElementById('advice-text');
        var prizePosition = parseInt(prizePositionInput.value) || 8;
        
        // Check if one draw is enough
        if (currentPoints + 1 >= threshold) {
            adviceText.textContent = 'Una patta ti garantisce la Top ' + prizePosition + '!';
            drawAdviceEl.classList.remove('hidden');
            return;
        }
        
        // Check if two draws are enough
        if (currentPoints + 2 >= threshold) {
            adviceText.textContent = '2 patte ti garantiscono la Top ' + prizePosition + '!';
            drawAdviceEl.classList.remove('hidden');
            return;
        }
        
        // Check if one draw + one win is enough (for strategic planning)
        if (currentPoints + 4 >= threshold && currentPoints + 3 < threshold) {
            adviceText.textContent = 'Una patta + una vittoria ti garantiscono la Top ' + prizePosition + '!';
            drawAdviceEl.classList.remove('hidden');
            return;
        }
        
        // Hide if no draw advantage
        drawAdviceEl.classList.add('hidden');
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
        
        updateBadge();
        updateThresholdDisplay();
        saveTournamentData();
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
        scheduleRecalculate();
    }

    function onRoundClear(e) {
        var round = parseInt(e.target.getAttribute('data-round'));
        // Clear this round and all subsequent rounds
        for (var i = round; i < roundResults.length; i++) {
            roundResults[i] = null;
        }
        buildRoundTracker();
        updateRecordDisplay();
        scheduleRecalculate();
    }

    function onToggleChange() {
        if (inProgressToggle.checked) {
            recordInputs.classList.add('hidden');
            roundTracker.classList.remove('hidden');
            document.getElementById('quick-actions').classList.remove('hidden');
            buildRoundTracker();
        } else {
            recordInputs.classList.remove('hidden');
            roundTracker.classList.add('hidden');
            document.getElementById('quick-actions').classList.add('hidden');
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
        var prizePosition = parseInt(prizePositionInput.value) || 8;

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
            var drawAllProb = estimatePrizePositionProbability(drawAllFinalW, drawAllFinalL, drawAllFinalD, totalRounds, numPlayers, prizePosition, omwEstimate);

            // Analyze the "win all remaining" scenario
            var winAllFinalW = currentWins + remaining;
            var winAllFinalL = currentLosses;
            var winAllFinalD = currentDraws;
            var winAllProb = estimatePrizePositionProbability(winAllFinalW, winAllFinalL, winAllFinalD, totalRounds, numPlayers, prizePosition, omwEstimate);

            // Find minimum wins needed for safe Top X (>= 75%)
            var minWinsNeeded = -1;
            for (var testW = 0; testW <= remaining; testW++) {
                var testDraws = remaining - testW;
                var testProb = estimatePrizePositionProbability(
                    currentWins + testW, currentLosses, currentDraws + testDraws, totalRounds, numPlayers, prizePosition, omwEstimate
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
                    ' gives you ' + drawAllProb + '% probability of Top ' + prizePosition + '.';
                strategyVerdict.className = 'strategy-verdict strategy-draw';
            } else if (drawAllProb >= 60) {
                strategyVerdict.textContent = 'Drawing all remaining rounds gives you ' + drawAllProb + '% chance \u2014 likely enough, ' +
                    'but winning would make it safer. Consider your tiebreakers.';
                strategyVerdict.className = 'strategy-verdict strategy-mixed';
            } else if (minWinsNeeded > 0 && minWinsNeeded <= remaining) {
                strategyVerdict.textContent = 'You need to win at least ' + minWinsNeeded + ' more round' + (minWinsNeeded !== 1 ? 's' : '') +
                    ' to have a solid shot at Top ' + prizePosition + '. Drawing alone (' + drawAllProb + '%) is not enough. Play to win.';
                strategyVerdict.className = 'strategy-verdict strategy-play';
            } else if (winAllProb < 25) {
                strategyVerdict.textContent = 'Even winning all remaining rounds gives only ' + winAllProb + '% chance. ' +
                    'Top ' + prizePosition + ' is very unlikely from this position.';
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
                var prob = estimatePrizePositionProbability(finalW, finalL, finalD, totalRounds, numPlayers, prizePosition, omwEstimate);
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
                strategySection.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
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
            currentProb = estimatePrizePositionProbability(currentWins, currentLosses, currentDraws, totalRounds, numPlayers, prizePosition);
            summaryInfo.innerHTML =
                '<div>' + currentPoints + ' match points (partial)</div>' +
                '<div>' + totalRounds + ' rounds / ' + numPlayers + ' players</div>';
        } else {
            currentProb = estimatePrizePositionProbability(currentWins, currentLosses, currentDraws, totalRounds, numPlayers, prizePosition);
            summaryInfo.innerHTML =
                '<div>' + currentPoints + ' match points</div>' +
                '<div>' + totalRounds + ' rounds / ' + numPlayers + ' players</div>';
        }

        var verdict = getVerdict(currentProb, prizePosition);
        summaryVerdict.textContent = verdict.text;
        summaryVerdict.className = 'summary-verdict ' + verdict.class;

        // Build full thresholds table
        var allRecords = generateAllRecords(totalRounds);
        thresholdsBody.innerHTML = '';

        allRecords.forEach(function (rec) {
            var pts = getMatchPoints(rec.wins, rec.draws);
            var prob = estimatePrizePositionProbability(rec.wins, rec.losses, rec.draws, totalRounds, numPlayers, prizePosition);
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
                resultsSection.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
            }, 100);
        }
    }

    // =====================
    // Event Listeners
    // =====================
    playersInput.addEventListener('input', updateRoundsDisplay);
    playersInput.addEventListener('change', saveTournamentData);
    prizePositionInput.addEventListener('change', function() {
        saveTournamentData();
        updateThresholdDisplay();
        if (resultsSection.classList.contains('hidden') === false) {
            calculate();
        }
    });
    inProgressToggle.addEventListener('change', onToggleChange);
    winsInput.addEventListener('input', updateRecordDisplay);
    lossesInput.addEventListener('input', updateRecordDisplay);
    drawsInput.addEventListener('input', updateRecordDisplay);
    calculateBtn.addEventListener('click', calculate);
    document.getElementById('clear-btn').addEventListener('click', clearTournamentData);

    document.querySelectorAll('.number-input').forEach(function (el) {
        el.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') calculate();
        });
    });

    // Initialize storage mode and load persisted data when valid
    storageMode = isStorageAvailable() ? 'local' : 'memory';
    loadTournamentData();
    addQuickActionButtons();
    onToggleChange();
    updateRoundsDisplay();
    updateRecordDisplay();
    
    // Handle quick actions from widget shortcuts
    var action = getUrlParameter('action');
    if (action) {
        // Enable in-progress mode to use quick actions
        if (!inProgressToggle.checked) {
            inProgressToggle.checked = true;
            onToggleChange();
        }
        
        // Wait a moment for DOM to be ready
        setTimeout(function() {
            quickAddResult(action);
        }, 500);
    }
})();
