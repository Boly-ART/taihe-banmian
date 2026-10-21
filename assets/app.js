/* 太和板面 · 页面交互
   - 滚动进度条 / 顶栏状态
   - 导航高亮（IntersectionObserver）
   - 移动端菜单
   - 步骤勾选（localStorage 记忆）
   - 复制备料清单
*/
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var progressBar = document.getElementById('progressBar');
  var nav = document.getElementById('siteNav');
  var navToggle = document.getElementById('navToggle');
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var STORAGE_KEY = 'taihe-banmian:steps';

  /* ── 滚动进度与顶栏 ─────────────────────────── */
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progressBar) {
      progressBar.style.width = pct.toFixed(2) + '%';
    }
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── 导航高亮 ───────────────────────────────── */
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href');
      return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var active = '#' + entry.target.id;
        navLinks.forEach(function (link) {
          var isActive = link.getAttribute('href') === active;
          link.classList.toggle('is-active', isActive);
          if (isActive) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ── 移动端菜单 ─────────────────────────────── */
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    navLinks.forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        navToggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });
  }

  /* ── 步骤勾选 ───────────────────────────────── */
  var boxes = Array.prototype.slice.call(
    document.querySelectorAll('.step-check input[data-step]')
  );
  var doneCount = document.getElementById('doneCount');
  var doneBar = document.getElementById('doneBar');

  function readState() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* 隐私模式或 file:// 限制下忽略，不影响勾选 */
    }
  }

  function syncSteps() {
    var done = 0;
    boxes.forEach(function (box) {
      var step = box.closest('.step');
      if (box.checked) {
        done += 1;
        if (step) step.classList.add('is-done');
      } else if (step) {
        step.classList.remove('is-done');
      }
    });
    if (doneCount) doneCount.textContent = String(done);
    if (doneBar) {
      doneBar.style.width = boxes.length ? (done / boxes.length) * 100 + '%' : '0%';
    }
  }

  if (boxes.length) {
    var saved = readState();
    boxes.forEach(function (box) {
      box.checked = Boolean(saved[box.dataset.step]);
    });
    syncSteps();

    boxes.forEach(function (box) {
      box.addEventListener('change', function () {
        var state = readState();
        state[box.dataset.step] = box.checked;
        saveState(state);
        syncSteps();
      });
    });
  }

  /* ── 复制备料清单 ───────────────────────────── */
  var copyBtn = document.getElementById('copyList');
  var copyStatus = document.getElementById('copyStatus');

  function listText() {
    var lines = ['太和板面 · 备料清单（3–4 人份）', ''];
    var cards = document.querySelectorAll('.ing-card');
    Array.prototype.forEach.call(cards, function (card) {
      var title = card.querySelector('h3');
      lines.push('【' + (title ? title.textContent.trim() : '') + '】');
      Array.prototype.forEach.call(card.querySelectorAll('li'), function (li) {
        var nameEl = li.querySelector('span');
        var amountEl = li.querySelector('b');
        var name = '';
        if (nameEl) {
          // 只取 span 的直属文本，避免把 <small> 的说明并进名称
          var first = nameEl.childNodes[0];
          name = (first ? first.textContent : nameEl.textContent).trim();
        }
        var amount = amountEl ? amountEl.textContent.trim() : '';
        lines.push('- ' + name + '：' + amount);
      });
      lines.push('');
    });
    lines.push('（总时长约 90 分钟，饧面与炖羊肉可同时进行）');
    return lines.join('\n');
  }

  function notify(message) {
    if (!copyStatus) return;
    copyStatus.textContent = message;
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(function () {
      copyStatus.textContent = '';
    }, 2600);
  }

  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = listText();
      var done = function (ok) {
        notify(ok ? '已复制，可直接粘到备忘录或聊天里' : '复制失败，请手动选中清单');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          done(true);
        }).catch(function () {
          done(legacyCopy(text));
        });
      } else {
        done(legacyCopy(text));
      }
    });
  }
})();
