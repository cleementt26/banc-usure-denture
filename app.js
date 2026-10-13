(() => {
  'use strict';
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('navigation');
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { toggle.setAttribute('aria-expanded','false'); nav.classList.remove('is-open'); }));
  const components = {
    moteurs: { title:'Les moteurs', eyebrow:'DEUX MACHINES ÉLECTRIQUES IDENTIQUES', caption:'Moteurs M1 et M2, avec transmissions par courroies crantées.', alt:'Les deux moteurs M1 et M2 et leurs transmissions par courroies', text:'Les cylindres noirs repérés M1 et M2 sont des servomoteurs à courant continu de la famille Parvex RX630E. Chaque moteur dispose de son variateur et d’un retour tachymétrique pour la vitesse.', note:'Le descriptif distingue un ensemble M1 fixe et un ensemble M2 mobile. Cela ne suffit pas à attribuer avec certitude le rôle moteur ou frein à chacun.' },
    courroies: { title:'Les transmissions', eyebrow:'POULIES ET COURROIES CRANTÉES', caption:'Transmission par courroie et arbre soutenu par ses paliers.', alt:'Une courroie crantée, une poulie dentée et un arbre sur paliers', text:'Les dents des courroies s’engagent dans celles des poulies pour transmettre la rotation des moteurs aux broches. Les paliers soutiennent les arbres. Les réglages et galets servent vraisemblablement à gérer la tension ou le guidage des courroies.', note:'Le descriptif prévoit des poulies interchangeables uniquement sur les axes liés aux pivots. Les cannelures de sortie moteur sont indiquées fixes et non démontables.' },
    broche: { title:'Les porte-pinces', eyebrow:'SERRER LES AXES DES PIÈCES D’ESSAI', caption:'Porte-pince avec pince conique fendue visible, écrou retiré.', alt:'Les broches et la pince conique de serrage, écrou démonté', text:'Les pinces coniques fendues serrent les petits axes qui portent les pièces d’essai. Le marquage ER25 est visible sur un porte-pince. Les roulements assurent le guidage en rotation des broches.', note:'La capacité de serrage et la précision du montage doivent être vérifiées pour les pièces choisies. La simple présence d’une pince ER25 ne garantit pas la compatibilité de tout montage.' },
    dentures: { title:'La zone d’essai', eyebrow:'LE CONTACT QUE L’ON ÉTUDIE', caption:'Une roue montée sur une broche ; l’autre porte-pince est vide.', alt:'Roue dentée montée entre les deux broches et autres roues sur la table', text:'Les roues à tester sont montées sur les broches, puis positionnées pour engrener. La rotation et le couple transmis sollicitent les dents. Les roues déposées sur le plateau montrent la possibilité de changer les pièces du montage.', note:'Ces vues montrent une seule roue montée. Elles ne permettent pas de vérifier un engrènement complet ni un essai sous charge.' },
    pupitre: { title:'Le pupitre', eyebrow:'VITESSE, COUPLE ET CYCLE', caption:'Pupitre avec afficheurs de vitesse et de couple, temporisateur et commandes.', alt:'Le pupitre de commande et ses afficheurs de vitesse et de couple', text:'Le pupitre comporte deux afficheurs, un temporisateur, un sélecteur DEM./CONTINU et un sélecteur GENE / FREIN. Les commandes marche et arrêt cycle, les voyants de défaut et l’arrêt d’urgence sont visibles.', note:'Le fonctionnement précis des sélecteurs, la programmation des cycles et la méthode de mesure du couple restent à confirmer avec les schémas et la documentation de commande.' }
  };
  const image = document.getElementById('component-image');
  const caption = document.getElementById('component-caption');
  const description = document.getElementById('component-description');
  const zoom = document.querySelector('.zoom-button');
  document.querySelectorAll('[data-component]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.component; const item = components[key]; if (!item) return;
    document.querySelectorAll('[data-component]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    image.src = `assets/${key}.jpg`; image.alt = item.alt; image.width = 1600; image.height = key === 'moteurs' ? 1200 : 2133;
    caption.textContent = item.caption; zoom.dataset.zoom = image.getAttribute('src');
    description.replaceChildren();
    [['p','eyebrow',item.eyebrow],['h3','',item.title],['p','',item.text],['p','fine',item.note]].forEach(([tag, cls, text]) => { const el = document.createElement(tag); el.className = cls; el.textContent = text; description.append(el); });
  }));
  const dialog = document.getElementById('photo-dialog');
  zoom.addEventListener('click', () => { document.getElementById('dialog-image').src = zoom.dataset.zoom; document.getElementById('dialog-image').alt = image.alt; document.getElementById('dialog-caption').textContent = caption.textContent; dialog.showModal(); });
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close(); } });
  const video = document.querySelector('video');
  document.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => { video.currentTime = Number(button.dataset.time); video.play().catch(() => {}); }));
})();
