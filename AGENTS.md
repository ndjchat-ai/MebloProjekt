# Instrukcje dla agentów w tym repozytorium

- Nie dopisuj roboczych notatek AI/Claude do `README.md`, jeśli nie są konieczne dla użytkownika końcowego.
- Robocze informacje, procedury wymiany zmian i kontekst dla kolejnych agentów zapisuj w `AI_NOTES.md`.
- `szafki.jsx` jest głównym źródłem kodu aplikacji webowej.
- `claude-zmiany.txt` jest tylko buforem porównawczym dla kodu wklejanego z Claude; nie podłączaj go do aplikacji ani GitHub Pages.
- Po zmianie `szafki.jsx` zaktualizuj `standalone.html`, bo workflow Pages publikuje `standalone.html` jako `index.html`.

- Jeśli zapisujesz roboczą informację, używaj tagów `[AI-INFO]`, `[AI-TODO]`, `[CLAUDE-CHANGE]` albo `[CHECK]` w `AI_NOTES.md` zamiast znaczników podobnych do konfliktów Git.
