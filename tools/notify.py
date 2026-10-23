#!/usr/bin/env python3
"""Larocq — envoie une notification Web Push à tous les appareils abonnés.

  python3 tools/notify.py new "Le dernier Costco — livre audio" --url "#/ecouter/31"
  python3 tools/notify.py decision "Second Notice : OK pour publier?" --url "#/projet/8"
  python3 tools/notify.py habs "BUT! CH 2 – 1 TOR" --body "Caufield (3e) · 2e pér."
  python3 tools/notify.py custom "Titre" --body "Texte" --url "#/"
  options: --dry (n'envoie rien)  --prune (retire les abonnements expirés de subs.json, commit+push)

Clé privée VAPID : ~/.larocq/vapid_private.pem (hors du dépôt, jamais affichée).
Abonnements : subs.json du dépôt (écrit par l'app via l'API GitHub).
"""
import argparse, json, os, subprocess, sys, urllib.request
from pywebpush import webpush, WebPushException
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.path.expanduser('~/.larocq/vapid_private.pem')
SUB = 'https://christian1195.github.io'
PRE = {'new': ('Nouveau dans Larocq', '🆕 '), 'decision': ('Réal a besoin de ta décision', '⏳ '), 'habs': ('Canadiens', '🏒 '), 'custom': ('Larocq', '')}

def subs():
    try:
        r = urllib.request.urlopen('https://api.github.com/repos/christian1195/mes-projets/contents/subs.json?ref=main', timeout=15)
        import base64; return json.loads(base64.b64decode(json.load(r)['content'])).get('subs', [])
    except Exception:
        p = os.path.join(REPO, 'subs.json')
        return json.load(open(p)).get('subs', []) if os.path.exists(p) else []

def main():
    a = argparse.ArgumentParser(); a.add_argument('kind', choices=PRE); a.add_argument('title')
    a.add_argument('--body', default=''); a.add_argument('--url', default='#/'); a.add_argument('--tag'); a.add_argument('--image')
    a.add_argument('--dry', action='store_true'); a.add_argument('--prune', action='store_true'); o = a.parse_args()
    head, emo = PRE[o.kind]
    msg = {'title': emo + o.title if o.kind != 'custom' else o.title, 'body': o.body or head, 'url': o.url, 'tag': o.tag or ('habs' if o.kind == 'habs' else None)}
    if o.image: msg['image'] = o.image
    L = subs(); print(f'{len(L)} appareil(s) abonné(s)')
    if not os.path.exists(KEY): sys.exit('Clé VAPID manquante: ' + KEY)
    dead, ok = [], 0
    for s in L:
        if o.dry: print('  [dry]', s.get('appareil'), s['endpoint'][:40] + '…'); continue
        try:
            webpush({'endpoint': s['endpoint'], 'keys': s['keys']}, json.dumps(msg), vapid_private_key=KEY, vapid_claims={'sub': SUB}, ttl=3600)
            ok += 1; print('  ✓', s.get('appareil'))
        except WebPushException as x:
            c = x.response.status_code if x.response is not None else None
            print('  ✗', s.get('appareil'), c); (dead.append(s['id']) if c in (404, 410) else None)
    print(f'Envoyé: {ok}/{len(L)}' + (f' · expirés: {len(dead)}' if dead else ''))
    if dead and o.prune:
        p = os.path.join(REPO, 'subs.json'); subprocess.run(['git', '-C', REPO, 'pull', '--rebase', '--autostash', '-q'])
        d = json.load(open(p)); d['subs'] = [s for s in d['subs'] if s['id'] not in dead]
        open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
        subprocess.run(['git', '-C', REPO, 'commit', '-qm', 'Notifications : retire abonnements expirés', 'subs.json']); subprocess.run(['git', '-C', REPO, 'push', '-q'])

if __name__ == '__main__': main()
