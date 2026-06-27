const bcrypt = require('bcryptjs');

async function seedIfEmpty(db) {
  db.users = db.users || [];
  db.services = db.services || [];
  db.realisations = db.realisations || [];
  db.devis = db.devis || [];
  db.blog_posts = db.blog_posts || [];
  db.gallery_images = db.gallery_images || [];
  db.counters = db.counters || {};

  const hasAnyUsers = db.users.length > 0;
  if (!hasAnyUsers) {
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);

    db.users.push({
      id: 1,
      email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@kmroot.com',
      name: 'Super Admin',
      role: 'super_admin',
      passwordHash: hash,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }

  // Demo content (optional)
  if (db.services.length === 0) {
    db.services.push(
      { id: 1, name: 'Génie Climatique', category: 'Technique', status: 'active', createdAt: new Date().toISOString() },
      { id: 2, name: 'Génie Électrique', category: 'Technique', status: 'active', createdAt: new Date().toISOString() },
      { id: 3, name: 'Architecture', category: 'Design', status: 'active', createdAt: new Date().toISOString() }
    );
    db.counters.serviceId = Math.max(db.counters.serviceId || 0, 3);
  }

  if (db.realisations.length === 0) {
    db.realisations.push(
      { id: 1, title: 'Installation HVAC', category: 'Climatique', dateLabel: 'Jan 2025', imageUrl: '', createdAt: new Date().toISOString() },
      { id: 2, title: 'Tableau Électrique', category: 'Électrique', dateLabel: 'Déc 2024', imageUrl: '', createdAt: new Date().toISOString() },
      { id: 3, title: 'Architecture Intérieure', category: 'Design', dateLabel: 'Nov 2024', imageUrl: '', createdAt: new Date().toISOString() }
    );
    db.counters.realisationId = Math.max(db.counters.realisationId || 0, 3);
  }

  if (db.blog_posts.length === 0) {
    db.blog_posts.push(
      { id: 1, title: 'Les nouvelles normes énergétiques 2025 pour les systèmes CVC', category: 'Climatique', dateLabel: '15 Jan 2025', content: '', createdAt: new Date().toISOString() },
      { id: 2, title: 'Transition vers les bornes de recharge électrique en entreprise', category: 'Électrique', dateLabel: '08 Jan 2025', content: '', createdAt: new Date().toISOString() },
      { id: 3, title: 'Tendances décoration 2025 : le biophilique', category: 'Architecture', dateLabel: '02 Jan 2025', content: '', createdAt: new Date().toISOString() }
    );
    db.counters.blogId = Math.max(db.counters.blogId || 0, 3);
  }

  if (db.gallery_images.length === 0) {
    db.gallery_images.push(
      { id: 1, imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600', createdAt: new Date().toISOString() },
      { id: 2, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', createdAt: new Date().toISOString() }
    );
    db.counters.galleryId = Math.max(db.counters.galleryId || 0, 2);
  }

  if (db.devis.length === 0) {
    // 6 last months example
    db.devis.push(
      { id: 1, fullName: 'Jean Dupont', service: 'Génie Climatique', budget: '5-10k€', status: 'pending', dateISO: new Date('2024-06-12').toISOString() },
      { id: 2, fullName: 'Société ABC', service: 'Génie Électrique', budget: '10-50k€', status: 'accepted', dateISO: new Date('2024-06-11').toISOString() },
      { id: 3, fullName: 'Marie Martin', service: 'Architecture', budget: '1-5k€', status: 'accepted', dateISO: new Date('2024-06-10').toISOString() },
      { id: 4, fullName: 'Entreprise XYZ', service: 'Tuyauterie', budget: '>50k€', status: 'rejected', dateISO: new Date('2024-06-09').toISOString() },
      { id: 5, fullName: 'Paul Durand', service: 'Formation', budget: '<1k€', status: 'pending', dateISO: new Date('2024-06-08').toISOString() }
    );
    db.counters.devisId = Math.max(db.counters.devisId || 0, 5);
  }
}

module.exports = { seedIfEmpty };

