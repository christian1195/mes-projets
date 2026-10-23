#!/usr/bin/env python3
"""Larocq — surveille le match du Canadien (ESPN) et notifie buts + final.
  python3 tools/habs_watch.py          # une vérification (pour une routine aux 2-5 min)
  python3 tools/habs_watch.py --loop   # boucle aux 60 s tant que le match n'est pas fini
État dans ~/.larocq/habs_state.json pour ne jamais notifier deux fois."""
import json, os, subprocess, sys, time, urllib.request
ST = os.path.expanduser('~/.larocq/habs_state.json'); N = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notify.py')
def game():
    j = json.load(urllib.request.urlopen('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard', timeout=15))
    for ev in j.get('events', []):
        c = ev['competitions'][0]; t = {x['team']['abbreviation']: x for x in c['competitors']}
        if 'MTL' in t: return ev, c, t
    return None
def once():
    g = game()
    if not g: print('Pas de match aujourd’hui'); return True
    ev, c, t = g; st = c['status']['type']; opp = [k for k in t if k != 'MTL'][0]
    sm, so = int(t['MTL'].get('score') or 0), int(t[opp].get('score') or 0)
    s = json.load(open(ST)) if os.path.exists(ST) else {}
    if s.get('id') != ev['id']: s = {'id': ev['id'], 'mtl': 0, 'opp': 0, 'final': False}
    line = f'CH {sm} – {so} {opp}'; per = c['status'].get('displayClock', '') + ' · ' + str(c['status'].get('period', '')) + 'e pér.'
    if st['state'] == 'in' or st.get('completed'):
        if sm > s['mtl']: subprocess.run([sys.executable, N, 'habs', 'BUT du Canadien! ' + line, '--body', per, '--url', '#/'])
        elif so > s['opp']: subprocess.run([sys.executable, N, 'habs', f'But de {opp}. ' + line, '--body', per, '--url', '#/'])
        s['mtl'], s['opp'] = sm, so
    if st.get('completed') and not s['final']:
        res = 'Victoire! ' if sm > so else 'Défaite. '
        subprocess.run([sys.executable, N, 'habs', res + 'Final : ' + line, '--body', st.get('detail', 'Final'), '--url', '#/']); s['final'] = True
    os.makedirs(os.path.dirname(ST), exist_ok=True); json.dump(s, open(ST, 'w'))
    print(line, st['state']); return st['state'] == 'post' or st['state'] == 'pre' and '--loop' not in sys.argv
if __name__ == '__main__':
    if '--loop' in sys.argv:
        while not once(): time.sleep(60)
    else: once()
