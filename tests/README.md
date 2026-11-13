# ChainLink Survey tests

Run from the repository root with Node (no packages needed). Unless noted, each
takes the path to `index.html` as an optional argument and defaults to `./index.html`.

    node tests/chainlink-tests.js      # deed-parser regression suite, ~2 min; compare the final table to EXPECTED in its header
    node tests/deed-diag-tests.js      # turned angles, blunder detection, 65 deed phrasings
    node tests/angleright-tests.js     # backsight / angle-right shots
    node tests/ui-tests.js             # point dock, connect flow, polyline labels
    node tests/keypad-tests.js         # surveyor keypad
    node tests/latlon-tests.js         # lat/lon paste parsing
    node tests/basemap-tests.js        # basemaps, zoom cap, Wayback releases
    node tests/kml-tests.js            # KML import and shifting one import
    node tests/jobmove-tests.js        # move / shift job
    node tests/app-smoke.js            # whole-app load test; reads /home/claude/index.html (fixed path inside the file)

All of them must pass (or match the expected table) before a new `index.html` ships.

Known as of v4.8.11: two wiring checks in `kml-tests.js` fail ("import menu entry",
"polylines persist whole"). Both look for text that only existed in functions
removed as unused in v4.8.10; KML import and polyline saving are unaffected.
