# 👀 Réal te montre — publier un nouvel item

1. Créer `montre/<slug>.html`. Ce doit être une page autonome, mobile d'abord, au style sombre de l'app. Pas de CDN : le CSS est intégré et les graphiques sont en SVG inline. Copier `montre/pneus-ram-1500.html` comme gabarit.
   - Afficher la date de la recherche. Ne jamais inventer un prix : si une donnée manque, l'écrire sur la page. Ne JAMAIS mettre l'adresse de Christian.
2. Ajouter en tête de `montre.json` → `items` :
   `{"id":"<slug>","titre":"…","resume":"…","date":"AAAA-MM-JJ","type":"comparatif|diagramme|recherche|autre","page":"montre/<slug>.html","vu":false}`
   - `id` doit respecter [A-Za-z0-9_-]. Il sert à la route `#/montre/<id>` et au point « non vu ».
   - Les items de plus de 14 jours passent automatiquement dans « Plus vieux ».
   - Les items vus sont gardés dans le localStorage du téléphone (`mp_montre_vu`). Le champ `vu` est seulement informatif.
3. `git pull --rebase && git add montre.json montre/ && git commit -m "montre: <slug>" && git push`
   - Pas besoin de changer le cache du service worker pour un nouvel item, parce que montre.json est chargé sans cache. Il faut le changer seulement si index.html change.
4. Vérifier : `curl -s https://christian1195.github.io/mes-projets/montre.json`

## Aperçu vidéo (optionnel)
- Champ `preview` : petit MP4 muet (~10 s, 640 px, <1 Mo, `-an -movflags +faststart`). Joue tout seul sur le héros de l’accueil (après 1,5 s visible) et au survol/focus des cartes. Coupé si Économiseur de données / Animations réduites / réglage désactivé.
