# Jak zbudować APK z telefonu przez GitHub

Projekt zawiera automatyczny proces GitHub Actions. GitHub uruchomi komputer z Android SDK, skompiluje aplikację i udostępni APK do pobrania.

1. Utwórz bezpłatne konto na GitHubie.
2. Utwórz nowe prywatne repozytorium, np. `MebloProjekt`.
3. Prześlij do repozytorium całą zawartość folderu `MebloProjekt` (nie sam nadrzędny folder).
4. Otwórz zakładkę **Actions**.
5. Wybierz **Build Android APK**.
6. Naciśnij **Run workflow**.
7. Po zakończeniu otwórz wykonane zadanie i pobierz artefakt **MebloProjekt-debug-apk**.
8. Rozpakuj pobrany ZIP. W środku będzie `app-debug.apk`.

Uwaga: jest to testowy APK bardzo wczesnego prototypu 0.1.0, a nie pełna aplikacja produkcyjna.
