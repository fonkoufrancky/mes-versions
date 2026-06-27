# TODO - Fix Devis/CRUD

- [ ] Fix admin: générer/brancher les boutons Accepter/Refuser sur la table devis (`js/app.js`)
- [ ] Backend: ajouter route `POST /api/devis` pour créer une demande de devis (`server/routes/crud.js`)
- [ ] Front public: envoyer le formulaire “DEMANDE DE DEVIS” via `fetch` vers `POST /api/devis` (`HTML/index.html`)
- [ ] Vérifier compatibilité: champs attendus par l’admin (fullName, service, budget, dateISO, status)
- [ ] Lancer le serveur + tester:
  - [ ] création devis => `data/db.json` incrémente `devis` et `counters.devisId`
  - [ ] admin => clic accepter/refuser => `PUT /api/devis/:id` met à jour le statut
  - [ ] CRUD services => ajout/modif/suppression fonctionnent (au moins sans erreurs console)

