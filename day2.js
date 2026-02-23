/**
 * MTG Day 2 Calculator
 * Determines if you can make Day 2 based on current record, remaining rounds,
 * and the point threshold. Considers wins, losses, and draws.
 */

(function () {
    'use strict';

    // =====================
    // DOM Elements
    // =====================
    var totalRoundsInput = document.getElementById('total-rounds');
    var thresholdInput = document.getElementById('threshold');
    var thresholdHint = document.getElementById('threshold-hint');
    var winsInput = document.getElementById('wins');
    var lossesInput = document.getElementById('losses');
    var drawsInput = document.getElementById('draws');
    var recordDisplay = document.getElementById('record-display');
    var pointsDisplay = document.getElementById('points-display');
    var roundsPlayedDisplay = document.getElementById('rounds-played-display');
    var calculateBtn = document.getElementById('calculate-btn');
    var resultsSection = document.getElementById('results-section');
    var verdictTitle = document.getElementById('verdict-title');
    var verdictSubtitle = document.getElementById('verdict-subtitle');
    var verdictText = document.getElementById('verdict-text');
    var scenariosDesc = document.getElementById('scenarios-desc');
    var scenariosBody = document.getElementById('scenarios-body');

    // =====================
    // Core Math
    // =====================

    function getMatchPoints(wins, draws) {
        return wins * 3 + draws * 1;
    }

    /**
     * Generate all combinations of W/L/D for a number of remaining rounds
     */
    function generateScenarios(remaining) {
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
    // UI
    // =====================

    function updateThresholdHint() {
        var threshold = parseInt(thresholdInput.value) || 0;
        var totalRounds = parseInt(totalRoundsInput.value) || 0;

        if (threshold > 0 && totalRounds > 0) {
            // Figure out what record cleanly gives that threshold (wins only, no draws)
            var winsNeeded = Math.ceil(threshold / 3);
            var lossesAllowed = totalRounds - winsNeeded;
            if (lossesAllowed >= 0 && winsNeeded * 3 === threshold) {
                thresholdHint.textContent = 'Need ' + threshold + ' points (' + winsNeeded + '-' + lossesAllowed + ' or better)';
            } else {
                thresholdHint.textContent = 'Need at least ' + threshold + ' match points to advance';
            }
        } else {
            thresholdHint.textContent = '';
        }
    }

    function updateRecordDisplay() {
        var w = parseInt(winsInput.value) || 0;
        var l = parseInt(lossesInput.value) || 0;
        var d = parseInt(drawsInput.value) || 0;
        var pts = getMatchPoints(w, d);
        var played = w + l + d;
        var totalRounds = parseInt(totalRoundsInput.value) || 0;

        recordDisplay.textContent = w + '-' + l + '-' + d;
        pointsDisplay.textContent = '(' + pts + ' points)';
        roundsPlayedDisplay.textContent = '| Round ' + played + ' of ' + totalRounds;
    }

    function buildPointsBarHTML(points, threshold) {
        var pct = threshold > 0 ? Math.min(100, Math.round((points / threshold) * 100)) : 0;
        var diff = points - threshold;
        var cls, label;

        if (diff >= 3) {
            cls = 'prob-high';
            label = '+' + diff;
        } else if (diff >= 0) {
            cls = 'prob-likely';
            label = diff === 0 ? 'Exact' : '+' + diff;
        } else if (diff >= -3) {
            cls = 'prob-medium';
            label = '' + diff;
        } else if (diff >= -6) {
            cls = 'prob-low';
            label = '' + diff;
        } else {
            cls = 'prob-none';
            label = '' + diff;
        }

        return '<div class="prob-bar-container">' +
            '<div class="prob-bar-bg">' +
            '<div class="prob-bar-fill ' + cls + '" style="width: 0%" data-width="' + pct + '%"></div>' +
            '</div>' +
            '<span class="prob-value ' + cls + '">' + label + '</span>' +
            '</div>';
    }

    function getDay2Status(points, threshold) {
        var diff = points - threshold;
        if (diff >= 3) return { text: 'Safe', class: 'status-safe' };
        if (diff >= 0) return { text: 'Day 2', class: 'status-likely' };
        if (diff >= -3) return { text: 'Close', class: 'status-possible' };
        if (diff >= -6) return { text: 'Tough', class: 'status-unlikely' };
        return { text: 'Eliminated', class: 'status-out' };
    }

    function animateBars(container) {
        var bars = container.querySelectorAll('.prob-bar-fill');
        requestAnimationFrame(function () {
            bars.forEach(function (bar) {
                bar.style.width = bar.getAttribute('data-width');
            });
        });
    }

    // =====================
    // Main Calculation
    // =====================

    function calculate() {
        var totalRounds = parseInt(totalRoundsInput.value) || 0;
        var threshold = parseInt(thresholdInput.value) || 0;
        var currentWins = parseInt(winsInput.value) || 0;
        var currentLosses = parseInt(lossesInput.value) || 0;
        var currentDraws = parseInt(drawsInput.value) || 0;
        var currentPoints = getMatchPoints(currentWins, currentDraws);
        var roundsPlayed = currentWins + currentLosses + currentDraws;
        var remaining = totalRounds - roundsPlayed;

        // Validation
        if (totalRounds < 1) {
            alert('Enter the total number of rounds for Day 1.');
            return;
        }
        if (threshold < 1) {
            alert('Enter the Day 2 threshold (minimum match points).');
            return;
        }
        if (roundsPlayed > totalRounds) {
            alert('Your record has ' + roundsPlayed + ' matches, but Day 1 only has ' + totalRounds + ' rounds.');
            return;
        }
        if (roundsPlayed === 0) {
            alert('Enter your current record — at least 1 round played.');
            return;
        }

        // Show results
        resultsSection.classList.remove('hidden');

        // Calculate key scenarios
        var maxPossiblePoints = currentPoints + (remaining * 3); // win all remaining
        var drawAllPoints = currentPoints + remaining;           // draw all remaining
        var alreadyIn = currentPoints >= threshold;

        // How many wins are needed (minimum) to reach threshold, using remaining rounds
        // Try all combos: w wins + (remaining-w) draws  => points = current + w*3 + (remaining-w)*1
        // We want: currentPoints + w*3 + (remaining-w) >= threshold
        // => currentPoints + 2w + remaining >= threshold
        // => w >= (threshold - currentPoints - remaining) / 2
        var minWinsNeeded = -1;
        var drawsWithMinWins = 0;
        if (!alreadyIn) {
            for (var testW = 0; testW <= remaining; testW++) {
                // Best case: win testW, draw the rest
                var testPts = currentPoints + testW * 3 + (remaining - testW) * 1;
                if (testPts >= threshold) {
                    minWinsNeeded = testW;
                    drawsWithMinWins = remaining - testW;
                    break;
                }
            }
        }

        // Can we lose any after getting minimum wins?
        // Check: win minWins, lose the rest => currentPoints + minWins*3
        var minWinsLoseRest = minWinsNeeded >= 0 ? currentPoints + minWinsNeeded * 3 : 0;
        var canLoseRest = minWinsLoseRest >= threshold;

        // Verdict
        verdictTitle.textContent = currentWins + '-' + currentLosses + '-' + currentDraws +
            ' (' + currentPoints + ' pts) — ' + remaining + ' round' + (remaining !== 1 ? 's' : '') + ' left';
        verdictSubtitle.textContent = 'Need ' + threshold + ' points for Day 2 | Max possible: ' + maxPossiblePoints + ' pts';

        if (alreadyIn) {
            verdictText.textContent = 'You have already reached ' + currentPoints + ' points — you are in for Day 2 regardless of remaining results!';
            verdictText.className = 'strategy-verdict strategy-draw';
        } else if (maxPossiblePoints < threshold) {
            verdictText.textContent = 'Even winning all ' + remaining + ' remaining rounds gives you ' + maxPossiblePoints +
                ' points, which is below the threshold of ' + threshold + '. You are mathematically eliminated from Day 2.';
            verdictText.className = 'strategy-verdict strategy-must-win';
        } else if (drawAllPoints >= threshold) {
            verdictText.textContent = 'You can draw all ' + remaining + ' remaining round' + (remaining !== 1 ? 's' : '') +
                ' and reach ' + drawAllPoints + ' points — enough for Day 2. No need to take risks!';
            verdictText.className = 'strategy-verdict strategy-draw';
        } else if (minWinsNeeded === 1 && canLoseRest) {
            verdictText.textContent = 'You need just 1 more win to secure Day 2. After winning once, you can safely draw or lose the rest.';
            verdictText.className = 'strategy-verdict strategy-mixed';
        } else if (minWinsNeeded >= 1 && minWinsNeeded <= remaining) {
            var lossesAvailable = remaining - minWinsNeeded;
            if (canLoseRest) {
                verdictText.textContent = 'You need at least ' + minWinsNeeded + ' win' + (minWinsNeeded !== 1 ? 's' : '') +
                    ' out of ' + remaining + ' remaining rounds. After getting ' + minWinsNeeded + ' win' + (minWinsNeeded !== 1 ? 's' : '') +
                    ', the rest does not matter.';
            } else {
                verdictText.textContent = 'You need at least ' + minWinsNeeded + ' win' + (minWinsNeeded !== 1 ? 's' : '') +
                    ' and can draw the remaining ' + drawsWithMinWins + ' round' + (drawsWithMinWins !== 1 ? 's' : '') +
                    ' to reach the threshold. Be careful with losses — they give 0 points.';
            }
            verdictText.className = 'strategy-verdict strategy-play';
        } else {
            verdictText.textContent = 'You must win all ' + remaining + ' remaining rounds to reach ' + maxPossiblePoints + ' points and qualify for Day 2.';
            verdictText.className = 'strategy-verdict strategy-must-win';
        }

        // Build scenarios table
        var scenarios = generateScenarios(remaining);
        scenariosDesc.textContent = 'How each combination of results in the ' + remaining + ' remaining round' +
            (remaining !== 1 ? 's' : '') + ' affects your Day 2 qualification:';
        scenariosBody.innerHTML = '';

        scenarios.forEach(function (sc) {
            var finalW = currentWins + sc.extraWins;
            var finalL = currentLosses + sc.extraLosses;
            var finalD = currentDraws + sc.extraDraws;
            var pts = getMatchPoints(finalW, finalD);
            var status = getDay2Status(pts, threshold);

            // Build remaining label
            var parts = [];
            if (sc.extraWins > 0) parts.push(sc.extraWins + 'W');
            if (sc.extraLosses > 0) parts.push(sc.extraLosses + 'L');
            if (sc.extraDraws > 0) parts.push(sc.extraDraws + 'D');
            var remainingLabel = parts.length > 0 ? parts.join(' ') : '—';

            var isAllDraw = (sc.extraDraws === remaining && sc.extraWins === 0 && sc.extraLosses === 0);
            var isAllWin = (sc.extraWins === remaining && sc.extraLosses === 0 && sc.extraDraws === 0);
            var makesDay2 = pts >= threshold;

            var tr = document.createElement('tr');
            if (isAllDraw) tr.classList.add('scenario-draw');
            if (isAllWin) tr.classList.add('scenario-best');

            tr.innerHTML =
                '<td class="record-cell">' + remainingLabel + '</td>' +
                '<td class="record-cell">' + finalW + '-' + finalL + '-' + finalD + '</td>' +
                '<td class="points-cell">' + pts + '</td>' +
                '<td class="prob-cell">' + buildPointsBarHTML(pts, threshold) + '</td>' +
                '<td><span class="status-badge ' + status.class + '">' + status.text + '</span></td>';

            scenariosBody.appendChild(tr);
        });

        animateBars(scenariosBody);

        // Scroll to results
        setTimeout(function () {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // =====================
    // Event Listeners
    // =====================
    totalRoundsInput.addEventListener('input', function () {
        updateThresholdHint();
        updateRecordDisplay();
    });
    thresholdInput.addEventListener('input', updateThresholdHint);
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
    updateThresholdHint();
    updateRecordDisplay();
})();
