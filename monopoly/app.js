/* Banque Plateau — UI premium + sync PeerJS / simulation */
(function () {
  "use strict";
  const D = window.BP_DATA;
  const PEER_PREFIX = "bpplateau-";
  const STORAGE_KEY = "bp-plateau-v2";
  const SIM_DEFAULT_NAMES = ["Christian", "Caroline", "Tristan", "Alex", "Sam", "Jo"];

  let peer = null, connections = {}, isHost = false, isSim = false;
  let myPeerId = null, myPlayerId = null, gameCode = null, connected = false;
  let state = null, undoStack = [], tab = "argent";
  const MAX_UNDO = 30;
  let lastCashShown = null;

  const $ = (id) => document.getElementById(id);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const code4 = () => {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  };
  const money = (n) => {
    const sign = n < 0 ? "-" : "";
    return sign + Math.abs(n).toLocaleString("fr-CA") + "\u00a0$";
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const propById = (id) => D.PROPERTIES.find((p) => p.id === id);
  const playerById = (id) => state && state.players.find((p) => p.id === id);
  const me = () => playerById(myPlayerId);
  const colorHex = (id) => (D.COLORS.find((c) => c.id === id) || { hex: "#888" }).hex;

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2800);
  }
  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (_) {}
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    const s = $("screen-" + name);
    if (s) s.classList.add("active");
    $("tabbar").classList.toggle("show", name === "game");
  }
  function setConnBadge(ok) {
    connected = ok;
    ["connBadge", "connBadgeGame"].forEach((id) => {
      const b = $(id);
      if (!b) return;
      b.classList.toggle("offline", !ok);
      const label = b.querySelector("span:last-child");
      if (label) label.textContent = isSim ? "Simulation" : (ok ? "En ligne" : "Hors ligne");
    });
  }

  function flyMoney() {
    const layer = $("fxLayer");
    if (!layer) return;
    for (let i = 0; i < 6; i++) {
      const el = document.createElement("div");
      el.className = "fx-bill";
      el.textContent = "$";
      const x = 40 + Math.random() * 60;
      const y = 55 + Math.random() * 20;
      el.style.left = x + "vw";
      el.style.top = y + "vh";
      el.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
      el.style.setProperty("--dy", (-80 - Math.random() * 100) + "px");
      layer.appendChild(el);
      setTimeout(() => el.remove(), 950);
    }
  }

  function animateCash(el, from, to) {
    if (!el) return;
    const start = performance.now();
    const dur = 420;
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = money(v);
      if (t < 1) requestAnimationFrame(frame);
      else {
        el.textContent = money(to);
        el.classList.remove("pulse");
        void el.offsetWidth;
        el.classList.add("pulse");
      }
    }
    requestAnimationFrame(frame);
  }

  /* —— state —— */
  function freshDecks() {
    return {
      chance: shuffle(D.CHANCE.map((c) => c.id)),
      community: shuffle(D.COMMUNITY.map((c) => c.id)),
      chanceDiscard: [],
      communityDiscard: []
    };
  }
  function createState(hostName, hostColor) {
    const hostId = uid();
    myPlayerId = hostId;
    return {
      version: 2, code: gameCode, started: false, simulation: false,
      players: [{ id: hostId, name: hostName, color: hostColor, cash: D.START_CASH, jailFree: 0, isHost: true }],
      deeds: {}, bankHouses: 32, bankHotels: 12,
      history: [], decks: freshDecks(), auction: null, lastCard: null
    };
  }
  function createSimState(names) {
    const players = names.map((name, i) => ({
      id: uid(), name: name || ("Joueur " + (i + 1)),
      color: D.COLORS[i % D.COLORS.length].id,
      cash: D.START_CASH, jailFree: 0, isHost: i === 0
    }));
    myPlayerId = players[0].id;
    return {
      version: 2, code: "SIMU", started: true, simulation: true, players,
      deeds: {}, bankHouses: 32, bankHotels: 12,
      history: [{ t: Date.now(), text: "Mode simulation démarré (" + players.length + " joueurs)" }],
      decks: freshDecks(), auction: null, lastCard: null
    };
  }
  function snapshot() {
    undoStack.push(JSON.parse(JSON.stringify(state)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }
  function log(text) {
    state.history.unshift({ t: Date.now(), text });
    if (state.history.length > 100) state.history.length = 100;
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ isHost, isSim, myPlayerId, gameCode, state, myPeerId }));
    } catch (_) {}
  }
  function broadcast() {
    if (!isHost || isSim) { persist(); render(); return; }
    const payload = JSON.stringify({ type: "state", state });
    Object.values(connections).forEach((c) => { if (c.open) c.send(payload); });
    persist();
    render();
  }

  /* —— peer —— */
  function peerOpts() {
    return {
      host: "0.peerjs.com", port: 443, path: "/", secure: true, debug: 1,
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }] }
    };
  }
  function wireConn(conn, asHost) {
    conn.on("open", () => {
      setConnBadge(true);
      if (asHost) {
        connections[conn.peer] = conn;
        conn.send(JSON.stringify({ type: "state", state }));
        toast("Joueur connecté");
        render();
      }
    });
    conn.on("data", (raw) => {
      let msg; try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return; }
      if (asHost) handleGuestAction(conn, msg);
      else if (msg.type === "state") { state = msg.state; persist(); render(); setConnBadge(true); }
      else if (msg.type === "welcome") { myPlayerId = msg.playerId; state = msg.state; persist(); render(); setConnBadge(true); }
      else if (msg.type === "error") toast(msg.text || "Erreur");
    });
    conn.on("close", () => {
      if (asHost) delete connections[conn.peer];
      else setConnBadge(false);
      render();
    });
    conn.on("error", () => {});
  }
  function startHostPeer(code) {
    return new Promise((resolve, reject) => {
      const id = PEER_PREFIX + code.toLowerCase();
      if (peer) try { peer.destroy(); } catch (_) {}
      peer = new Peer(id, peerOpts());
      peer.on("open", (pid) => { myPeerId = pid; setConnBadge(true); resolve(pid); });
      peer.on("connection", (conn) => wireConn(conn, true));
      peer.on("error", (err) => {
        if (String(err).includes("unavailable-id") || (err && err.type === "unavailable-id"))
          reject(new Error("Code déjà pris — réessaie"));
      });
      setTimeout(() => { if (!myPeerId) reject(new Error("Connexion PeerJS lente — réessaie")); }, 12000);
    });
  }
  function joinHostPeer(code) {
    return new Promise((resolve, reject) => {
      if (peer) try { peer.destroy(); } catch (_) {}
      peer = new Peer(peerOpts());
      peer.on("open", () => {
        myPeerId = peer.id;
        const conn = peer.connect(PEER_PREFIX + code.toLowerCase(), { reliable: true });
        connections.host = conn;
        wireConn(conn, false);
        conn.on("open", () => { setConnBadge(true); resolve(conn); });
        conn.on("error", reject);
        setTimeout(() => { if (!connected) reject(new Error("Impossible de joindre (code ou hôte hors ligne)")); }, 12000);
      });
      peer.on("error", () => {});
    });
  }
  function freeColor() {
    const used = new Set(state.players.map((p) => p.color));
    return (D.COLORS.find((x) => !used.has(x.id)) || D.COLORS[0]).id;
  }
  function handleGuestAction(conn, msg) {
    if (msg.type === "join") {
      let p = state.players.find((x) => x.name === msg.name && !x.isHost);
      if (!p) {
        snapshot();
        p = { id: uid(), name: msg.name, color: msg.color || freeColor(), cash: D.START_CASH, jailFree: 0, isHost: false };
        state.players.push(p);
        log(p.name + " a rejoint la partie");
      }
      conn.send(JSON.stringify({ type: "welcome", playerId: p.id, state }));
      broadcast();
      return;
    }
    if (msg.type === "action") runAction(msg.action, msg.playerId);
  }
  function sendAction(action) {
    if (isHost || isSim) { runAction(action, myPlayerId); return; }
    const conn = connections.host;
    if (!conn || !conn.open) { toast("Pas connecté à l'hôte"); return; }
    conn.send(JSON.stringify({ type: "action", action, playerId: myPlayerId }));
  }

  /* —— rules helpers —— */
  function ownsFullGroup(playerId, group) {
    const props = D.PROPERTIES.filter((p) => p.group === group);
    return props.every((p) => state.deeds[p.id] && state.deeds[p.id].ownerId === playerId && !state.deeds[p.id].mortgaged);
  }
  function calcRent(prop, deed) {
    if (prop.type === "street") {
      let r = prop.rent[Math.min(deed.houses, 5)];
      if (deed.houses === 0 && ownsFullGroup(deed.ownerId, prop.group)) r *= 2;
      return r;
    }
    if (prop.type === "rail") {
      const n = D.PROPERTIES.filter((p) => p.type === "rail" && state.deeds[p.id] && state.deeds[p.id].ownerId === deed.ownerId).length;
      return prop.rent[Math.max(0, n - 1)] || 25;
    }
    if (prop.type === "util") {
      const n = D.PROPERTIES.filter((p) => p.type === "util" && state.deeds[p.id] && state.deeds[p.id].ownerId === deed.ownerId).length;
      return n >= 2 ? 70 : 28;
    }
    return 0;
  }
  function countHousesHotels(playerId) {
    let houses = 0, hotels = 0;
    Object.values(state.deeds).forEach((deed) => {
      if (deed.ownerId !== playerId) return;
      if (deed.houses === 5) hotels++; else houses += deed.houses;
    });
    return { houses, hotels };
  }
  function applyDraw(deckName, playerId) {
    const p = playerById(playerId);
    if (!p) return;
    const key = deckName === "chance" ? "chance" : "community";
    const discardKey = key + "Discard";
    const catalog = key === "chance" ? D.CHANCE : D.COMMUNITY;
    if (!state.decks[key].length) {
      state.decks[key] = shuffle(state.decks[discardKey]);
      state.decks[discardKey] = [];
    }
    const cardId = state.decks[key].shift();
    const card = catalog.find((c) => c.id === cardId);
    if (!card) return;
    state.decks[discardKey].push(cardId);
    state.lastCard = { deck: key, text: card.text, playerId, cardId };
    let note = p.name + " tire " + (key === "chance" ? "Chance" : "Caisse de communauté") + " : " + card.text;
    const ef = card.effect || { type: "none" };
    if (ef.type === "money") { p.cash += ef.amount; note += " → " + money(ef.amount); }
    else if (ef.type === "go") { p.cash += D.GO_BONUS; note += " → +" + money(D.GO_BONUS); }
    else if (ef.type === "jailfree") p.jailFree = (p.jailFree || 0) + 1;
    else if (ef.type === "repairs") {
      const { houses, hotels } = countHousesHotels(p.id);
      const cost = houses * ef.house + hotels * ef.hotel;
      p.cash -= cost; note += " → −" + money(cost);
    } else if (ef.type === "birthday") {
      state.players.forEach((other) => {
        if (other.id === p.id) return;
        other.cash -= ef.amount; p.cash += ef.amount;
      });
    } else if (ef.type === "chairman") {
      state.players.forEach((other) => {
        if (other.id === p.id) return;
        p.cash -= ef.amount; other.cash += ef.amount;
      });
    }
    log(note);
  }

  function runAction(action, actorId) {
    if (!state || !action) return;
    if (!(isHost || isSim)) return;
    if (action.type === "undo") {
      if (!undoStack.length) { toast("Rien à annuler"); return; }
      state = undoStack.pop();
      log("↩ Action annulée");
      broadcast();
      return;
    }
    snapshot();
    try {
      switch (action.type) {
        case "start":
          state.started = true; log("Partie démarrée"); break;
        case "pay_player": {
          const from = playerById(action.fromId), to = playerById(action.toId);
          const amt = Math.max(0, Math.floor(+action.amount || 0));
          if (!from || !to || amt <= 0) break;
          from.cash -= amt; to.cash += amt;
          log(from.name + " → " + to.name + " : " + money(amt));
          flyMoney(); haptic(18);
          break;
        }
        case "pay_bank": {
          const from = playerById(action.fromId);
          const amt = Math.max(0, Math.floor(+action.amount || 0));
          if (!from || amt <= 0) break;
          from.cash -= amt; log(from.name + " paie la banque " + money(amt)); flyMoney(); break;
        }
        case "recv_bank": {
          const to = playerById(action.toId);
          const amt = Math.max(0, Math.floor(+action.amount || 0));
          if (!to || amt <= 0) break;
          to.cash += amt; log(to.name + " reçoit de la banque " + money(amt)); flyMoney(); break;
        }
        case "pass_go": {
          const p = playerById(action.playerId); if (!p) break;
          p.cash += D.GO_BONUS; log(p.name + " passe par Départ (+" + money(D.GO_BONUS) + ")"); flyMoney(); break;
        }
        case "buy": {
          const p = playerById(action.playerId), prop = propById(action.propId);
          if (!p || !prop || state.deeds[prop.id]) { undoStack.pop(); toast("Indisponible"); return; }
          const price = action.price != null ? Math.floor(+action.price) : prop.price;
          p.cash -= price;
          state.deeds[prop.id] = { ownerId: p.id, mortgaged: false, houses: 0 };
          log(p.name + " achète " + prop.name + " pour " + money(price));
          break;
        }
        case "rent": {
          const from = playerById(action.fromId), deed = state.deeds[action.propId], prop = propById(action.propId);
          if (!from || !deed || !prop || deed.mortgaged) break;
          const owner = playerById(deed.ownerId);
          if (!owner || owner.id === from.id) break;
          let rent = action.amount != null ? Math.floor(+action.amount) : calcRent(prop, deed);
          from.cash -= rent; owner.cash += rent;
          log(from.name + " paie loyer " + money(rent) + " à " + owner.name + " (" + prop.name + ")");
          flyMoney(); haptic(15);
          break;
        }
        case "mortgage": {
          const deed = state.deeds[action.propId], prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || deed.mortgaged) break;
          if (deed.houses > 0) { undoStack.pop(); toast("Vends les maisons d'abord"); return; }
          deed.mortgaged = true; owner.cash += prop.mortgage;
          log(owner.name + " hypothèque " + prop.name + " (+" + money(prop.mortgage) + ")");
          break;
        }
        case "unmortgage": {
          const deed = state.deeds[action.propId], prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || !deed.mortgaged) break;
          const cost = Math.ceil(prop.mortgage * 1.1);
          owner.cash -= cost; deed.mortgaged = false;
          log(owner.name + " lève l'hypothèque de " + prop.name + " (−" + money(cost) + ")");
          break;
        }
        case "build": {
          const deed = state.deeds[action.propId], prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || prop.type !== "street" || deed.mortgaged) break;
          if (!ownsFullGroup(owner.id, prop.group)) { undoStack.pop(); toast("Il faut le groupe complet"); return; }
          if (deed.houses >= 5) break;
          if (deed.houses === 4) {
            if (state.bankHotels < 1) { undoStack.pop(); toast("Plus d'hôtels"); return; }
            state.bankHotels--; state.bankHouses += 4; deed.houses = 5;
            owner.cash -= prop.houseCost;
            log(owner.name + " construit un hôtel sur " + prop.name);
          } else {
            if (state.bankHouses < 1) { undoStack.pop(); toast("Plus de maisons"); return; }
            state.bankHouses--; deed.houses++; owner.cash -= prop.houseCost;
            log(owner.name + " construit une maison sur " + prop.name + " (" + deed.houses + ")");
          }
          break;
        }
        case "sell_house": {
          const deed = state.deeds[action.propId], prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || deed.houses < 1) break;
          if (deed.houses === 5) {
            if (state.bankHouses < 4) { undoStack.pop(); toast("Pas assez de maisons en banque"); return; }
            state.bankHotels++; state.bankHouses -= 4; deed.houses = 4;
          } else { state.bankHouses++; deed.houses--; }
          owner.cash += Math.floor(prop.houseCost / 2);
          log(owner.name + " vend une construction sur " + prop.name);
          break;
        }
        case "draw": applyDraw(action.deck, action.playerId); haptic(10); break;
        case "auction_start": {
          const prop = propById(action.propId);
          if (!prop || state.deeds[prop.id]) break;
          state.auction = { propId: prop.id, highBid: 0, highBidderId: null, open: true };
          log("Enchère ouverte : " + prop.name); break;
        }
        case "auction_bid": {
          if (!state.auction || !state.auction.open) break;
          const bid = Math.floor(+action.amount || 0), p = playerById(action.playerId);
          if (!p || bid <= state.auction.highBid) { undoStack.pop(); toast("Enchère trop basse"); return; }
          state.auction.highBid = bid; state.auction.highBidderId = p.id;
          log(p.name + " enchérir " + money(bid)); break;
        }
        case "auction_end": {
          if (!state.auction) break;
          const prop = propById(state.auction.propId);
          const winner = playerById(state.auction.highBidderId);
          if (winner && state.auction.highBid > 0 && prop) {
            winner.cash -= state.auction.highBid;
            state.deeds[prop.id] = { ownerId: winner.id, mortgaged: false, houses: 0 };
            log(winner.name + " remporte " + prop.name + " pour " + money(state.auction.highBid));
          } else log("Enchère sans offre");
          state.auction = null; break;
        }
        case "transfer_deed": {
          const deed = state.deeds[action.propId], to = playerById(action.toId);
          if (!deed || !to) break;
          if (deed.houses > 0) { undoStack.pop(); toast("Vends les constructions d'abord"); return; }
          const from = playerById(deed.ownerId);
          deed.ownerId = to.id;
          if (action.amount) {
            const amt = Math.floor(+action.amount);
            to.cash -= amt; if (from) from.cash += amt;
            log((from ? from.name : "?") + " cède " + propById(action.propId).name + " à " + to.name + " pour " + money(amt));
          } else {
            log((from ? from.name : "?") + " cède " + propById(action.propId).name + " à " + to.name);
          }
          break;
        }
        default: undoStack.pop(); return;
      }
    } catch (e) {
      console.error(e); undoStack.pop(); toast("Erreur d'action"); return;
    }
    broadcast();
  }

  /* —— SVG bits —— */
  function pawnSVG(hex) {
    return '<svg class="token" viewBox="0 0 64 80" aria-hidden="true"><ellipse cx="32" cy="72" rx="18" ry="5" fill="rgba(0,0,0,.18)"/><path d="M32 8c8 0 14 6 14 14 0 6-3 11-8 14l4 18H22l4-18c-5-3-8-8-8-14 0-8 6-14 14-14z" fill="' + hex + '" stroke="#1a1a14" stroke-width="2"/><circle cx="32" cy="20" r="7" fill="#fff" opacity=".35"/></svg>';
  }
  function houseSVG() {
    return '<svg viewBox="0 0 24 24"><path fill="#2E7D32" d="M4 20V10l8-6 8 6v10H4z"/><path fill="#1B4D3E" d="M10 20v-6h4v6"/></svg>';
  }
  function hotelSVG() {
    return '<svg viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="12" rx="1" fill="#C62828"/><path fill="#8B0000" d="M3 10 L12 3 L21 10 Z"/><rect x="10" y="14" width="4" height="6" fill="#F3E6C8"/></svg>';
  }

  /* —— render —— */
  function render() {
    if (!state) return;
    if (!state.started) {
      const lobby = $("screen-lobby");
      if (lobby && lobby.classList.contains("active")) {
        renderLobbyPlayers();
        $("lobbyCode").textContent = state.code || gameCode || "----";
        return;
      }
    } else if (!$("screen-game").classList.contains("active")) showScreen("game");

    $("gameCodeLabel").textContent = state.code || gameCode || "----";
    const modeLabel = $("modeLabel");
    if (modeLabel) modeLabel.textContent = isSim ? "Mode" : "Code";
    const simBanner = $("simBanner");
    if (simBanner) {
      simBanner.style.display = isSim ? "block" : "none";
      if (isSim) fillSimPlayerSelect();
    }
    if (isSim) setConnBadge(true);

    const p = me();
    if (p) {
      $("myName").textContent = p.name + (isSim ? " · actif" : "");
      const cashEl = $("myCash");
      if (lastCashShown != null && lastCashShown !== p.cash) animateCash(cashEl, lastCashShown, p.cash);
      else cashEl.textContent = money(p.cash);
      lastCashShown = p.cash;
    }
    renderPawns();
    renderTab();
    if (state.auction && state.auction.open) {
      $("auctionBanner").style.display = "block";
      const prop = propById(state.auction.propId);
      const winner = playerById(state.auction.highBidderId);
      $("auctionBanner").innerHTML = "<h2>Enchère</h2><p><strong>" + escapeHtml(prop ? prop.name : "?") + "</strong> — mise " + money(state.auction.highBid) + (winner ? " (" + escapeHtml(winner.name) + ")" : "") + "</p>";
    } else $("auctionBanner").style.display = "none";
  }

  function renderPawns() {
    const box = $("playersList");
    if (!box) return;
    box.innerHTML = "";
    state.players.forEach((pl) => {
      const div = document.createElement("button");
      div.type = "button";
      div.className = "pawn" + (pl.id === myPlayerId ? " active" : "");
      div.style.borderColor = pl.id === myPlayerId ? colorHex(pl.color) : "transparent";
      div.innerHTML = pawnSVG(colorHex(pl.color)) +
        '<div class="pname">' + escapeHtml(pl.name) + "</div>" +
        '<div class="pcash">' + money(pl.cash) + "</div>";
      div.onclick = () => {
        if (pl.id === myPlayerId) { toast("C'est toi — choisis un autre pion pour payer"); return; }
        openPayKeypad(pl.id);
      };
      box.appendChild(div);
    });
  }

  function fillSimPlayerSelect() {
    const sel = $("simPlayerSelect");
    if (!sel || !state) return;
    const cur = myPlayerId;
    sel.innerHTML = "";
    state.players.forEach((pl) => {
      const o = document.createElement("option");
      o.value = pl.id;
      o.textContent = pl.name + " — " + money(pl.cash);
      if (pl.id === cur) o.selected = true;
      sel.appendChild(o);
    });
  }

  function renderLobbyPlayers() {
    if (!state) return;
    const box = $("lobbyPlayers");
    box.innerHTML = "";
    state.players.forEach((p) => {
      const d = document.createElement("div");
      d.className = "pawn";
      d.innerHTML = pawnSVG(colorHex(p.color)) +
        '<div class="pname">' + escapeHtml(p.name) + (p.isHost ? " · banque" : "") + "</div>" +
        '<div class="pcash">' + money(p.cash) + "</div>";
      box.appendChild(d);
    });
    $("btnStartGame").style.display = isHost ? "block" : "none";
  }

  function setTab(name) {
    tab = name;
    ["argent", "terrains", "cartes", "histo"].forEach((tn) => {
      const pane = $("tab-" + tn);
      if (!pane) return;
      const on = tn === name;
      pane.style.display = on ? "flex" : "none";
      pane.classList.toggle("is-on", on);
    });
    document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    renderTab();
  }
  function renderTab() {
    if (tab === "terrains") renderTerrains();
    else if (tab === "cartes") renderCartes();
    else if (tab === "histo") renderHisto();
  }

  function moneyPlain(n) {
    return Math.abs(n).toLocaleString("fr-CA") + "\u00a0$";
  }
  function fadeBand(hex) {
    // desaturate / warm for 1980s offset print feel
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    let r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const mix = (c, toward, amt) => Math.round(c * (1 - amt) + toward * amt);
    r = mix(r, 180, 0.18); g = mix(g, 140, 0.14); b = mix(b, 90, 0.16);
    const to = (n) => n.toString(16).padStart(2, "0");
    return "#" + to(r) + to(g) + to(b);
  }
  function locoSVG() {
    return '<svg viewBox="0 0 96 64" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="18" y="28" width="52" height="18" rx="2"/><path d="M28 28 V16 h22 v12"/><circle cx="34" cy="50" r="6"/><circle cx="58" cy="50" r="6"/>' +
      '<path d="M70 36 h10 v6 H70"/><path d="M36 10 h8"/><path d="M40 6 v8"/></svg>';
  }
  function bulbSVG() {
    return '<svg viewBox="0 0 64 64" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M32 8c-9 0-16 7-16 16 0 6 3 10 7 13v5h18v-5c4-3 7-7 7-13 0-9-7-16-16-16z"/><path d="M26 48h12M28 54h8"/></svg>';
  }
  function faucetSVG() {
    return '<svg viewBox="0 0 64 64" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M14 26h28a8 8 0 0 1 8 8v4H38"/><path d="M28 16v10"/><circle cx="28" cy="12" r="4"/><path d="M38 42c0 6-4 12-10 14"/></svg>';
  }

  function deedFrontHTML(pr) {
    const name = escapeHtml(pr.name.toUpperCase());
    const enLine = pr.nameEn
      ? '<div class="deed-band-en">' + escapeHtml(pr.nameEn) + "</div>"
      : "";
    const enPlain = pr.nameEn
      ? '<div class="deed-name-en">' + escapeHtml(pr.nameEn) + "</div>"
      : "";
    if (pr.type === "street") {
      const band = fadeBand(D.GROUP_HEX[pr.group] || "#555");
      return '<div class="deed-band" style="background:' + band + '">' +
        '<div class="deed-band-label">Titre de propriété</div>' +
        '<div class="deed-band-name">' + name + "</div>" + enLine + "</div>" +
        '<div class="deed-front-body">' +
        '<div class="deed-rent-main">LOYER\u00a0' + moneyPlain(pr.rent[0]) + ".</div>" +
        '<table class="deed-rows"><tbody>' +
        "<tr><td>Avec 1 Maison</td><td>" + moneyPlain(pr.rent[1]) + ".</td></tr>" +
        "<tr><td>Avec 2 Maisons</td><td>" + moneyPlain(pr.rent[2]) + ".</td></tr>" +
        "<tr><td>Avec 3 Maisons</td><td>" + moneyPlain(pr.rent[3]) + ".</td></tr>" +
        "<tr><td>Avec 4 Maisons</td><td>" + moneyPlain(pr.rent[4]) + ".</td></tr>" +
        '<tr class="hotel"><td>Avec HÔTEL</td><td>' + moneyPlain(pr.rent[5]) + ".</td></tr>" +
        "</tbody></table>" +
        '<hr class="deed-divider">' +
        '<div class="deed-mortgage">Valeur hypothécaire\u00a0' + moneyPlain(pr.mortgage) + ".</div>" +
        '<div class="deed-house-cost">Maisons coûtent\u00a0' + moneyPlain(pr.houseCost) + ".\u00a0chacune.</div>" +
        '<div class="deed-hotel-cost">Hôtels coûtent\u00a0' + moneyPlain(pr.houseCost) + ".\u00a0plus\u00a04\u00a0maisons.</div>" +
        '<div class="deed-footnote">Si un joueur possède TOUS les terrains d’un Groupe de Couleur, le loyer est doublé sur les terrains non bâtis de ce groupe.</div>' +
        "</div>";
    }
    if (pr.type === "rail") {
      return '<div class="deed-icon-top">' + locoSVG() + "</div>" +
        '<div class="deed-name-plain">' + name + "</div>" + enPlain +
        '<div class="deed-front-body">' +
        '<div class="deed-rent-main">LOYER\u00a0' + moneyPlain(25) + ".</div>" +
        '<table class="deed-rows"><tbody>' +
        "<tr><td>Si l’on possède 2 chemins de fer</td><td>" + moneyPlain(50) + ".</td></tr>" +
        "<tr><td>Si l’on possède 3\u00a0»</td><td>" + moneyPlain(100) + ".</td></tr>" +
        "<tr><td>Si l’on possède 4\u00a0»</td><td>" + moneyPlain(200) + ".</td></tr>" +
        "</tbody></table>" +
        '<hr class="deed-divider">' +
        '<div class="deed-mortgage">Valeur hypothécaire\u00a0' + moneyPlain(pr.mortgage) + ".</div>" +
        '<div class="deed-footnote">Reading · Pennsylvanie · B. & O. · Petit Réseau</div>' +
        "</div>";
    }
    const icon = (pr.id === "water" || pr.id === "eaux") ? faucetSVG() : bulbSVG();
    return '<div class="deed-icon-top">' + icon + "</div>" +
      '<div class="deed-name-plain">' + name + "</div>" + enPlain +
      '<div class="deed-front-body">' +
      '<div class="deed-rent-main" style="font-size:.95rem;font-weight:600;letter-spacing:0;font-family:var(--font-deed-row)">Si l’on possède UN service public, le loyer est 4 fois le montant indiqué par les dés.</div>' +
      '<div class="deed-rent-main" style="font-size:.95rem;font-weight:600;letter-spacing:0;font-family:var(--font-deed-row);margin-top:10px">Si l’on possède les DEUX services, le loyer est 10 fois le montant indiqué par les dés.</div>' +
      '<hr class="deed-divider">' +
      '<div class="deed-mortgage">Valeur hypothécaire\u00a0' + moneyPlain(pr.mortgage) + ".</div>" +
      "</div>";
  }

  function buildDeedCard(pr, deed, controllable) {
    const wrap = document.createElement("div");
    wrap.className = "deed-wrap";
    wrap.dataset.propId = pr.id;
    // slight random tilt like a well-used 80s set on the table
    const tilt = ((pr.id.charCodeAt(0) * 17 + pr.id.length * 13) % 21 - 10) / 5; // -2°..+2°
    wrap.style.setProperty("--tilt", tilt.toFixed(2) + "deg");

    const flip = document.createElement("div");
    flip.className = "deed-flip" + (deed && deed.mortgaged ? " is-mortgaged" : "");
    flip.innerHTML =
      '<div class="deed-flip-inner">' +
      '<div class="deed-face deed-front">' + deedFrontHTML(pr) + "</div>" +
      '<div class="deed-face deed-back"><div class="deed-back-inner">' +
      '<div class="deed-back-title">HYPOTHÉQUÉ</div>' +
      '<div class="deed-back-name">' + escapeHtml(pr.name.toUpperCase()) + "</div>" +
      (pr.nameEn ? '<div class="deed-name-en" style="margin-top:-6px;margin-bottom:10px">' + escapeHtml(pr.nameEn) + "</div>" : "") +
      '<div class="deed-back-value">Valeur\u00a0' + moneyPlain(pr.mortgage) + ".</div>" +
      '<p class="deed-back-note">Présenter cette face lorsque le titre est hypothéqué. Pour lever l’hypothèque, rembourser à la Banque la valeur hypothécaire plus 10\u00a0%.</p>' +
      "</div></div></div>";

    flip.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      if (!(deed && deed.mortgaged)) return;
      flip.classList.toggle("peek-front");
    });

    wrap.appendChild(flip);

    if (deed && deed.mortgaged) {
      const hint = document.createElement("div");
      hint.className = "deed-flip-hint";
      hint.textContent = "Touche pour voir le recto · face HYPOTHÉQUÉ";
      wrap.appendChild(hint);
    }

    let builds = "";
    if (deed) {
      if (deed.houses === 5) builds = hotelSVG();
      else for (let i = 0; i < deed.houses; i++) builds += houseSVG();
    }
    if (builds) {
      const b = document.createElement("div");
      b.className = "deed-builds";
      b.innerHTML = builds;
      wrap.appendChild(b);
    }

    if (controllable) {
      const actions = document.createElement("div");
      actions.className = "deed-actions";
      const isOwner = deed && deed.ownerId === myPlayerId;
      const canManage = isOwner || isHost || isSim;
      if (canManage && deed) {
        if (!deed.mortgaged && pr.type === "street") {
          const b1 = document.createElement("button"); b1.className = "secondary"; b1.textContent = "+ Maison";
          b1.onclick = (e) => { e.stopPropagation(); sendAction({ type: "build", propId: pr.id }); };
          actions.appendChild(b1);
          if (deed.houses > 0) {
            const b2 = document.createElement("button"); b2.className = "secondary"; b2.textContent = "− Maison";
            b2.onclick = (e) => { e.stopPropagation(); sendAction({ type: "sell_house", propId: pr.id }); };
            actions.appendChild(b2);
          }
        }
        if (!deed.mortgaged && deed.houses === 0) {
          const bm = document.createElement("button"); bm.className = "warn";
          bm.textContent = "Hypothéquer +" + money(pr.mortgage);
          bm.onclick = (e) => { e.stopPropagation(); sendAction({ type: "mortgage", propId: pr.id }); haptic(20); };
          actions.appendChild(bm);
        } else if (deed.mortgaged) {
          const bu = document.createElement("button");
          bu.textContent = "Lever −" + money(Math.ceil(pr.mortgage * 1.1));
          bu.onclick = (e) => { e.stopPropagation(); sendAction({ type: "unmortgage", propId: pr.id }); };
          actions.appendChild(bu);
        }
        if (deed.houses === 0) {
          const bt = document.createElement("button"); bt.className = "secondary"; bt.textContent = "Céder…";
          bt.onclick = (e) => { e.stopPropagation(); openTradeModal(pr.id); };
          actions.appendChild(bt);
        }
      }
      if (actions.childNodes.length) wrap.appendChild(actions);
    }
    return wrap;
  }

  function renderTerrains() {
    const mine = $("myDeeds");
    const bank = $("bankDeeds");
    if (!mine || !bank) return;
    mine.innerHTML = "";
    bank.innerHTML = "";
    const myProps = D.PROPERTIES.filter((pr) => state.deeds[pr.id] && state.deeds[pr.id].ownerId === myPlayerId);
    if (!myProps.length) mine.innerHTML = '<p class="empty" style="color:rgba(243,230,200,.8)">Aucun titre pour l\'instant — glisse le carrousel après un achat.</p>';
    else myProps.forEach((pr) => mine.appendChild(buildDeedCard(pr, state.deeds[pr.id], true)));

    D.PROPERTIES.filter((pr) => !state.deeds[pr.id]).forEach((pr) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "bank-chip";
      chip.style.borderTopColor = fadeBand(D.GROUP_HEX[pr.group] || "#888");
      chip.style.setProperty("--tilt", (((pr.id.charCodeAt(1) || 1) % 9) - 4) / 4 + "deg");
      chip.innerHTML = '<div class="n">' + escapeHtml(pr.name) + '</div><div class="p">' + money(pr.price) + "</div>";
      chip.onclick = () => {
        sendAction({ type: "buy", playerId: myPlayerId, propId: pr.id, price: pr.price });
        haptic(10);
      };
      bank.appendChild(chip);
    });
  }

  function renderCartes() {
    const stage = $("drawnStage");
    if (!stage) return;
    if (state.lastCard) {
      const border = state.lastCard.deck === "chance" ? "chance-border" : "community-border";
      const kind = state.lastCard.deck === "chance" ? "Chance" : "Caisse de communauté";
      stage.innerHTML = '<div class="drawn-card ' + border + '"><div class="kind">' + kind + '</div>' + escapeHtml(state.lastCard.text) + "</div>";
    } else {
      stage.innerHTML = '<p class="empty">Touche un paquet pour tirer une carte</p>';
    }
  }

  function renderHisto() {
    const box = $("histoList");
    const moreBtn = $("btnHistoMore");
    if (!box) return;
    box.innerHTML = "";
    if (!state.history.length) {
      box.innerHTML = '<p class="empty">Aucune transaction.</p>';
      if (moreBtn) moreBtn.style.display = "none";
      return;
    }
    // Fit ~5 latest on short phones; rest behind "voir plus"
    const VISIBLE = 5;
    const visible = state.history.slice(0, VISIBLE);
    visible.forEach((h) => {
      const d = document.createElement("div");
      d.className = "hist-card";
      const time = new Date(h.t).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
      d.innerHTML = '<div class="t">' + time + '</div><div class="txt">' + escapeHtml(h.text) + "</div>";
      box.appendChild(d);
    });
    if (moreBtn) {
      moreBtn.style.display = state.history.length > VISIBLE ? "block" : "none";
      moreBtn.onclick = () => openHistoSheet();
    }
  }
  function openHistoSheet() {
    openModal("Historique complet", (body) => {
      body.innerHTML = "";
      state.history.forEach((h) => {
        const d = document.createElement("div");
        d.className = "hist-card";
        const time = new Date(h.t).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
        d.innerHTML = '<div class="t">' + time + '</div><div class="txt">' + escapeHtml(h.text) + "</div>";
        body.appendChild(d);
      });
    }, null);
  }

  /* —— modals —— */
  function openModal(title, bodyBuilder, onConfirm, confirmLabel) {
    const bd = $("modal");
    bd.classList.add("show");
    $("modalTitle").textContent = title;
    const body = $("modalBody");
    body.innerHTML = "";
    bodyBuilder(body);
    const ok = $("modalOk");
    ok.style.display = onConfirm ? "inline-flex" : "none";
    ok.textContent = confirmLabel || "OK";
    ok.onclick = () => { if (onConfirm && onConfirm() === false) return; bd.classList.remove("show"); };
    $("modalCancel").onclick = () => bd.classList.remove("show");
  }

  function openPayKeypad(toId) {
    const to = playerById(toId);
    if (!to) return;
    let amtStr = "";
    openModal("Payer " + to.name, (body) => {
      body.innerHTML =
        '<div class="amt-display" id="kpAmt">0\u00a0$</div>' +
        '<div class="chips">' +
        '<button type="button" data-v="50">+50</button>' +
        '<button type="button" data-v="100">+100</button>' +
        '<button type="button" data-v="200">+200</button>' +
        '<button type="button" data-v="loyer">Loyer…</button>' +
        "</div>" +
        '<div class="keypad" id="kp"></div>';
      const disp = () => { $("kpAmt").textContent = money(parseInt(amtStr || "0", 10)); };
      const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","00"];
      const kp = $("kp");
      keys.forEach((k) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = k;
        b.onclick = () => {
          if (k === "⌫") amtStr = amtStr.slice(0, -1);
          else if (amtStr.length < 6) amtStr += k === "00" ? "00" : k;
          if (amtStr.length > 1) amtStr = String(parseInt(amtStr, 10));
          disp(); haptic(8);
        };
        kp.appendChild(b);
      });
      body.querySelectorAll(".chips button").forEach((b) => {
        b.onclick = () => {
          if (b.dataset.v === "loyer") { $("modal").classList.remove("show"); openRentModal(toId); return; }
          amtStr = String((parseInt(amtStr || "0", 10) || 0) + parseInt(b.dataset.v, 10));
          disp();
        };
      });
    }, () => {
      const amt = parseInt(amtStr || "0", 10);
      if (amt <= 0) { toast("Montant invalide"); return false; }
      sendAction({ type: "pay_player", fromId: myPlayerId, toId, amount: amt });
    }, "Payer");
  }

  function openBankModal() {
    openModal("Banque", (body) => {
      body.innerHTML =
        '<label>Montant</label><input id="mAmt" type="number" inputmode="numeric" min="1" value="100">' +
        '<div class="chips" style="margin-top:12px">' +
        '<button type="button" id="mPay">Je paie</button>' +
        '<button type="button" id="mRecv">Je reçois</button></div>';
      $("mPay").onclick = () => {
        const amt = Math.floor(+$("mAmt").value || 0);
        if (amt <= 0) return;
        $("modal").classList.remove("show");
        sendAction({ type: "pay_bank", fromId: myPlayerId, amount: amt });
      };
      $("mRecv").onclick = () => {
        const amt = Math.floor(+$("mAmt").value || 0);
        if (amt <= 0) return;
        $("modal").classList.remove("show");
        sendAction({ type: "recv_bank", toId: myPlayerId, amount: amt });
      };
    }, null);
  }

  function openRentModal(preferOwnerId) {
    openModal("Payer un loyer", (body) => {
      let html = '<label>Terrain</label><select id="mProp">';
      D.PROPERTIES.forEach((pr) => {
        const deed = state.deeds[pr.id];
        if (!deed || deed.mortgaged || deed.ownerId === myPlayerId) return;
        if (preferOwnerId && deed.ownerId !== preferOwnerId) return;
        const rent = calcRent(pr, deed);
        html += '<option value="' + pr.id + '" data-rent="' + rent + '">' + escapeHtml(pr.name) + " → " + money(rent) + "</option>";
      });
      html += '</select><label>Montant</label><input id="mAmt" type="number" inputmode="numeric" min="0" value="">';
      body.innerHTML = html;
      const sync = () => {
        const opt = $("mProp") && $("mProp").selectedOptions[0];
        if (opt) $("mAmt").value = opt.getAttribute("data-rent") || "0";
      };
      if ($("mProp") && $("mProp").options.length) { $("mProp").onchange = sync; sync(); }
      else body.innerHTML = '<p class="hint">Aucun loyer possible.</p>';
    }, () => {
      if (!$("mProp")) return false;
      sendAction({ type: "rent", fromId: myPlayerId, propId: $("mProp").value, amount: Math.floor(+$("mAmt").value || 0) });
    }, "Payer le loyer");
  }

  function openBuyModal() {
    openModal("Acheter", (body) => {
      let html = '<label>Terrain libre</label><select id="mProp">';
      D.PROPERTIES.forEach((pr) => {
        if (state.deeds[pr.id]) return;
        html += '<option value="' + pr.id + '">' + escapeHtml(pr.name) + " (" + money(pr.price) + ")</option>";
      });
      html += '</select><label>Prix</label><input id="mAmt" type="number" inputmode="numeric" min="0" value="">';
      body.innerHTML = html;
      const sync = () => { const pr = propById($("mProp").value); if (pr) $("mAmt").value = pr.price; };
      if ($("mProp")) { $("mProp").onchange = sync; sync(); }
    }, () => {
      if (!$("mProp")) return false;
      sendAction({ type: "buy", playerId: myPlayerId, propId: $("mProp").value, price: Math.floor(+$("mAmt").value || 0) });
    }, "Acheter");
  }

  function openAuctionModal() {
    if (state.auction && state.auction.open) {
      openModal("Enchère en cours", (body) => {
        body.innerHTML = "<p>" + escapeHtml((propById(state.auction.propId) || {}).name || "") + "</p>" +
          "<p>Mise max : " + money(state.auction.highBid) + "</p>" +
          '<label>Ta mise</label><input id="mAmt" type="number" inputmode="numeric" min="1" value="' + (state.auction.highBid + 10) + '">';
      }, () => {
        sendAction({ type: "auction_bid", playerId: myPlayerId, amount: Math.floor(+$("mAmt").value || 0) });
      }, "Enchérir");
      if (isHost || isSim) {
        const end = document.createElement("button");
        end.className = "danger"; end.textContent = "Clore l'enchère";
        end.onclick = () => { $("modal").classList.remove("show"); sendAction({ type: "auction_end" }); };
        $("modal").querySelector(".actions").appendChild(end);
      }
      return;
    }
    openModal("Nouvelle enchère", (body) => {
      let html = '<label>Terrain libre</label><select id="mProp">';
      D.PROPERTIES.forEach((pr) => { if (!state.deeds[pr.id]) html += '<option value="' + pr.id + '">' + escapeHtml(pr.name) + "</option>"; });
      html += "</select>";
      body.innerHTML = html;
    }, () => {
      if (!$("mProp")) return false;
      sendAction({ type: "auction_start", propId: $("mProp").value });
    }, "Ouvrir");
  }

  function openTradeModal(propId) {
    openModal("Céder un terrain", (body) => {
      let html = "";
      if (!propId) {
        html += '<label>Terrain</label><select id="mProp">';
        D.PROPERTIES.forEach((pr) => {
          const d = state.deeds[pr.id];
          if (!d || d.ownerId !== myPlayerId || d.houses > 0) return;
          html += '<option value="' + pr.id + '">' + escapeHtml(pr.name) + "</option>";
        });
        html += "</select>";
      } else {
        html += "<p><strong>" + escapeHtml((propById(propId) || {}).name || "") + "</strong></p>";
      }
      html += '<label>À qui</label><select id="mTo">';
      state.players.forEach((p) => {
        if (p.id === myPlayerId) return;
        html += '<option value="' + p.id + '">' + escapeHtml(p.name) + "</option>";
      });
      html += '</select><label>Prix (0 = gratuit)</label><input id="mAmt" type="number" inputmode="numeric" min="0" value="0">';
      body.innerHTML = html;
    }, () => {
      const pid = propId || ($("mProp") && $("mProp").value);
      const toId = $("mTo") && $("mTo").value;
      if (!pid || !toId) { toast("Choix invalide"); return false; }
      sendAction({ type: "transfer_deed", propId: pid, toId, amount: Math.floor(+$("mAmt").value || 0) });
    }, "Céder");
  }

  /* —— boot —— */
  function fillColorSelect(sel) {
    sel.innerHTML = "";
    D.COLORS.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id; o.textContent = c.label; sel.appendChild(o);
    });
  }
  function refreshSimNameInputs() {
    const box = $("simNames"); if (!box) return;
    const n = Math.max(2, Math.min(6, +($("simCount").value || 3)));
    const prev = []; box.querySelectorAll("input").forEach((inp) => prev.push(inp.value));
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const wrap = document.createElement("div");
      const lab = document.createElement("label"); lab.textContent = "J" + (i + 1); lab.htmlFor = "simName" + i;
      const inp = document.createElement("input"); inp.id = "simName" + i; inp.maxLength = 20;
      inp.value = prev[i] || SIM_DEFAULT_NAMES[i] || ("Joueur " + (i + 1));
      wrap.appendChild(lab); wrap.appendChild(inp);
      box.appendChild(wrap);
    }
  }

  function boot() {
    fillColorSelect($("hostColor"));
    fillColorSelect($("joinColor"));
    refreshSimNameInputs();
    $("simCount").onchange = refreshSimNameInputs;
    showScreen("home");
  }

  $("btnSim").onclick = () => {
    const n = Math.max(2, Math.min(6, +($("simCount").value || 3)));
    const names = [];
    for (let i = 0; i < n; i++) {
      const el = $("simName" + i);
      names.push(((el && el.value) || "").trim() || SIM_DEFAULT_NAMES[i] || ("Joueur " + (i + 1)));
    }
    try { if (peer) peer.destroy(); } catch (_) {}
    peer = null; connections = {}; isSim = true; isHost = true; gameCode = "SIMU";
    connected = true; undoStack = []; lastCashShown = null;
    state = createSimState(names);
    showScreen("game"); setTab("argent"); setConnBadge(true); persist(); render();
    toast("Simulation prête");
  };

  $("btnCreate").onclick = async () => {
    const name = ($("hostName").value || "").trim() || "Banque";
    const color = $("hostColor").value;
    gameCode = code4(); isHost = true; isSim = false;
    $("btnCreate").disabled = true; $("btnCreate").textContent = "Connexion…";
    try {
      await startHostPeer(gameCode);
      state = createState(name, color); undoStack = []; lastCashShown = null;
      showScreen("lobby");
      $("lobbyCode").textContent = gameCode;
      $("lobbyStatus").textContent = "En attente des joueurs… Partage le code.";
      renderLobbyPlayers(); persist();
    } catch (e) { toast(e.message || "Erreur PeerJS"); isHost = false; }
    $("btnCreate").disabled = false; $("btnCreate").textContent = "Créer · devenir banque";
  };

  $("btnJoin").onclick = async () => {
    const name = ($("joinName").value || "").trim() || "Joueur";
    const color = $("joinColor").value;
    const code = ($("joinCode").value || "").trim().toUpperCase();
    if (code.length < 4) { toast("Entre le code à 4 lettres"); return; }
    gameCode = code; isHost = false; isSim = false;
    $("btnJoin").disabled = true; $("btnJoin").textContent = "Connexion…";
    try {
      const conn = await joinHostPeer(code);
      conn.send(JSON.stringify({ type: "join", name, color }));
      showScreen("lobby");
      $("lobbyCode").textContent = code;
      $("lobbyStatus").textContent = "Connecté — en attente du départ…";
    } catch (e) { toast(e.message || "Impossible de rejoindre"); }
    $("btnJoin").disabled = false; $("btnJoin").textContent = "Rejoindre la table";
  };

  $("btnStartGame").onclick = () => {
    if (!isHost) return;
    runAction({ type: "start" }, myPlayerId);
    showScreen("game"); setTab("argent"); render();
  };
  $("btnCopyCode").onclick = async () => {
    try { await navigator.clipboard.writeText(gameCode || state.code); toast("Code copié"); }
    catch { toast("Code : " + (gameCode || "")); }
  };
  $("btnLeave").onclick = () => {
    if (!confirm("Quitter la partie sur ce téléphone?")) return;
    try { if (peer) peer.destroy(); } catch (_) {}
    localStorage.removeItem(STORAGE_KEY);
    state = null; connections = {}; isHost = false; isSim = false; lastCashShown = null;
    showScreen("home"); setConnBadge(false); refreshSimNameInputs();
  };

  document.querySelectorAll(".tabbar button").forEach((b) => {
    b.onclick = () => { setTab(b.dataset.tab); haptic(8); };
  });
  document.addEventListener("change", (ev) => {
    if (ev.target && ev.target.id === "simPlayerSelect" && isSim && state) {
      myPlayerId = ev.target.value; lastCashShown = null; persist(); render();
      toast("Joueur actif : " + ((me() || {}).name || ""));
    }
  });

  $("fabGo").onclick = () => sendAction({ type: "pass_go", playerId: myPlayerId });
  $("fabPay").onclick = () => {
    const others = state.players.filter((p) => p.id !== myPlayerId);
    if (!others.length) { toast("Pas d'autre joueur"); return; }
    openModal("Qui payer ?", (body) => {
      const wrap = document.createElement("div"); wrap.className = "avatar-pick";
      others.forEach((pl) => {
        const btn = document.createElement("button"); btn.type = "button"; btn.className = "pawn";
        btn.innerHTML = pawnSVG(colorHex(pl.color)) + '<div class="pname">' + escapeHtml(pl.name) + "</div>";
        btn.onclick = () => { $("modal").classList.remove("show"); openPayKeypad(pl.id); };
        wrap.appendChild(btn);
      });
      body.appendChild(wrap);
    }, null);
  };
  $("fabBank").onclick = () => openBankModal();
  $("fabUndo").onclick = () => {
    if (isHost || isSim) runAction({ type: "undo" }, myPlayerId);
    else toast("Seul l'hôte peut annuler");
  };
  $("btnBuy").onclick = () => openBuyModal();
  $("btnAuction").onclick = () => openAuctionModal();
  $("btnRent").onclick = () => openRentModal();
  $("deckChance").onclick = () => { sendAction({ type: "draw", deck: "chance", playerId: myPlayerId }); setTab("cartes"); };
  $("deckCommunity").onclick = () => { sendAction({ type: "draw", deck: "community", playerId: myPlayerId }); setTab("cartes"); };

  window.__BP = {
    getState: () => state,
    isHost: () => isHost,
    isSim: () => isSim,
    myPlayerId: () => myPlayerId,
    setMyPlayerId: (id) => { myPlayerId = id; lastCashShown = null; render(); },
    sendAction, runAction: (a) => runAction(a, myPlayerId),
    code: () => gameCode,
    calcRent, propById, setTab
  };


  // Home mode segments (no scroll: one pane at a time)
  document.querySelectorAll(".home-seg").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.home;
      document.querySelectorAll(".home-seg").forEach((b) => b.classList.toggle("on", b === btn));
      document.querySelectorAll(".home-pane").forEach((p) => p.classList.toggle("on", p.id === "home-" + id));
    };
  });

  boot();
})();
