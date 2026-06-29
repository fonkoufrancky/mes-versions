# TODO — Réalisations: récupération locale (upload admin)

- [ ] Implémenter le stockage upload local pour les documents liés aux réalisations
  - [ ] Créer dossier `uploads/realisations/` (et sous-dossier éventuel)
  - [ ] Servir ces fichiers en statique depuis Express
- [ ] Étendre le modèle “realisations”
  - [ ] Ajouter champ (JSON) `docs` (tableau) ou `docsJson`
  - [ ] Adapter `GET /api/realisations` pour inclure `docs` (ou au moins une structure)
  - [ ] Adapter `POST/PUT /api/realisations` pour enregistrer les docs (après upload)
- [ ] Ajouter endpoints upload & gestion docs
  - [ ] `POST /api/realisations/:id/docs` (multipart/form-data via multer)
  - [ ] `DELETE /api/realisations/:id/docs/:docId` (optionnel au début)
- [ ] Mettre à jour l’UI admin (`admin.html` + `js/app.js`)
  - [ ] Ajouter un champ “Documents” dans le modal “realisations”
  - [ ] Uploader depuis le navigateur (fichiers PDF/images/zip)
  - [ ] Afficher une liste des documents existants pour la réalisation
- [ ] Mettre à jour la page publique `realisations.html`
  - [ ] Remplacer la grille hardcodée par un chargement `GET /api/realisations`
  - [ ] Ajouter un bouton / lien “Télécharger” pour chaque doc de la réalisation
- [ ] Tests manuels
  - [ ] Créer une réalisation + uploader un fichier
  - [ ] Vérifier chargement API & lien téléchargement
  - [ ] Vérifier persistance en local (db.json ou MySQL selon configuration)

