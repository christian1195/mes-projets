# accueil.json — page d'accueil (style Netflix)

Réal édite ce fichier pour changer l'onglet Accueil. Aucun changement de code requis.

```json
{
  "maj": "AAAA-MM-JJ",
  "salut": "Petite phrase perso de Réal sous le bonjour",
  "une":       [ { "titre": "", "texte": "", "image": "", "lien": "" } ],
  "nouvelles": [ { "titre": "", "texte": "", "image": "", "lien": "", "date": "AAAA-MM-JJ" } ],
  "idees":     [ { "titre": "", "texte": "", "image": "", "lien": "" } ],
  "pourtoi":   [ { "titre": "", "texte": "", "image": "", "lien": "", "date": "AAAA-MM-JJ" } ]
}
```

- **salut** : affiché sous « Bon matin / Bon après-midi / Bonsoir Christian » (selon l'heure) et la date.
- **une** : grand carrousel « La une » (swipe + points).
- **nouvelles** : rangée « Nouvelles de tes projets ».
- **idees** : rangée « Idées que je te prépare ».
- **pourtoi** : rangée « Nouvelles pour toi » (vraies nouvelles seulement, liens vérifiés).
- La rangée « Continue d'écouter / lire » est automatique (localStorage `mp_pos_<id>` et `mp_read_<id>`).

**lien** : `projet:24` ouvre la fiche du projet 24 · `#/montre/<id>` ouvre une page Réal · `#/ecouter/<id>`, `#/lire/<id>` · `https://…` ouvre dans un nouvel onglet.

**image** : chemin relatif (ex. `covers/x.jpg`, `accueil/x.webp`). Vide = dégradé + emoji. Les vignettes web vont dans `accueil/` en webp ≤ 640 px.

**Valeurs de repli** : `une`, `nouvelles` ou `idees` vides → l'app utilise les projets avec couverture (triés par `maj`) et les items de `montre.json`. `pourtoi` vide → rangée cachée.

Jamais d'adresse personnelle ici (dépôt public). Après modif de index.html, augmenter la version du cache dans sw.js.

## agenda (rangée « 📅 Aujourd'hui », sous le bonjour)

```json
"agenda": [ { "date": "2026-10-23", "heure": "10:00", "titre": "Rendez-vous", "lieu": "Gatineau" } ]
```

- Aujourd'hui + les 2 prochains jours, tirés de Google Calendar (primaire + Family + fériés ; pas les calendriers de collecte des déchets).
- `heure` : `"HH:MM"` ou `"Toute la journée"`. Chaque carte a une étiquette Aujourd'hui / Demain / jour.
- Rien aujourd'hui → carte « Rien à l'agenda aujourd'hui 😌 ». Clé `agenda` absente → rangée cachée. Tap → calendar.google.com.
- **Jamais l'adresse de la maison** (dépôt public) : remplacer par `"À la maison"`.

## Tout nouvel item = en primeur

Chaque nouvel item (projet, livre audio, page Réal dans `montre.json`) reçoit `"ajoute": "AAAA-MM-JJTHH:MM"`.
L'app met automatiquement l'item au `ajoute` le plus récent en **première carte de « La une »** (étiquette NOUVEAU), si sa date est ≥ `maj` de accueil.json. Sinon : `une` de accueil.json (puis les valeurs de repli). Une carte `une` avec le même `lien` est retirée (pas de doublon).
Projet avec `audio` → lien `#/ecouter/<id>`, sinon la fiche du projet.

## Carrousel « À la une » (règle)
- Ordre : le plus récent item de projet (étiquette NOUVEAU, règle primeur) en premier, puis on alterne projet / nouvelle.
- Les nouvelles viennent de `pourtoi` (dans l'ordre du fichier, la plus récente en premier). Seuls les items avec `image` ET `lien` vont dans le carrousel ; ils portent l'étiquette NOUVELLES et ouvrent le lien source dans un nouvel onglet.
- La routine de 6 h DOIT fournir une `image` (fichier dans `accueil/`, webp ~800 px de large) pour chaque item `pourtoi`, sinon il apparaît seulement dans la rangée « Nouvelles pour toi ».
