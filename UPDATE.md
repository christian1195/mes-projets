# Mettre à jour « Mes projets »
1. Modifier `projects.json` (champs: id, titre, categorie, statut, progression, prochaine_etape, bloque_par, liens[{titre,url}], maj) et le champ racine `maj`.
   Catégories: Livres, Livres audio, YouTube, Maison, Emploi. Statuts: À faire, En cours, En attente de toi, Bloqué, Terminé.
   JAMAIS d'adresse ni de courriel (repo public).
2. Redéployer (une commande, une fois GitHub Pages configuré):
   cd /workspace/mesprojets && git add -A && git commit -m "maj projets" && git push
L'app relit projects.json à chaque ouverture (no-store + ?t=), donc pas de réinstallation. Hors ligne: dernière copie en cache.
Première mise en ligne (nécessite `gh auth login`):
   git init -b main && git add -A && git commit -m init && gh repo create mes-projets --public --source . --push && gh api -X POST repos/{owner}/mes-projets/pages -f source[branch]=main -f source[path]=/
   URL: https://<owner>.github.io/mes-projets/

## NIP (verrou léger)
- index.html contient seulement un sel + un hash SHA-256 du NIP (jamais le NIP en clair).
- Le NIP est un verrou léger, PAS une vraie sécurité : le dépôt et projects.json sont publics, n'importe qui avec l'URL de projects.json peut le lire directement. Ne jamais y mettre d'info sensible (adresse, courriel).
- Pour changer le NIP : recalculer sha256(SEL + NIP) et remplacer HASH dans index.html, puis incrémenter la version du cache dans sw.js.

## Archiver / désarchiver un projet
- Christian touche « 🗄️ Archiver » dans la fiche : ça copie « Archive : <titre> » qu'il colle à Réal (le site est statique, il ne peut pas écrire).
- Pour archiver, dans `projects.json` sur le projet : `"archive": true, "archive_date": "AAAA-MM-JJ", "archive_raison": "texte court"`, et mettre `maj` à jour.
- Pour désarchiver (« Désarchive : <titre> ») : retirer `archive` (ou le mettre à false). On peut garder `archive_date`/`archive_raison` comme historique ou les enlever.
- Les projets archivés sont exclus de tous les onglets, compteurs, « Activité récente » et « Ce qui attend ta décision ». Ils ne s'affichent que dans la vue Archives (icône 🗄️ en haut).
- Ensuite : commit + push (voir plus haut). Pas besoin de changer sw.js pour une simple modif de projects.json.

## Notes
- « Mes notes » (Christian) : stockées UNIQUEMENT dans le localStorage du téléphone, clé `mp_notes_v1`, format `{ "<id projet>": [{ "t": ms, "texte": "...", "m": ms_modif? }] }`. Ajout/modif/suppression dans la fiche. Bouton « Envoyer à Réal » copie « Note pour Réal — <titre> : <texte> ».
- Sauvegarde : ⚙️ (en-tête) > Exporter (télécharge mes-notes-AAAA-MM-JJ.json) / Copier ; Importer = coller le JSON ou choisir le fichier (fusion, sans doublons). Effacer les données du navigateur ou désinstaller l'app = notes perdues sans export.
- « Notes de Réal » : champ `notes_real: [{ "date": "AAAA-MM-JJ", "texte": "..." }]` dans projects.json (lecture seule dans l'app). Ajouter la plus récente en premier. Faits documentés seulement, jamais d'adresse ni de courriel (repo public).
