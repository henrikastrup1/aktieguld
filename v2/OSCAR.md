# Oscar-opgaver til Aktieguld 2.0

Denne fil er specifikationen for de to cron-jobs der fodrer **Aktieguld 2.0**
(`https://henrikastrup1.github.io/aktieguld/v2/`). Alt data committes som JSON
til dette repo (`henrikastrup1/aktieguld`) under mappen `v2/` via GitHub API.

**Token:** Læs `GITHUB_TOKEN` fra miljøet (`~/.hermes/.env`). Hardcod ALDRIG tokenet.

---

## Job 1 — Dagligt morgenbrief (alle dage kl. 06:45)

### Datakilder (yfinance MCP)
1. **Danmark:** `^OMXC25` niveau + ændring, nyheder for `NOVO-B.CO`, `DSV.CO`, `JYSK.CO` og evt. andre C25-bevægelser
2. **USA:** `^GSPC`, `^IXIC` lukkeniveauer fra i går + de vigtigste markedsnyheder
3. **Futures:** `ES=F` (S&P 500), `NQ=F` (Nasdaq), `YM=F` (Dow). For Europa: test selv hvilke futures-tickers din yfinance-MCP finder (fx EURO STOXX/DAX-futures); hvis ingen virker, så brug seneste indeksniveauer og skriv det ærligt. **Gæt aldrig en kurs.**

### Indholdsregler
- Skriv på dansk, 3 faste sektioner: "Det danske marked", "Det amerikanske marked", "Futures & dagens åbning"
- Weekend: kortere indlæg med fokus på "ugen der kommer" (lørdag) og "ugen der gik" (søndag)
- Kun verificerbare tal fra MCP-kald — ingen opfundne kurser eller begivenheder
- Markdown: **fed**, `kode`, [links](url), - punktlister
- Din faste sign-off-stil er velkommen i slutningen af sidste sektion

### JSON-format — append til `v2/nyheder/YYYY-MM.json`
```json
{
  "month": "2026-06",
  "posts": [
    {
      "date": "2026-06-11",
      "weekday": "torsdag",
      "title": "Kort, fængende overskrift om dagens vigtigste tema",
      "sections": [
        {"heading": "Det danske marked", "body": "markdown…"},
        {"heading": "Det amerikanske marked", "body": "markdown…"},
        {"heading": "Futures & dagens åbning", "body": "markdown…"}
      ],
      "board": [
        {"label": "C25", "value": "2.145", "chg": "+0.4%"},
        {"label": "ES=F", "value": "6.870", "chg": "-0.2%"}
      ]
    }
  ]
}
```
`board` er valgfri og vises som chips under indlægget. Nyeste indlæg behøver ikke
ligge først — siden sorterer selv på `date`.

### Månedsskifte (den 1. i måneden)
1. Opret ny fil `v2/nyheder/YYYY-MM.json` med `{"month":"YYYY-MM","posts":[…]}`
2. Tilføj måneden til `v2/nyheder/index.json` → `{"months":["2026-06","2026-07"]}`

### Commit-mønster (GitHub API)
```bash
# 1) Hent eksisterende fil + sha
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/henrikastrup1/aktieguld/contents/v2/nyheder/2026-06.json"
# → dekod "content" (base64), tilføj dagens post til "posts"-arrayet

# 2) Skriv tilbage (sha SKAL med ved opdatering af eksisterende fil)
curl -s -X PUT -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/henrikastrup1/aktieguld/contents/v2/nyheder/2026-06.json" \
  -d '{"message":"Morgenbrief 2026-06-11","content":"<base64>","sha":"<sha-fra-trin-1>"}'
```

---

## Job 2 — Teknisk søndagsanalyse (søndag kl. 10:15, efter radar-kørslen kl. 10:00)

### Omfang
Alle aktier i `radar-data.js` (i repo-roden). Kommer der nye aktier til, analyseres de automatisk med.

### Indikatorer pr. aktie (yfinance MCP, 1 års dagsdata)
RSI(14), SMA50, SMA200, MACD (12/26/9), støtte/modstand (seneste markante lav/høj),
position i 52-ugers interval, trend (1 måned).

### Signalregler (deterministiske — argumentationen er din, reglerne er faste)
- **KØB:** kurs > SMA50 OG kurs > SMA200, RSI 35–70, samt gyldent kors eller brud over modstand
- **SÆLG:** kurs < SMA50 OG kurs < SMA200 med RSI > 30, eller dødskors i faldende trend
- **BEHOLD:** alt andet

### JSON-format — ny fil `v2/analyser/YYYY-MM-DD.json` (overskrives ALDRIG senere)
Se `v2/analyser/2026-06-07.json` som skabelon. Felter pr. aktie:
`name, ticker, price, currency, signal` (`koeb`/`saelg`/`behold`),
`headline, indicators {rsi, sma50, sma200, support, resistance, macd, trend, range52w},
arguments [3-5 punkter med konkrete tal], conclusion`.

Topfelter: `date, source` (fx "Søndagskørsel 14-06-2026"), `method` (signalreglerne).

### Efter snapshot
1. Tilføj datoen til `v2/analyser/index.json` → `{"dates":["2026-06-07","2026-06-14"]}`
2. **Telegram-besked til Henrik KUN hvis et signal har ændret sig** siden sidste
   snapshot (fx BEHOLD → KØB). Ingen ændring = ingen besked. Format: ticker,
   gammelt → nyt signal, én linjes begrundelse, link til siden.

---

## Ufravigelige principper
1. **Aldrig opfundne tal.** Kan en værdi ikke hentes, udelades den eller markeres "ikke tilgængelig".
2. **Snapshots er historik** — filer i `v2/analyser/` redigeres aldrig efter oprettelse.
3. **Append, ikke overskriv** — i nyhedsfiler tilføjes til `posts`, eksisterende indlæg røres ikke.
4. Fejler et API-kald: prøv igen én gang, og giv ellers Henrik besked på Telegram i stedet for at gætte.
