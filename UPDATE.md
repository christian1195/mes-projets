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

## Notes pour Réal (notes.json, écriture directe)
- Fichier `notes.json` (séparé de projects.json) : `{"notes":[{id, projet_id, projet_titre, texte, date (ISO), auteur:"christian", statut:"à faire"|"fait", reponse_real}]}`.
- L'app écrit via l'API GitHub contents (GET pour le sha, ajout, PUT ; message « Note: <titre> » ; 1 nouvel essai si conflit 409). Christian peut modifier/supprimer ses notes tant qu'elles sont « à faire ».
- La clé GitHub (fine-grained, seulement mes-projets, Contents: lecture/écriture) est collée dans ⚙️ Réglages et gardée UNIQUEMENT dans le localStorage (`mp_gh_token`). Ne JAMAIS la mettre dans le dépôt.
- Lecture : par l'API si clé présente (frais), sinon notes.json via Pages avec ?t=. Le service worker ne met en cache ni l'API ni notes.json.
- Côté Réal : lire https://raw.githubusercontent.com/christian1195/mes-projets/main/notes.json (ou `gh api repos/christian1195/mes-projets/contents/notes.json`), répondre en remplissant `reponse_real` et `statut:"fait"`, puis commit + push (faire `git pull --rebase` avant, l'app commite aussi).
- L'ancienne Google Sheet « Notes pour Réal » n'est plus utilisée par l'app (gardée sur Drive).

## Notes audio (lecteur #/ecouter/<id>)
- Bouton 📝 dans le lecteur → même canal notes.json (API GitHub, clé dans Réglages). Champs en plus : type:"audio", sujet:"[Note audio] <livre> ch07 23:15", chapitre (1-based), chapitre_titre, position_s, position. Message du commit = sujet.
- Copie locale par livre : localStorage `mp_anotes_<id>` (sent 0/1, renvoi auto si pas de clé/réseau).

## Notifications (Web Push) — pour Réal
- Clé privée VAPID : `~/.larocq/vapid_private.pem` (box, hors dépôt). Publique dans `next.js` (LX.VAPID).
- Abonnements : `subs.json` (écrit par l'app via la clé GitHub de Christian, Réglages › Activer les notifications).
- Envoyer : `python3 tools/notify.py new|decision|habs|custom "Titre" [--body "…"] [--url "#/ecouter/31"] [--dry] [--prune]`
- Habs : `python3 tools/habs_watch.py --loop` (buts + final, état ~/.larocq/habs_state.json).
## Hors ligne
- Livres audio téléchargés dans Cache Storage `larocq-audio-v1` (réponses opaques, les assets de release n'ont pas de CORS). Le SW sert le cache pour `/releases/download/`. Ne jamais renommer ce cache sans migration.
