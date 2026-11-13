# ChainLink Survey tests

Run from the repository root with Node (no packages needed). Each takes the
path to `index.html` as an optional argument and defaults to `./index.html`.

    node tests/chainlink-tests.js      # deed-parser regression suite, ~2 min; compare the final table to EXPECTED in its header
    node tests/deed-diag-tests.js      # turned angles, blunder detection, 65 deed phrasings
    node tests/angleright-tests.js     # backsight / angle-right shots

All of them must pass (or match the expected table) before a new `index.html` ships.
