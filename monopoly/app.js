/* Banque Plateau — compagnon d'argent pour plateau physique */
(function () {
  "use strict";

  const D = window.BP_DATA;
  const PEER_PREFIX = "bpplateau-";
  const STORAGE_KEY = "bp-plateau-v1";

  /** @type {any} */
  let peer = null;
  /** @type {Record<string, any>} */
  let connections = {};
  let isHost = false;
  let isSim = false;
  let myPeerId = null;
  let myPlayerId = null;
  let gameCode = null;
  let connected = false;
  const SIM_DEFAULT_NAMES = ["Christian", "Caroline", "Tristan", "Alex", "Sam", "Jo"];

  /** @type {any} */
  let state = null;
  /** @type {any[]} */
  let undoStack = [];
  const MAX_UNDO = 30;

  // ---------- utils ----------
  function $(id) { return document.getElementById(id); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function code4() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function money(n) {
    const sign = n < 0 ? "-" : "";
    return sign + Math.abs(n).toLocaleString("fr-CA") + " $";
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2800);
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function propById(id) { return D.PROPERTIES.find((p) => p.id === id); }
  function playerById(id) { return state && state.players.find((p) => p.id === id); }
  function me() { return playerById(myPlayerId); }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    const s = $("screen-" + name);
    if (s) s.classList.add("active");
    $("footerBar").classList.toggle("show", name === "game");
  }

  // ---------- state ----------
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
      version: 1,
      code: gameCode,
      started: false,
      simulation: false,
      players: [
        { id: hostId, name: hostName, color: hostColor, cash: D.START_CASH, jailFree: 0, isHost: true }
      ],
      deeds: {}, // propId -> { ownerId, mortgaged, houses (0-5, 5=hotel) }
      bankHouses: 32,
      bankHotels: 12,
      history: [],
      decks: freshDecks(),
      auction: null, // { propId, highBid, highBidderId, open }
      lastCard: null
    };
  }

  function createSimState(names) {
    const players = names.map((name, i) => ({
      id: uid(),
      name: name || ("Joueur " + (i + 1)),
      color: D.COLORS[i % D.COLORS.length].id,
      cash: D.START_CASH,
      jailFree: 0,
      isHost: i === 0
    }));
    myPlayerId = players[0].id;
    return {
      version: 1,
      code: "SIMU",
      started: true,
      simulation: true,
      players,
      deeds: {},
      bankHouses: 32,
      bankHotels: 12,
      history: [{ t: Date.now(), text: "Mode simulation démarré (" + players.length + " joueurs)" }],
      decks: freshDecks(),
      auction: null,
      lastCard: null
    };
  }

  function snapshot() {
    undoStack.push(JSON.parse(JSON.stringify(state)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function log(text) {
    state.history.unshift({ t: Date.now(), text });
    if (state.history.length > 80) state.history.length = 80;
  }

  function broadcast() {
    if (!isHost) return;
    const payload = JSON.stringify({ type: "state", state, myPlayerIdHint: null });
    Object.values(connections).forEach((c) => {
      if (c.open) c.send(payload);
    });
    persist();
    render();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isHost, isSim, myPlayerId, gameCode, state, myPeerId
      }));
    } catch (_) {}
  }

  function applyGuestState(next) {
    state = next;
    persist();
    render();
  }

  // ---------- peer ----------
  function peerOpts() {
    return {
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" }
        ]
      }
    };
  }

  function setConnBadge(ok) {
    connected = ok;
    ["connBadge", "connBadgeGame"].forEach((id) => {
      const b = $(id);
      if (!b) return;
      b.classList.toggle("offline", !ok);
      const label = b.querySelector("span:last-child");
      if (label) label.textContent = ok ? "En ligne" : "Hors ligne";
    });
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
      let msg;
      try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return; }
      if (asHost) {
        handleGuestAction(conn, msg);
      } else if (msg.type === "state") {
        applyGuestState(msg.state);
        setConnBadge(true);
      } else if (msg.type === "welcome") {
        myPlayerId = msg.playerId;
        applyGuestState(msg.state);
        setConnBadge(true);
      } else if (msg.type === "error") {
        toast(msg.text || "Erreur");
      }
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
      peer.on("open", (pid) => {
        myPeerId = pid;
        setConnBadge(true);
        resolve(pid);
      });
      peer.on("connection", (conn) => wireConn(conn, true));
      peer.on("error", (err) => {
        if (String(err).includes("unavailable-id") || (err && err.type === "unavailable-id")) {
          reject(new Error("Code déjà pris — réessaie"));
        } else {
          // soft: still resolve if already open
          console.warn(err);
        }
      });
      setTimeout(() => {
        if (!myPeerId) reject(new Error("Connexion PeerJS lente — réessaie"));
      }, 12000);
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
        conn.on("open", () => {
          setConnBadge(true);
          resolve(conn);
        });
        conn.on("error", reject);
        setTimeout(() => {
          if (!connected) reject(new Error("Impossible de joindre la partie (mauvais code ou hôtel hors ligne)"));
        }, 12000);
      });
      peer.on("error", (err) => console.warn(err));
    });
  }

  function sendAction(action) {
    if (isHost) {
      runAction(action, myPlayerId);
      return;
    }
    const conn = connections.host;
    if (!conn || !conn.open) {
      toast("Pas connecté à l'hôte");
      return;
    }
    conn.send(JSON.stringify({ type: "action", action, playerId: myPlayerId }));
  }

  function handleGuestAction(conn, msg) {
    if (msg.type === "join") {
      if (state.started && !state.players.find((p) => p.name === msg.name)) {
        // allow late join with cash
      }
      const color = msg.color || freeColor();
      let p = state.players.find((x) => x.name === msg.name && !x.isHost);
      if (!p) {
        snapshot();
        p = { id: uid(), name: msg.name, color, cash: D.START_CASH, jailFree: 0, isHost: false };
        state.players.push(p);
        log(p.name + " a rejoint la partie");
      }
      conn.send(JSON.stringify({ type: "welcome", playerId: p.id, state }));
      broadcast();
      return;
    }
    if (msg.type === "action") {
      runAction(msg.action, msg.playerId);
    }
  }

  function freeColor() {
    const used = new Set(state.players.map((p) => p.color));
    const c = D.COLORS.find((x) => !used.has(x.id));
    return (c || D.COLORS[0]).id;
  }

  function colorHex(id) {
    const c = D.COLORS.find((x) => x.id === id);
    return c ? c.hex : "#888";
  }

  // ---------- game actions ----------
  function runAction(action, actorId) {
    if (!state || !action) return;
    const actor = playerById(actorId);
    if (!actor && action.type !== "undo") return;

    // Only host mutates
    if (!isHost) return;

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
          state.started = true;
          log("Partie démarrée");
          break;
        case "rename": {
          const p = playerById(action.playerId);
          if (p && action.name) p.name = String(action.name).slice(0, 20);
          break;
        }
        case "pay_player": {
          const from = playerById(action.fromId);
          const to = playerById(action.toId);
          const amt = Math.max(0, Math.floor(+action.amount || 0));
          if (!from || !to || amt <= 0) break;
          from.cash -= amt;
          to.cash += amt;
          log(from.name + " → " + to.name + " : " + money(amt));
          break;
        }
        case "pay_bank": {
          const from = playerById(action.fromId);
          const amt = Math.max(0, Math.floor(+action.amount || 0));
          if (!from || amt <= 0) break;
          from.cash -= amt;
          log(from.name + " paie la banque " + money(amt));
          break;
        }
        case "recv_bank": {
          const to = playerById(action.toId);
          const amt = Math.max(0, Math.floor(+action.amount || 0));
          if (!to || amt <= 0) break;
          to.cash += amt;
          log(to.name + " reçoit de la banque " + money(amt));
          break;
        }
        case "pass_go": {
          const p = playerById(action.playerId);
          if (!p) break;
          p.cash += D.GO_BONUS;
          log(p.name + " passe par Départ (+" + money(D.GO_BONUS) + ")");
          break;
        }
        case "buy": {
          const p = playerById(action.playerId);
          const prop = propById(action.propId);
          if (!p || !prop) break;
          if (state.deeds[prop.id]) { toast("Déjà vendu"); undoStack.pop(); return; }
          const price = action.price != null ? Math.floor(+action.price) : prop.price;
          p.cash -= price;
          state.deeds[prop.id] = { ownerId: p.id, mortgaged: false, houses: 0 };
          log(p.name + " achète " + prop.name + " pour " + money(price));
          break;
        }
        case "rent": {
          const from = playerById(action.fromId);
          const deed = state.deeds[action.propId];
          const prop = propById(action.propId);
          if (!from || !deed || !prop || deed.mortgaged) break;
          const owner = playerById(deed.ownerId);
          if (!owner || owner.id === from.id) break;
          let rent = calcRent(prop, deed);
          if (action.amount != null) rent = Math.floor(+action.amount);
          from.cash -= rent;
          owner.cash += rent;
          log(from.name + " paie loyer " + money(rent) + " à " + owner.name + " (" + prop.name + ")");
          break;
        }
        case "mortgage": {
          const deed = state.deeds[action.propId];
          const prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || deed.mortgaged) break;
          if (deed.houses > 0) { toast("Vends les maisons d'abord"); undoStack.pop(); return; }
          deed.mortgaged = true;
          owner.cash += prop.mortgage;
          log(owner.name + " hypothèque " + prop.name + " (+" + money(prop.mortgage) + ")");
          break;
        }
        case "unmortgage": {
          const deed = state.deeds[action.propId];
          const prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || !deed.mortgaged) break;
          const cost = Math.ceil(prop.mortgage * 1.1);
          owner.cash -= cost;
          deed.mortgaged = false;
          log(owner.name + " lève l'hypothèque de " + prop.name + " (−" + money(cost) + ")");
          break;
        }
        case "build": {
          const deed = state.deeds[action.propId];
          const prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || prop.type !== "street" || deed.mortgaged) break;
          if (!ownsFullGroup(owner.id, prop.group)) { toast("Il faut le groupe complet"); undoStack.pop(); return; }
          if (deed.houses >= 5) break;
          if (deed.houses === 4) {
            if (state.bankHotels < 1) { toast("Plus d'hôtels"); undoStack.pop(); return; }
            state.bankHotels--;
            state.bankHouses += 4;
            deed.houses = 5;
            owner.cash -= prop.houseCost;
            log(owner.name + " construit un hôtel sur " + prop.name);
          } else {
            if (state.bankHouses < 1) { toast("Plus de maisons"); undoStack.pop(); return; }
            state.bankHouses--;
            deed.houses++;
            owner.cash -= prop.houseCost;
            log(owner.name + " construit une maison sur " + prop.name + " (" + deed.houses + ")");
          }
          break;
        }
        case "sell_house": {
          const deed = state.deeds[action.propId];
          const prop = propById(action.propId);
          const owner = deed && playerById(deed.ownerId);
          if (!deed || !prop || !owner || deed.houses < 1) break;
          if (deed.houses === 5) {
            if (state.bankHouses < 4) { toast("Pas assez de maisons en banque pour descendre l'hôtel"); undoStack.pop(); return; }
            state.bankHotels++;
            state.bankHouses -= 4;
            deed.houses = 4;
          } else {
            state.bankHouses++;
            deed.houses--;
          }
          owner.cash += Math.floor(prop.houseCost / 2);
          log(owner.name + " vend une construction sur " + prop.name);
          break;
        }
        case "draw": {
          applyDraw(action.deck, action.playerId);
          break;
        }
        case "auction_start": {
          const prop = propById(action.propId);
          if (!prop || state.deeds[prop.id]) break;
          state.auction = { propId: prop.id, highBid: 0, highBidderId: null, open: true };
          log("Enchère ouverte : " + prop.name);
          break;
        }
        case "auction_bid": {
          if (!state.auction || !state.auction.open) break;
          const bid = Math.floor(+action.amount || 0);
          const p = playerById(action.playerId);
          if (!p || bid <= state.auction.highBid) { toast("Enchère trop basse"); undoStack.pop(); return; }
          state.auction.highBid = bid;
          state.auction.highBidderId = p.id;
          log(p.name + " enchérir " + money(bid));
          break;
        }
        case "auction_end": {
          if (!state.auction) break;
          const prop = propById(state.auction.propId);
          const winner = playerById(state.auction.highBidderId);
          if (winner && state.auction.highBid > 0 && prop) {
            winner.cash -= state.auction.highBid;
            state.deeds[prop.id] = { ownerId: winner.id, mortgaged: false, houses: 0 };
            log(winner.name + " remporte " + prop.name + " pour " + money(state.auction.highBid));
          } else {
            log("Enchère annulée / sans offre");
          }
          state.auction = null;
          break;
        }
        case "transfer_deed": {
          const deed = state.deeds[action.propId];
          const to = playerById(action.toId);
          if (!deed || !to) break;
          const from = playerById(deed.ownerId);
          deed.ownerId = to.id;
          log((from ? from.name : "?") + " cède " + (propById(action.propId) || {}).name + " à " + to.name);
          break;
        }
        default:
          undoStack.pop();
          return;
      }
    } catch (e) {
      console.error(e);
      undoStack.pop();
      toast("Erreur d'action");
      return;
    }
    broadcast();
  }

  function ownsFullGroup(playerId, group) {
    const props = D.PROPERTIES.filter((p) => p.group === group);
    return props.every((p) => state.deeds[p.id] && state.deeds[p.id].ownerId === playerId && !state.deeds[p.id].mortgaged);
  }

  function calcRent(prop, deed) {
    if (prop.type === "street") {
      const idx = Math.min(deed.houses, 5);
      let r = prop.rent[idx];
      if (deed.houses === 0 && ownsFullGroup(deed.ownerId, prop.group)) r *= 2;
      return r;
    }
    if (prop.type === "rail") {
      const n = D.PROPERTIES.filter((p) => p.type === "rail" && state.deeds[p.id] && state.deeds[p.id].ownerId === deed.ownerId).length;
      return prop.rent[Math.max(0, n - 1)] || 25;
    }
    if (prop.type === "util") {
      // dice unknown — default 4× / 10× with prompt amount handled by UI; use 4*7 average-ish as hint
      const n = D.PROPERTIES.filter((p) => p.type === "util" && state.deeds[p.id] && state.deeds[p.id].ownerId === deed.ownerId).length;
      return n >= 2 ? 70 : 28; // approx; UI lets override
    }
    return 0;
  }

  function countHousesHotels(playerId) {
    let houses = 0, hotels = 0;
    Object.entries(state.deeds).forEach(([pid, deed]) => {
      if (deed.ownerId !== playerId) return;
      if (deed.houses === 5) hotels++;
      else houses += deed.houses;
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
    let note = p.name + " tire " + (key === "chance" ? "Chance" : "Caisse commune") + " : " + card.text;
    const ef = card.effect || { type: "none" };
    if (ef.type === "money") {
      p.cash += ef.amount;
      note += " → " + money(ef.amount);
    } else if (ef.type === "go") {
      p.cash += D.GO_BONUS;
      note += " → +" + money(D.GO_BONUS);
    } else if (ef.type === "jailfree") {
      p.jailFree = (p.jailFree || 0) + 1;
      // remove from discard so it stays with player — keep simple: stay in discard but flag player
    } else if (ef.type === "repairs") {
      const { houses, hotels } = countHousesHotels(p.id);
      const cost = houses * ef.house + hotels * ef.hotel;
      p.cash -= cost;
      note += " → −" + money(cost);
    } else if (ef.type === "birthday") {
      state.players.forEach((other) => {
        if (other.id === p.id) return;
        other.cash -= ef.amount;
        p.cash += ef.amount;
      });
    }
    log(note);
  }

  // ---------- UI ----------
  let tab = "moi";

  function render() {
    if (!state) return;
    // Lobby (avant démarrage)
    if (!state.started) {
      const lobby = $("screen-lobby");
      if (lobby && lobby.classList.contains("active")) {
        renderLobbyPlayers();
        $("lobbyCode").textContent = state.code || gameCode || "----";
        return;
      }
    } else {
      if (!$("screen-game").classList.contains("active")) showScreen("game");
    }
    $("gameCodeLabel").textContent = state.code || gameCode || "----";
    const modeLabel = $("modeLabel");
    if (modeLabel) modeLabel.textContent = isSim ? "Mode" : "Code";
    const simBanner = $("simBanner");
    if (simBanner) {
      simBanner.style.display = isSim ? "block" : "none";
      if (isSim) fillSimPlayerSelect();
    }
    if (isSim) {
      setConnBadge(true);
      const b = $("connBadgeGame");
      if (b) {
        b.classList.remove("offline");
        const label = b.querySelector("span:last-child");
        if (label) label.textContent = "Simulation";
      }
    }
    const p = me();
    if (p) {
      $("myName").textContent = p.name + (isSim ? " (actif)" : "");
      $("myCash").textContent = money(p.cash);
      $("myCash").style.color = colorHex(p.color);
    }
    renderPlayers();
    renderTab();
    $("hostTools").style.display = (isHost || isSim) ? "block" : "none";
    if ($("hostTools") && (isHost || isSim)) {
      $("hostTools").querySelector("h2").textContent = isSim ? "Simulation (banque locale)" : "Banque (hôte)";
      const hint = $("hostTools").querySelector(".hint");
      if (hint) hint.textContent = isSim
        ? "Tout reste sur ce téléphone. Utilise le sélecteur « Joueur actif » pour chaque tour."
        : "Maisons en banque et contrôles réservés à ce téléphone. Les autres voient leurs soldes en direct.";
    }
    if (state.auction && state.auction.open) {
      $("auctionBanner").style.display = "block";
      const prop = propById(state.auction.propId);
      const winner = playerById(state.auction.highBidderId);
      $("auctionBanner").innerHTML =
        "<strong>Enchère :</strong> " + (prop ? prop.name : "?") +
        " — mise " + money(state.auction.highBid) +
        (winner ? " (" + winner.name + ")" : "");
    } else {
      $("auctionBanner").style.display = "none";
    }
    if (state.lastCard) {
      $("lastCard").style.display = "block";
      $("lastCard").textContent =
        (state.lastCard.deck === "chance" ? "Chance" : "Caisse") + " : " + state.lastCard.text;
    }
  }

  function renderPlayers() {
    const box = $("playersList");
    box.innerHTML = "";
    state.players.forEach((pl) => {
      const div = document.createElement("div");
      div.className = "player-chip" + (pl.id === myPlayerId ? " me" : "");
      div.style.borderLeftColor = colorHex(pl.color);
      const propsCount = Object.values(state.deeds).filter((d) => d.ownerId === pl.id).length;
      div.innerHTML =
        '<div class="name">' + escapeHtml(pl.name) +
        (pl.isHost ? ' <span class="tag">Banque</span>' : "") +
        '<div class="sub" style="color:var(--muted);font-size:.8rem;font-weight:500">' +
        propsCount + " terrain(s)" +
        (pl.jailFree ? " · libéré×" + pl.jailFree : "") +
        "</div></div>" +
        '<div class="cash">' + money(pl.cash) + "</div>";
      box.appendChild(div);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderTab() {
    document.querySelectorAll(".tabs button").forEach((b) => {
      b.classList.toggle("on", b.dataset.tab === tab);
    });
    const pane = $("tabPane");
    pane.innerHTML = "";
    if (tab === "moi") renderMeTab(pane);
    else if (tab === "actions") renderActionsTab(pane);
    else if (tab === "terrains") renderTerrainsTab(pane);
    else if (tab === "cartes") renderCartesTab(pane);
    else if (tab === "histo") renderHistoTab(pane);
  }

  function renderMeTab(pane) {
    const p = me();
    if (!p) return;
    const mine = D.PROPERTIES.filter((pr) => state.deeds[pr.id] && state.deeds[pr.id].ownerId === p.id);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>Mes terrains</h2>";
    if (!mine.length) {
      card.innerHTML += '<p class="hint">Aucun terrain pour l\'instant.</p>';
    } else {
      mine.forEach((pr) => card.appendChild(propEl(pr, state.deeds[pr.id], true)));
    }
    pane.appendChild(card);
  }

  function propEl(pr, deed, withBtns) {
    const el = document.createElement("div");
    el.className = "prop" + (deed && deed.mortgaged ? " mortgaged" : "");
    el.style.borderLeftColor = D.GROUP_HEX[pr.group] || "#555";
    const houses = deed ? deed.houses : 0;
    let build = "";
    if (houses === 5) build = "🏨 Hôtel";
    else if (houses > 0) build = "🏠".repeat(houses);
    const owner = deed ? playerById(deed.ownerId) : null;
    el.innerHTML =
      '<div class="meta"><div class="title">' + escapeHtml(pr.name) + "</div>" +
      '<div class="sub">' + (D.GROUP_LABELS[pr.group] || "") +
      " · " + money(pr.price) +
      (deed && deed.mortgaged ? " · HYPOTHÉQUÉ" : "") +
      (build ? " · " + build : "") +
      (owner ? " · " + escapeHtml(owner.name) : " · Banque") +
      "</div></div>";
    if (withBtns && deed && (isHost || isSim)) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.flexDirection = "column";
      row.style.gap = "4px";
      if (!deed.mortgaged && pr.type === "street") {
        row.appendChild(smallBtn("+🏠", () => sendAction({ type: "build", propId: pr.id })));
        if (deed.houses > 0) row.appendChild(smallBtn("−🏠", () => sendAction({ type: "sell_house", propId: pr.id })));
      }
      if (!deed.mortgaged && deed.houses === 0) {
        row.appendChild(smallBtn("Hyp.", () => sendAction({ type: "mortgage", propId: pr.id })));
      } else if (deed.mortgaged) {
        row.appendChild(smallBtn("Lève", () => sendAction({ type: "unmortgage", propId: pr.id })));
      }
      el.appendChild(row);
    }
    return el;
  }

  function smallBtn(label, fn) {
    const b = document.createElement("button");
    b.className = "secondary";
    b.style.padding = "8px 10px";
    b.style.minHeight = "36px";
    b.style.fontSize = ".85rem";
    b.textContent = label;
    b.onclick = fn;
    return b;
  }

  function renderActionsTab(pane) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>Actions rapides</h2>";
    const grid = document.createElement("div");
    grid.className = "actions-grid";
    const actions = [
      ["Départ +200 $", () => sendAction({ type: "pass_go", playerId: myPlayerId })],
      ["Payer un joueur", () => openPayPlayer()],
      ["Payer la banque", () => openAmountModal("Payer la banque", (amt) => sendAction({ type: "pay_bank", fromId: myPlayerId, amount: amt }))],
      ["Recevoir banque", () => openAmountModal("Recevoir de la banque", (amt) => sendAction({ type: "recv_bank", toId: myPlayerId, amount: amt }))],
      ["Acheter terrain", () => openBuyModal()],
      ["Payer loyer", () => openRentModal()],
      ["Enchère", () => openAuctionModal()],
      ["Annuler ↩", () => { if (isHost || isSim) runAction({ type: "undo" }, myPlayerId); else toast("Seul l'hôte peut annuler"); }]
    ];
    actions.forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.textContent = label;
      if (label.startsWith("Annuler")) b.className = "warn";
      b.onclick = fn;
      grid.appendChild(b);
    });
    card.appendChild(grid);
    pane.appendChild(card);

    if (!isHost) {
      const tip = document.createElement("p");
      tip.className = "hint";
      tip.textContent = "Les actions sont validées par le téléphone Banque (hôte).";
      pane.appendChild(tip);
    }
  }

  function renderTerrainsTab(pane) {
    const bank = document.createElement("div");
    bank.className = "card";
    bank.innerHTML = "<h2>À vendre (banque)</h2>";
    const owned = document.createElement("div");
    owned.className = "card";
    owned.innerHTML = "<h2>Possédés</h2>";
    D.PROPERTIES.forEach((pr) => {
      const deed = state.deeds[pr.id];
      if (!deed) {
        const btn = document.createElement("button");
        btn.className = "list-btn";
        btn.innerHTML = escapeHtml(pr.name) + '<span class="right">' + money(pr.price) + "</span>";
        btn.style.borderLeft = "6px solid " + (D.GROUP_HEX[pr.group] || "#555");
        btn.onclick = () => {
          if (!isHost && myPlayerId) {
            // guest requests buy at list price
            sendAction({ type: "buy", playerId: myPlayerId, propId: pr.id });
          } else {
            openBuyModal(pr.id);
          }
        };
        bank.appendChild(btn);
      } else {
        owned.appendChild(propEl(pr, deed, deed.ownerId === myPlayerId || isHost || isSim));
      }
    });
    pane.appendChild(bank);
    pane.appendChild(owned);
  }

  function renderCartesTab(pane) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>Cartes</h2><p class=\"hint\">Mélange auto. Les effets d'argent s'appliquent; les déplacements restent manuels sur le plateau.</p>";
    const row = document.createElement("div");
    row.className = "row";
    const b1 = document.createElement("button");
    b1.textContent = "Tirage Chance";
    b1.onclick = () => sendAction({ type: "draw", deck: "chance", playerId: myPlayerId });
    const b2 = document.createElement("button");
    b2.className = "secondary";
    b2.textContent = "Caisse commune";
    b2.onclick = () => sendAction({ type: "draw", deck: "community", playerId: myPlayerId });
    row.appendChild(b1);
    row.appendChild(b2);
    card.appendChild(row);
    const draw = document.createElement("div");
    draw.className = "card-draw";
    draw.style.marginTop = "12px";
    draw.textContent = state.lastCard ? state.lastCard.text : "Tire une carte…";
    card.appendChild(draw);
    pane.appendChild(card);
  }

  function renderHistoTab(pane) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>Historique</h2>";
    if (!state.history.length) {
      card.innerHTML += '<p class="hint">Aucune transaction.</p>';
    } else {
      state.history.forEach((h) => {
        const d = document.createElement("div");
        d.className = "hist-item";
        const time = new Date(h.t).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
        d.innerHTML = "<strong>" + time + "</strong> — " + escapeHtml(h.text);
        card.appendChild(d);
      });
    }
    pane.appendChild(card);
  }

  // ---------- modals ----------
  function openModal(title, bodyBuilder, onConfirm, confirmLabel) {
    const bd = $("modal");
    bd.classList.add("show");
    $("modalTitle").textContent = title;
    const body = $("modalBody");
    body.innerHTML = "";
    bodyBuilder(body);
    const ok = $("modalOk");
    ok.textContent = confirmLabel || "OK";
    ok.onclick = () => {
      if (onConfirm() !== false) bd.classList.remove("show");
    };
    $("modalCancel").onclick = () => bd.classList.remove("show");
  }

  function openAmountModal(title, cb) {
    openModal(title, (body) => {
      body.innerHTML = '<label>Montant</label><input id="mAmt" type="number" inputmode="numeric" min="1" step="1" value="100">';
      setTimeout(() => $("mAmt").focus(), 50);
    }, () => {
      const amt = Math.floor(+$("mAmt").value || 0);
      if (amt <= 0) { toast("Montant invalide"); return false; }
      cb(amt);
    }, "Confirmer");
  }

  function openPayPlayer() {
    openModal("Payer un joueur", (body) => {
      let html = '<label>À qui</label><select id="mTo">';
      state.players.forEach((p) => {
        if (p.id === myPlayerId) return;
        html += '<option value="' + p.id + '">' + escapeHtml(p.name) + "</option>";
      });
      html += '</select><label>Montant</label><input id="mAmt" type="number" inputmode="numeric" min="1" value="50">';
      body.innerHTML = html;
    }, () => {
      const toId = $("mTo").value;
      const amt = Math.floor(+$("mAmt").value || 0);
      if (!toId || amt <= 0) { toast("Choix invalide"); return false; }
      sendAction({ type: "pay_player", fromId: myPlayerId, toId, amount: amt });
    });
  }

  function openBuyModal(preselect) {
    openModal("Acheter un terrain", (body) => {
      let html = '<label>Terrain</label><select id="mProp">';
      D.PROPERTIES.forEach((pr) => {
        if (state.deeds[pr.id]) return;
        html += '<option value="' + pr.id + '"' + (preselect === pr.id ? " selected" : "") + ">" +
          escapeHtml(pr.name) + " (" + money(pr.price) + ")</option>";
      });
      html += '</select><label>Joueur</label><select id="mWho">';
      state.players.forEach((p) => {
        html += '<option value="' + p.id + '"' + (p.id === myPlayerId ? " selected" : "") + ">" + escapeHtml(p.name) + "</option>";
      });
      html += '</select><label>Prix payé</label><input id="mAmt" type="number" inputmode="numeric" min="0" value="">';
      body.innerHTML = html;
      const syncPrice = () => {
        const pr = propById($("mProp").value);
        if (pr && !$("mAmt").value) $("mAmt").value = pr.price;
      };
      $("mProp").onchange = () => { $("mAmt").value = ""; syncPrice(); };
      syncPrice();
    }, () => {
      const propId = $("mProp").value;
      const playerId = $("mWho").value;
      const amt = Math.floor(+$("mAmt").value || 0);
      if (!propId) { toast("Aucun terrain libre"); return false; }
      sendAction({ type: "buy", playerId, propId, price: amt });
    }, "Acheter");
  }

  function openRentModal() {
    openModal("Payer un loyer", (body) => {
      let html = '<label>Terrain</label><select id="mProp">';
      D.PROPERTIES.forEach((pr) => {
        const deed = state.deeds[pr.id];
        if (!deed || deed.mortgaged || deed.ownerId === myPlayerId) return;
        const rent = calcRent(pr, deed);
        html += '<option value="' + pr.id + '" data-rent="' + rent + '">' +
          escapeHtml(pr.name) + " → " + money(rent) + "</option>";
      });
      html += '</select><label>Qui paie</label><select id="mFrom">';
      state.players.forEach((p) => {
        html += '<option value="' + p.id + '"' + (p.id === myPlayerId ? " selected" : "") + ">" + escapeHtml(p.name) + "</option>";
      });
      html += '</select><label>Montant (modifiable)</label><input id="mAmt" type="number" inputmode="numeric" min="0" value="">';
      body.innerHTML = html;
      const sync = () => {
        const opt = $("mProp").selectedOptions[0];
        if (opt) $("mAmt").value = opt.getAttribute("data-rent") || "0";
      };
      if ($("mProp")) { $("mProp").onchange = sync; sync(); }
      else body.innerHTML = '<p class="hint">Aucun loyer possible (pas de terrain adverse).</p>';
    }, () => {
      if (!$("mProp")) return false;
      sendAction({
        type: "rent",
        fromId: $("mFrom").value,
        propId: $("mProp").value,
        amount: Math.floor(+$("mAmt").value || 0)
      });
    }, "Payer");
  }

  function openAuctionModal() {
    if (state.auction && state.auction.open) {
      openModal("Enchère en cours", (body) => {
        body.innerHTML =
          '<p>' + escapeHtml((propById(state.auction.propId) || {}).name || "") + "</p>" +
          "<p>Mise max : " + money(state.auction.highBid) + "</p>" +
          '<label>Ta mise</label><input id="mAmt" type="number" inputmode="numeric" min="1" value="' +
          (state.auction.highBid + 10) + '">';
      }, () => {
        sendAction({ type: "auction_bid", playerId: myPlayerId, amount: Math.floor(+$("mAmt").value || 0) });
      }, "Enchérir");
      // also allow host to end via second button injection
      if (isHost || isSim) {
        const end = document.createElement("button");
        end.className = "danger";
        end.textContent = "Clore l'enchère";
        end.onclick = () => { $("modal").classList.remove("show"); sendAction({ type: "auction_end" }); };
        $("modal").querySelector(".actions").appendChild(end);
      }
      return;
    }
    openModal("Nouvelle enchère", (body) => {
      let html = '<label>Terrain libre</label><select id="mProp">';
      D.PROPERTIES.forEach((pr) => {
        if (state.deeds[pr.id]) return;
        html += '<option value="' + pr.id + '">' + escapeHtml(pr.name) + "</option>";
      });
      html += "</select>";
      body.innerHTML = html || '<p class="hint">Rien à vendre.</p>';
    }, () => {
      if (!$("mProp")) return false;
      sendAction({ type: "auction_start", propId: $("mProp").value });
    }, "Ouvrir");
  }

  // ---------- screens / boot ----------
  function fillColorSelect(sel) {
    sel.innerHTML = "";
    D.COLORS.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.label;
      sel.appendChild(o);
    });
  }

  function refreshSimNameInputs() {
    const box = $("simNames");
    if (!box) return;
    const n = Math.max(2, Math.min(6, +($("simCount").value || 3)));
    const prev = [];
    box.querySelectorAll("input").forEach((inp) => prev.push(inp.value));
    box.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const lab = document.createElement("label");
      lab.textContent = "Joueur " + (i + 1);
      lab.setAttribute("for", "simName" + i);
      const inp = document.createElement("input");
      inp.id = "simName" + i;
      inp.maxLength = 20;
      inp.value = prev[i] || SIM_DEFAULT_NAMES[i] || ("Joueur " + (i + 1));
      inp.placeholder = "Nom";
      box.appendChild(lab);
      box.appendChild(inp);
    }
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

  function bootLobby() {
    fillColorSelect($("hostColor"));
    fillColorSelect($("joinColor"));
    refreshSimNameInputs();
    if ($("simCount")) $("simCount").onchange = refreshSimNameInputs;
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
    peer = null;
    connections = {};
    isSim = true;
    isHost = true; // toutes les actions locales
    gameCode = "SIMU";
    connected = true;
    undoStack = [];
    state = createSimState(names);
    showScreen("game");
    tab = "actions";
    setConnBadge(true);
    persist();
    render();
    toast("Simulation prête — change de joueur en haut");
  };

  $("btnCreate").onclick = async () => {
    const name = ($("hostName").value || "").trim() || "Banque";
    const color = $("hostColor").value;
    gameCode = code4();
    isHost = true;
    isSim = false;
    $("btnCreate").disabled = true;
    $("btnCreate").textContent = "Connexion…";
    try {
      await startHostPeer(gameCode);
      state = createState(name, color);
      undoStack = [];
      showScreen("lobby");
      $("lobbyCode").textContent = gameCode;
      $("lobbyStatus").textContent = "En attente des joueurs… Partage le code.";
      renderLobbyPlayers();
      persist();
    } catch (e) {
      toast(e.message || "Erreur PeerJS");
      isHost = false;
    }
    $("btnCreate").disabled = false;
    $("btnCreate").textContent = "Créer une partie";
  };

  $("btnJoin").onclick = async () => {
    const name = ($("joinName").value || "").trim() || "Joueur";
    const color = $("joinColor").value;
    const code = ($("joinCode").value || "").trim().toUpperCase();
    if (code.length < 4) { toast("Entre le code à 4 lettres"); return; }
    gameCode = code;
    isHost = false;
    isSim = false;
    $("btnJoin").disabled = true;
    $("btnJoin").textContent = "Connexion…";
    try {
      const conn = await joinHostPeer(code);
      // wait a tick then send join
      conn.send(JSON.stringify({ type: "join", name, color }));
      showScreen("lobby");
      $("lobbyCode").textContent = code;
      $("lobbyStatus").textContent = "Connecté — en attente du départ…";
      // render when state arrives
    } catch (e) {
      toast(e.message || "Impossible de rejoindre");
    }
    $("btnJoin").disabled = false;
    $("btnJoin").textContent = "Rejoindre";
  };

  function renderLobbyPlayers() {
    if (!state) return;
    const box = $("lobbyPlayers");
    box.innerHTML = "";
    state.players.forEach((p) => {
      const d = document.createElement("div");
      d.className = "player-chip";
      d.style.borderLeftColor = colorHex(p.color);
      d.innerHTML = '<div class="name">' + escapeHtml(p.name) + (p.isHost ? " (banque)" : "") + "</div>" +
        '<div class="cash">' + money(p.cash) + "</div>";
      box.appendChild(d);
    });
    $("btnStartGame").style.display = isHost ? "block" : "none";
  }

  $("btnStartGame").onclick = () => {
    if (!isHost) return;
    runAction({ type: "start" }, myPlayerId);
    showScreen("game");
    tab = "actions";
    render();
  };

  $("btnCopyCode").onclick = async () => {
    try {
      await navigator.clipboard.writeText(gameCode || state.code);
      toast("Code copié");
    } catch {
      toast("Code : " + (gameCode || ""));
    }
  };

  document.querySelectorAll(".tabs button").forEach((b) => {
    b.onclick = () => { tab = b.dataset.tab; renderTab(); };
  });

  $("btnLeave").onclick = () => {
    if (!confirm("Quitter la partie sur ce téléphone?")) return;
    try { if (peer) peer.destroy(); } catch (_) {}
    localStorage.removeItem(STORAGE_KEY);
    state = null;
    connections = {};
    isHost = false;
    isSim = false;
    showScreen("home");
    setConnBadge(false);
    refreshSimNameInputs();
  };

  // Switch active player in simulation
  document.addEventListener("change", (ev) => {
    if (ev.target && ev.target.id === "simPlayerSelect" && isSim && state) {
      myPlayerId = ev.target.value;
      persist();
      render();
      toast("Joueur actif : " + ((me() || {}).name || ""));
    }
  });

  // Expose for Playwright tests
  window.__BP = {
    getState: () => state,
    isHost: () => isHost,
    isSim: () => isSim,
    myPlayerId: () => myPlayerId,
    setMyPlayerId: (id) => { myPlayerId = id; render(); },
    sendAction,
    runAction: (a) => runAction(a, myPlayerId),
    code: () => gameCode
  };

  bootLobby();
})();
