(function () {
  var svgNS = 'http://www.w3.org/2000/svg';

  function createBaseSvg(el) {
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', el.getAttribute('class') || '');
    return svg;
  }

  function appendShape(svg, tag, attrs) {
    var node = document.createElementNS(svgNS, tag);
    for (var key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        node.setAttribute(key, attrs[key]);
      }
    }
    svg.appendChild(node);
    return node;
  }

  function drawFallback(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '9' });
    appendShape(svg, 'line', { x1: '12', y1: '7', x2: '12', y2: '13' });
    appendShape(svg, 'line', { x1: '12', y1: '17', x2: '12.01', y2: '17' });
  }

  function drawHome(svg) {
    appendShape(svg, 'path', { d: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z' });
  }

  function drawMenu(svg) {
    appendShape(svg, 'line', { x1: '4', y1: '7', x2: '20', y2: '7' });
    appendShape(svg, 'line', { x1: '4', y1: '12', x2: '20', y2: '12' });
    appendShape(svg, 'line', { x1: '4', y1: '17', x2: '20', y2: '17' });
  }

  function drawSearch(svg) {
    appendShape(svg, 'circle', { cx: '11', cy: '11', r: '6' });
    appendShape(svg, 'line', { x1: '16', y1: '16', x2: '20', y2: '20' });
  }

  function drawSearchX(svg) {
    drawSearch(svg);
    appendShape(svg, 'line', { x1: '9', y1: '9', x2: '13', y2: '13' });
    appendShape(svg, 'line', { x1: '13', y1: '9', x2: '9', y2: '13' });
  }

  function drawArrowUp(svg) {
    appendShape(svg, 'line', { x1: '12', y1: '19', x2: '12', y2: '5' });
    appendShape(svg, 'polyline', { points: '5 12 12 5 19 12' });
  }

  function drawArrowLeft(svg) {
    appendShape(svg, 'line', { x1: '19', y1: '12', x2: '5', y2: '12' });
    appendShape(svg, 'polyline', { points: '12 5 5 12 12 19' });
  }

  function drawChevronRight(svg) {
    appendShape(svg, 'polyline', { points: '9 18 15 12 9 6' });
  }

  function drawList(svg) {
    appendShape(svg, 'line', { x1: '8', y1: '6', x2: '21', y2: '6' });
    appendShape(svg, 'line', { x1: '8', y1: '12', x2: '21', y2: '12' });
    appendShape(svg, 'line', { x1: '8', y1: '18', x2: '21', y2: '18' });
    appendShape(svg, 'circle', { cx: '4', cy: '6', r: '1' });
    appendShape(svg, 'circle', { cx: '4', cy: '12', r: '1' });
    appendShape(svg, 'circle', { cx: '4', cy: '18', r: '1' });
  }

  function drawStar(svg) {
    appendShape(svg, 'polygon', { points: '12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9' });
  }

  function drawHeart(svg) {
    appendShape(svg, 'path', { d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z' });
  }

  function drawCamera(svg) {
    appendShape(svg, 'rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' });
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '4' });
    appendShape(svg, 'circle', { cx: '18', cy: '8', r: '1' });
  }

  function drawRadio(svg) {
    appendShape(svg, 'rect', { x: '3', y: '8', width: '18', height: '13', rx: '2' });
    appendShape(svg, 'circle', { cx: '8', cy: '15', r: '3' });
    appendShape(svg, 'line', { x1: '16', y1: '13', x2: '19', y2: '13' });
    appendShape(svg, 'line', { x1: '16', y1: '17', x2: '19', y2: '17' });
    appendShape(svg, 'line', { x1: '9', y1: '4', x2: '3', y2: '8' });
  }

  function drawClapperboard(svg) {
    appendShape(svg, 'rect', { x: '3', y: '7', width: '18', height: '14', rx: '2' });
    appendShape(svg, 'polyline', { points: '3 7 9 3 15 7 21 3' });
  }

  function drawCat(svg) {
    appendShape(svg, 'path', { d: 'M4 6l2-3 3 3 3-3 3 3 2-3 2 5v7a7 7 0 0 1-7 7 7 7 0 0 1-7-7V6z' });
    appendShape(svg, 'circle', { cx: '10', cy: '11', r: '1' });
    appendShape(svg, 'circle', { cx: '14', cy: '11', r: '1' });
    appendShape(svg, 'path', { d: 'M9 15c1 1 2 1 3 1s2 0 3-1' });
  }

  function drawMoon(svg) {
    appendShape(svg, 'path', { d: 'M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z' });
  }

  function drawSun(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '4' });
    appendShape(svg, 'line', { x1: '12', y1: '1', x2: '12', y2: '3' });
    appendShape(svg, 'line', { x1: '12', y1: '21', x2: '12', y2: '23' });
    appendShape(svg, 'line', { x1: '4.22', y1: '4.22', x2: '5.64', y2: '5.64' });
    appendShape(svg, 'line', { x1: '18.36', y1: '18.36', x2: '19.78', y2: '19.78' });
    appendShape(svg, 'line', { x1: '1', y1: '12', x2: '3', y2: '12' });
    appendShape(svg, 'line', { x1: '21', y1: '12', x2: '23', y2: '12' });
    appendShape(svg, 'line', { x1: '4.22', y1: '19.78', x2: '5.64', y2: '18.36' });
    appendShape(svg, 'line', { x1: '18.36', y1: '5.64', x2: '19.78', y2: '4.22' });
  }

  function drawRocket(svg) {
    appendShape(svg, 'path', { d: 'M4 13l2-2h4l3-3 3 3-3 3v4l-2 2' });
    appendShape(svg, 'circle', { cx: '15', cy: '9', r: '1' });
    appendShape(svg, 'path', { d: 'M4 13s-1 4 3 4' });
  }

  function drawCalendar(svg) {
    appendShape(svg, 'rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' });
    appendShape(svg, 'line', { x1: '3', y1: '10', x2: '21', y2: '10' });
    appendShape(svg, 'line', { x1: '8', y1: '2', x2: '8', y2: '6' });
    appendShape(svg, 'line', { x1: '16', y1: '2', x2: '16', y2: '6' });
  }

  function drawFolder(svg) {
    appendShape(svg, 'path', { d: 'M3 7h5l2 3h11v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z' });
  }

  function drawEye(svg) {
    appendShape(svg, 'path', { d: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z' });
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '3' });
  }

  function drawClock(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '9' });
    appendShape(svg, 'polyline', { points: '12 7 12 12 16 14' });
  }

  function drawLink2(svg) {
    appendShape(svg, 'path', { d: 'M9 17H7a5 5 0 0 1 0-10h2' });
    appendShape(svg, 'path', { d: 'M15 7h2a5 5 0 0 1 0 10h-2' });
    appendShape(svg, 'line', { x1: '8', y1: '12', x2: '16', y2: '12' });
  }

  function drawMapPin(svg) {
    appendShape(svg, 'path', { d: 'M12 21s-6-5.14-6-10a6 6 0 0 1 12 0c0 4.86-6 10-6 10z' });
    appendShape(svg, 'circle', { cx: '12', cy: '11', r: '2' });
  }

  function drawLoader2(svg) {
    appendShape(svg, 'path', { d: 'M21 12a9 9 0 1 1-3-6.7' });
  }

  function drawLayoutGrid(svg) {
    appendShape(svg, 'rect', { x: '4', y: '4', width: '6', height: '6', rx: '1' });
    appendShape(svg, 'rect', { x: '14', y: '4', width: '6', height: '6', rx: '1' });
    appendShape(svg, 'rect', { x: '4', y: '14', width: '6', height: '6', rx: '1' });
    appendShape(svg, 'rect', { x: '14', y: '14', width: '6', height: '6', rx: '1' });
  }

  function drawTag(svg) {
    appendShape(svg, 'path', { d: 'M7 4h5l7 7-7 7-7-7z' });
    appendShape(svg, 'circle', { cx: '9.5', cy: '8.5', r: '1.3' });
  }

  function drawX(svg) {
    appendShape(svg, 'line', { x1: '18', y1: '6', x2: '6', y2: '18' });
    appendShape(svg, 'line', { x1: '6', y1: '6', x2: '18', y2: '18' });
  }

  function drawXCircle(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '9' });
    drawX(svg);
  }

  function drawFileJson(svg) {
    appendShape(svg, 'path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z' });
    appendShape(svg, 'polyline', { points: '14 2 14 8 20 8' });
    appendShape(svg, 'circle', { cx: '9', cy: '13', r: '1' });
    appendShape(svg, 'circle', { cx: '9', cy: '17', r: '1' });
    appendShape(svg, 'path', { d: 'M13 12h3v2h-3z' });
    appendShape(svg, 'path', { d: 'M13 16h3v2h-3z' });
  }

  function drawPlay(svg) {
    appendShape(svg, 'polygon', { points: '8 5 19 12 8 19 8 5' });
  }

  function drawMonitor(svg) {
    appendShape(svg, 'rect', { x: '3', y: '4', width: '18', height: '12', rx: '2' });
    appendShape(svg, 'line', { x1: '12', y1: '16', x2: '12', y2: '20' });
    appendShape(svg, 'line', { x1: '8', y1: '20', x2: '16', y2: '20' });
  }

  function drawActivity(svg) {
    appendShape(svg, 'polyline', { points: '3 12 6 12 9 4 15 20 18 12 21 12' });
  }

  function drawTerminal(svg) {
    appendShape(svg, 'rect', { x: '3', y: '4', width: '18', height: '16', rx: '2' });
    appendShape(svg, 'polyline', { points: '7 9 10 12 7 15' });
    appendShape(svg, 'line', { x1: '11', y1: '16', x2: '17', y2: '16' });
  }

  function drawGlobe(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '9' });
    appendShape(svg, 'line', { x1: '3', y1: '12', x2: '21', y2: '12' });
    appendShape(svg, 'path', { d: 'M12 3a14 14 0 0 1 0 18' });
    appendShape(svg, 'path', { d: 'M12 3a14 14 0 0 0 0 18' });
  }

  function drawSettings(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '3' });
    appendShape(svg, 'path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l0 0a2 2 0 1 1-2.83 2.83l0 0a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 0 1-4 0v0a1.65 1.65 0 0 0-1-1.51h0a1.65 1.65 0 0 0-1.82.33l0 0a2 2 0 1 1-2.83-2.83l0 0a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h0a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l0 0a2 2 0 1 1 2.83-2.83l0 0a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 4.6V4a2 2 0 0 1 4 0v0a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l0 0a2 2 0 1 1 2.83 2.83l0 0a1.65 1.65 0 0 0-.33 1.82h0A1.65 1.65 0 0 0 21.4 11H22a2 2 0 0 1 0 4h0a1.65 1.65 0 0 0-1.6 1z' });
  }

  function drawLock(svg) {
    appendShape(svg, 'rect', { x: '4', y: '11', width: '16', height: '11', rx: '2' });
    appendShape(svg, 'path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' });
    appendShape(svg, 'circle', { cx: '12', cy: '16', r: '1' });
  }

  function drawInfo(svg) {
    appendShape(svg, 'circle', { cx: '12', cy: '12', r: '9' });
    appendShape(svg, 'line', { x1: '12', y1: '10', x2: '12', y2: '16' });
    appendShape(svg, 'line', { x1: '12', y1: '8', x2: '12.01', y2: '8' });
  }

  function createIconElement(el) {
    var svg = createBaseSvg(el);
    var name = (el.getAttribute('data-lucide') || '').toLowerCase();

    switch (name) {
      case 'home':
        drawHome(svg);
        break;
      case 'menu':
        drawMenu(svg);
        break;
      case 'search':
        drawSearch(svg);
        break;
      case 'search-x':
        drawSearchX(svg);
        break;
      case 'arrow-up':
        drawArrowUp(svg);
        break;
      case 'arrow-left':
        drawArrowLeft(svg);
        break;
      case 'chevron-right':
        drawChevronRight(svg);
        break;
      case 'list':
        drawList(svg);
        break;
      case 'star':
        drawStar(svg);
        break;
      case 'heart':
        drawHeart(svg);
        break;
      case 'camera':
        drawCamera(svg);
        break;
      case 'radio':
        drawRadio(svg);
        break;
      case 'clapperboard':
        drawClapperboard(svg);
        break;
      case 'cat':
        drawCat(svg);
        break;
      case 'moon':
        drawMoon(svg);
        break;
      case 'sun':
        drawSun(svg);
        break;
      case 'rocket':
        drawRocket(svg);
        break;
      case 'calendar':
        drawCalendar(svg);
        break;
      case 'folder':
        drawFolder(svg);
        break;
      case 'eye':
        drawEye(svg);
        break;
      case 'clock':
        drawClock(svg);
        break;
      case 'link-2':
        drawLink2(svg);
        break;
      case 'map-pin':
        drawMapPin(svg);
        break;
      case 'loader-2':
        drawLoader2(svg);
        break;
      case 'layout-grid':
        drawLayoutGrid(svg);
        break;
      case 'grid':
        drawLayoutGrid(svg);
        break;
      case 'x':
        drawX(svg);
        break;
      case 'x-circle':
        drawXCircle(svg);
        break;
      case 'file-json':
        drawFileJson(svg);
        break;
      case 'play':
        drawPlay(svg);
        break;
      case 'monitor':
        drawMonitor(svg);
        break;
      case 'activity':
        drawActivity(svg);
        break;
      case 'terminal':
        drawTerminal(svg);
        break;
      case 'globe':
        drawGlobe(svg);
        break;
      case 'settings':
        drawSettings(svg);
        break;
      case 'lock':
        drawLock(svg);
        break;
      case 'info':
        drawInfo(svg);
        break;
      case 'tag':
        drawTag(svg);
        break;
      default:
        drawFallback(svg);
        break;
    }

    return svg;
  }

  function createIcons(root) {
    var scope = root || document;
    var elements = scope.querySelectorAll('[data-lucide]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.__lucide_processed) continue;
      var icon = createIconElement(el);
      icon.__lucide_processed = true;
      el.parentNode.replaceChild(icon, el);
    }
  }

  if (!window.lucide) {
    window.lucide = { createIcons: createIcons };
  } else if (!window.lucide.createIcons) {
    window.lucide.createIcons = createIcons;
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createIcons();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      createIcons();
    });
  }
})();
