# ChainLink Survey tests

Run from the repository root with Node (no packages needed). Each takes the
path to `index.html` as an optional argument and defaults to `./index.html`.

    node tests/chainlink-tests.js      # deed-parser regression suite, ~2 min; compare the final table to EXPECTED in its header
    node tests/deed-diag-tests.js      # turned angles, blunder detection, 65 deed phrasings, 19 real published descriptions, gap bridging and closure solving
    node tests/angleright-tests.js     # backsight / angle-right shots
    node tests/ui-tests.js             # point dock, connect flow, polyline labels
    node tests/keypad-tests.js         # surveyor keypad
    node tests/latlon-tests.js         # lat/lon paste parsing
    node tests/basemap-tests.js        # basemaps, zoom cap, Wayback releases
    node tests/kml-tests.js            # KML import and shifting one import
    node tests/jobmove-tests.js        # move / shift job
    node tests/app-smoke.js            # whole-app load test
    node tests/compat-tests.js         # every saved field survives save/reopen and the CSV copy; jobs and CSVs from 10 older versions load whole

All of them must pass (or match the expected table) before a new `index.html` ships.

## Compatibility fixtures

`tests/compat/fixtures/<version>.json` hold the phone storage, the CSV copy and the
job record that each listed older version (4.4.21 through 4.8.14) wrote for the same
job (`tests/compat/scenario.js`), produced by running that version's own code from
this repo's history. `BAC-4.8.13.csv` is a real CSV copy from the field.

To add the version you are about to replace, add it to `VERSIONS` in
`tests/compat/make-fixtures.js` and run `node tests/compat/make-fixtures.js` from the
repository root (needs git history). Existing fixtures are never rewritten unless
`--force` is given.
