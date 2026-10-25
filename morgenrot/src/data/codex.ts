// Das Lexikon: kurze, sachliche Erklärungen zu Konzepten, Geschichte und realen Beispielen.
// Einträge werden im Spiel durch Ereignisse, Politik und Systeme freigeschaltet.
import type { CodexEintrag } from './schema';

const e = (id: string, titel: string, kategorie: string, text: string[], quellen?: string[]): CodexEintrag => ({
  id,
  titel,
  kategorie,
  text,
  quellen,
});

export const CODEX: CodexEintrag[] = [
  // ───────── Grundlagen ─────────
  e('spielanleitung', 'So funktioniert Morgenrot', 'Grundlagen', [
    'Jede Runde ist ein Halbjahr. Du stellst politische Stellschrauben, startest Großprojekte, reagierst auf Ereignisse und verhandelst mit gesellschaftlichen Kräften. Dann beendest du die Runde, und das Land entwickelt sich.',
    'Politische Entscheidungen kosten politisches Kapital (PK). Es wächst mit Zustimmung und Legitimität. Mächtige Gruppen, die eine Reform ablehnen, machen sie teurer – so zeigt das Spiel, wie Macht in der Gesellschaft verteilt ist.',
    'Die meisten Werte reagieren verzögert: Politik setzt Ziele, die Wirklichkeit folgt langsam. Gute Politik braucht Geduld – und eine Mehrheit, die sie trägt.',
    'Das eigentliche Ziel ist nicht das Wirtschaftswachstum, sondern die Lebensqualität aller Menschen auf einem bewohnbaren Planeten. Du kannst Wahlen verlieren, gestürzt werden und zurückkehren. Das Spiel läuft bis 2100 – und darüber hinaus.',
  ]),
  e('sozialismus', 'Was ist Sozialismus?', 'Grundlagen', [
    'Sozialismus bezeichnet eine Vielzahl von Ideen und Bewegungen, deren gemeinsamer Kern ist: Die Wirtschaft soll den Bedürfnissen aller Menschen dienen, nicht dem Profit weniger. Dazu sollen Produktionsmittel – Fabriken, Land, Infrastruktur – ganz oder teilweise gemeinschaftlich besessen und demokratisch kontrolliert werden.',
    'Die Spannweite ist groß: vom demokratischen Sozialismus und der Sozialdemokratie über Genossenschafts- und Rätemodelle bis zu autoritären Staatssozialismen des 20. Jahrhunderts. Deren Scheitern – Unterdrückung, Bürokratie, Mangelwirtschaft – ist ein zentraler Teil dieser Geschichte.',
    'Heutige Ansätze verbinden soziale Gerechtigkeit meist mit Demokratie, Ökologie, Feminismus und Antirassismus. Im Spiel kannst du sehr unterschiedliche Wege gehen – und ihre Folgen erleben.',
  ], ['Axel Honneth: Die Idee des Sozialismus (2015)', 'Erik Olin Wright: Linke Alternativen. Real Utopias (2017)']),
  e('gutes_leben', 'Gutes Leben jenseits des Wachstums', 'Grundlagen', [
    'Das Bruttoinlandsprodukt misst, wie viel produziert und verkauft wird – nicht, wie gut Menschen leben. Ab einem gewissen Wohlstandsniveau steigt die Lebenszufriedenheit kaum noch mit dem Einkommen, während Umweltzerstörung weiter wächst.',
    'Konzepte wie „Buen Vivir“ aus den Anden, die „Doughnut-Ökonomie“ von Kate Raworth oder Degrowth fragen: Wie können alle Menschen gut leben, ohne die planetaren Grenzen zu sprengen? Antworten sind u. a. öffentliche Güter, kürzere Arbeitszeiten, gerechte Verteilung und Suffizienz.',
  ], ['Kate Raworth: Die Doughnut-Ökonomie (2018)', 'Jason Hickel: Weniger ist mehr (2022)']),

  // ───────── Wirtschaft & Eigentum ─────────
  e('verstaatlichung', 'Verstaatlichung', 'Wirtschaft', [
    'Bei einer Verstaatlichung geht ein Unternehmen in staatliches Eigentum über. Viele Länder haben Schlüsselbranchen verstaatlicht – etwa Großbritannien nach 1945 (Kohle, Bahn, Gesundheit), Frankreich 1982 (Banken, Industrie) oder Mexiko 1938 (Öl).',
    'Vorteile: Gewinne fließen an die Allgemeinheit, strategische Entscheidungen folgen dem Gemeinwohl. Risiken: Bürokratie, politische Einflussnahme, Kapitalflucht und Konflikte mit Investoren und anderen Staaten. Entscheidend ist, wie demokratisch und transparent die Betriebe geführt werden.',
  ]),
  e('vergesellschaftung', 'Vergesellschaftung', 'Wirtschaft', [
    'Vergesellschaftung geht über Verstaatlichung hinaus: Unternehmen werden in Gemeineigentum überführt, das nicht von Ministerien, sondern von Beschäftigten, Nutzerinnen und der Öffentlichkeit gemeinsam verwaltet wird.',
    'Das deutsche Grundgesetz erlaubt in Artikel 15 ausdrücklich die Vergesellschaftung von Grund und Boden, Naturschätzen und Produktionsmitteln gegen Entschädigung. Angewendet wurde der Artikel bisher nie – die Berliner Initiative „Deutsche Wohnen & Co. enteignen“ hat ihn 2021 wieder in die Debatte gebracht.',
  ], ['Grundgesetz, Art. 14 und 15']),
  e('genossenschaften', 'Genossenschaften', 'Wirtschaft', [
    'In Genossenschaften gehört das Unternehmen den Mitgliedern – etwa den Beschäftigten, Kundinnen oder Erzeugern. Jedes Mitglied hat eine Stimme, unabhängig vom Kapitalanteil.',
    'Die Mondragón-Gruppe im Baskenland beschäftigt rund 70.000 Menschen in über 80 Genossenschaften; die Lohnspreizung ist stark begrenzt. In der Emilia-Romagna erwirtschaften Genossenschaften einen großen Teil der Wirtschaftsleistung. Studien zeigen: Genossenschaften sind oft krisenfester und bauen in Rezessionen seltener Stellen ab.',
  ], ['Mondragon Corporation, Jahresberichte', 'Virginie Pérotin: What do we really know about worker co-operatives? (2016)']),
  e('demokratische_planung', 'Demokratische Planung', 'Wirtschaft', [
    'Märkte sind gut darin, Konsumwünsche zu koordinieren – aber schlecht darin, langfristige Ziele wie Klimaneutralität zu erreichen. Demokratische Planung bedeutet, dass gewählte Gremien Prioritäten für Investitionen setzen, während Märkte für viele Alltagsgüter bestehen bleiben.',
    'Beispiele sind die Kriegswirtschaften im Zweiten Weltkrieg, die französische „Planification“ der Nachkriegszeit oder heutige Ideen einer „ökologischen Rahmenplanung“. Die Herausforderung: Pläne müssen demokratisch, flexibel und informiert sein.',
  ]),
  e('planwirtschaft', 'Zentrale Planwirtschaft', 'Geschichte', [
    'In der Sowjetunion und anderen Staatssozialismen legten Planbehörden Produktionsziele und Preise zentral fest. Das ermöglichte schnelle Industrialisierung, Vollbeschäftigung und Grundversorgung – aber auch chronischen Mangel, Verschwendung, Umweltzerstörung und eine mächtige Bürokratie.',
    'Ein zentrales Problem war Information: Ohne Preissignale und ohne freie Rückmeldung von unten wussten die Planer oft nicht, was gebraucht wurde. Geschönte Erfolgsmeldungen verschärften das. Im Spiel siehst du deshalb in autoritären Systemen nur ungenaue Statistiken.',
  ], ['János Kornai: The Socialist System (1992)']),
  e('cybersyn', 'Projekt Cybersyn', 'Geschichte', [
    'In Chile entwickelte die Regierung Allende ab 1971 mit dem britischen Kybernetiker Stafford Beer das Projekt Cybersyn: Ein Netzwerk aus Fernschreibern übermittelte täglich Produktionsdaten aus den verstaatlichten Betrieben an einen Kontrollraum in Santiago. Ziel war eine dezentrale, partizipative Planung.',
    'Während eines Unternehmerstreiks 1972 half das System, die Versorgung aufrechtzuerhalten. Nach dem Putsch 1973 wurde es zerstört. Heute gilt Cybersyn als frühe Vision digitaler Wirtschaftsdemokratie.',
  ], ['Eden Medina: Cybernetic Revolutionaries (2011)']),
  e('oeffentliche_banken', 'Öffentliche Banken', 'Wirtschaft', [
    'Öffentliche Banken gehören Staat oder Kommunen und verfolgen einen Gemeinwohlauftrag. In Deutschland halten Sparkassen und Landesbanken einen großen Teil des Marktes; die KfW finanziert Wohnungsbau und Energiewende.',
    'Weltweit spielen Entwicklungsbanken eine Schlüsselrolle für Infrastruktur. Öffentliche Banken können günstigere Kredite für Klimaschutz vergeben und machen den Staat weniger abhängig von Finanzmärkten.',
  ]),
  e('kapitalkontrollen', 'Kapitalverkehrskontrollen', 'Wirtschaft', [
    'Kapitalverkehrskontrollen beschränken, wie viel Geld ins Land oder aus dem Land fließen darf. Nach dem Zweiten Weltkrieg waren sie weltweit üblich. Malaysia nutzte sie 1998 erfolgreich in der Asienkrise, Island 2008, Zypern 2013.',
    'Selbst der IWF erkennt inzwischen an, dass Kontrollen in Krisen sinnvoll sein können. Sie schützen vor Kapitalflucht und Spekulation, erschweren aber auch ausländische Investitionen.',
  ], ['IMF: The Liberalization and Management of Capital Flows (2012)']),
  e('kapitalstreik', 'Investitionsstreik', 'Wirtschaft', [
    'Unternehmen und Vermögende können Druck auf Regierungen ausüben, indem sie Investitionen zurückhalten oder Kapital abziehen. Dieses strukturelle Machtungleichgewicht wird in der Politikwissenschaft als „struktureller Macht des Kapitals“ beschrieben.',
    'Linke Regierungen von Frankreich 1981 bis Griechenland 2015 erlebten solchen Druck. Gegenstrategien sind öffentliche Investitionen, öffentliche Banken, Kapitalverkehrskontrollen und die Stärkung von Gemeineigentum.',
  ], ['Charles Lindblom: Politics and Markets (1977)']),
  e('vermoegensteuer', 'Vermögensteuer', 'Wirtschaft', [
    'In vielen Ländern besitzt das reichste Prozent mehr als die ärmere Hälfte der Bevölkerung zusammen. Eine Vermögensteuer besteuert große Vermögen jährlich mit einem kleinen Prozentsatz.',
    'Deutschland erhob bis 1996 eine Vermögensteuer. Ökonominnen wie Gabriel Zucman schlagen eine globale Mindeststeuer von 2 % für Milliardäre vor – die G20 haben 2024 darüber beraten.',
  ], ['Thomas Piketty: Das Kapital im 21. Jahrhundert (2014)', 'Gabriel Zucman: Bericht an die G20 (2024)']),
  e('maximaleinkommen', 'Maximaleinkommen', 'Wirtschaft', [
    'Die Idee: Einkommen oberhalb einer Grenze – etwa das Zwanzigfache des Mindestlohns – werden nahezu vollständig besteuert. In den USA lag der Spitzensteuersatz zwischen 1944 und 1963 bei über 90 %.',
    'Befürworter argumentieren, dass extreme Einkommen demokratische Gleichheit untergraben. Kritiker warnen vor Abwanderung. In Mondragón verdienen Führungskräfte höchstens etwa das Sechsfache der niedrigsten Löhne.',
  ]),
  e('steueroasen', 'Steueroasen', 'Wirtschaft', [
    'Schätzungen zufolge sind weltweit rund 8 bis 10 Billionen Dollar Privatvermögen in Steueroasen versteckt. Konzerne verschieben jährlich Hunderte Milliarden an Gewinnen in Niedrigsteuerländer.',
    'Enthüllungen wie die Panama Papers (2016) oder die Pandora Papers (2021) haben das Ausmaß sichtbar gemacht. Seit 2024 gilt eine globale Mindeststeuer von 15 % für große Konzerne – mit vielen Ausnahmen.',
  ], ['EU Tax Observatory: Global Tax Evasion Report (2024)']),
  e('autarkie', 'Autarkie', 'Wirtschaft', [
    'Autarkie bedeutet wirtschaftliche Selbstversorgung. Völlige Abschottung führte historisch meist zu Armut und Mangel – etwa in Nordkorea oder Albanien unter Hoxha.',
    'Zugleich hat die Pandemie gezeigt, wie verletzlich globale Lieferketten sind. Viele Länder setzen heute auf „strategische Autonomie“ bei Medikamenten, Energie und Nahrung – ohne sich ganz abzuschotten.',
  ]),
  e('finanzkrise', 'Finanzkrisen', 'Wirtschaft', [
    'Die Finanzkrise 2008 begann mit einer geplatzten Immobilienblase in den USA und wurde zur schwersten Weltwirtschaftskrise seit 1929. Staaten retteten Banken mit Billionen – die Kosten trugen über Sparprogramme oft die Bürgerinnen.',
    'Ökonom Hyman Minsky beschrieb, wie Stabilität selbst Instabilität erzeugt: In guten Zeiten steigt die Risikobereitschaft, bis die Blase platzt. Strenge Regulierung und öffentliche Banken können das Risiko verringern.',
  ], ['Adam Tooze: Crashed (2018)']),
  e('mmt', 'Staatsschulden und Geldschöpfung', 'Wirtschaft', [
    'Staaten mit eigener Währung können sich nicht wie Privatpersonen „verschulden“: Ihre Zentralbank kann Geld schöpfen. Die Grenze ist nicht die Kasse, sondern die Inflation – wenn mehr Geld auf zu wenige Güter trifft.',
    'Die „Moderne Geldtheorie“ betont diesen Spielraum, Kritiker warnen vor Inflation und Vertrauensverlust. Für Länder, die in fremder Währung verschuldet sind, ist die Lage ganz anders: Sie sind auf Finanzmärkte und den IWF angewiesen.',
  ], ['Stephanie Kelton: The Deficit Myth (2020)']),
  e('schuldenbremse', 'Die Schuldenbremse', 'Wirtschaft', [
    'Seit 2009 begrenzt das Grundgesetz die Neuverschuldung des Bundes auf 0,35 % des BIP pro Jahr. Befürworter sehen darin Generationengerechtigkeit, Kritikerinnen einen Investitionsstau bei Schulen, Bahn und Klimaschutz.',
    'Der Investitionsbedarf für Klimaneutralität und Infrastruktur wird auf mehrere hundert Milliarden Euro geschätzt. 2025 wurde die Regel für Verteidigung und ein Infrastruktur-Sondervermögen gelockert.',
  ], ['IMK/IW: Investitionsbedarf Deutschland (2024)']),
  e('schuldenstreik', 'Schuldenkrisen und Schuldenstreik', 'Welt', [
    'Viele Länder des globalen Südens zahlen mehr für Schuldendienst als für Gesundheit und Bildung zusammen. IWF-Programme verlangten oft Privatisierungen und Kürzungen („Strukturanpassung“) – mit verheerenden sozialen Folgen.',
    'Ecuador ließ 2008 seine Schulden prüfen und verweigerte die Zahlung als „illegitim“ eingestufter Anleihen – und kaufte sie später billig zurück. Argentinien stellte 2001 die Zahlungen ein. Das Konzept der „verabscheuungswürdigen Schulden“ (odious debt) besagt, dass Schulden von Diktaturen nicht von der Bevölkerung zurückgezahlt werden müssen.',
  ], ['erlassjahr.de: Schuldenreport', 'Éric Toussaint: Das System Schulden (2019)']),
  e('rohstoffe', 'Rohstoffe und der Ressourcenfluch', 'Wirtschaft', [
    'Reiche Bodenschätze führen oft nicht zu Wohlstand, sondern zu Korruption, Ungleichheit und Konflikten – man spricht vom „Ressourcenfluch“. Norwegen zeigt, dass es anders geht: Sein staatlicher Ölfonds gehört der Bevölkerung.',
    'Die Energiewende braucht Lithium, Kupfer, Nickel und Kobalt. Länder wie Chile, Bolivien, Indonesien und die DR Kongo ringen darum, mehr von der Wertschöpfung im eigenen Land zu behalten – und Umwelt und indigene Rechte zu schützen.',
  ]),
  e('monopole', 'Monopole und Kartellrecht', 'Technologie', [
    'Wenige Konzerne beherrschen Suche, soziale Medien, Onlinehandel und Cloud. Diese Marktmacht erlaubt es ihnen, Preise zu diktieren, Konkurrenz aufzukaufen und politische Debatten zu prägen.',
    'Historisch wurden Monopole zerschlagen – Standard Oil 1911, AT&T 1984. Die EU reguliert Plattformen seit 2022 mit dem Digital Markets Act und dem Digital Services Act.',
  ]),

  // ───────── Arbeit & Soziales ─────────
  e('mitbestimmung', 'Mitbestimmung', 'Arbeit', [
    'In Deutschland wählen Beschäftigte in großen Unternehmen bis zur Hälfte des Aufsichtsrats (Mitbestimmungsgesetz 1976), in der Montanindustrie sogar paritätisch. Betriebsräte haben Mitspracherechte bei Arbeitszeiten, Kündigungen und mehr.',
    'Die polnische Gewerkschaft Solidarność forderte 1981 eine „selbstverwaltete Republik“ mit Arbeiterräten. Studien zeigen, dass Mitbestimmung Produktivität und Beschäftigungssicherheit nicht schwächt, sondern oft stärkt.',
  ], ['Hans-Böckler-Stiftung: Mitbestimmungsreport']),
  e('tarifbindung', 'Tarifbindung', 'Arbeit', [
    'Tarifverträge zwischen Gewerkschaften und Arbeitgebern regeln Löhne und Arbeitsbedingungen. In Skandinavien oder Österreich gelten sie für über 80 % der Beschäftigten, in Deutschland nur noch für rund die Hälfte.',
    'Hohe Tarifbindung geht mit geringerer Lohnungleichheit einher. Die EU-Mindestlohnrichtlinie verlangt von Staaten mit weniger als 80 % Tarifbindung einen Aktionsplan.',
  ]),
  e('vier_tage_woche', 'Die Vier-Tage-Woche', 'Arbeit', [
    'Vor gut hundert Jahren erkämpften Gewerkschaften den Achtstundentag. Seitdem ist die Produktivität um ein Vielfaches gestiegen – die Arbeitszeit kaum gesunken.',
    'In Pilotprojekten in Großbritannien (2022, 61 Unternehmen) und Island (2015–2019) blieb die Produktivität bei weniger Stunden meist stabil, während Stress und Krankheitstage deutlich sanken. Die meisten Firmen behielten das Modell bei.',
  ], ['Autonomy: The results are in – UK four-day week pilot (2023)']),
  e('jobgarantie', 'Die Jobgarantie', 'Arbeit', [
    'Eine Jobgarantie verpflichtet den Staat, allen, die arbeiten wollen, eine tariflich bezahlte Stelle anzubieten – etwa in Pflege, Umweltschutz oder Kultur. Arbeitslosigkeit wird so praktisch abgeschafft.',
    'Indien garantiert seit 2005 ländlichen Haushalten 100 Tage bezahlte Arbeit im Jahr (MGNREGA). In der österreichischen Gemeinde Gramatneusiedl lief 2020–2024 ein Modellprojekt mit positiven Ergebnissen für Gesundheit und Gemeinschaft.',
  ], ['Pavlina Tcherneva: The Case for a Job Guarantee (2020)']),
  e('gerechter_uebergang', 'Gerechter Übergang (Just Transition)', 'Arbeit', [
    'Klimaschutz bedeutet das Ende von Kohle, Öl und Gas – und damit von Jobs in diesen Branchen. Ein „gerechter Übergang“ sorgt dafür, dass die Beschäftigten und Regionen nicht die Verlierer sind.',
    'Spanien vereinbarte 2018 mit den Gewerkschaften einen Kohleausstieg mit Frühverrentung, Umschulung und Investitionen in die Bergbauregionen. Ohne solche Garantien wenden sich betroffene Regionen häufig rechten Parteien zu.',
  ], ['ILO: Guidelines for a just transition (2015)']),
  e('grundeinkommen', 'Bedingungsloses Grundeinkommen', 'Arbeit', [
    'Jeder Mensch erhält regelmäßig einen festen Geldbetrag – ohne Bedingungen. Befürworterinnen versprechen Freiheit von Existenzangst und Anerkennung unbezahlter Arbeit. Kritiker fürchten hohe Kosten und sehen die Gefahr, dass öffentliche Dienste abgebaut werden.',
    'In Finnland (2017–2018) und im deutschen Pilotprojekt „Mein Grundeinkommen“ (2021–2024) arbeiteten Empfänger nicht weniger, waren aber gesünder und zufriedener.',
  ], ['DIW Berlin: Pilotprojekt Grundeinkommen – Ergebnisse (2025)']),
  e('grunddienste', 'Universelle Grunddienste', 'Arbeit', [
    'Statt Geld für alle schlägt dieser Ansatz vor, grundlegende Dienste für alle kostenlos zu machen: Gesundheit, Bildung, Wohnen, Nahverkehr, Internet. Gemeinsam genutzte Güter sind oft effizienter und ökologischer als privater Konsum.',
    'Das Konzept wurde 2017 am University College London ausgearbeitet. Kostenloser Nahverkehr in Luxemburg oder Tallinn und der britische Gesundheitsdienst sind Beispiele.',
  ], ['Anna Coote, Andrew Percy: The Case for Universal Basic Services (2020)']),
  e('care', 'Sorgearbeit (Care)', 'Gesellschaft', [
    'Kinder betreuen, Kranke pflegen, kochen, putzen: Weltweit leisten Frauen den Großteil dieser unbezahlten Arbeit – Schätzungen zufolge täglich über zwölf Milliarden Stunden. Ohne sie würde keine Wirtschaft funktionieren.',
    'Feministische Ökonominnen fordern, Sorgearbeit sichtbar zu machen, gerecht zu verteilen und gut zu bezahlen. Kostenlose Kitas, bezahlte Pflegezeiten und kürzere Arbeitszeiten für alle sind zentrale Instrumente.',
  ], ['Oxfam: Time to Care (2020)', 'Nancy Fraser: Der Allesfresser (2023)']),
  e('polikliniken', 'Polikliniken', 'Gesellschaft', [
    'In Polikliniken arbeiten Ärztinnen verschiedener Fachrichtungen, Pflegekräfte und Sozialarbeiter unter einem Dach. Das Modell war in der DDR verbreitet und lebt in Kuba sowie in Gesundheitszentren wie in Hamburg-Veddel wieder auf.',
    'Kubas Familienarzt-System erreicht trotz geringer Mittel eine Lebenserwartung ähnlich der der USA. Stadtteil-Gesundheitszentren verbinden Medizin mit der Frage, was Menschen krank macht: Armut, schlechte Wohnungen, Stress.',
  ]),
  e('nhs', 'Universelle Gesundheitsversorgung', 'Gesellschaft', [
    'Der britische National Health Service wurde 1948 gegründet: Gesundheitsversorgung für alle, kostenlos am Ort der Behandlung, finanziert aus Steuern. Er wurde zum Vorbild für viele Länder.',
    'Die USA geben pro Kopf fast doppelt so viel für Gesundheit aus wie andere reiche Länder – bei geringerer Lebenserwartung. Millionen sind unversichert; medizinische Schulden sind eine Hauptursache für Privatinsolvenzen.',
  ], ['OECD: Health at a Glance (2023)']),
  e('wien', 'Das Wiener Modell', 'Gesellschaft', [
    'Rund die Hälfte der Wienerinnen und Wiener lebt in Gemeindewohnungen oder geförderten Genossenschaftswohnungen. Die Stadt baut seit dem „Roten Wien“ der 1920er Jahre selbst – und hält die Mieten dadurch dauerhaft niedrig.',
    'Wien landet in Rankings regelmäßig auf den vordersten Plätzen der lebenswertesten Städte. Das Modell zeigt: Wenn ein großer Teil des Wohnraums dem Markt entzogen ist, sinkt der Druck auf alle Mieten.',
  ]),
  e('enteignen', 'Deutsche Wohnen & Co. enteignen', 'Gesellschaft', [
    'Im September 2021 stimmten in Berlin 59,1 % für einen Volksentscheid, große Wohnungskonzerne mit mehr als 3.000 Wohnungen zu vergesellschaften. Betroffen wären rund 240.000 Wohnungen.',
    'Eine Expertenkommission bestätigte 2023, dass eine Vergesellschaftung nach Artikel 15 Grundgesetz rechtlich möglich ist. Die Umsetzung steht bislang aus.',
  ], ['Abschlussbericht der Expertenkommission zum Volksentscheid (2023)']),
  e('oepnv', 'Kostenloser Nahverkehr', 'Klima & Umwelt', [
    'Luxemburg hat 2020 als erstes Land den gesamten öffentlichen Nahverkehr kostenlos gemacht, Tallinn schon 2013. Das Deutschlandticket zeigte 2023, wie stark günstige Preise die Nutzung erhöhen.',
    'Verkehr ist einer der größten CO₂-Verursacher. Doch kostenloser Nahverkehr wirkt nur, wenn auch das Angebot stimmt – gerade auf dem Land.',
  ]),

  // ───────── Klima & Umwelt ─────────
  e('klimakrise', 'Die Klimakrise', 'Klima & Umwelt', [
    'Die Erde hat sich gegenüber der vorindustriellen Zeit bereits um etwa 1,3 bis 1,5 °C erwärmt. Ursache ist vor allem die Verbrennung von Kohle, Öl und Gas. Hitzewellen, Dürren, Fluten und Stürme nehmen zu.',
    'Um die Erwärmung auf deutlich unter 2 °C zu begrenzen, müssten die weltweiten Emissionen bis etwa 2050 auf netto null sinken. Die reichsten 10 % der Weltbevölkerung verursachen rund die Hälfte der Emissionen – die Ärmsten leiden am meisten unter den Folgen.',
  ], ['IPCC: Sechster Sachstandsbericht (2023)', 'Oxfam: Climate Equality (2023)']),
  e('kipppunkte', 'Kipppunkte', 'Klima & Umwelt', [
    'Manche Teile des Klimasystems können ab einer bestimmten Erwärmung unumkehrbar kippen: das Abschmelzen der Eisschilde Grönlands und der Westantarktis, das Absterben tropischer Korallenriffe, das Auftauen von Permafrost oder die Verwandlung des Amazonas in eine Savanne.',
    'Einige dieser Kipppunkte könnten schon zwischen 1,5 und 2 °C überschritten werden. Sie würden die Erwärmung weiter beschleunigen.',
  ], ['Armstrong McKay et al., Science (2022)', 'Global Tipping Points Report (2023)']),
  e('energiewende', 'Die Energiewende', 'Klima & Umwelt', [
    'Solar- und Windstrom sind heute an den meisten Orten der Welt die günstigsten Energiequellen. Die Kosten für Solarmodule sind seit 2010 um rund 90 % gefallen, für Batterien ähnlich stark.',
    'Die Herausforderung liegt nicht mehr in der Technik, sondern im Tempo: Netze, Speicher, Genehmigungen, Fachkräfte – und in der Frage, wem die neue Energieinfrastruktur gehört.',
  ], ['IRENA: Renewable Power Generation Costs (2023)']),
  e('energiegenossenschaften', 'Energie in Bürgerhand', 'Klima & Umwelt', [
    'In Deutschland gehörte die Hälfte der erneuerbaren Anlagen zeitweise Bürgerinnen, Landwirten und Genossenschaften. In Dänemark müssen neue Windparks Anteile an Anwohner anbieten.',
    'Wenn Menschen an Windrädern und Solarparks beteiligt sind, steigt die Akzeptanz – und die Gewinne bleiben in der Region. Stadtwerke in kommunaler Hand können die Wärmewende planen.',
  ]),
  e('kernkraft', 'Kernkraft', 'Klima & Umwelt', [
    'Kernkraftwerke erzeugen Strom fast ohne CO₂-Emissionen. Neue Reaktoren sind jedoch sehr teuer und brauchen oft zehn bis zwanzig Jahre bis zur Fertigstellung – etwa Hinkley Point C in Großbritannien oder Flamanville in Frankreich.',
    'Die Endlagerung des Atommülls ist weltweit ungelöst, Unfälle wie Tschernobyl und Fukushima haben ganze Regionen unbewohnbar gemacht. Ob Kernkraft Teil der Lösung ist, bleibt umstritten.',
  ]),
  e('klimadividende', 'CO₂-Preis mit Klimadividende', 'Klima & Umwelt', [
    'Ein CO₂-Preis macht klimaschädliches Verhalten teurer. Allein trifft er aber ärmere Haushalte am stärksten. Die Lösung: Alle Einnahmen werden als gleiche Pro-Kopf-Dividende ausgezahlt.',
    'Weil Reiche viel mehr CO₂ verursachen, zahlen sie mehr ein, als sie zurückbekommen – die Mehrheit profitiert. Die Schweiz und Kanada nutzen solche Modelle.',
  ]),
  e('agraroekologie', 'Agrarökologie und Landreform', 'Klima & Umwelt', [
    'Agrarökologie verbindet traditionelles Wissen mit moderner Ökologie: vielfältige Fruchtfolgen, Agroforst, Humusaufbau, wenig Chemie. Kleinbäuerliche Betriebe produzieren weltweit einen großen Teil der Nahrung auf einem kleinen Teil der Fläche.',
    'In vielen Ländern besitzen wenige Großgrundbesitzer den Großteil des Landes. Bewegungen wie die brasilianische Landlosenbewegung MST oder La Vía Campesina kämpfen für Landreform und Ernährungssouveränität.',
  ], ['Weltagrarbericht (IAASTD, 2008)']),
  e('dreissig_prozent', '30 % für die Natur', 'Klima & Umwelt', [
    'Auf der UN-Biodiversitätskonferenz 2022 in Montréal vereinbarten fast 200 Staaten, bis 2030 je 30 % der Land- und Meeresflächen zu schützen. Die Zahl der Wildtiere ist seit 1970 im Schnitt um rund 70 % gesunken.',
    'Renaturierte Moore, Wälder und Flussauen speichern CO₂, schützen vor Fluten und sind Lebensraum. Das EU-Renaturierungsgesetz von 2024 verpflichtet die Mitgliedstaaten zur Wiederherstellung von Ökosystemen.',
  ], ['WWF: Living Planet Report (2024)']),
  e('rechte_der_natur', 'Rechte der Natur', 'Klima & Umwelt', [
    'Ecuador hat 2008 als erstes Land die Rechte der Natur in die Verfassung geschrieben. Neuseeland erkannte 2017 den Fluss Whanganui als Rechtsperson an, Spanien 2022 die Lagune Mar Menor.',
    'Die Idee wurzelt oft in indigenen Weltanschauungen, die den Menschen als Teil der Natur sehen. Indigene Völker schützen weltweit einen großen Teil der verbliebenen Artenvielfalt.',
  ]),
  e('klimagerechtigkeit', 'Klimagerechtigkeit', 'Welt', [
    'Die Länder, die am wenigsten zur Klimakrise beigetragen haben, leiden am stärksten. Die reichen Industrieländer haben historisch den Großteil der Emissionen verursacht.',
    'Auf der Klimakonferenz 2022 wurde ein Fonds für Verluste und Schäden beschlossen. Das Versprechen, jährlich 100 Milliarden Dollar Klimafinanzierung bereitzustellen, wurde jahrelang verfehlt.',
  ]),
  e('geoengineering', 'Geoengineering', 'Technologie', [
    'Solares Geoengineering will die Erde kühlen, indem Partikel in die Stratosphäre gebracht werden, die Sonnenlicht reflektieren – ähnlich wie nach großen Vulkanausbrüchen.',
    'Die Risiken sind enorm: Veränderung von Monsunen und Niederschlägen, ein „Terminationsschock“ beim plötzlichen Stopp und die Frage, wer über das Klima der ganzen Welt entscheidet. Die Ursache – die Emissionen – bleibt unberührt.',
  ]),

  // ───────── Demokratie & Staat ─────────
  e('parlamentarismus', 'Parlamentarische Demokratie', 'Demokratie', [
    'In parlamentarischen Demokratien wählt das Volk ein Parlament, das die Regierung bestimmt und kontrolliert. Gewaltenteilung, freie Presse und unabhängige Gerichte sollen Machtmissbrauch verhindern.',
    'Kritik von links: Wirtschaftliche Macht übersetzt sich in politische Macht – durch Lobbyismus, Parteispenden und Medienbesitz. Viele Bereiche des Lebens, vor allem die Wirtschaft, bleiben der demokratischen Entscheidung entzogen.',
  ]),
  e('gewaltenteilung', 'Gewaltenteilung', 'Demokratie', [
    'Die Teilung in Gesetzgebung, Regierung und Rechtsprechung soll verhindern, dass eine Instanz zu mächtig wird. Unabhängige Gerichte schützen Grundrechte – auch gegen Mehrheiten.',
    'Wer Gerichte mit Gefolgsleuten besetzt, untergräbt die Demokratie – das zeigten Ungarn und Polen in den 2010er Jahren. Auch wohlmeinende Regierungen öffnen damit Türen, durch die später andere gehen.',
  ]),
  e('partizipative_demokratie', 'Partizipative Demokratie', 'Demokratie', [
    'Partizipative Demokratie ergänzt Wahlen durch direkte Beteiligung: Bürgerhaushalte, ausgeloste Bürgerräte, Volksentscheide, Wirtschafts- und Sozialräte.',
    'Irland nutzte Bürgerversammlungen, um die Ehe für alle (2015) und die Legalisierung von Abtreibungen (2018) vorzubereiten – beides wurde per Referendum angenommen. Die Erfahrung: Gut informierte Bürgerinnen treffen oft mutigere Entscheidungen als Parlamente.',
  ]),
  e('buergerraete', 'Bürgerräte', 'Demokratie', [
    'Ein Bürgerrat besteht aus zufällig ausgelosten Menschen, die die Bevölkerung nach Alter, Geschlecht, Bildung und Herkunft abbilden. Sie hören Expertinnen an, beraten und geben Empfehlungen.',
    'Frankreichs Bürgerkonvent für das Klima (2019–2020) erarbeitete 149 Vorschläge. Dass die Regierung viele davon verwässerte, sorgte für Enttäuschung – Bürgerräte wirken nur, wenn ihre Ergebnisse ernst genommen werden.',
  ]),
  e('porto_alegre', 'Der Bürgerhaushalt von Porto Alegre', 'Demokratie', [
    'Ab 1989 entschieden in der brasilianischen Stadt Porto Alegre die Bewohnerinnen in Versammlungen direkt über einen Teil des städtischen Investitionshaushalts. Besonders arme Viertel profitierten: Kanalisation, Schulen, Gesundheitsposten.',
    'Das Modell verbreitete sich in Tausende Städte weltweit. Die Weltbank stellte fest, dass es Korruption verringerte und öffentliche Leistungen verbesserte.',
  ], ['Gianpaolo Baiocchi: Militants and Citizens (2005)']),
  e('raete', 'Rätedemokratie', 'Demokratie', [
    'In einer Rätedemokratie organisieren sich Menschen in Räten an ihrem Arbeitsplatz und in ihrer Nachbarschaft. Diese wählen Delegierte in höhere Räte – mit imperativem Mandat und jederzeitiger Abwählbarkeit.',
    'Räte entstanden in vielen Revolutionen: Paris 1871, Russland 1905 und 1917 (bevor die Bolschewiki sie entmachteten), Deutschland 1918, Ungarn 1956. Heute gibt es ähnliche Strukturen etwa in der Autonomen Verwaltung Nord- und Ostsyriens oder bei den Zapatistas in Mexiko.',
  ], ['Hannah Arendt: Über die Revolution (1963)']),
  e('staatssozialismus', 'Staatssozialismus', 'Geschichte', [
    'Die Sowjetunion, die DDR, China unter Mao und andere Staaten nannten sich sozialistisch. Sie erreichten teils beachtliche Erfolge bei Alphabetisierung, Gesundheit und Gleichstellung von Frauen in der Arbeitswelt.',
    'Zugleich waren sie Diktaturen: Einparteienherrschaft, Geheimpolizei, Zensur, Lager, Millionen Tote durch Repression und Hungersnöte. Die Lehre vieler heutiger Sozialistinnen: Ohne Demokratie und Freiheit kein Sozialismus, der diesen Namen verdient.',
  ], ['Rosa Luxemburg: Zur russischen Revolution (1918): „Freiheit ist immer Freiheit der Andersdenkenden.“']),
  e('autoritarismus', 'Die autoritäre Versuchung', 'Demokratie', [
    'Immer wieder haben Regierungen – auch linke – geglaubt, ihre Ziele schneller ohne Opposition, freie Presse und unabhängige Gerichte zu erreichen. Fast immer führte das zu Machtmissbrauch, Korruption und Gewalt.',
    'Die Politikwissenschaftler Levitsky und Ziblatt beschreiben, wie Demokratien heute selten durch Putsche sterben, sondern schleichend: durch das Aushöhlen von Normen, die Übernahme der Schiedsrichter und die Ausschaltung der Opposition.',
  ], ['Steven Levitsky, Daniel Ziblatt: Wie Demokratien sterben (2018)']),
  e('zensur', 'Zensur und Propaganda', 'Demokratie', [
    'Wer Medien kontrolliert, kontrolliert die Wahrnehmung. Staatliche Zensur unterdrückt Kritik – und beraubt die Regierung zugleich der Information, die sie braucht, um Fehler zu erkennen.',
    'Der Ökonom Amartya Sen zeigte: In Demokratien mit freier Presse gab es keine großen Hungersnöte, weil Probleme öffentlich wurden, bevor sie zur Katastrophe wuchsen.',
  ], ['Amartya Sen: Ökonomie für den Menschen (1999)']),
  e('medienvielfalt', 'Medienvielfalt', 'Demokratie', [
    'In vielen Ländern besitzen wenige Milliardäre große Teile der Medien. Rupert Murdochs Konzern prägt die Öffentlichkeit in den USA, Großbritannien und Australien.',
    'Öffentlich-rechtliche Medien, Genossenschaften wie die taz, gemeinnütziger Journalismus und Regeln gegen Medienkonzentration können für Vielfalt sorgen – wenn sie unabhängig von der Regierung sind.',
  ]),
  e('desinformation', 'Desinformation', 'Technologie', [
    'Falschnachrichten verbreiten sich in sozialen Medien schneller als wahre – Studien des MIT zeigten bis zu sechsmal schneller. Algorithmen belohnen Empörung, weil sie Aufmerksamkeit und Werbeeinnahmen bringt.',
    'Mit generativer KI sind täuschend echte Fälschungen billig geworden. Gegenmittel sind Medienkompetenz, Plattformregulierung, unabhängiger Journalismus – und Vertrauen, das in persönlichen Beziehungen entsteht.',
  ], ['Vosoughi, Roy, Aral: The spread of true and false news online, Science (2018)']),
  e('ueberwachung', 'Überwachung', 'Demokratie', [
    'Edward Snowden enthüllte 2013 die massenhafte Überwachung durch Geheimdienste. Heute sammeln auch Konzerne riesige Datenmengen über unser Verhalten – Shoshana Zuboff nennt das „Überwachungskapitalismus“.',
    'Überwachungstechnik, die für Terrorabwehr eingeführt wird, richtet sich oft später gegen Journalisten, Aktivistinnen und Minderheiten. Datenschutz ist Schutz der Demokratie.',
  ], ['Shoshana Zuboff: Das Zeitalter des Überwachungskapitalismus (2018)']),
  e('wehrhafte_demokratie', 'Wehrhafte Demokratie', 'Demokratie', [
    'Nach der Erfahrung, dass die Nationalsozialisten 1933 legal an die Macht kamen, verankerte das Grundgesetz die „wehrhafte Demokratie“: Parteien, die die freiheitlich-demokratische Grundordnung beseitigen wollen, können verboten werden.',
    'Das Bundesverfassungsgericht verbot 1952 die SRP und 1956 die KPD. Ein NPD-Verbot scheiterte 2017, weil die Partei zu unbedeutend war. Verbote sind umstritten: Sie schützen, können aber auch Märtyrer schaffen – und missbraucht werden.',
  ]),
  e('zivile_kontrolle', 'Zivile Kontrolle des Militärs', 'Demokratie', [
    'In vielen Ländern hat das Militär gewählte Regierungen gestürzt. Die Bundeswehr wurde nach 1955 nach dem Prinzip der „Inneren Führung“ aufgebaut: Soldaten als „Staatsbürger in Uniform“, dem Grundgesetz verpflichtet.',
    'Costa Rica schaffte 1948 seine Armee ganz ab und steckte das Geld in Bildung und Gesundheit. Es gilt heute als eine der stabilsten Demokratien Lateinamerikas.',
  ]),
  e('putsch', 'Putsche gegen gewählte Regierungen', 'Geschichte', [
    'Im 20. Jahrhundert wurden zahlreiche gewählte linke Regierungen gestürzt – oft mit Unterstützung von Großmächten und Konzernen: Iran 1953, Guatemala 1954, Brasilien 1964, Indonesien 1965, Chile 1973.',
    'Die US-Regierung hat ihre Beteiligung an mehreren dieser Umstürze später eingeräumt. Putsche scheiterten dagegen dort, wo die Bevölkerung massenhaft Widerstand leistete – etwa beim Kapp-Putsch 1920 in Deutschland durch einen Generalstreik.',
  ], ['Vincent Bevins: Die Jakarta-Methode (2020)']),
  e('opposition', 'In der Opposition', 'Demokratie', [
    'Wahlniederlagen gehören zur Demokratie. Viele erfolgreiche Bewegungen haben in der Opposition ihre stärksten Strukturen aufgebaut: Gewerkschaften, Genossenschaften, Nachbarschaftsorganisationen, eigene Medien.',
    'Die Arbeiterbewegung des 19. Jahrhunderts schuf eine ganze Gegenkultur – von Konsumgenossenschaften bis zu Sportvereinen. Reformen, die in der Gesellschaft verankert sind, überleben Regierungswechsel leichter.',
  ]),
  e('revolution', 'Friedliche Revolutionen', 'Geschichte', [
    'Die Politikwissenschaftlerin Erica Chenoweth untersuchte über 300 Widerstandsbewegungen des 20. Jahrhunderts: Gewaltfreie Bewegungen waren doppelt so häufig erfolgreich wie gewaltsame.',
    'Beispiele sind die Nelkenrevolution in Portugal 1974, die Friedliche Revolution in der DDR 1989 und das Ende der Apartheid in Südafrika. Entscheidend war oft, dass Sicherheitskräfte sich weigerten, auf die eigene Bevölkerung zu schießen.',
  ], ['Erica Chenoweth, Maria Stephan: Why Civil Resistance Works (2011)']),

  // ───────── Gesellschaft ─────────
  e('faschismus', 'Faschismus und extreme Rechte', 'Gesellschaft', [
    'Faschismus verbindet extremen Nationalismus, Führerkult, Feindbilder und Gewalt. Er wächst in Zeiten von Krise und Abstiegsangst und wird oft von wirtschaftlichen Eliten unterstützt, die eine Bedrohung von links fürchten.',
    'Heutige extrem rechte Bewegungen hetzen gegen Migranten, Feministinnen und Minderheiten. Forschung zeigt: Soziale Sicherheit, Begegnung und eine glaubwürdige soziale Alternative schwächen sie – das Kopieren ihrer Themen stärkt sie.',
  ], ['Robert Paxton: Anatomie des Faschismus (2006)', 'Wilhelm Heitmeyer: Autoritäre Versuchungen (2018)']),
  e('migration', 'Migration', 'Gesellschaft', [
    'Rund 280 Millionen Menschen leben außerhalb ihres Geburtslandes, über 100 Millionen sind auf der Flucht – vor Krieg, Verfolgung, Armut und zunehmend vor den Folgen der Klimakrise.',
    'Alternde Gesellschaften brauchen Zuwanderung für Pflege, Handwerk und Renten. Gelingende Integration hängt von schneller Arbeitserlaubnis, Sprachkursen, bezahlbarem Wohnraum und gleichen Rechten ab.',
  ], ['UNHCR: Global Trends (2024)', 'IOM: World Migration Report (2024)']),
  e('selbstbestimmung', 'Reproduktive Selbstbestimmung', 'Gesellschaft', [
    'Weltweit sterben jedes Jahr Zehntausende Frauen an unsicheren Abtreibungen. Verbote verhindern Abbrüche nicht, sie machen sie gefährlich.',
    'Irland legalisierte 2018 nach einem Bürgerrat und einem Referendum. In den USA hob der Supreme Court 2022 das landesweite Recht auf Abtreibung auf. In Polen und Lateinamerika – etwa mit der „grünen Welle“ in Argentinien 2020 – kämpfen Frauenbewegungen für Legalisierung.',
  ], ['WHO: Abortion care guideline (2022)']),
  e('paritaet', 'Gleichstellung und Parität', 'Gesellschaft', [
    'Frauen verdienen weltweit im Schnitt rund 20 % weniger als Männer, sind in Parlamenten und Vorständen unterrepräsentiert und erleben häufig Gewalt. Laut UN wird alle zehn Minuten eine Frau von ihrem Partner oder einem Familienmitglied getötet.',
    'Länder wie Island setzen auf gesetzlich verpflichtende Lohngleichheit, Frankreich auf Paritätsgesetze. Die Istanbul-Konvention verpflichtet Staaten zum Schutz vor Gewalt.',
  ], ['UN Women: Femicides in 2023']),
  e('befreiungstheologie', 'Glaube und soziale Gerechtigkeit', 'Gesellschaft', [
    'In Lateinamerika entstand in den 1960er Jahren die Befreiungstheologie: Christinnen und Priester stellten sich an die Seite der Armen und gegen Diktaturen. Erzbischof Óscar Romero wurde 1980 in El Salvador ermordet.',
    'Auch in anderen Religionen gibt es starke Traditionen sozialer Gerechtigkeit. Religiöse Gemeinschaften waren oft Verbündete in Bürgerrechts- und Arbeiterbewegungen – etwa Martin Luther King in den USA.',
  ]),
  e('kerala', 'Das Kerala-Modell', 'Welt', [
    'Der indische Bundesstaat Kerala erreicht trotz relativ geringen Einkommens eine Lebenserwartung, Alphabetisierungsrate und Kindersterblichkeit wie viele reiche Länder.',
    'Grundlagen waren eine frühe Landreform, starke öffentliche Bildung und Gesundheit, lokale Selbstverwaltung mit großem Budget, starke Gewerkschaften und hohe Bildung von Frauen. Linke Regierungen prägten den Bundesstaat seit 1957 immer wieder.',
  ], ['Amartya Sen, Jean Drèze: Indien. Ein Land und seine Widersprüche (2014)']),
  e('indonesien1965', 'Indonesien 1965/66', 'Geschichte', [
    'Nach einem gescheiterten Putschversuch 1965 ließ das indonesische Militär unter General Suharto eine Kampagne gegen die Kommunistische Partei – damals die drittgrößte der Welt – und vermeintliche Linke durchführen. Schätzungen gehen von 500.000 bis einer Million Toten aus.',
    'Westliche Regierungen unterstützten das Vorgehen. Suharto regierte bis 1998. Eine offizielle Aufarbeitung steht bis heute weitgehend aus.',
  ], ['Joshua Oppenheimer: The Act of Killing (Film, 2012)', 'Vincent Bevins: Die Jakarta-Methode (2020)']),
  e('allende', 'Salvador Allende und Chile 1970–1973', 'Geschichte', [
    'Salvador Allende wurde 1970 als erster Marxist in freien Wahlen Präsident Chiles. Seine Regierung verstaatlichte die Kupferminen, führte eine Landreform durch und verteilte Milch an Kinder.',
    'Die US-Regierung kündigte an, die chilenische Wirtschaft „zum Schreien“ zu bringen. Unternehmerstreiks, Inflation und Polarisierung folgten. Am 11. September 1973 putschte das Militär unter Pinochet; Allende starb im Präsidentenpalast. Die Diktatur folterte und ermordete Tausende.',
  ], ['Peter Kornbluh: The Pinochet File (2003)']),

  // ───────── Welt ─────────
  e('internationalismus', 'Internationalismus', 'Welt', [
    'Die Arbeiterbewegung war von Anfang an international: „Proletarier aller Länder, vereinigt euch!“ Heute verbinden sich Bewegungen in Netzwerken wie dem Weltsozialforum, La Vía Campesina oder internationalen Gewerkschaftsbünden.',
    'Viele Probleme – Klimakrise, Steuerflucht, Konzernmacht – lassen sich nicht in einem Land allein lösen. Ein Land, das einen anderen Weg geht, braucht Verbündete, um Sanktionen und Isolation zu überstehen.',
  ]),
  e('sanktionen', 'Sanktionen', 'Welt', [
    'Wirtschaftssanktionen sollen Staaten zu einem Politikwechsel zwingen. Sie treffen jedoch häufig vor allem die Bevölkerung: Medikamente und Lebensmittel werden knapp, die Wirtschaft schrumpft.',
    'Kuba steht seit 1962 unter einem US-Embargo, Venezuela und Iran unter weitreichenden Sanktionen. Studien zeigen erhebliche humanitäre Folgen. Länder, die vielfältige Handelsbeziehungen haben, sind weniger verwundbar.',
  ]),
  e('antimilitarismus', 'Abrüstung und Frieden', 'Welt', [
    'Die weltweiten Militärausgaben lagen 2024 bei über 2,7 Billionen Dollar – ein Rekord. Ein Bruchteil davon würde reichen, um Hunger zu beenden oder Klimaschutz im globalen Süden zu finanzieren.',
    'Die Friedensbewegung stand immer vor dem Dilemma: Wie schützt man Menschen vor Angriffen, ohne die Spirale der Aufrüstung anzuheizen? Konzepte wie „soziale Verteidigung“ und zivile Konfliktbearbeitung sind Teil der Antwort.',
  ], ['SIPRI: Trends in World Military Expenditure (2025)']),
  e('konversion', 'Konversion', 'Arbeit', [
    'Konversion bedeutet die Umstellung von Produktion auf neue, gesellschaftlich sinnvolle Güter. In den 1970er Jahren entwickelten Beschäftigte des britischen Rüstungskonzerns Lucas Aerospace den „Lucas Plan“ mit 150 Ideen für zivile Produkte – von Wärmepumpen bis zu Hybridfahrzeugen.',
    'Heute fordern Gewerkschaften, Autowerke auf Busse, Bahnen und Energietechnik umzustellen, statt sie zu schließen.',
  ]),

  // ───────── Technologie ─────────
  e('techoligarchie', 'Tech-Oligarchie', 'Technologie', [
    'Eine Handvoll Tech-Milliardäre kontrolliert Plattformen, auf denen Milliarden Menschen kommunizieren, sich informieren und einkaufen. Einige von ihnen nehmen offen politischen Einfluss – bis hin zu Regierungsämtern.',
    'Die Konzentration von Daten, Rechenleistung und KI-Modellen in wenigen Händen gibt ihnen eine historisch beispiellose Macht. Antworten reichen von Kartellrecht und Datenschutz bis zu öffentlichen und genossenschaftlichen Alternativen.',
  ], ['Yanis Varoufakis: Technofeudalismus (2024)']),
  e('digitale_gemeingueter', 'Digitale Gemeingüter', 'Technologie', [
    'Wikipedia, Linux, OpenStreetMap und unzählige Open-Source-Projekte zeigen, dass Menschen gemeinsam digitale Güter schaffen können, die allen gehören.',
    'Städte wie Barcelona entwickelten Programme für „technologische Souveränität“. Öffentliche Plattformen, offene Standards und Datengenossenschaften könnten die Macht der Tech-Konzerne begrenzen.',
  ]),
  e('automatisierungsdividende', 'Wem gehören die Roboter?', 'Technologie', [
    'Automatisierung und KI könnten viel Arbeit überflüssig machen. Ob das zu Massenarbeitslosigkeit oder zu mehr freier Zeit für alle führt, ist keine technische, sondern eine politische Frage: Wem gehören die Maschinen und ihre Erträge?',
    'Vorschläge reichen von einer Maschinensteuer über öffentliche Beteiligungen an KI-Konzernen bis zu einem Bürgerfonds, der allen eine Dividende aus der Automatisierung zahlt.',
  ]),
];

export const CODEX_MAP: Record<string, CodexEintrag> = Object.fromEntries(CODEX.map((c) => [c.id, c]));

export const CODEX_KATEGORIEN = [...new Set(CODEX.map((c) => c.kategorie))];
