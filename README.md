# MebloProjekt — prototyp 0.1.0

Pierwszy szkielet natywnej aplikacji Android do projektowania prostych mebli z płyty laminowanej.

## Co już zawiera

- lista projektów i tworzenie nowego projektu,
- kreator korpusu z szerokością, wysokością i głębokością,
- góra/dno między bokami lub na zewnątrz boków,
- front nakładany albo wpuszczany,
- plecy HDF, z płyty lub brak,
- automatyczne obliczanie formatek,
- fronty z domyślnymi luzami 2 mm,
- cofnięcie półek przy froncie wpuszczanym o grubość frontu + 2 mm,
- wymiar korpusu bez frontu i osobna głębokość całkowita,
- edycja wysokości komór,
- prosty podgląd drzwi otwartych/zamkniętych,
- lista formatek i krawędzi PVC,
- model danych gotowy na późniejsze wycięcia wykonywane po produkcji.

## Ważne

`applicationId` jest roboczy: `pl.mebloprojekt.app`. Przed pierwszym podpisanym wydaniem produkcyjnym trzeba ustalić finalny identyfikator, ponieważ później nie powinien się zmieniać.


## Podgląd webowy bez instalowania npm

Możesz uruchomić podgląd podobnie do artefaktu Claude, bez budowania projektu:

```bash
python3 -m http.server 5173
```

Następnie otwórz w przeglądarce:

```txt
http://localhost:5173/preview.html
```

`preview.html` ładuje React, ReactDOM, Babel Standalone i Tailwind z CDN, pobiera lokalny plik `szafki.jsx`, kompiluje JSX w przeglądarce i montuje aplikację w `#root`.

Po włączeniu GitHub Pages ze źródłem `GitHub Actions`, workflow `Deploy Web Preview` publikuje podgląd automatycznie po zmianach na `main`/`master` albo ręcznie z zakładki Actions. Strona główna Pages używa `standalone.html` jako `index.html`, więc link GitHub Pages otwiera aplikację od razu.

Jeśli nie chcesz używać Pages, możesz też pobrać `standalone.html` z repozytorium i otworzyć go dwuklikiem w przeglądarce. Plik zawiera kod aplikacji w środku, więc nie potrzebuje `localhost`; wymaga tylko internetu do pobrania React, Babel i Tailwind z CDN.

## Budowanie

Projekt jest skonfigurowany dla Android SDK 36, AGP 8.13.2, Kotlin 2.3.21 i Jetpack Compose.

1. Otwórz katalog w Android Studio.
2. Zainstaluj Android SDK 36, jeśli IDE o to poprosi.
3. Uruchom wariant `debug` na telefonie lub emulatorze.
4. APK: `Build > Build APK(s)`.

## Następne etapy

1. trwały zapis projektów i migracje danych,
2. ręczne dodawanie/obrót elementów oraz przyciąganie,
3. prawdziwy model 3D,
4. strefy kolizyjne i automatyczne propozycje wycięć,
5. FIX-y, belki wzmacniające, cokoły i wiele szafek,
6. eksport zestawienia do PDF/CSV,
7. system aktualizacji.
