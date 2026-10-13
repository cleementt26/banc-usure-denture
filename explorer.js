/* Illustration pédagogique : aucune commande ni mesure du banc réel. */
(() => {
  "use strict";

  function initializeExplorer() {
    const host = document.getElementById("mechanism-svg");
    const motionButton = document.getElementById("motion-toggle");
    const speedControl = document.getElementById("speed-ratio");
    const speedOutput = document.getElementById("ratio-speed");
    const torqueOutput = document.getElementById("ratio-torque");
    const stepDescription = document.getElementById("step-description");
    const stepButtons = [...document.querySelectorAll("[data-step]")];
    if (!host || !motionButton || !speedControl || !speedOutput ||
        !torqueOutput || !stepDescription) return;

    const NS = "http://www.w3.org/2000/svg";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const teeth = 24;
    const toothAngle = 360 / teeth;
    const duration = 15000;
    const baseAngularSpeed = 24;
    let ratio = 1;
    let angle = 0;
    let running = false;
    let frame = 0;
    let lastTime = null;
    let elapsed = 0;

    function element(name, attributes = {}, text) {
      const node = document.createElementNS(NS, name);
      Object.entries(attributes).forEach(([key, value]) => {
        node.setAttribute(key, String(value));
      });
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function label(text, x, y, attributes = {}) {
      return element("text", {
        x, y, "text-anchor": "middle", fill: "var(--ink, #192d3b)",
        "font-family": "inherit", "font-size": 16, ...attributes
      }, text);
    }

    function gearPath() {
      const points = [];
      for (let tooth = 0; tooth < teeth; tooth += 1) {
        const center = tooth * toothAngle;
        [
          // Narrow schematic tips leave clearance throughout a complete tooth cycle.
          [-0.5, 111], [-0.31, 111], [-0.12, 126],
          [0.12, 126], [0.31, 111], [0.5, 111]
        ].forEach(([part, radius]) => {
          const radians = (center + part * toothAngle) * Math.PI / 180;
          points.push(`${(Math.cos(radians) * radius).toFixed(3)},${(Math.sin(radians) * radius).toFixed(3)}`);
        });
      }
      return `M${points.join(" L")} Z`;
    }

    const svg = element("svg", {
      viewBox: "0 0 900 420", role: "img",
      "aria-labelledby": "mechanism-title mechanism-description",
      width: "100%", "preserveAspectRatio": "xMidYMid meet",
      class: "mechanism-illustration"
    });
    svg.append(
      element("title", {id: "mechanism-title"}, "Principe d’un banc d’essai de denture"),
      element("desc", {id: "mechanism-description"},
        "La machine entraînante A fait tourner deux engrenages extérieurs en sens opposés. La machine de charge B résiste à la rotation. Les repères A et B sont propres à ce schéma et ne désignent pas les moteurs M1 et M2 du banc. Les deux roues ont ici le même diamètre : leur rapport reste un pour un. Le curseur illustre un rapport hypothétique de poulies entre la machine entraînante et les broches ; ces poulies ne sont pas dessinées. La vitesse et le couple relatifs ne sont pas des mesures du banc réel.")
    );

    const defs = element("defs");
    const arrow = element("marker", {
      id: "mechanism-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse"
    });
    arrow.append(element("path", {d: "M0 0 L10 5 L0 10 Z", fill: "var(--accent, #b55b35)"}));
    defs.append(arrow);
    svg.append(defs);

    const power = element("g", {"data-part": "power"});
    power.append(
      element("line", {
        x1: 260, y1: 68, x2: 635, y2: 68,
        stroke: "var(--accent, #b55b35)", "stroke-width": 2,
        "marker-end": "url(#mechanism-arrow)"
      })
    );
    svg.append(power);

    const shafts = element("g", {"data-part": "mounting"});
    shafts.append(
      element("line", {x1: 176, y1: 210, x2: 330, y2: 210, stroke: "var(--line, #aab7be)", "stroke-width": 14}),
      element("line", {x1: 570, y1: 210, x2: 724, y2: 210, stroke: "var(--line, #aab7be)", "stroke-width": 14})
    );
    [220, 680].forEach((x) => {
      shafts.append(element("rect", {
        x: x - 15, y: 180, width: 30, height: 60, rx: 6,
        fill: "var(--line, #aab7be)", stroke: "var(--ink, #192d3b)", "stroke-width": 1.5
      }));
    });
    svg.append(shafts);

    function motor(x, id, caption, part) {
      const group = element("g", {"data-part": part});
      group.append(
        element("rect", {
          x, y: 166, width: 145, height: 88, rx: 16,
          fill: "var(--ink, #192d3b)", stroke: "var(--line, #aab7be)", "stroke-width": 2
        }),
        label(id, x + 72.5, 224, {fill: "#ffffff", "font-weight": 700, "font-size": 40}),
        label(caption, x + 72.5, 293, {"font-size": 32})
      );
      for (let n = 0; n < 4; n += 1) {
        group.append(element("line", {
          x1: x + 20 + n * 12, y1: 183, x2: x + 20 + n * 12, y2: 236,
          stroke: "var(--line, #aab7be)", "stroke-width": 2, opacity: 0.45
        }));
      }
      return group;
    }
    svg.append(motor(31, "A", "Moteur", "drive"), motor(724, "B", "Charge", "load"));

    function gear(x, side) {
      const translated = element("g", {transform: `translate(${x} 210)`});
      const rotating = element("g", {"data-gear": side});
      rotating.append(
        element("path", {
          d: gearPath(), fill: "var(--accent, #b55b35)", "fill-opacity": side === "left" ? 0.2 : 0.1,
          stroke: "var(--accent, #b55b35)", "stroke-width": 2.3, "stroke-linejoin": "round"
        }),
        element("circle", {r: 91, fill: "none", stroke: "var(--line, #aab7be)", "stroke-width": 1.3}),
        element("circle", {r: 25, fill: "var(--ink, #192d3b)", stroke: "var(--line, #aab7be)", "stroke-width": 1.5}),
        element("line", {x1: 31, y1: 0, x2: 78, y2: 0, stroke: "var(--accent, #b55b35)", "stroke-width": 5, "stroke-linecap": "round"})
      );
      translated.append(rotating);
      svg.append(translated);
      return rotating;
    }
    const leftGear = gear(330, "left");
    const rightGear = gear(570, "right");
    svg.append(
      label("Roue 1", 330, 365, {"font-size": 32}),
      label("Roue 2", 570, 365, {"font-size": 32})
    );

    // A div is expected, but also accept an SVG placeholder supplied by the page.
    if (host.namespaceURI === NS && host.tagName.toLowerCase() === "svg") {
      [...svg.attributes].forEach(({name, value}) => host.setAttribute(name, value));
      host.replaceChildren(...svg.childNodes);
    } else {
      host.replaceChildren(svg);
    }

    function paintGears() {
      leftGear.setAttribute("transform", `rotate(${angle.toFixed(2)})`);
      // Half a tooth offsets the mating teeth. Equal angular speeds, opposite senses.
      rightGear.setAttribute("transform", `rotate(${(-angle + toothAngle / 2).toFixed(2)})`);
    }

    function renderMotionState() {
      motionButton.setAttribute("aria-pressed", String(running));
      motionButton.disabled = reducedMotion.matches;
      motionButton.textContent = reducedMotion.matches
        ? "Animation désactivée : mouvements réduits"
        : running ? "Arrêter l’animation" : "Animer le schéma · 15 s";
    }

    function stopMotion() {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      renderMotionState();
    }

    function tick(time) {
      if (!running || document.hidden || reducedMotion.matches) {
        stopMotion();
        return;
      }
      if (lastTime !== null) {
        const delta = Math.min(time - lastTime, 100);
        elapsed += delta;
        angle = (angle + baseAngularSpeed * ratio * delta / 1000) % 360;
        paintGears();
      }
      lastTime = time;
      if (elapsed >= duration) {
        stopMotion();
        return;
      }
      frame = window.requestAnimationFrame(tick);
    }

    motionButton.addEventListener("click", () => {
      if (running) {
        stopMotion();
      } else if (!reducedMotion.matches && !document.hidden) {
        running = true;
        elapsed = 0;
        lastTime = null;
        renderMotionState();
        frame = window.requestAnimationFrame(tick);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopMotion();
    });
    window.addEventListener("pagehide", stopMotion);
    const preferenceChanged = () => {
      if (reducedMotion.matches) stopMotion();
      renderMotionState();
    };
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", preferenceChanged);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(preferenceChanged);
    }

    speedControl.min = "0.5";
    speedControl.max = "2";
    speedControl.step = "0.25";
    speedControl.value = "1";
    const format = new Intl.NumberFormat("fr-FR", {maximumFractionDigits: 0});
    function updateRatio() {
      const parsed = Number(speedControl.value);
      ratio = Number.isFinite(parsed) ? Math.max(0.5, Math.min(2, parsed)) : 1;
      speedOutput.textContent = `${format.format(ratio * 100)} %`;
      torqueOutput.textContent = `${format.format(100 / ratio)} %`;
      speedControl.setAttribute("aria-valuetext", `${format.format(ratio * 100)} pour cent de la vitesse de référence illustrée`);
    }
    speedControl.addEventListener("input", updateRatio);

    const steps = {
      montage: "Montage : les roues à tester sont fixées sur leurs arbres. Les paliers maintiennent les axes et leur alignement. Dans ce dessin, deux engrenages extérieurs de même diamètre transmettent la rotation avec un rapport de 1:1 ; le montage réel peut avoir une géométrie différente.",
      reglage: "Réglage : l’essai se prépare avec les paramètres adaptés au montage : alignement, conditions d’engrènement, vitesse, charge et durée. Le curseur illustre un rapport hypothétique de poulies entre le moteur et les broches, à vitesse moteur constante. Hors pertes, un rapport de 2 donne 200 % de vitesse et 50 % de couple disponible. Ces valeurs relatives ne commandent pas le banc.",
      entrainement: "Entraînement : la machine entraînante fournit le mouvement. Son variateur commande la vitesse ; les poulies transmettent la rotation aux broches. Les poulies sont omises de ce schéma simplifié. Une dent entraîne la roue voisine, qui tourne en sens opposé. Le curseur change ensemble la vitesse illustrée des deux roues ; leur rapport reste de 1:1. Le repère A sert seulement à lire le schéma ; l’affectation de ce rôle à M1 ou M2 reste à confirmer.",
      charge: "Charge : la machine de charge oppose un couple à la rotation. Le pupitre porte un sélecteur GENE / FREIN ; son fonctionnement précis reste à confirmer. Cette résistance sollicite les contacts entre les dents, comme une charge que la transmission doit entraîner. Le couple relatif affiché reste une illustration à puissance constante. Le repère B sert seulement à lire le schéma ; l’affectation de ce rôle à M1 ou M2 reste à confirmer.",
      observation: "Observation : la vitesse, le couple et la durée situent les conditions d’essai. Comparer l’état des dents avant et après permet d’étudier leur usure. Les photos montrent l’équipement, mais elles ne donnent pas à elles seules une mesure de l’usure ni les paramètres réellement appliqués."
    };
    stepDescription.setAttribute("aria-live", "polite");
    stepDescription.setAttribute("aria-atomic", "true");
    function chooseStep(key) {
      if (!Object.prototype.hasOwnProperty.call(steps, key)) return;
      stepButtons.forEach((button) => {
        const selected = button.dataset.step === key;
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("is-active", selected);
      });
      stepDescription.textContent = steps[key];
      host.dataset.activeStep = key;
    }
    stepButtons.forEach((button) => {
      if (button.tagName.toLowerCase() === "button") button.type = "button";
      button.addEventListener("click", () => chooseStep(button.dataset.step));
    });

    paintGears();
    updateRatio();
    renderMotionState();
    chooseStep("montage");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExplorer, {once: true});
  } else {
    initializeExplorer();
  }
})();
