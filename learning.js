(() => {
  'use strict';
  const mapDescriptions = {
    m1: 'M1 est une des deux machines à courant continu. Son ensemble est fixe mécaniquement ; son rôle d’entraînement ou de charge reste à confirmer.',
    m2: 'L’ensemble M2 est mobile. Il permet d’adapter la position relative des arbres. Cette mobilité ne définit pas son rôle électrique.',
    courroies: 'Les deux transmissions à courroies et poulies relient les machines électriques aux broches. Un changement de rapport modifie la vitesse et le couple disponibles aux pièces.',
    broches: 'Les paliers guident les arbres en rotation. Les porte-pinces en bout serrent les axes des roues d’essai. Le montage doit assurer alignement et répétabilité.',
    essai: 'Les pièces d’essai prennent place dans la zone sous le carter transparent. Les dents transmettent l’effort au contact. La photo ne montre pas un essai chargé en cours.'
  };
  document.querySelectorAll('[data-map-marker]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.mapMarker;
      if (!Object.prototype.hasOwnProperty.call(mapDescriptions, key)) return;
      document.querySelectorAll('[data-map-marker]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.mapMarker === key)));
      document.getElementById('map-description').textContent = mapDescriptions[key];
    });
  });

  const fields = ['motion', 'duty', 'count', 'turns'].map(key => document.getElementById(`cycle-${key}`));
  const outputs = ['pause', 'duration', 'days', 'total-turns'].map(key => document.getElementById(`cycle-${key}`));
  const segments = [...document.querySelectorAll('[data-cycle-segment]')];
  const phaseButtons = [...document.querySelectorAll('[data-cycle-phase]')];
  const bar = document.querySelector('.cycle-bar');
  const error = document.getElementById('cycle-error');
  const phaseDescription = document.getElementById('cycle-phase-description');
  const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  let selectedPhase = 0;
  let cycle = null;
  function showPhase(index) {
    selectedPhase = index;
    phaseButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.cyclePhase) === index)));
    segments.forEach((segment, i) => segment.classList.toggle('is-selected', i === index));
    if (!cycle) return;
    const descriptions = [
      `Aller : un premier mouvement de ${number.format(cycle.motion)} secondes est prévu dans ce scénario. Le sens et la commande réels doivent être définis pour l’essai retenu.`,
      `Pause : ${number.format(cycle.pause)} secondes après le premier mouvement. Le calcul ne définit pas à lui seul l’état électrique des moteurs pendant cette pause.`,
      `Retour : un second mouvement de ${number.format(cycle.motion)} secondes complète l’aller-retour prévu par le calcul. La stratégie d’inversion reste à valider sur le banc.`,
      `Pause : ${number.format(cycle.pause)} secondes avant le cycle suivant. Un cycle complet dure ${number.format(cycle.duration)} secondes.`
    ];
    phaseDescription.textContent = descriptions[index];
  }
  function updateCycle() {
    const values = fields.map(field => Number(field.value));
    const valid = fields.every((field, i) => field.value.trim() !== '' && field.checkValidity() && Number.isFinite(values[i]));
    if (!valid) {
      cycle = null;
      outputs.forEach(output => { output.textContent = '—'; });
      error.hidden = false;
      error.textContent = 'Renseigne un temps positif, un facteur de marche de 1 à 100 %, un nombre entier de cycles et un nombre de tours positif ou nul.';
      bar.setAttribute('aria-label', 'Paramètres du cycle incomplets ou invalides.');
      bar.classList.add('is-unavailable');
      phaseButtons.forEach(button => { button.disabled = true; });
      phaseDescription.textContent = 'Le calcul reprendra quand les paramètres seront valides.';
      return;
    }
    const [motion, dutyPercent, count, turns] = values;
    const duty = dutyPercent / 100;
    const pause = motion * (1 - duty) / duty;
    const duration = 2 * (motion + pause);
    cycle = { motion, pause, duration, count, turns };
    error.hidden = true;
    bar.classList.remove('is-unavailable');
    phaseButtons.forEach(button => { button.disabled = false; });
    const times = [motion, pause, motion, pause];
    segments.forEach((segment, index) => {
      segment.style.flexBasis = `${100 * times[index] / duration}%`;
      segment.querySelector('span').textContent = `${number.format(times[index])} s`;
    });
    bar.setAttribute('aria-label', `Aller ${number.format(motion)} secondes, pause ${number.format(pause)} secondes, retour ${number.format(motion)} secondes, pause ${number.format(pause)} secondes. ${number.format(dutyPercent)} pour cent de temps actif.`);
    const campaignSeconds = duration * count;
    const campaignText = campaignSeconds < 60 ? `${number.format(campaignSeconds)} s`
      : campaignSeconds < 3600 ? `${number.format(campaignSeconds / 60)} min`
      : campaignSeconds < 86400 ? `${number.format(campaignSeconds / 3600)} h`
      : `${number.format(campaignSeconds / 86400)} jours`;
    const text = [`${number.format(pause)} s`, `${number.format(duration)} s`, campaignText, number.format(count * turns)];
    outputs.forEach((output, index) => { output.textContent = text[index]; });
    showPhase(selectedPhase);
  }
  if (fields.every(Boolean) && outputs.every(Boolean) && bar && error && phaseDescription) {
    fields.forEach(field => field.addEventListener('input', updateCycle));
    phaseButtons.forEach(button => button.addEventListener('click', () => showPhase(Number(button.dataset.cyclePhase))));
    document.getElementById('cycle-reset').addEventListener('click', () => {
      [8, 25, 25000, 4].forEach((value, index) => { fields[index].value = String(value); });
      selectedPhase = 0;
      updateCycle();
    });
    updateCycle();
  }

  const notes = document.getElementById('meeting-notes');
  const questions = [...document.querySelectorAll('[data-meeting-question]')];
  const feedback = document.getElementById('meeting-feedback');
  const storageKey = 'banc-denture-conception-v1';
  if (notes && feedback) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved.notes === 'string') notes.value = saved.notes;
      if (saved && saved.questions && typeof saved.questions === 'object') {
        questions.forEach(question => { question.checked = saved.questions[question.dataset.meetingQuestion] === true; });
      }
    } catch { /* Notes remain usable when device storage is unavailable. */ }
    const save = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ notes: notes.value, questions: Object.fromEntries(questions.map(question => [question.dataset.meetingQuestion, question.checked])) }));
      } catch { feedback.textContent = 'Le navigateur ne permet pas de conserver ces notes. Copie la fiche avant de fermer la page.'; }
    };
    notes.addEventListener('input', save);
    questions.forEach(question => question.addEventListener('change', save));
    function meetingText() {
      const lines = ['BANC D’USURE DE DENTURE — RÉUNION DE CONCEPTION', '', 'Décisions attendues : essai cible ; architecture à valider ; responsables et prochaines vérifications.', '', 'QUESTIONS'];
      questions.forEach(question => {
        const label = question.closest('label');
        lines.push(`${question.checked ? '[Abordée]' : '[À aborder]'} ${label.querySelector('strong').textContent}`);
      });
      lines.push('', 'DÉCISIONS ET PROCHAINES ACTIONS', notes.value.trim() || '(À renseigner)', '', 'REPÈRES', 'Origine et étalonnage du couple MICRA inconnus. Schéma électrique du banc non retrouvé. Rôles M1/M2 à confirmer. 7,8 Nm est M₀ à basse vitesse, sans preuve de disponibilité continue à 2400 tr/min. Les procédures MAGTROL concernent un autre banc.', '', 'https://cleementt26.github.io/banc-usure-denture/');
      return lines.join('\n');
    }
    document.getElementById('copy-meeting').addEventListener('click', async () => {
      const text = meetingText();
      try {
        await navigator.clipboard.writeText(text);
        feedback.textContent = 'Fiche copiée, avec tes questions et tes notes.';
      } catch {
        let fallback = document.getElementById('meeting-copy-fallback');
        if (!fallback) {
          fallback = document.createElement('textarea');
          fallback.id = 'meeting-copy-fallback';
          fallback.readOnly = true;
          fallback.setAttribute('aria-label', 'Fiche complète à copier');
          notes.parentElement.append(fallback);
        }
        fallback.value = text;
        fallback.focus();
        fallback.select();
        feedback.textContent = 'Fiche sélectionnée ci-dessous : utilise Ctrl+C ou la commande Copier de ton appareil.';
      }
    });
    const preparePrint = () => { document.getElementById('meeting-notes-print').textContent = notes.value.trim() || 'Décisions et prochaines actions : à renseigner.'; };
    window.addEventListener('beforeprint', preparePrint);
    document.getElementById('print-meeting').addEventListener('click', () => { preparePrint(); window.print(); });
  }
})();
