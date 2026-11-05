/* Banque Plateau — données édition française classique (rues de Paris).
   Sources vérifiées :
   - Noms / prix / gares / services : Wikipédia FR « Monopoly », Monopolypedia classique,
     Avenue des Investisseurs, Règles 2 Jeux (liste de propriétés).
   - Loyers maisons/hôtel : structure standard Monopoly (mêmes paliers que l’édition
     internationale) cohérente avec les loyers d’hôtel publiés sur Règles 2 Jeux.
   - Cartes Chance (16) : Règles 2 Jeux — liste Chance/Caisse (édition FR parisienne).
   - Cartes Caisse de communauté (16) : regles-du-jeu.net — liste Chance/Communauté FR.
   Montants : francs classiques ÷ 100 → unités modernes (ex. F20 000 → 200), affichées en $.
*/
window.BP_DATA = {
  START_CASH: 1500,
  GO_BONUS: 200,
  SOURCES: {
    properties: "https://fr.wikipedia.org/wiki/Monopoly ; https://www.monopolypedia.fr/editions/france/classique2017/classique2017.php ; https://regles2jeux.fr/liste-de-proprietes-du-monopoly/",
    chance: "https://regles2jeux.fr/liste-des-cartes-chance-et-caisse-de-communaute-au-monopoly/",
    community: "https://www.regles-du-jeu.net/les-cartes-chance/"
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
  /* rent: [nu, 1 maison, 2, 3, 4, hôtel] — street only */
  PROPERTIES: [
    { id: "belleville", name: "Boulevard de Belleville", group: "marron", type: "street", price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250], mortgage: 30 },
    { id: "lecourbe", name: "Rue Lecourbe", group: "marron", type: "street", price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450], mortgage: 30 },
    { id: "gare_montparnasse", name: "Gare Montparnasse", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "vaugirard", name: "Rue de Vaugirard", group: "bleuclair", type: "street", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], mortgage: 50 },
    { id: "courcelles", name: "Rue de Courcelles", group: "bleuclair", type: "street", price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550], mortgage: 50 },
    { id: "republique", name: "Avenue de la République", group: "bleuclair", type: "street", price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600], mortgage: 60 },
    { id: "villette", name: "Boulevard de la Villette", group: "violet", type: "street", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], mortgage: 70 },
    { id: "electricite", name: "Compagnie de distribution d'électricité", group: "util", type: "util", price: 150, mortgage: 75 },
    { id: "neuilly", name: "Avenue de Neuilly", group: "violet", type: "street", price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750], mortgage: 70 },
    { id: "paradis", name: "Rue de Paradis", group: "violet", type: "street", price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900], mortgage: 80 },
    { id: "gare_lyon", name: "Gare de Lyon", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "mozart", name: "Avenue Mozart", group: "orange", type: "street", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], mortgage: 90 },
    { id: "stmichel", name: "Boulevard Saint-Michel", group: "orange", type: "street", price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950], mortgage: 90 },
    { id: "pigalle", name: "Place Pigalle", group: "orange", type: "street", price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000], mortgage: 100 },
    { id: "matignon", name: "Avenue Matignon", group: "rouge", type: "street", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], mortgage: 110 },
    { id: "malesherbes", name: "Boulevard Malesherbes", group: "rouge", type: "street", price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050], mortgage: 110 },
    { id: "eaux", name: "Compagnie de distribution des eaux", group: "util", type: "util", price: 150, mortgage: 75 },
    { id: "henrimartin", name: "Avenue Henri-Martin", group: "rouge", type: "street", price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100], mortgage: 120 },
    { id: "gare_nord", name: "Gare du Nord", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "sainthonore", name: "Faubourg Saint-Honoré", group: "jaune", type: "street", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], mortgage: 130 },
    { id: "bourse", name: "Place de la Bourse", group: "jaune", type: "street", price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150], mortgage: 130 },
    { id: "lafayette", name: "Rue La Fayette", group: "jaune", type: "street", price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200], mortgage: 140 },
    { id: "breteuil", name: "Avenue de Breteuil", group: "vert", type: "street", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], mortgage: 150 },
    { id: "foch", name: "Avenue Foch", group: "vert", type: "street", price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275], mortgage: 150 },
    { id: "gare_lazare", name: "Gare Saint-Lazare", group: "gare", type: "rail", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
    { id: "capucines", name: "Boulevard des Capucines", group: "vert", type: "street", price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400], mortgage: 160 },
    { id: "champs", name: "Avenue des Champs-Élysées", group: "bleufonce", type: "street", price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500], mortgage: 175 },
    { id: "paix", name: "Rue de la Paix", group: "bleufonce", type: "street", price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000], mortgage: 200 }
  ],
  GROUP_LABELS: {
    marron: "Marron",
    bleuclair: "Bleu ciel",
    violet: "Violet / rose",
    orange: "Orange",
    rouge: "Rouge",
    jaune: "Jaune",
    vert: "Vert",
    bleufonce: "Bleu foncé",
    gare: "Gares",
    util: "Services publics"
  },
  GROUP_HEX: {
    marron: "#8B4513",
    bleuclair: "#87CEEB",
    violet: "#D14C8C",
    orange: "#FF8C00",
    rouge: "#DC143C",
    jaune: "#FFD700",
    vert: "#228B22",
    bleufonce: "#1a237e",
    gare: "#333333",
    util: "#607d8b"
  },
  CHANCE: [
    { id: "ch1", text: "Avancez jusqu'à la case Départ. Touchez 200 $.", effect: { type: "go" } },
    { id: "ch2", text: "Rendez-vous à la Rue de la Paix.", effect: { type: "none" } },
    { id: "ch3", text: "Rendez-vous à l'Avenue Henri-Martin. Si vous passez par la case Départ, recevez 200 $.", effect: { type: "none" } },
    { id: "ch4", text: "Avancez au Boulevard de la Villette. Si vous passez par la case Départ, recevez 200 $.", effect: { type: "none" } },
    { id: "ch5", text: "Avancez jusqu'à la Gare de Lyon. Si vous passez par la case Départ, recevez 200 $.", effect: { type: "none" } },
    { id: "ch6", text: "Reculez de trois cases.", effect: { type: "none" } },
    { id: "ch7", text: "Allez en prison. Rendez-vous directement en prison. Ne passez pas par la case Départ, ne touchez pas 200 $.", effect: { type: "none" } },
    { id: "ch8", text: "Vous êtes libéré de prison. Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée ou vendue.", effect: { type: "jailfree" } },
    { id: "ch9", text: "Vous êtes imposé pour les réparations de voirie à raison de 40 $ par maison et 115 $ par hôtel.", effect: { type: "repairs", house: 40, hotel: 115 } },
    { id: "ch10", text: "Faites des réparations dans toutes vos maisons. Versez pour chaque maison 25 $. Versez pour chaque hôtel 100 $.", effect: { type: "repairs", house: 25, hotel: 100 } },
    { id: "ch11", text: "Amende pour excès de vitesse : 15 $.", effect: { type: "money", amount: -15 } },
    { id: "ch12", text: "Amende pour ivresse : 20 $.", effect: { type: "money", amount: -20 } },
    { id: "ch13", text: "Payez pour frais de scolarité : 150 $.", effect: { type: "money", amount: -150 } },
    { id: "ch14", text: "La banque vous verse un dividende de 50 $.", effect: { type: "money", amount: 50 } },
    { id: "ch15", text: "Votre immeuble et votre prêt rapportent. Touchez 150 $.", effect: { type: "money", amount: 150 } },
    { id: "ch16", text: "Vous avez gagné le prix des mots croisés. Recevez 100 $.", effect: { type: "money", amount: 100 } }
  ],
  COMMUNITY: [
    { id: "cc1", text: "Placez-vous sur la case Départ. Touchez 200 $.", effect: { type: "go" } },
    { id: "cc2", text: "Retournez à Belleville.", effect: { type: "none" } },
    { id: "cc3", text: "Allez en prison. Rendez-vous directement à la prison. Ne passez pas par la case Départ, ne touchez pas 200 $.", effect: { type: "none" } },
    { id: "cc4", text: "Vous êtes libéré de prison. Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée ou vendue.", effect: { type: "jailfree" } },
    { id: "cc5", text: "Erreur de la banque en votre faveur : recevez 200 $.", effect: { type: "money", amount: 200 } },
    { id: "cc6", text: "Recevez votre revenu annuel : 100 $.", effect: { type: "money", amount: 100 } },
    { id: "cc7", text: "Héritage : vous touchez 100 $.", effect: { type: "money", amount: 100 } },
    { id: "cc8", text: "La vente de votre stock vous rapporte 50 $.", effect: { type: "money", amount: 50 } },
    { id: "cc9", text: "Intérêts sur l'emprunt à 7 % : recevez 25 $.", effect: { type: "money", amount: 25 } },
    { id: "cc10", text: "Les contributions vous remboursent 20 $.", effect: { type: "money", amount: 20 } },
    { id: "cc11", text: "C'est votre anniversaire ! Chaque joueur vous donne 10 $.", effect: { type: "birthday", amount: 10 } },
    { id: "cc12", text: "Vous avez gagné le 2e prix de beauté : recevez 10 $.", effect: { type: "money", amount: 10 } },
    { id: "cc13", text: "Payez votre police d'assurance : 50 $.", effect: { type: "money", amount: -50 } },
    { id: "cc14", text: "Payez la note du médecin : 50 $.", effect: { type: "money", amount: -50 } },
    { id: "cc15", text: "Payez une amende de 10 $ ou bien tirez une carte Chance.", effect: { type: "money", amount: -10 } },
    { id: "cc16", text: "Rendez-vous à la gare la plus proche. Si vous passez par la case Départ, recevez 200 $.", effect: { type: "none" } }
  ]
};
