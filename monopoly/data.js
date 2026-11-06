/* Banque Plateau — édition canadienne classique (Atlantic City, FR-CA).
   Sources noms plateau :
   - https://fr.wikipedia.org/wiki/Monopoly (section édition canadienne en français)
   - https://en.wikipedia.org/wiki/List_of_licensed_and_localized_editions_of_Monopoly:_North_America
     (French Canadian edition board layout)
   - http://worldofmonopoly.com/albert/canada_uk.htm (Hasbro Can. Atlantic City French, 2004)
   - https://toponymie.gouv.qc.ca/ct/salle-de-presse/chroniques-toponymiques/semaine-2015-07-23.html
   Prix / loyers : structure classique US $ (Méditerranée 60 $ … Promenade 400 $, loyer de base 50 $).
   Cartes Chance / Caisse commune : textes FR fidèles aux 16+16 cartes Atlantic City classiques (US),
   montants en $ ; formulations FR-CA exactes imprimées non toutes vérifiées photo — marquées TRANSLATION.
*/
window.BP_DATA = {
  START_CASH: 1500,
  GO_BONUS: 200,
  EDITION: "canada-atlantic-fr",
  SOURCES: {
    properties: "https://fr.wikipedia.org/wiki/Monopoly ; https://en.wikipedia.org/wiki/List_of_licensed_and_localized_editions_of_Monopoly:_North_America ; http://worldofmonopoly.com/albert/canada_uk.htm",
    rents: "Classic US Atlantic City title-deed rent schedule (standard worldwide for this board)",
    chance: "Classic US Chance deck amounts/effects; French wording = faithful translation using Canadian French place names (not photograph-verified Canadian print)",
    community: "Classic US Community Chest deck amounts/effects; French wording = faithful translation (not photograph-verified Canadian print)"
  },
  COLORS: [
    { id: "rouge", label: "Rouge", hex: "#c62828" },
    { id: "bleu", label: "Bleu", hex: "#1565c0" },
    { id: "vert", label: "Vert", hex: "#2e7d32" },
    { id: "jaune", label: "Jaune", hex: "#f9a825" },
    { id: "mauve", label: "Mauve", hex: "#6a1b9a" },
    { id: "orange", label: "Orange", hex: "#ef6c00" },
    { id: "rose", label: "Rose", hex: "#ad1457" },
    { id: "turquoise", label: "Turquoise", hex: "#00838f" }
  ],
  PROPERTIES: [
    { id: "mediterranean", name: "Avenue de la Méditerranée", nameEn: "Mediterranean Avenue", group: "brun", type: "street", price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250], mortgage: 30 },
    { id: "baltic", name: "Avenue de la Baltique", nameEn: "Baltic Avenue", group: "brun", type: "street", price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450], mortgage: 30 },
    { id: "reading", name: "Chemin de fer Reading", nameEn: "Reading Railroad", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "oriental", name: "Avenue de l'Orient", nameEn: "Oriental Avenue", group: "bleuclair", type: "street", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], mortgage: 50 },
    { id: "vermont", name: "Avenue Vermont", nameEn: "Vermont Avenue", group: "bleuclair", type: "street", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], mortgage: 50 },
    { id: "connecticut", name: "Avenue Connecticut", nameEn: "Connecticut Avenue", group: "bleuclair", type: "street", price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600], mortgage: 60 },
    { id: "stcharles", name: "Place St-Charles", nameEn: "St. Charles Place", group: "rose", type: "street", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], mortgage: 70 },
    { id: "electric", name: "Compagnie d'électricité", nameEn: "Electric Company", group: "util", type: "util", price: 150, mortgage: 75 },
    { id: "states", name: "Avenue des États-Unis", nameEn: "States Avenue", group: "rose", type: "street", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], mortgage: 70 },
    { id: "virginia", name: "Avenue Virginie", nameEn: "Virginia Avenue", group: "rose", type: "street", price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900], mortgage: 80 },
    { id: "pennsylvania_rr", name: "Chemin de fer Pennsylvanie", nameEn: "Pennsylvania Railroad", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "stjames", name: "Place St-Jacques", nameEn: "St. James Place", group: "orange", type: "street", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], mortgage: 90 },
    { id: "tennessee", name: "Avenue Tennessee", nameEn: "Tennessee Avenue", group: "orange", type: "street", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], mortgage: 90 },
    { id: "newyork", name: "Avenue New York", nameEn: "New York Avenue", group: "orange", type: "street", price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000], mortgage: 100 },
    { id: "kentucky", name: "Avenue Kentucky", nameEn: "Kentucky Avenue", group: "rouge", type: "street", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], mortgage: 110 },
    { id: "indiana", name: "Avenue Indiana", nameEn: "Indiana Avenue", group: "rouge", type: "street", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], mortgage: 110 },
    { id: "illinois", name: "Avenue Illinois", nameEn: "Illinois Avenue", group: "rouge", type: "street", price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100], mortgage: 120 },
    { id: "bo", name: "Chemin de fer B. & O.", nameEn: "B. & O. Railroad", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "atlantic", name: "Avenue Atlantique", nameEn: "Atlantic Avenue", group: "jaune", type: "street", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], mortgage: 130 },
    { id: "ventnor", name: "Avenue Ventnor", nameEn: "Ventnor Avenue", group: "jaune", type: "street", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], mortgage: 130 },
    { id: "water", name: "Aqueduc", nameEn: "Water Works", group: "util", type: "util", price: 150, mortgage: 75 },
    { id: "marvin", name: "Jardins Marvin", nameEn: "Marvin Gardens", group: "jaune", type: "street", price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200], mortgage: 140 },
    { id: "pacific", name: "Avenue Pacifique", nameEn: "Pacific Avenue", group: "vert", type: "street", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], mortgage: 150 },
    { id: "carolina", name: "Avenue Caroline du Nord", nameEn: "North Carolina Avenue", group: "vert", type: "street", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], mortgage: 150 },
    { id: "pennsylvania", name: "Avenue Pennsylvanie", nameEn: "Pennsylvania Avenue", group: "vert", type: "street", price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400], mortgage: 160 },
    { id: "shortline", name: "Chemin de fer Petit Réseau", nameEn: "Short Line", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "parkplace", name: "Place du Parc", nameEn: "Park Place", group: "bleufonce", type: "street", price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500], mortgage: 175 },
    { id: "boardwalk", name: "Promenade", nameEn: "Boardwalk", group: "bleufonce", type: "street", price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000], mortgage: 200 }
  ],
  GROUP_LABELS: {
    brun: "Brun",
    bleuclair: "Bleu clair",
    rose: "Rose / violet",
    orange: "Orange",
    rouge: "Rouge",
    jaune: "Jaune",
    vert: "Vert",
    bleufonce: "Bleu foncé",
    gare: "Chemins de fer",
    util: "Services publics"
  },
  GROUP_HEX: {
    brun: "#8B4513",
    bleuclair: "#87CEEB",
    rose: "#D14C8C",
    orange: "#FF8C00",
    rouge: "#DC143C",
    jaune: "#FFD700",
    vert: "#228B22",
    bleufonce: "#1a237e",
    gare: "#333333",
    util: "#607d8b"
  },
  /* TRANSLATION: FR wording not photo-verified from Canadian box; effects/amounts = classic US */
  CHANCE: [
    { id: "ch1", text: "Avancez jusqu'à la case Départ (GO). Touchez 200 $.", effect: { type: "go" }, verified: "amount" },
    { id: "ch2", text: "Avancez jusqu'à la Promenade.", effect: { type: "none" }, verified: "place-name-ca" },
    { id: "ch3", text: "Avancez jusqu'à l'Avenue Illinois. Si vous passez par la case Départ, touchez 200 $.", effect: { type: "none" }, verified: "place-name-ca" },
    { id: "ch4", text: "Avancez jusqu'à la Place St-Charles. Si vous passez par la case Départ, touchez 200 $.", effect: { type: "none" }, verified: "place-name-ca" },
    { id: "ch5", text: "Avancez jusqu'au chemin de fer le plus proche. S'il n'appartient à personne, vous pouvez l'acheter à la Banque. S'il appartient à un joueur, payez le double du loyer habituel.", effect: { type: "none" }, verified: "amount" },
    { id: "ch6", text: "Avancez jusqu'au chemin de fer le plus proche. S'il n'appartient à personne, vous pouvez l'acheter à la Banque. S'il appartient à un joueur, payez le double du loyer habituel.", effect: { type: "none" }, verified: "amount" },
    { id: "ch7", text: "Avancez jusqu'au service public le plus proche. S'il n'appartient à personne, vous pouvez l'acheter à la Banque. S'il appartient à un joueur, lancez les dés et payez 10 fois le montant obtenu.", effect: { type: "none" }, verified: "amount" },
    { id: "ch8", text: "La banque vous verse un dividende de 50 $.", effect: { type: "money", amount: 50 }, verified: "amount" },
    { id: "ch9", text: "Vous êtes libéré de prison. Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée ou vendue.", effect: { type: "jailfree" }, verified: "amount" },
    { id: "ch10", text: "Reculez de 3 cases.", effect: { type: "none" }, verified: "amount" },
    { id: "ch11", text: "Allez en prison. Rendez-vous directement en prison. Ne passez pas par la case Départ, ne touchez pas 200 $.", effect: { type: "none" }, verified: "amount" },
    { id: "ch12", text: "Faites des réparations générales sur toutes vos propriétés : payez 25 $ par maison et 100 $ par hôtel.", effect: { type: "repairs", house: 25, hotel: 100 }, verified: "amount" },
    { id: "ch13", text: "Amende pour excès de vitesse : 15 $.", effect: { type: "money", amount: -15 }, verified: "amount" },
    { id: "ch14", text: "Faites un voyage jusqu'au Chemin de fer Reading. Si vous passez par la case Départ, touchez 200 $.", effect: { type: "none" }, verified: "place-name-ca" },
    { id: "ch15", text: "Vous avez été élu président du conseil d'administration. Payez 50 $ à chaque joueur.", effect: { type: "chairman", amount: 50 }, verified: "amount" },
    { id: "ch16", text: "Votre prêt immobilier arrive à échéance. Touchez 150 $.", effect: { type: "money", amount: 150 }, verified: "amount" }
  ],
  COMMUNITY: [
    { id: "cc1", text: "Avancez jusqu'à la case Départ (GO). Touchez 200 $.", effect: { type: "go" }, verified: "amount" },
    { id: "cc2", text: "Erreur de la banque en votre faveur. Touchez 200 $.", effect: { type: "money", amount: 200 }, verified: "amount" },
    { id: "cc3", text: "Note du médecin. Payez 50 $.", effect: { type: "money", amount: -50 }, verified: "amount" },
    { id: "cc4", text: "De la vente d'actions, vous recevez 50 $.", effect: { type: "money", amount: 50 }, verified: "amount" },
    { id: "cc5", text: "Vous êtes libéré de prison. Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée ou vendue.", effect: { type: "jailfree" }, verified: "amount" },
    { id: "cc6", text: "Allez en prison. Rendez-vous directement en prison. Ne passez pas par la case Départ, ne touchez pas 200 $.", effect: { type: "none" }, verified: "amount" },
    { id: "cc7", text: "Votre fonds de vacances arrive à échéance. Recevez 100 $.", effect: { type: "money", amount: 100 }, verified: "amount" },
    { id: "cc8", text: "Remboursement d'impôt. Touchez 20 $.", effect: { type: "money", amount: 20 }, verified: "amount" },
    { id: "cc9", text: "C'est votre anniversaire. Recevez 10 $ de chaque joueur.", effect: { type: "birthday", amount: 10 }, verified: "amount" },
    { id: "cc10", text: "Votre assurance-vie arrive à échéance. Touchez 100 $.", effect: { type: "money", amount: 100 }, verified: "amount" },
    { id: "cc11", text: "Payez les frais d'hôpital : 100 $.", effect: { type: "money", amount: -100 }, verified: "amount" },
    { id: "cc12", text: "Payez les frais d'école : 50 $.", effect: { type: "money", amount: -50 }, verified: "amount" },
    { id: "cc13", text: "Recevez 25 $ d'honoraires de consultation.", effect: { type: "money", amount: 25 }, verified: "amount" },
    { id: "cc14", text: "Vous êtes imposé pour réparations de voirie : 40 $ par maison et 115 $ par hôtel.", effect: { type: "repairs", house: 40, hotel: 115 }, verified: "amount" },
    { id: "cc15", text: "Vous avez gagné le 2e prix d'un concours de beauté. Touchez 10 $.", effect: { type: "money", amount: 10 }, verified: "amount" },
    { id: "cc16", text: "Vous héritez de 100 $.", effect: { type: "money", amount: 100 }, verified: "amount" }
  ]
};
