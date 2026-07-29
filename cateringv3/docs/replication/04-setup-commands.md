# Setup Commands — Copy-Pasteable

Run from the Reflex project root (where `rxconfig.py` lives), in order.

## Fresh scaffold

```bash
reflex init
```

## Fonts (customer app, one-time)

```bash
mkdir -p assets/fonts
curl -L -o assets/fonts/PlayfairDisplay.woff2 "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.woff2"
curl -L -o assets/fonts/Inter.woff2 "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.woff2"
ls -la assets/fonts/
```

Expected: two non-empty `.woff2` files. If either 404s or is under 10 KB, find the current variable-font path in the google/fonts repo and retry — never fall back to a CDN `<link>`.

## Test loop (every task)

```bash
python -m pytest tests/<new_test_file>.py -v   # verify new test fails first
# ...write implementation...
python -m pytest tests/<new_test_file>.py -v   # verify it passes
python -m pytest -v                             # full suite before every commit
```

## Compile check (after every component/page change)

```bash
python -c "from cateringv3.<module> import <name>; print('ok')"
```

## Full compile + run (before a browser smoke test)

```bash
reflex compile --dry
```

Then, to run the server:

```bash
reflex run --env prod --single-port > reflex.log 2>&1 &
disown
```

Poll until ready (don't assume a short wait means crash — prod build takes ~40s):

```bash
i=0; until grep -qi "App running at" reflex.log 2>/dev/null || [ $i -ge 30 ]; do sleep 2; i=$((i+1)); done
cat reflex.log
```

## Reload after a code change (server already running)

```bash
PORT=$(grep -oP 'http://0\.0\.0\.0:\K[0-9]+' reflex.log)
kill -INT $(lsof -i :$PORT -sTCP:LISTEN -t)
> reflex.log
reflex run --env prod --single-port > reflex.log 2>&1 &
disown
```
