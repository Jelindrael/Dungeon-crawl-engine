# Morgenrot – Eine neue Welt

Ein Länder-Management-Spiel für das Smartphone (PWA). Du übernimmst 2026 die Regierung eines Landes, in dem gerade ein linkes Bündnis die Wahl gewonnen hat, und führst es bis ins Jahr 2100: durch Klimakrise, Kapitalflucht, Wahlen, Putschversuche, Tech-Oligarchie und den Kampf gegen die extreme Rechte.

Das Spiel ist ernst und lehrreich gemeint. Es zeigt nicht, dass „alles einfach“ ist, sondern welche Wege es gibt, wo sie scheitern können und was die Geschichte darüber lehrt.

## Spielen

```bash
cd morgenrot
npm install
npm run dev        # Entwicklungsserver (auch im LAN erreichbar, z. B. vom Handy)
npm run build      # Produktionsbuild nach dist/
npm run preview    # Build lokal testen
```

Als PWA lässt sich das Spiel nach dem ersten Aufruf über „Zum Startbildschirm hinzufügen“ installieren und funktioniert danach offline. Der Spielstand wird automatisch im Browser gespeichert.

Zum Veröffentlichen genügt jeder statische Webhost mit HTTPS (z. B. GitHub Pages, Netlify, Cloudflare Pages). Alle Pfade sind relativ, das Spiel läuft also auch in einem Unterordner. Für GitHub Pages liegt ein Workflow unter `.github/workflows/morgenrot-pages.yml` bereit.

## Was das Spiel enthält

- **8 Startländer** mit realen Ausgangsdaten (2025/26), eigenen Regionen, Kulturmerkmalen, Fraktionen und Konflikten: Deutschland, Chile, Brasilien, Polen, Südafrika, Indonesien, Indien und die USA.
- **38 politische Stellschrauben** in 8 Bereichen, von Eigentum, Steuern und Arbeitszeit über Energie, reproduktive Rechte und Migration bis zu Plattformregulierung, KI und Schuldenpolitik.
- **6 wählbare politische Systeme** (parlamentarisch, präsidial, partizipativ, Rätedemokratie, Staatssozialismus, Notstand) mit echten Vor- und Nachteilen. Autoritäre Systeme liefern z. B. geschönte Statistiken.
- **12 gesellschaftliche Kräfte** mit Loyalität, Macht und eigenen Forderungen. Mächtige Gegner verteuern Reformen.
- **Wahlen, Opposition und Regime**: Du kannst abgewählt werden, im Widerstand gegen ein Regime kämpfen und zurückkehren.
- **27 Großprojekte**, die auf der 3D-Karte sichtbar werden, und **15 Technologien** mit Chancen und Gefahren.
- **201 Ereignisse**: allgemeine, länderspezifische und fraktionsbezogene sowie Ereignisse späterer Jahrzehnte.
- **Ein Lexikon mit 78 Einträgen** zu Konzepten, Geschichte und realen Beispielen, mit Quellen.
- **34 Erfolge**, eine Bilanz im Jahr 2100 und eine endlose Fortsetzung.

## Aufbau

```
src/
  sim/        Simulation in reinem TypeScript (ohne DOM, testbar)
  data/       Spielinhalte: Länder, Politik, Systeme, Ereignisse, Lexikon …
  world/      3D-Welt mit three.js (Hex-Diorama, Modelle, Animation)
  ui/         Oberfläche mit Preact (Bildschirme, Panels, Dialoge)
  audio/      Prozeduraler Klang über die Web Audio API
tests/        Datenintegrität und Balance-Simulationen mit Bots
```

### Simulationsprinzip

- **Ziele statt Sprünge:** Politik setzt Zielwerte, die Wirklichkeit nähert sich ihnen langsam an. Beim Spielstart wird jedes Land so kalibriert, dass seine reale Ausgangslage ein Gleichgewicht ist. Es zählt also der Unterschied, den deine Politik macht.
- **Materielle Lage vor Ideologie:** Fraktionen bewerten Politik, aber ihre Loyalität hängt stärker an Arbeitslosigkeit, Inflation, Lebensqualität usw. Menschen gewöhnen sich an Verbesserungen, und Regierungen nutzen sich ab.
- **Lebensqualität statt BIP:** Der zentrale Erfolgsindikator verbindet Gesundheit, Bildung, Wohnen, gerecht verteiltes Einkommen, freie Zeit, Umwelt, Sicherheit und Rechte.
- **Die Welt spielt mit:** Die globale Erwärmung hängt nur teilweise vom eigenen Land ab, vom Vorbild, der Klimadiplomatie und der globalen Bewegung.

### Tests

```bash
npm test           # Datenintegrität + Balance-Simulationen
npm run balance    # Ausführliche Balance-Auswertung je Land und Strategie
```

Die Balance-Tests lassen mehrere Bot-Strategien (passiv, reformorientiert, radikal, klug, zufällig) in allen Ländern bis 2100 spielen und prüfen, dass die Simulation stabil bleibt.

## Hinweis

Das Spiel ist eine stark vereinfachte Simulation. Länderdaten sind gerundet, Wirkungszusammenhänge bewusst modellhaft. Reale Politikerinnen und Politiker kommen nicht vor; alle Rollen sind generisch.
