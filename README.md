# MTG Top 8 Calculator

A web app for competitive **Magic: The Gathering** players to estimate their chances in Swiss-format tournaments.

---

## Features

### Top 8 Calculator
- Enter the number of players and your Win/Loss/Draw record
- Automatically calculates the number of Swiss rounds
- Estimates the probability of making Top 8 for every possible final record
- Color-coded probability bars and status indicators

### In-Progress Tournament Mode
- Toggle "Tournament in progress" to unlock real-time strategy analysis
- Round-by-round result tracker with sequential W/L/D input per round
- Estimates your Opponent Match Win % (OMW%) based on when losses occurred
- Adjusts Top 8 probability at tiebreaker thresholds using the OMW% estimate
- Get a clear **Play or Draw (ID)** recommendation based on your current standing

### Day 2 Calculator
- Configure total Day 1 rounds and the minimum point threshold
- Input your current record to see if Day 2 is still reachable
- View every possible outcome with a points-vs-threshold comparison

---

## How It Works

Swiss tournament scoring:

| Result | Match Points |
|--------|-------------|
| Win    | 3           |
| Draw   | 1           |
| Loss   | 0           |

Probabilities are estimated using Swiss tournament mathematics. In the in-progress mode, the calculator also estimates your OMW% (Opponent Match Win Percentage) based on the order of your results: losing early rounds pairs you against weaker opponents, lowering your OMW%, while losing late means your opponents were stronger, improving your tiebreaker position. This OMW% estimate adjusts the probability at the tiebreaker threshold where it matters most.

---

## Tech Stack

- **HTML** — semantic markup, responsive layout
- **CSS** — custom design system with glassmorphism, glowing backgrounds, and smooth animations
- **JavaScript** — zero dependencies, IIFE-encapsulated modules

---

## Getting Started

No build step required. Just open `index.html` in your browser.

```bash
git clone https://github.com/raffato01/mtg-top8-calculator.git
cd mtg-top8-calculator
start index.html
```

---

## Project Structure

```
index.html    Top 8 Calculator page
day2.html     Day 2 Calculator page
script.js     Top 8 logic and in-progress strategy analysis
day2.js       Day 2 logic and scenario generation
style.css     Shared design system and styles
```

---

## License

This project is open source. Feel free to use and modify it.

---

<sub><i>Code development assisted by Claude 4.6.</i></sub>
