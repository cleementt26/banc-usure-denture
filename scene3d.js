/* Vue pédagogique autonome. Coordonnées arbitraires, aucune mesure du banc. */
(() => {
  "use strict";

  function initialize() {
    const canvas = document.getElementById("bench-3d");
    if (!canvas) return;
    const description = document.getElementById("scene-description");
    const motionButton = document.getElementById("scene-motion");
    const resetButton = document.getElementById("scene-reset");
    const explodedControl = document.getElementById("scene-exploded");
    const viewButtons = [...document.querySelectorAll("[data-scene-view]")];
    const partButtons = [...document.querySelectorAll("[data-scene-part]")];
    const context = canvas.getContext("2d", {alpha: false});
    if (!context) {
      if (description) description.textContent = "Vue schématique : une machine entraînante et une machine de charge sont reliées par deux transmissions à courroies à deux broches parallèles. Les roues d’essai se rencontrent entre les broches. La vue 3D est indisponible dans ce navigateur.";
      if (motionButton) motionButton.disabled = true;
      return;
    }

    const colors = {
      paper: "#f4f1e8", ink: "#222520", accent: "#bcb045",
      steel: "#71817c", line: "#c4c7bc", belt: "#b5a66d"
    };
    const presets = {
      ensemble: {yaw: 0.66, pitch: 0.43, distance: 10.2, focal: 1.42, centerY: 0.43, target: [-0.45, 0, 0.05]},
      transmissions: {yaw: 2.47, pitch: 0.28, distance: 7.8, focal: 1.14, centerY: 0.5, target: [-1.6, 0, 0.1]},
      dentures: {yaw: 0.18, pitch: 0.20, distance: 5.6, focal: 1.14, centerY: 0.44, target: [1.55, 0, 0.84]}
    };
    const text = {
      moteurs: "Deux machines électriques sont dessinées. La machine entraînante A fournit le mouvement ; la machine B peut servir de charge. A et B sont des repères pédagogiques, sans affectation aux moteurs M1 et M2 du banc. Le réglage réel dépend des variateurs et de leurs connexions.",
      transmissions: "Deux courroies relient les poulies des machines aux poulies des broches. Elles transmettent la rotation sans placer les moteurs dans la zone d’essai. Le rapport des poulies adapte la vitesse et le couple disponibles. Les diamètres et la tension dessinés ne sont pas des mesures du banc.",
      broches: "Chaque broche tourne dans des paliers qui guident son arbre. Les roues d’essai sont portées par ces deux broches à axes parallèles. Leur position relative permet de préparer le contact entre les dentures. Les fixations et réglages réels sont simplifiés ici.",
      contact: "Les deux roues d’essai extérieures sont dans un même plan et leurs axes sont parallèles. Une dent entraîne la roue voisine en sens opposé. Les deux roues du dessin sont identiques : leur rapport est de 1:1. La répétition des contacts sous charge permet d’étudier leur usure ; le profil dessiné n’est pas une denture de fabrication.",
      charge: "La machine de charge B oppose un couple à la rotation. Les commandes photographiées du banc mentionnent un mode génératrice ou frein. Cet effort sollicite les dentures. Le dessin montre le principe ; il ne confirme ni l’affectation de cette fonction à M1 ou M2, ni le fonctionnement électrique actuel."
    };
    const summary = "Deux transmissions à courroies relient deux machines à deux broches parallèles. Les roues d’essai s’engrènent entre les broches. Glisse sur la vue, utilise les flèches du clavier ou choisis un angle et un composant. A et B sont des repères de principe ; aucune cote ou mesure du banc n’est représentée.";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let camera = {...presets.ensemble, target: [...presets.ensemble.target]};
    let activeView = "ensemble";
    let activePart = null;
    let exploded = Boolean(explodedControl && explodedControl.checked);
    let width = 600;
    let height = 400;
    let dpr = 1;
    let frame = 0;
    let running = false;
    let lastTime = null;
    let elapsed = 0;
    let rotation = 0;
    let pointer = null;
    let renderedPolygons = [];

    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Vue 3D schématique du banc. Glisser ou utiliser les touches fléchées pour tourner ; touche Origine pour réinitialiser. Les boutons voisins permettent de sélectionner un composant.");
    if (description) {
      canvas.setAttribute("aria-describedby", "scene-description");
      description.setAttribute("aria-live", "polite");
      description.setAttribute("aria-atomic", "true");
    }
    canvas.style.touchAction = "none";

    const add = (a, b) => a.map((v, i) => v + b[i]);
    const subtract = (a, b) => a.map((v, i) => v - b[i]);
    const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const normalize = (a) => {
      const length = Math.hypot(...a) || 1;
      return a.map((v) => v / length);
    };
    const clamp = (value, lower, upper) => Math.max(lower, Math.min(upper, value));

    function updateDescription() {
      if (description) description.textContent = (text[activePart] || summary) + (exploded ? " Vue éclatée : les groupes sont écartés pour les distinguer. Leur éloignement n’indique ni une cote ni une procédure de démontage." : "");
    }

    function updateButtons() {
      viewButtons.forEach((button) => {
        const selected = button.dataset.sceneView === activeView;
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("is-active", selected);
      });
      partButtons.forEach((button) => {
        const selected = button.dataset.scenePart === activePart;
        button.setAttribute("aria-pressed", String(selected));
        button.classList.toggle("is-active", selected);
      });
      if (motionButton) {
        motionButton.setAttribute("aria-pressed", String(running));
        motionButton.disabled = media.matches;
        motionButton.textContent = media.matches ? "Animation désactivée : mouvements réduits" : running ? "Arrêter l’animation" : "Animer · 15 s";
      }
    }

    function requestDraw() {
      if (!frame && !document.hidden) frame = window.requestAnimationFrame(drawFrame);
    }

    function stopMotion() {
      running = false;
      lastTime = null;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      updateButtons();
      requestDraw();
    }

    function toggleMotion() {
      if (running) {
        stopMotion();
      } else if (!media.matches && !document.hidden) {
        running = true;
        lastTime = null;
        elapsed = 0;
        updateButtons();
        requestDraw();
      }
    }

    function selectPart(part) {
      if (!Object.prototype.hasOwnProperty.call(text, part)) return;
      activePart = part;
      updateDescription();
      updateButtons();
      requestDraw();
    }

    function setView(view) {
      if (!presets[view]) return;
      activeView = view;
      camera = {...presets[view], target: [...presets[view].target]};
      updateButtons();
      requestDraw();
    }

    function reset() {
      stopMotion();
      rotation = 0;
      activePart = null;
      exploded = false;
      if (explodedControl) explodedControl.checked = false;
      setView("ensemble");
      updateDescription();
      updateButtons();
      requestDraw();
    }

    function shade(color, normal, selected) {
      const source = selected ? colors.accent : color;
      const light = normalize([0.35, -0.55, 0.9]);
      const factor = normal ? 0.73 + 0.28 * Math.abs(dot(normal, light)) : 1;
      return `rgb(${[1, 3, 5].map((index) => Math.round(parseInt(source.slice(index, index + 2), 16) * factor)).join(",")})`;
    }

    function makeScene() {
      const scene = [];
      function polygon(points, color, parts = [], outline = true) {
        const normal = normalize(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
        scene.push({kind: "polygon", points, color, parts, outline, normal});
      }
      function line(points, color, parts = [], lineWidth = 2, dashed = false) {
        scene.push({kind: "line", points, color, parts, lineWidth, dashed});
      }
      function box(center, size, color, parts = []) {
        const v = [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ].map((sign) => center.map((value, index) => value + sign[index] * size[index] / 2));
        [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]].forEach((indices) => polygon(indices.map((index) => v[index]), color, parts));
      }
      function cylinder(x1, x2, y, z, radius, color, parts = [], count = 24, phase = 0) {
        const circle = (x) => Array.from({length: count}, (_, index) => {
          const theta = index * Math.PI * 2 / count + phase;
          return [x, y + radius * Math.cos(theta), z + radius * Math.sin(theta)];
        });
        const a = circle(x1), b = circle(x2);
        polygon([...a].reverse(), color, parts);
        polygon(b, color, parts);
        a.forEach((point, index) => {
          const next = (index + 1) % count;
          polygon([point, a[next], b[next], b[index]], color, parts, false);
        });
      }
      function ring(x1, x2, y, z, outer, inner, color, parts = [], count = 24) {
        for (let i = 0; i < count; i += 1) {
          const a = i * Math.PI * 2 / count, b = (i + 1) * Math.PI * 2 / count;
          const point = (x, r, theta) => [x, y + r * Math.cos(theta), z + r * Math.sin(theta)];
          [x1, x2].forEach((x) => polygon([point(x, outer, a), point(x, outer, b), point(x, inner, b), point(x, inner, a)], color, parts, false));
          polygon([point(x1, outer, a), point(x1, outer, b), point(x2, outer, b), point(x2, outer, a)], color, parts, false);
        }
      }
      function gear(centerX, y, phase) {
        const outline = [];
        for (let tooth = 0; tooth < 24; tooth += 1) {
          [[-0.5, 0.795], [-0.31, 0.795], [-0.12, 0.90], [0.12, 0.90], [0.31, 0.795], [0.5, 0.795]].forEach(([fraction, radius]) => {
            const theta = (tooth + fraction) * Math.PI * 2 / 24 + phase;
            outline.push([radius * Math.cos(theta), radius * Math.sin(theta)]);
          });
        }
        const a = outline.map(([dy, dz]) => [centerX - 0.08, y + dy, 0.84 + dz]);
        const b = outline.map(([dy, dz]) => [centerX + 0.08, y + dy, 0.84 + dz]);
        polygon([...a].reverse(), colors.steel, ["contact"]);
        polygon(b, colors.steel, ["contact"]);
        a.forEach((point, index) => {
          const next = (index + 1) % a.length;
          polygon([point, a[next], b[next], b[index]], colors.steel, ["contact"], false);
        });
        cylinder(centerX - 0.12, centerX + 0.13, y, 0.84, 0.24, colors.ink, ["contact", "broches"], 20);
        // A radial mark makes opposite wheel rotations visible without fake telemetry.
        line([[centerX + 0.135, y + 0.32 * Math.cos(phase), 0.84 + 0.32 * Math.sin(phase)], [centerX + 0.135, y + 0.65 * Math.cos(phase), 0.84 + 0.65 * Math.sin(phase)]], colors.accent, ["contact"], 3);
      }

      box([-0.5, 0, -1.05], [6.2, 3.7, 0.18], colors.line);
      [-1.5, 1.5].forEach((y) => box([-0.5, y, -0.91], [5.6, 0.13, 0.12], colors.steel));
      const motorShift = exploded ? -0.7 : 0;
      const gearShift = exploded ? 0.7 : 0;
      [-0.86, 0.86].forEach((y, index) => {
        const phase = index === 0 ? rotation : -rotation + Math.PI / 24;
        const motorParts = index === 0 ? ["moteurs"] : ["moteurs", "charge"];
        const motorStart = -3.05 + motorShift, motorEnd = -1.90 + motorShift;
        const motorZ = -0.38;
        box([-2.45 + motorShift, y, -0.82], [1.18, 0.9, 0.25], colors.line, motorParts);
        cylinder(motorStart, motorEnd, y, motorZ, 0.38, colors.ink, motorParts, 28);
        cylinder(motorStart - 0.06, motorStart + 0.06, y, motorZ, 0.40, colors.steel, motorParts, 28);
        cylinder(motorEnd - 0.04, motorEnd + 0.05, y, motorZ, 0.39, colors.steel, motorParts, 28);
        cylinder(motorEnd, -1.43 + motorShift, y, motorZ, 0.095, colors.steel, motorParts, 16);
        [-2.95, -2.80, -2.65].forEach((x) => ring(x + motorShift, x + motorShift + 0.035, y, motorZ, 0.389, 0.377, colors.steel, motorParts, 20));

        cylinder(-1.60, 1.88, y, 0.84, 0.095, colors.steel, ["broches"], 16);
        [-0.75, 0.78].forEach((x) => {
          box([x, y, -0.15], [0.32, 0.51, 1.46], colors.line, ["broches"]);
          ring(x - 0.17, x + 0.17, y, 0.84, 0.265, 0.102, colors.steel, ["broches"], 20);
          box([x, y, -0.82], [0.65, 0.70, 0.12], colors.steel, ["broches"]);
        });

        // Separate lower/upper pulley centers and an actual loop in the YZ plane.
        const pulleyX = -1.53;
        const upperRadius = 0.39, lowerRadius = 0.39;
        cylinder(pulleyX - 0.085, pulleyX + 0.085, y, 0.84, upperRadius, colors.steel, ["transmissions"], 32, phase);
        cylinder(pulleyX - 0.085 + motorShift, pulleyX + 0.085 + motorShift, y, motorZ, lowerRadius, colors.steel, ["transmissions"], 32, phase);
        // In exploded mode the lower group moves rearward; the belt is shown detached.
        const beltX = pulleyX + (exploded ? -0.35 : 0);
        const belt = [];
        const r = 0.408;
        for (let i = 0; i <= 24; i += 1) {
          const theta = i * Math.PI / 24;
          belt.push([beltX, y + r * Math.cos(theta), 0.84 + r * Math.sin(theta)]);
        }
        for (let i = 0; i <= 24; i += 1) {
          const theta = Math.PI + i * Math.PI / 24;
          belt.push([beltX, y + r * Math.cos(theta), motorZ + r * Math.sin(theta)]);
        }
        const back = belt.map(([x, py, pz]) => [x - 0.11, py, pz]);
        belt.forEach((point, i) => {
          const next = (i + 1) % belt.length;
          polygon([point, belt[next], back[next], back[i]], colors.belt, ["transmissions"], false);
        });
        line([...belt, belt[0]], colors.belt, ["transmissions"], 3);
        [0.84, motorZ].forEach((z, pulleyIndex) => {
          const x = pulleyX + 0.095 + (pulleyIndex === 1 ? motorShift : 0);
          line([[x, y, z], [x, y + 0.28 * Math.cos(phase), z + 0.28 * Math.sin(phase)]], colors.ink, ["transmissions"], 2);
        });

        gear(1.55 + gearShift, y, phase);
        if (exploded) {
          line([[1.55, y, 0.84], [1.55 + gearShift, y, 0.84]], colors.line, [], 1, true);
          line([[-1.53 + motorShift, y, motorZ], [-1.53, y, motorZ]], colors.line, [], 1, true);
        }
        scene.push({kind: "label", points: [[-2.45 + motorShift, y, 0.25]], label: index === 0 ? "A" : "B", parts: motorParts});
      });
      return scene;
    }

    function projectScene(scene) {
      const radius = camera.distance + (exploded && activeView === "ensemble" ? 1 : 0);
      const orbit = [Math.cos(camera.yaw) * Math.cos(camera.pitch), Math.sin(camera.yaw) * Math.cos(camera.pitch), Math.sin(camera.pitch)];
      const eye = add(camera.target, orbit.map((value) => value * radius));
      const forward = normalize(subtract(camera.target, eye));
      const right = normalize(cross(forward, [0, 0, 1]));
      const up = normalize(cross(right, forward));
      const aspectFit = Math.min(1, width / height * 0.90);
      const focal = Math.min(width, height) * camera.focal * aspectFit;
      const project = (point) => {
        const relative = subtract(point, eye);
        const depth = dot(relative, forward);
        return {x: width / 2 + focal * dot(relative, right) / depth, y: height * camera.centerY - focal * dot(relative, up) / depth, depth};
      };
      return scene.map((shape) => {
        const points = shape.points.map(project);
        return {...shape, projected: points, depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length};
      }).filter((shape) => shape.projected.every((point) => point.depth > 0.1)).sort((a, b) => b.depth - a.depth);
    }

    function render() {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = colors.paper;
      context.fillRect(0, 0, width, height);
      renderedPolygons = [];
      const shapes = projectScene(makeScene());
      for (const shape of shapes) {
        const selected = Boolean(activePart && shape.parts.includes(activePart));
        const points = shape.projected;
        if (shape.kind === "label") continue;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        if (shape.kind === "polygon") {
          context.closePath();
          context.fillStyle = shade(shape.color, shape.normal, selected);
          context.fill();
          if (shape.outline) {
            context.strokeStyle = selected ? "#766b0e" : "rgba(34,37,32,0.28)";
            context.lineWidth = selected ? 1.15 : 0.65;
            context.stroke();
          }
          renderedPolygons.push({points, parts: shape.parts});
        } else {
          context.strokeStyle = selected ? colors.accent : shape.color;
          context.lineWidth = shape.lineWidth;
          context.setLineDash(shape.dashed ? [4, 4] : []);
          context.stroke();
          context.setLineDash([]);
        }
      }
      // Labels remain legible independently of the projection scale.
      shapes.filter((shape) => shape.kind === "label").forEach((shape) => {
        const {x, y} = shape.projected[0];
        const selected = Boolean(activePart && shape.parts.includes(activePart));
        context.fillStyle = selected ? colors.accent : colors.paper;
        context.fillRect(x - 13, y - 14, 26, 27);
        context.strokeStyle = colors.ink;
        context.lineWidth = 1;
        context.strokeRect(x - 13, y - 14, 26, 27);
        context.fillStyle = colors.ink;
        context.font = "600 15px system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(shape.label, x, y);
      });
      context.fillStyle = "#66695f";
      context.font = "12px system-ui, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "bottom";
      context.fillText("Schéma de principe · sans cotes exactes", 14, height - 12);
    }

    function drawFrame(time) {
      frame = 0;
      if (running && !document.hidden && !media.matches) {
        if (lastTime !== null) {
          const delta = Math.max(0, time - lastTime);
          elapsed += delta;
          rotation = (rotation + Math.min(delta, 100) / 1000 * 0.42) % (Math.PI * 2);
        }
        lastTime = time;
        if (elapsed >= 15000) {
          running = false;
          lastTime = null;
          updateButtons();
        }
      } else if (running) {
        running = false;
        lastTime = null;
        updateButtons();
      }
      render();
      if (running) requestDraw();
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(240, Math.round(bounds.width || canvas.clientWidth || 600));
      height = Math.max(240, Math.round(bounds.height || canvas.clientHeight || 400));
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const nextWidth = Math.round(width * dpr), nextHeight = Math.round(height * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      requestDraw();
    }

    function rotate(deltaYaw, deltaPitch) {
      camera.yaw += deltaYaw;
      camera.pitch = clamp(camera.pitch + deltaPitch, -0.15, 1.12);
      activeView = null;
      updateButtons();
      requestDraw();
    }

    function inside(point, polygon) {
      let result = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result;
      }
      return result;
    }

    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.isPrimary === false) return;
      pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY};
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
      canvas.focus({preventScroll: true});
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      rotate((event.clientX - pointer.x) * -0.009, (event.clientY - pointer.y) * 0.007);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (event.cancelable) event.preventDefault();
    });
    canvas.addEventListener("pointerup", (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < 5) {
        const bounds = canvas.getBoundingClientRect();
        const point = {x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * height / bounds.height};
        const hit = [...renderedPolygons].reverse().find((shape) => inside(point, shape.points));
        if (hit && hit.parts.length) selectPart(hit.parts.includes("charge") ? "charge" : hit.parts[0]);
      }
      pointer = null;
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointercancel", () => { pointer = null; });
    canvas.addEventListener("lostpointercapture", () => { pointer = null; });
    canvas.addEventListener("keydown", (event) => {
      const controls = {ArrowLeft: [-0.10, 0], ArrowRight: [0.10, 0], ArrowUp: [0, 0.07], ArrowDown: [0, -0.07]};
      if (controls[event.key]) {
        event.preventDefault();
        rotate(...controls[event.key]);
      } else if (event.key === "Home") {
        event.preventDefault();
        reset();
      }
    });

    viewButtons.forEach((button) => {
      button.type = "button";
      button.addEventListener("click", () => setView(button.dataset.sceneView));
    });
    partButtons.forEach((button) => {
      button.type = "button";
      button.addEventListener("click", () => selectPart(button.dataset.scenePart));
    });
    if (motionButton) {
      motionButton.type = "button";
      motionButton.addEventListener("click", toggleMotion);
    }
    if (resetButton) {
      resetButton.type = "button";
      resetButton.addEventListener("click", reset);
    }
    if (explodedControl) explodedControl.addEventListener("change", () => {
      exploded = explodedControl.checked;
      updateDescription();
      requestDraw();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopMotion();
      else requestDraw();
    });
    window.addEventListener("pagehide", stopMotion);
    const preferenceChanged = () => {
      if (media.matches) stopMotion();
      updateButtons();
    };
    if (media.addEventListener) media.addEventListener("change", preferenceChanged);
    else if (media.addListener) media.addListener(preferenceChanged);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener("resize", resize);
    updateDescription();
    updateButtons();
    resize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once: true});
  else initialize();
})();
