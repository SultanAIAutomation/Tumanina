function safeGetStorage(key, defaultValue) {
    try {
        var v = localStorage.getItem(key);
        return v ? JSON.parse(v) : defaultValue;
    } catch (e) { return defaultValue; }
}
function safeSetStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

var iconsMap = {
    sun: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    moon: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    prayer: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    treasures: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    sleep: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M2 12h3"/><path d="M2 17h5"/></svg>',
    wake: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 2v3"/><path d="m4.9 6.9 2.1 2.1"/><path d="m17 9 2.1-2.1"/><path d="M2 18h20"/><path d="M6 18a6 6 0 0 1 12 0"/></svg>'
};

var currentSection = null;
var activeIndex = 0;
var activeZikrCount = 0;
var progressData = safeGetStorage('azkar_user_progress', {});
var fontSizes = [19, 23, 27];
var currentFontSize = safeGetStorage('azkar_font_size', 19);
if (fontSizes.indexOf(currentFontSize) === -1) currentFontSize = 19;

/* ---- إعادة الضبط اليومي + عداد الأيام المتتالية (streak) ---- */
function localDateStr(d) {
    d = d || new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
}
function daysBetween(fromStr, toStr) {
    var a = new Date(fromStr + 'T00:00:00');
    var b = new Date(toStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
}

var todayStr = localDateStr();
var streakData = safeGetStorage('azkar_streak', { count: 0, lastDayCounted: null });

function handleDailyReset() {
    try {
        var lastOpen = safeGetStorage('azkar_last_open_date', null);
        if (lastOpen !== todayStr) {
            if (lastOpen) {
                progressData = {};
                safeSetStorage('azkar_user_progress', progressData);
            }
            safeSetStorage('azkar_last_open_date', todayStr);
        }
        // انقطاع السلسلة: إذا مرّ يوم كامل دون إتمام الصباح والمساء
        if (streakData.lastDayCounted && daysBetween(streakData.lastDayCounted, todayStr) >= 2) {
            streakData.count = 0;
            safeSetStorage('azkar_streak', streakData);
        }
    } catch (e) {}
}

function maybeAdvanceStreak() {
    try {
        var morningDone = progressData['morning'] && progressData['morning'].finished;
        var eveningDone = progressData['evening'] && progressData['evening'].finished;
        if (!morningDone || !eveningDone) return;
        if (streakData.lastDayCounted === todayStr) return;
        if (streakData.lastDayCounted && daysBetween(streakData.lastDayCounted, todayStr) === 1) {
            streakData.count = (streakData.count || 0) + 1;
        } else {
            streakData.count = 1;
        }
        streakData.lastDayCounted = todayStr;
        safeSetStorage('azkar_streak', streakData);
        renderStreak();
    } catch (e) {}
}

function renderStreak() {
    try {
        var el = document.getElementById('streak-count');
        if (el) el.innerText = (streakData.count || 0);
    } catch (e) {}
}

function initDashboard() {
    try {
        var grid = document.getElementById('sections-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        var r = 12;
        var circum = 2 * Math.PI * r;

        for (var i = 0; i < azkarData.length; i++) {
            var section = azkarData[i];
            var totalItems = section.items.length;
            var savedIndex = (progressData[section.id] && progressData[section.id].currentIndex) || 0;
            var isFinished = (progressData[section.id] && progressData[section.id].finished) || false;
            
            if (savedIndex > totalItems) savedIndex = totalItems;

            var percent, displayNum;
            if (isFinished) {
                percent = 100;
                displayNum = totalItems;
            } else {
                percent = Math.round((savedIndex / totalItems) * 100);
                if (percent > 100) percent = 100;
                displayNum = Math.min(savedIndex + 1, totalItems);
            }

            var offset = circum - (percent / 100) * circum;
            var btnLabel = isFinished ? 'إعادة' : (savedIndex > 0 ? 'متابعة' : 'ابدأ');

            var card = document.createElement('div');
            card.className = "card";
            card.setAttribute('onclick', "startSection('" + section.id + "')");

            card.innerHTML = 
                '<div class="card-right">' +
                    '<div class="card-icon">' + (iconsMap[section.iconKey] || '') + '</div>' +
                    '<div>' +
                        '<div class="card-title">' + section.title + '</div>' +
                        '<div class="card-desc">الذكر ' + displayNum + ' من ' + totalItems + ' (%' + percent + ')</div>' +
                    '</div>' +
                '</div>' +
                '<div class="card-left">' +
                    '<svg class="progress-ring-svg">' +
                        '<circle class="progress-ring-circle-bg" cx="16" cy="16" r="' + r + '"/>' +
                        '<circle class="progress-ring-circle" cx="16" cy="16" r="' + r + '" stroke-dasharray="' + circum + '" stroke-dashoffset="' + offset + '"/>' +
                    '</svg>' +
                    '<button class="btn-action">' + btnLabel + '</button>' +
                '</div>';

            grid.appendChild(card);
        }
    } catch (e) {}
}

function startSection(sectionId) {
    try {
        currentSection = null;
        for (var i = 0; i < azkarData.length; i++) {
            if (azkarData[i].id === sectionId) {
                currentSection = azkarData[i];
                break;
            }
        }
        if (!currentSection) return;

        if (!progressData[sectionId]) {
            progressData[sectionId] = { currentIndex: 0, currentZikrCount: 0, finished: false };
        }
        if (progressData[sectionId].finished) {
            progressData[sectionId].currentIndex = 0;
            progressData[sectionId].currentZikrCount = 0;
            progressData[sectionId].finished = false;
        }

        activeIndex = progressData[sectionId].currentIndex || 0;
        activeZikrCount = progressData[sectionId].currentZikrCount || 0;

        if (activeIndex >= currentSection.items.length) {
            activeIndex = 0;
            activeZikrCount = 0;
            saveProgress();
        }

        document.getElementById('dashboard-view').classList.add('hidden');
        document.getElementById('completion-view').classList.add('hidden');
        document.getElementById('zikr-view').classList.remove('hidden');
        
        renderZikr();
    } catch (e) {}
}

// حذف علامات الوقف/الإقلاب الزخرفية من النص المعروض فقط (نطاق أضيق بعد المراجعة؛ لا تُحذف حروف المدّ الصغيرة، ولا يُعدَّل مصدر البيانات)
function stripQuranicSmallMarks(text) {
    return text
        .replace(/[\u06D6\u06D7\u06DA\u06E2]/g, '')
        .replace(/ {2,}/g, ' ');
}

function renderZikr() {
    try {
        if (!currentSection || !currentSection.items) return;
        if (activeIndex >= currentSection.items.length) {
            finishSection();
            return;
        }

        var currentZikr = currentSection.items[activeIndex];
        var zikrText = document.getElementById('zikr-text');
        var hasUthmaniText = /[ٱۥۦ۟ۚۗۖ]/.test(currentZikr.text);
        zikrText.classList.toggle('quran-text', hasUthmaniText);
        zikrText.textContent = hasUthmaniText ? stripQuranicSmallMarks(currentZikr.text) : currentZikr.text;
        applyFontSize();
        
        var benefitBox = document.getElementById('zikr-benefit');
        if (currentZikr.benefit) {
            benefitBox.innerText = currentZikr.benefit;
            benefitBox.classList.remove('hidden');
        } else {
            benefitBox.classList.add('hidden');
        }

        var noteBox = document.getElementById('zikr-note');
        if (currentZikr.note) {
            noteBox.innerText = currentZikr.note;
            noteBox.classList.remove('hidden');
        } else {
            noteBox.classList.add('hidden');
        }

        var total = currentSection.items.length;
        document.getElementById('progress-text').innerText = 'الذكر ' + (activeIndex + 1) + ' من ' + total;
        var barPercent = Math.round((activeIndex / total) * 100);
        document.getElementById('progress-bar').style.width = barPercent + '%';

        document.getElementById('counter-current').innerText = activeZikrCount;
        document.getElementById('counter-target').innerText = currentZikr.count;

        var previousBtn = document.getElementById('previous-btn');
        if (previousBtn) {
            var isFirstZikr = activeIndex === 0;
            previousBtn.disabled = isFirstZikr;
            previousBtn.style.opacity = isFirstZikr ? '0.4' : '1';
            previousBtn.style.pointerEvents = isFirstZikr ? 'none' : 'auto';
        }
    } catch (e) {}
}

function incrementCounter() {
    try {
        if (!currentSection || !currentSection.items) return;
        var currentZikr = currentSection.items[activeIndex];
        if (activeZikrCount < currentZikr.count) {
            activeZikrCount++;
            document.getElementById('counter-current').innerText = activeZikrCount;
            saveProgress();

            if (navigator.vibrate) navigator.vibrate(15);

            if (activeZikrCount === currentZikr.count) {
                setTimeout(function() {
                    activeIndex++;
                    activeZikrCount = 0;
                    saveProgress();
                    renderZikr();
                }, 350);
            }
        }
    } catch (e) {}
}

function nextZikrManual() {
    try {
        activeIndex++;
        activeZikrCount = 0;
        saveProgress();
        renderZikr();
    } catch (e) {}
}

var lastCounterPointerTime = 0;

function initCounterButton() {
    try {
        var counterButton = document.getElementById('counter-btn');
        if (!counterButton) return;

        var MOVE_THRESHOLD = 10;
        var pressTracking = false;
        var pressStartX = 0;
        var pressStartY = 0;

        var beginPress = function(x, y) {
            pressTracking = true;
            pressStartX = x;
            pressStartY = y;
        };

        var endPress = function(event, x, y) {
            if (!pressTracking) return;
            pressTracking = false;
            if (typeof event.button === 'number' && event.button !== 0) return;
            var dx = x - pressStartX;
            var dy = y - pressStartY;
            if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) return;
            lastCounterPointerTime = Date.now();
            incrementCounter();
        };

        if ('PointerEvent' in window) {
            counterButton.addEventListener('pointerdown', function(event) {
                if (typeof event.button === 'number' && event.button !== 0) return;
                beginPress(event.clientX, event.clientY);
            });
            counterButton.addEventListener('pointerup', function(event) {
                event.preventDefault();
                endPress(event, event.clientX, event.clientY);
            });
            counterButton.addEventListener('pointercancel', function() {
                pressTracking = false;
            });
        } else if ('ontouchstart' in window) {
            counterButton.addEventListener('touchstart', function(event) {
                var t = event.changedTouches && event.changedTouches[0];
                if (!t) return;
                beginPress(t.clientX, t.clientY);
            }, { passive: true });
            counterButton.addEventListener('touchend', function(event) {
                event.preventDefault();
                var t = event.changedTouches && event.changedTouches[0];
                if (!t) { pressTracking = false; return; }
                endPress(event, t.clientX, t.clientY);
            }, { passive: false });
            counterButton.addEventListener('touchcancel', function() {
                pressTracking = false;
            });
        }

        counterButton.addEventListener('dblclick', function(event) {
            event.preventDefault();
        });

        counterButton.addEventListener('keydown', function(event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            lastCounterPointerTime = Date.now();
            incrementCounter();
        });

        counterButton.addEventListener('click', function(event) {
            event.preventDefault();
            if (Date.now() - lastCounterPointerTime < 400) return;
            incrementCounter();
        });
    } catch (e) {}
}

function previousZikrManual() {
    try {
        if (activeIndex === 0) return;
        activeIndex--;
        activeZikrCount = 0;
        saveProgress();
        renderZikr();
    } catch (e) {}
}

function resetCurrentCount() {
    try {
        activeZikrCount = 0;
        saveProgress();
        renderZikr();
    } catch (e) {}
}

function finishSection() {
    try {
        if (!currentSection) return;
        progressData[currentSection.id].finished = true;
        safeSetStorage('azkar_user_progress', progressData);
        maybeAdvanceStreak();

        document.getElementById('zikr-view').classList.add('hidden');
        document.getElementById('completion-view').classList.remove('hidden');
    } catch (e) {}
}

function saveProgress() {
    try {
        if (!currentSection) return;
        progressData[currentSection.id] = {
            currentIndex: activeIndex,
            currentZikrCount: activeZikrCount,
            finished: false
        };
        safeSetStorage('azkar_user_progress', progressData);
    } catch (e) {}
}

function triggerResetSection() {
    document.getElementById('reset-modal').classList.remove('hidden');
}
function closeResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
}
function confirmResetSection() {
    activeZikrCount = 0;
    activeIndex = 0;
    saveProgress();
    closeResetModal();
    renderZikr();
}

function showDashboard() {
    document.getElementById('zikr-view').classList.add('hidden');
    document.getElementById('completion-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    renderStreak();
    initDashboard();
}

function applyFontSize() {
    var zikrContent = document.getElementById('zikr-content');
    if (zikrContent) zikrContent.style.fontSize = currentFontSize + 'px';
}

function cycleFontSize() {
    try {
        var currentIndex = fontSizes.indexOf(currentFontSize);
        currentFontSize = fontSizes[(currentIndex + 1) % fontSizes.length];
        safeSetStorage('azkar_font_size', currentFontSize);
        applyFontSize();
    } catch (e) {}
}

function toggleTheme() {
    try {
        var isDark = document.documentElement.classList.toggle('dark');
        safeSetStorage('azkar_dark_mode', isDark);
        updateThemeIcon(isDark);
    } catch (e) {}
}

function updateThemeIcon(isDark) {
    var icon = document.getElementById('theme-icon');
    if (icon) {
        if (isDark) {
            icon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
        } else {
            icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
        }
    }
}

handleDailyReset();

var savedDarkMode = safeGetStorage('azkar_dark_mode', true);
if (savedDarkMode) {
    document.documentElement.classList.add('dark');
    updateThemeIcon(true);
} else {
    document.documentElement.classList.remove('dark');
    updateThemeIcon(false);
}

applyFontSize();
initCounterButton();
renderStreak();
initDashboard();

try {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
    }
} catch (e) {}
