(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad = (value) => String(value).padStart(2, '0');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const announcer = $('#announcer');
  const say = (message) => {
    if (announcer) announcer.textContent = message;
  };

  class CitySoundscape {
    constructor() {
      this.context = null;
      this.master = null;
      this.ambienceGain = null;
      this.enabled = false;
      this.stress = 0;
      this.noiseSource = null;
      this.lowOscillator = null;
      this.ambienceStarted = false;
    }

    async enable() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      try {
        if (!this.context) this.createContext(AudioContextClass);
        if (this.context.state === 'suspended') await this.context.resume();
        this.enabled = true;
        this.master.gain.cancelScheduledValues(this.context.currentTime);
        this.master.gain.setTargetAtTime(0.48, this.context.currentTime, 0.18);
        this.ambienceGain.gain.cancelScheduledValues(this.context.currentTime);
        this.ambienceGain.gain.setTargetAtTime(0.025 + this.stress * 0.035, this.context.currentTime, 0.22);
        return true;
      } catch (error) {
        console.warn('City sound could not be started:', error);
        return false;
      }
    }

    createContext(AudioContextClass) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 230;
      filter.Q.value = 0.65;
      this.ambienceGain = this.context.createGain();
      this.ambienceGain.gain.value = 0;
      filter.connect(this.ambienceGain);
      this.ambienceGain.connect(this.master);

      const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * 0.42;
      }
      this.noiseSource = this.context.createBufferSource();
      this.noiseSource.buffer = buffer;
      this.noiseSource.loop = true;
      this.noiseSource.connect(filter);
      this.noiseSource.start();

      this.lowOscillator = this.context.createOscillator();
      this.lowOscillator.type = 'sine';
      this.lowOscillator.frequency.value = 51;
      const lowGain = this.context.createGain();
      lowGain.gain.value = 0.07;
      this.lowOscillator.connect(lowGain);
      lowGain.connect(this.master);
      this.lowOscillator.start();
      this.ambienceStarted = true;
    }

    disable() {
      this.enabled = false;
      if (!this.context || !this.master) return;
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.14);
    }

    setStress(amount) {
      this.stress = clamp(amount, 0, 1);
      if (!this.enabled || !this.context || !this.ambienceGain) return;
      const target = 0.025 + this.stress * 0.035;
      this.ambienceGain.gain.cancelScheduledValues(this.context.currentTime);
      this.ambienceGain.gain.setTargetAtTime(target, this.context.currentTime, 0.12);
    }

    play(kind = 'tick') {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const now = this.context.currentTime;
      if (kind === 'horn') {
        const horn = this.context.createOscillator();
        const harmony = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        horn.type = 'sawtooth';
        harmony.type = 'triangle';
        horn.frequency.setValueAtTime(285, now);
        horn.frequency.exponentialRampToValueAtTime(236, now + 0.34);
        harmony.frequency.setValueAtTime(301, now);
        harmony.frequency.exponentialRampToValueAtTime(250, now + 0.34);
        filter.type = 'lowpass';
        filter.frequency.value = 620;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        horn.connect(filter);
        harmony.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        horn.start(now);
        harmony.start(now);
        horn.stop(now + 0.4);
        harmony.stop(now + 0.4);
        return;
      }

      if (kind === 'heartbeat') {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(83, now);
        oscillator.frequency.exponentialRampToValueAtTime(44, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(now);
        oscillator.stop(now + 0.21);
        return;
      }

      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'signal' ? 720 : 470, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'signal' ? 480 : 330, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === 'signal' ? 0.045 : 0.018, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'signal' ? 0.16 : 0.095));
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + 0.18);
    }
  }

  const soundscape = new CitySoundscape();

  // The opening countdown is visual-first. Sound is opt-in and can only start after a gesture.
  const opening = $('#opening');
  const openingCount = $('#opening-count');
  const openingTitle = $('#opening-title');
  const skipIntroButton = $('#skip-intro');
  const loader = $('#loading-screen');
  let openingInterval = null;
  let openingTimeout = null;
  let openingFinished = false;
  let openingValue = 15;

  function showOpeningTitle() {
    if (openingFinished) return;
    window.clearInterval(openingInterval);
    window.clearTimeout(openingTimeout);
    openingFinished = true;
    const returnFocusToBegin = document.activeElement === skipIntroButton;
    opening?.classList.add('opening--blackout');
    openingTimeout = window.setTimeout(() => {
      if (!opening) return;
      opening.classList.remove('opening--blackout');
      opening.classList.add('opening--title-ready');
      openingTitle?.classList.add('is-visible');
      openingTitle?.removeAttribute('inert');
      openingTitle?.setAttribute('aria-hidden', 'false');
      openingCount?.setAttribute('aria-label', 'The crossing countdown has ended');
      window.setTimeout(() => openingTitle?.classList.add('is-second-line-visible'), prefersReducedMotion.matches ? 150 : 900);
      window.setTimeout(() => {
        openingTitle?.classList.add('is-ready');
        const beginButton = $('#begin-story');
        if (beginButton) beginButton.disabled = false;
        skipIntroButton?.setAttribute('hidden', '');
        if (returnFocusToBegin) beginButton?.focus({ preventScroll: true });
      }, prefersReducedMotion.matches ? 360 : 1650);
      say('Fifteen Seconds. A city gave everyone the same amount of time.');
    }, prefersReducedMotion.matches ? 40 : 850);
  }

  function startOpeningSequence() {
    if (!opening || openingFinished) return;
    if (prefersReducedMotion.matches) {
      showOpeningTitle();
      return;
    }
    openingValue = 15;
    opening.dataset.count = '15';
    openingCount.textContent = '15';
    openingCount.style.transform = 'scale(.92)';
    openingInterval = window.setInterval(() => {
      openingValue -= 1;
      if (openingValue <= 0) {
        window.clearInterval(openingInterval);
        openingValue = 0;
        opening.dataset.count = '00';
        openingCount.textContent = '00';
        opening.classList.add('opening--blackout');
        openingTimeout = window.setTimeout(showOpeningTitle, 500);
        return;
      }
      opening.dataset.count = String(openingValue);
      openingCount.textContent = String(openingValue);
      openingCount.style.transform = `scale(${0.92 + ((15 - openingValue) / 15) * 0.48})`;
      if (openingValue === 8 || openingValue === 5) {
        opening.classList.remove('opening--honk');
        void opening.offsetWidth;
        opening.classList.add('opening--honk');
      }
      if (openingValue <= 3) opening.classList.add('opening--chaos');
    }, 360);
  }

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      loader?.classList.add('is-gone');
      window.setTimeout(() => loader?.setAttribute('hidden', ''), 680);
      startOpeningSequence();
    }, 700);
  }, { once: true });

  skipIntroButton?.addEventListener('click', showOpeningTitle);

  const story = $('#story');
  const storyInterface = $('#story-interface');
  const chapterReadout = $('#chapter-readout');
  const beginButton = $('#begin-story');
  let storyEntered = false;
  let presentationMode = false;

  function enterStory() {
    if (storyEntered) return;
    storyEntered = true;
    opening?.classList.add('opening--finished');
    openingTitle?.setAttribute('aria-hidden', 'true');
    story?.removeAttribute('inert');
    story?.setAttribute('aria-hidden', 'false');
    story?.classList.add('is-entered');
    storyInterface?.removeAttribute('inert');
    storyInterface?.setAttribute('aria-hidden', 'false');
    storyInterface?.classList.add('is-active');
    chapterReadout?.setAttribute('aria-hidden', 'false');
    window.scrollTo({ top: 0, behavior: 'auto' });
    window.requestAnimationFrame(() => {
      scheduleScrollUpdate();
      crossingSignal?.focus({ preventScroll: true });
    });
    say('Chapter one. The crossing. Tap the pedestrian signal when you are ready.');
  }

  beginButton?.addEventListener('click', enterStory);
  $('.skip-link')?.addEventListener('click', (event) => {
    if (storyEntered) return;
    event.preventDefault();
    enterStory();
  });
  skipIntroButton?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') showOpeningTitle();
  });

  // Table of contents: modal-like panel with focus return and Escape handling.
  const menuToggle = $('#menu-toggle');
  const contentsPanel = $('#contents-panel');
  const contentsBackdrop = $('#contents-backdrop');
  const contentsClose = $('#contents-close');
  let menuReturnFocus = null;

  function openContents() {
    if (!contentsPanel || !contentsBackdrop) return;
    menuReturnFocus = document.activeElement;
    contentsPanel.classList.add('is-open');
    contentsPanel.removeAttribute('inert');
    contentsPanel.setAttribute('aria-hidden', 'false');
    contentsBackdrop.hidden = false;
    menuToggle?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    window.setTimeout(() => $('a[href^="#ch-"]', contentsPanel)?.focus(), 80);
  }

  function closeContents(restoreFocus = true) {
    if (!contentsPanel || !contentsBackdrop) return;
    contentsPanel.classList.remove('is-open');
    contentsPanel.setAttribute('inert', '');
    contentsPanel.setAttribute('aria-hidden', 'true');
    contentsBackdrop.hidden = true;
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (restoreFocus && menuReturnFocus instanceof HTMLElement) menuReturnFocus.focus();
  }

  menuToggle?.addEventListener('click', () => {
    if (menuToggle.getAttribute('aria-expanded') === 'true') closeContents();
    else openContents();
  });
  contentsClose?.addEventListener('click', () => closeContents());
  contentsBackdrop?.addEventListener('click', () => closeContents());
  $$('.contents-list a').forEach((link) => link.addEventListener('click', () => closeContents(false)));
  contentsPanel?.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = $$('a[href],button:not([disabled])', contentsPanel).filter((node) => !node.hasAttribute('inert'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Sound stays off until the visitor explicitly turns it on.
  const soundToggle = $('#sound-toggle');
  const soundState = $('#sound-state');
  soundToggle?.addEventListener('click', async () => {
    if (soundscape.enabled) {
      soundscape.disable();
      soundToggle.setAttribute('aria-pressed', 'false');
      soundToggle.setAttribute('aria-label', 'Turn city sound on');
      if (soundState) soundState.textContent = 'OFF';
      say('City sound off. The story continues in silence.');
      return;
    }
    const started = await soundscape.enable();
    soundToggle.setAttribute('aria-pressed', started ? 'true' : 'false');
    soundToggle.setAttribute('aria-label', started ? 'Turn city sound off' : 'City sound is not available in this browser');
    if (soundState) soundState.textContent = started ? 'ON' : 'N/A';
    say(started ? 'City sound on. Ambient traffic is low and optional.' : 'Audio is not available in this browser.');
  });

  // Chapter pagination follows the manga panels, not a separate page route.
  const chapters = $$('[data-chapter]');
  const currentChapterName = $('#current-chapter-name');
  const readoutCurrent = $('#readout-current');
  const progressFill = $('#interface-progress-fill');
  const chapterNames = [
    'THE CROSSING', 'FIFTEEN SECONDS', 'LOOK AGAIN', 'THE AVERAGE HUMAN', 'THE MIRROR',
    'THE NUMBERS', 'GIVE THEM 15 SECONDS', 'THE SECOND PERSON', '34 SECONDS', 'THE CITY'
  ];
  let activeChapter = 1;
  let scrollTicking = false;
  let revealObserver = null;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
  }
  $$('.reveal-on-view').forEach((element) => {
    if (prefersReducedMotion.matches || !revealObserver) element.classList.add('is-visible');
    else revealObserver.observe(element);
  });

  function updateProgress() {
    scrollTicking = false;
    if (!storyEntered || !chapters.length) return;
    const markerY = window.innerHeight * 0.42;
    let selected = chapters[0];
    let selectedIndex = 0;
    chapters.forEach((chapter, index) => {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= markerY && rect.bottom > markerY) {
        selected = chapter;
        selectedIndex = index;
      } else if (rect.top <= markerY && rect.top > selected.getBoundingClientRect().top) {
        selected = chapter;
        selectedIndex = index;
      }
    });
    selected.classList.add('is-visible');
    const chapterNumber = Number(selected.dataset.chapter) || 1;
    if (chapterNumber !== activeChapter) {
      activeChapter = chapterNumber;
      if (currentChapterName) currentChapterName.textContent = `${pad(chapterNumber)} — ${chapterNames[chapterNumber - 1]}`;
      if (readoutCurrent) readoutCurrent.textContent = pad(chapterNumber);
      say(`Chapter ${pad(chapterNumber)}. ${chapterNames[chapterNumber - 1].toLowerCase()}.`);
    }
    const rect = selected.getBoundingClientRect();
    const chapterDistance = Math.max(1, selected.offsetHeight - window.innerHeight);
    const localProgress = clamp(-rect.top / chapterDistance, 0, 0.92);
    const percent = clamp(((selectedIndex + localProgress) / chapters.length) * 100, 2, 100);
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (selectedIndex === chapters.length - 1 && rect.bottom < window.innerHeight) {
      if (progressFill) progressFill.style.width = '100%';
    }
  }

  function scheduleScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      updateProgress();
      updateMirrorReveal();
      updateReturnWalkFromScroll();
    });
  }
  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('resize', scheduleScrollUpdate, { passive: true });

  // 01 — The signal starts a full fifteen-second crossing. The timer continues while the visitor scrolls.
  const crossingChapter = $('#ch-01');
  const crossingSignal = $('#crossing-signal');
  const crossingSeconds = $('#crossing-seconds');
  const signalButtonCopy = $('#signal-button-copy');
  const timerInstruction = $('#timer-instruction');
  const crossingDialogue = $('#crossing-dialogue');
  let crossingTimer = null;
  let crossingStarted = false;

  function startCrossing() {
    if (crossingStarted) return;
    crossingStarted = true;
    let seconds = 15;
    crossingSignal?.setAttribute('aria-pressed', 'true');
    crossingSignal?.setAttribute('aria-label', 'The pedestrian crossing timer is running');
    $('.lamp--red', crossingSignal)?.classList.remove('active');
    $('.lamp--green', crossingSignal)?.classList.add('active');
    if (signalButtonCopy) signalButtonCopy.textContent = 'THE SIGNAL IS GREEN';
    if (timerInstruction) timerInstruction.textContent = 'They have fifteen seconds. Watch what the road asks of them.';
    if (crossingSeconds) crossingSeconds.textContent = '15';
    crossingChapter?.classList.add('is-started');
    soundscape.setStress(0.05);
    soundscape.play('signal');
    soundscape.play('heartbeat');
    say('The signal turns green. Fifteen seconds to cross.');

    crossingTimer = window.setInterval(() => {
      seconds -= 1;
      if (crossingSeconds) crossingSeconds.textContent = pad(Math.max(0, seconds));
      soundscape.setStress(clamp((15 - seconds) / 15, 0, 1));
      if (seconds > 0 && seconds <= 11) soundscape.play('tick');
      if (seconds === 8 || seconds === 5) soundscape.play('horn');
      if (seconds === 5) {
        crossingChapter?.classList.add('is-stressful');
        if (timerInstruction) timerInstruction.textContent = 'The road is still moving. Dadu is not.';
        say('Five seconds. Dadu is still in the road.');
      }
      if (seconds === 3) {
        crossingChapter?.classList.add('is-chaos');
        soundscape.play('horn');
        soundscape.play('horn');
        if (timerInstruction) timerInstruction.textContent = 'The crossing narrows. The traffic does not.';
      }
      if (seconds === 1) {
        crossingChapter?.classList.add('is-frozen');
        if (timerInstruction) timerInstruction.textContent = 'One second.';
      }
      if (seconds <= 0) {
        window.clearInterval(crossingTimer);
        crossingTimer = null;
        if (crossingSeconds) crossingSeconds.textContent = '00';
        crossingChapter?.classList.add('is-frozen');
        if (timerInstruction) timerInstruction.textContent = 'The light changes. Dadu is still here.';
        if (crossingDialogue) crossingDialogue.hidden = false;
        soundscape.setStress(0);
        say('The timer reaches zero. Dadu asks, Maine kya galat kiya? What did I do wrong?');
      }
    }, 1000);
  }
  crossingSignal?.addEventListener('click', startCrossing);

  // 02 — Pick a body; the time limit never changes.
  const paceChoices = $$('.pace-choice');
  const simulationPerson = $('#simulation-person');
  const simulationStatus = $('#simulation-status');
  paceChoices.forEach((button) => {
    button.addEventListener('click', () => {
      const pace = Number(button.dataset.pace);
      const person = button.dataset.person || 'Pedestrian';
      paceChoices.forEach((choice) => choice.setAttribute('aria-pressed', choice === button ? 'true' : 'false'));
      const completion = Math.min(1, 15 / pace);
      const leftPercent = 4 + completion * 91;
      if (simulationPerson) {
        simulationPerson.style.left = `${leftPercent}%`;
        simulationPerson.classList.toggle('is-done', pace <= 15);
        simulationPerson.setAttribute('aria-label', `${person}: ${Math.round(completion * 100)} percent across when the signal ends`);
      }
      if (simulationStatus) {
        if (pace <= 15) {
          simulationStatus.textContent = `${person} reaches the other side in ${pace} seconds. The signal still has ${15 - pace} seconds left.`;
        } else {
          const remaining = pace - 15;
          simulationStatus.textContent = `At 15 seconds: ${Math.round(completion * 100)}% across. ${remaining} more seconds are needed.`;
        }
      }
      soundscape.play('tick');
      say(`${person} takes ${pace} seconds to cross. The timer remains fifteen seconds.`);
    });
  });

  // 03 — Evidence pins uncover everyday exclusions in the same street.
  const evidenceCopy = {
    footpath: { index: 'OBSERVATION 01', title: 'CAR ON FOOTPATH', copy: 'Someone gained convenience. Someone lost a path.' },
    ramp: { index: 'OBSERVATION 02', title: 'BLOCKED RAMP', copy: 'For one person, this is parking. For another, it is a wall.' },
    crossing: { index: 'OBSERVATION 03', title: 'CROSSING BLOCKED', copy: "The crossing exists. The priority doesn't." },
    litter: { index: 'OBSERVATION 04', title: 'GARBAGE BESIDE BIN', copy: "Public space becomes nobody's space." },
    horn: { index: 'OBSERVATION 05', title: 'HONKING DRIVER', copy: 'Someone is trying to save seconds.' }
  };
  const evidenceCaption = $('#evidence-caption');
  const evidenceCaptionIndex = $('#evidence-caption-index');
  const evidenceCaptionTitle = $('#evidence-caption-title');
  const evidenceCaptionCopy = $('#evidence-caption-copy');
  const evidencePins = $$('.evidence-pin');
  evidencePins.forEach((pin) => {
    pin.addEventListener('click', () => {
      const item = evidenceCopy[pin.dataset.evidence];
      if (!item || !evidenceCaption) return;
      evidencePins.forEach((other) => other.setAttribute('aria-expanded', other === pin ? 'true' : 'false'));
      evidenceCaptionIndex.textContent = item.index;
      evidenceCaptionTitle.textContent = item.title;
      evidenceCaptionCopy.textContent = item.copy;
      evidenceCaption.hidden = false;
      soundscape.play('tick');
      say(`${item.title}. ${item.copy}`);
    });
  });
  $('#evidence-caption-close')?.addEventListener('click', () => {
    if (evidenceCaption) evidenceCaption.hidden = true;
    evidencePins.forEach((pin) => pin.setAttribute('aria-expanded', 'false'));
  });

  // 04 — Break the one-size-fits-all label into the people it leaves out.
  const revealHumanity = $('#reveal-humanity');
  const fracturePanel = $('#fracture-panel');
  const averageRevealLine = $('#average-reveal-line');
  revealHumanity?.addEventListener('click', () => {
    const isBroken = !fracturePanel.classList.contains('is-broken');
    fracturePanel.classList.toggle('is-broken', isBroken);
    revealHumanity.setAttribute('aria-expanded', String(isBroken));
    revealHumanity.innerHTML = isBroken ? 'PUT THE PEOPLE BACK <span aria-hidden="true">↗</span>' : 'BREAK THE AVERAGE <span aria-hidden="true">↘</span>';
    if (averageRevealLine) averageRevealLine.hidden = !isBroken;
    if (isBroken) {
      say('Child. Elderly person. Parent. Wheelchair user. Injured person. Student. Worker. Tourist. Everyone. There is no average person.');
    } else {
      say('The phrase average pedestrian returns to the monitor.');
    }
  });

  // 05 — Scrolling physically reveals the reflection below the system.
  const mirrorChapter = $('#ch-05');
  const mirrorWall = $('#mirror-wall');
  const mirrorReflection = $('#mirror-us');
  const mirrorInner = $('.mirror-inner', mirrorChapter || document);
  function updateMirrorReveal() {
    if (!mirrorChapter || !mirrorWall || !mirrorInner) return;
    const rect = mirrorChapter.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const travel = Math.max(1, mirrorChapter.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel, 0, 1);
    const reveal = clamp(progress * 1.8, 0, 1);
    const quoteOpacity = clamp((progress - 0.53) / 0.3, 0, 1);
    mirrorWall.style.setProperty('--mirror-reveal', reveal.toFixed(3));
    if (mirrorReflection) mirrorReflection.style.clipPath = `inset(${(1 - reveal) * 100}% 0 0 0)`;
    mirrorInner.style.setProperty('--mirror-quote-opacity', quoteOpacity.toFixed(3));
    if (progress > 0.48 && !mirrorChapter.dataset.announced) {
      mirrorChapter.dataset.announced = 'true';
      say('The reflection: footpaths blocked, red lights ignored, litter dropped, ramps taken, horns held down, queues skipped.');
    }
    if (progress < 0.3) delete mirrorChapter.dataset.announced;
  }

  // 06 — A real notebook with five pages, plus the observations behind the bars.
  const notes = [
    { time: '11', person: 'young student', note: 'The green figure blinked twice. He was already on the other side.' },
    { time: '17', person: 'carrying groceries', note: 'The bags swung into the road. The signal changed before the load did.' },
    { time: '24', person: 'parent + child', note: 'One hand held a small hand. The other held a lunchbox.' },
    { time: '27', person: 'elderly pedestrian', note: 'A wooden stick met every painted stripe. The light kept counting.' },
    { time: '31', person: 'mobility difficulty', note: 'The ramp was blocked. The road was the only way around.' }
  ];
  let notebookIndex = 0;
  const notebookPage = $('#notebook-page');
  const notebookTime = $('#notebook-time');
  const notebookPerson = $('#notebook-person');
  const notebookNote = $('#notebook-note');
  const notebookPageNumber = $('#notebook-page-number');
  const notebookPageIndicator = $('#notebook-page-indicator');
  const notebookPrevious = $('#notebook-prev');
  const notebookNext = $('#notebook-next');

  function renderNotebookPage(index) {
    notebookIndex = clamp(index, 0, notes.length - 1);
    const entry = notes[notebookIndex];
    if (!entry) return;
    notebookPage?.classList.remove('is-turning');
    if (notebookPage) {
      void notebookPage.offsetWidth;
      notebookPage.classList.add('is-turning');
    }
    if (notebookTime) notebookTime.innerHTML = `${entry.time} <small>SEC</small>`;
    if (notebookPerson) notebookPerson.textContent = entry.person;
    if (notebookNote) notebookNote.textContent = entry.note;
    if (notebookPageNumber) notebookPageNumber.textContent = pad(notebookIndex + 1);
    if (notebookPageIndicator) notebookPageIndicator.innerHTML = `<span>${pad(notebookIndex + 1)}</span> / 05`;
    if (notebookPrevious) notebookPrevious.disabled = notebookIndex === 0;
    if (notebookNext) notebookNext.disabled = notebookIndex === notes.length - 1;
    say(`Notebook page ${notebookIndex + 1} of five. ${entry.time} seconds. ${entry.person}.`);
  }
  notebookPrevious?.addEventListener('click', () => renderNotebookPage(notebookIndex - 1));
  notebookNext?.addEventListener('click', () => renderNotebookPage(notebookIndex + 1));

  // 07 — Drag, tap, or keyboard-place the poster on the shutter.
  const posterWorld = $('#poster-world');
  const campaignPoster = $('#campaign-poster');
  const posterTarget = $('#poster-wall-target');
  const posterPlaceButton = $('#poster-place-button');
  const posterInstructions = $('#poster-instructions');
  const posterReactions = $('#poster-reactions');
  const posterResponse = $('#poster-response');
  const posterWaitButton = $('#poster-wait-button');
  const posterResult = $('#poster-result');
  let posterPlaced = false;
  let posterCarrying = false;
  let dragStart = null;
  let pointerMoved = false;

  function setPosterCarrying() {
    if (posterPlaced) return;
    posterCarrying = true;
    campaignPoster?.classList.add('is-carrying');
    if (posterPlaceButton) posterPlaceButton.disabled = false;
    if (posterInstructions) posterInstructions.textContent = 'Now place it on the outlined wall.';
    if (posterTarget) posterTarget.classList.add('is-targeted');
    say('Poster picked up. Place it on the wall.');
  }

  function placePoster() {
    if (posterPlaced || !posterCarrying) return;
    posterPlaced = true;
    posterCarrying = false;
    campaignPoster?.classList.remove('is-carrying', 'is-dragging');
    campaignPoster?.classList.add('is-placed');
    campaignPoster?.setAttribute('aria-label', 'The Give Them 15 Seconds poster is now on the wall');
    posterTarget?.classList.remove('is-targeted');
    posterTarget?.classList.add('is-filled');
    posterTarget?.setAttribute('aria-disabled', 'true');
    if (posterInstructions) posterInstructions.hidden = true;
    if (posterPlaceButton) posterPlaceButton.hidden = true;
    if (posterReactions) posterReactions.hidden = false;
    if (posterResponse) posterResponse.hidden = false;
    soundscape.play('tick');
    say('The poster is on the wall. At first, nobody stops.');
  }

  campaignPoster?.addEventListener('pointerdown', (event) => {
    if (posterPlaced || event.button !== 0) return;
    const posterRect = campaignPoster.getBoundingClientRect();
    dragStart = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - posterRect.left,
      offsetY: event.clientY - posterRect.top
    };
    pointerMoved = false;
    campaignPoster.setPointerCapture?.(event.pointerId);
  });

  campaignPoster?.addEventListener('pointermove', (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId || posterPlaced || !posterWorld) return;
    const delta = Math.hypot(event.clientX - dragStart.startX, event.clientY - dragStart.startY);
    if (delta < 8) return;
    pointerMoved = true;
    posterCarrying = true;
    campaignPoster.classList.add('is-dragging');
    campaignPoster.classList.remove('is-carrying');
    if (posterPlaceButton) posterPlaceButton.disabled = false;
    if (posterTarget) posterTarget.classList.add('is-targeted');
    const worldRect = posterWorld.getBoundingClientRect();
    const posterWidth = campaignPoster.offsetWidth;
    const posterHeight = campaignPoster.offsetHeight;
    const left = clamp(event.clientX - worldRect.left - dragStart.offsetX, 0, worldRect.width - posterWidth);
    const top = clamp(event.clientY - worldRect.top - dragStart.offsetY, 0, worldRect.height - posterHeight);
    campaignPoster.style.left = `${left}px`;
    campaignPoster.style.top = `${top}px`;
  });

  campaignPoster?.addEventListener('pointerup', (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    if (pointerMoved && posterTarget) {
      const targetRect = posterTarget.getBoundingClientRect();
      const insideTarget = event.clientX >= targetRect.left && event.clientX <= targetRect.right && event.clientY >= targetRect.top && event.clientY <= targetRect.bottom;
      if (insideTarget) placePoster();
      else {
        campaignPoster.classList.remove('is-dragging');
        campaignPoster.classList.add('is-carrying');
        if (posterInstructions) posterInstructions.textContent = 'Nearly there. Move it onto the outlined wall, or choose “Place poster”.';
      }
    } else if (!posterPlaced) {
      setPosterCarrying();
    }
    dragStart = null;
  });
  campaignPoster?.addEventListener('pointercancel', () => {
    dragStart = null;
    pointerMoved = false;
    campaignPoster?.classList.remove('is-dragging');
  });
  campaignPoster?.addEventListener('click', (event) => {
    if (event.detail === 0 && !posterPlaced) setPosterCarrying();
  });
  posterTarget?.addEventListener('click', () => placePoster());
  posterPlaceButton?.addEventListener('click', placePoster);
  posterWaitButton?.addEventListener('click', () => {
    if (posterResponse) posterResponse.hidden = true;
    if (posterReactions) posterReactions.hidden = true;
    if (posterResult) posterResult.hidden = false;
    posterWorld?.classList.add('poster-seen');
    say('Then one person stops before the crossing. Someone else notices.');
  });

  // 08 — Choices create a path for the next person; no points or score.
  const chainSteps = [
    {
      label: 'THE RAMP',
      prompt: 'A motorcyclist pulls onto the ramp.',
      context: '“Just for a minute,” he says. A pedestrian is coming.',
      wrong: '“Just for a minute.”',
      right: '“Find another place.”',
      feedback: 'The ramp stays blocked. “Only a minute” is still a wall when you are the one who needs the path.'
    },
    {
      label: 'THE CROSSING',
      prompt: 'A car rolls toward the zebra crossing.',
      context: 'Its front bumper reaches the white stripes before the light changes.',
      wrong: '“Just over the line.”',
      right: '“Stop before the crossing.”',
      feedback: 'The stripes are not extra parking. A few feet of space is the difference between a crossing and a squeeze.'
    },
    {
      label: 'THE WAIT',
      prompt: 'A slow walker steps off the curb.',
      context: 'A horn could hurry them. It cannot make them safer.',
      wrong: 'Tap the horn.',
      right: 'Wait without honking.',
      feedback: 'The person is already moving as quickly as they can. The road can wait a few seconds.'
    }
  ];
  let chainStepIndex = 0;
  const chainScene = $('#chain-scene');
  const choiceStepNumber = $('#choice-step-number');
  const choiceStepLabel = $('#choice-step-label');
  const choiceQuestion = $('#choice-question');
  const choiceContext = $('#choice-context');
  const choiceButtons = $('#choice-buttons');
  const choiceFeedback = $('#choice-feedback');
  const chainEnding = $('#chain-ending');
  const chainDots = $$('[data-chain-dot]');
  const chainPersonOne = $('#chain-person-one');
  const chainPersonTwo = $('#chain-person-two');
  const chainPersonThree = $('#chain-person-three');
  const motorbike = $('#motorbike-figure');
  const chainStamp = $('#chain-stamp');
  let chainAdvancing = false;

  function updateChainDots(completedIndex) {
    chainDots.forEach((dot, index) => {
      dot.classList.toggle('is-done', index < completedIndex);
      dot.classList.toggle('is-current', index === completedIndex && completedIndex < chainSteps.length);
    });
  }

  function renderChainStep(index) {
    const step = chainSteps[index];
    if (!step) return;
    chainStepIndex = index;
    if (choiceStepNumber) choiceStepNumber.textContent = pad(index + 1);
    if (choiceStepLabel) choiceStepLabel.textContent = step.label;
    if (choiceQuestion) choiceQuestion.textContent = step.prompt;
    if (choiceContext) choiceContext.textContent = step.context;
    if (choiceFeedback) choiceFeedback.hidden = true;
    if (choiceButtons) {
      choiceButtons.hidden = false;
      choiceButtons.innerHTML = `
        <button class="choice-option choice-option--quiet" type="button" data-choice="wrong">${step.wrong}</button>
        <button class="choice-option choice-option--right" type="button" data-choice="right">${step.right}</button>
      `;
    }
    updateChainDots(index);
  }

  function finishChain() {
    chainStepIndex = chainSteps.length;
    if (choiceButtons) choiceButtons.hidden = true;
    if (choiceStepNumber) choiceStepNumber.textContent = '03';
    if (choiceStepLabel) choiceStepLabel.textContent = 'A PATH WIDENS';
    if (choiceQuestion) choiceQuestion.textContent = 'The road makes a little more room.';
    if (choiceContext) choiceContext.textContent = 'A second person sees someone waiting—and waits too.';
    if (chainPersonTwo) chainPersonTwo.classList.add('is-visible');
    if (chainPersonThree) chainPersonThree.classList.add('is-visible');
    if (chainStamp) {
      chainStamp.textContent = 'THE SECOND\nARRIVES';
      chainStamp.classList.add('is-visible');
    }
    chainDots.forEach((dot) => {
      dot.classList.add('is-done');
      dot.classList.remove('is-current');
    });
    window.setTimeout(() => {
      if (chainEnding) chainEnding.hidden = false;
      say('One person cannot change the city. The second can.');
    }, prefersReducedMotion.matches ? 0 : 600);
  }

  choiceButtons?.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-choice]');
    if (!choice || chainAdvancing) return;
    const step = chainSteps[chainStepIndex];
    if (!step) return;
    if (choice.dataset.choice === 'wrong') {
      if (choiceFeedback) {
        choiceFeedback.textContent = step.feedback;
        choiceFeedback.hidden = false;
      }
      soundscape.play('tick');
      say(step.feedback);
      return;
    }

    chainAdvancing = true;
    if (choiceButtons) $$('.choice-option', choiceButtons).forEach((button) => { button.disabled = true; });
    if (choiceFeedback) {
      choiceFeedback.textContent = chainStepIndex === 0
        ? 'The rider finds another place. The ramp opens.'
        : chainStepIndex === 1
          ? 'The car waits behind the line. The crossing stays open.'
          : 'The horn stays quiet. The walker keeps their own pace.';
      choiceFeedback.hidden = false;
    }
    if (chainStepIndex === 0) {
      chainScene?.classList.add('is-clear');
      motorbike?.classList.add('is-moved');
      chainPersonOne?.classList.add('is-visible');
      chainStamp?.classList.add('is-visible');
    } else if (chainStepIndex === 1) {
      chainScene?.classList.add('is-car-waiting');
      chainPersonTwo?.classList.add('is-visible');
    } else if (chainStepIndex === 2) {
      chainScene?.classList.add('is-waiting');
      chainPersonThree?.classList.add('is-visible');
    }
    soundscape.play('signal');
    say(choiceFeedback?.textContent || 'One small action makes room.');
    const completed = chainStepIndex;
    updateChainDots(completed + 1);
    window.setTimeout(() => {
      chainAdvancing = false;
      if (completed + 1 >= chainSteps.length) finishChain();
      else renderChainStep(completed + 1);
    }, prefersReducedMotion.matches ? 60 : 1100);
  });

  // 09 — The scroll position is a slow, accessible control for Dadu's crossing.
  const returnChapter = $('#ch-09');
  const returnStage = $('#return-stage');
  const returnAfter = $('.return-after');
  const crossingScrubber = $('#crossing-scrubber');
  const crossingProgressLabel = $('#crossing-progress-label');
  const returnCalmed = $('#return-calmed');
  let lastWalkAnnounced = false;

  function setReturnProgress(progress) {
    const value = clamp(progress, 0, 1);
    if (!returnStage) return;
    returnStage.style.setProperty('--walk-progress', value.toFixed(4));
    if (returnAfter) returnAfter.style.clipPath = `inset(0 ${(1 - clamp(value * 2, 0, 1)) * 100}% 0 0)`;
    returnStage.dataset.progress = String(Math.round(value * 100));
    if (crossingScrubber) crossingScrubber.value = String(Math.round(value * 100));
    if (crossingProgressLabel) crossingProgressLabel.textContent = `${Math.round(value * 100)}%`;
    returnStage.classList.toggle('show-first-line', value >= 0.4);
    returnStage.classList.toggle('show-second-line', value >= 0.67);
    returnStage.classList.toggle('show-third-line', value >= 0.92);
    returnStage.classList.toggle('is-crossed', value >= 0.98);
    if (returnCalmed) returnCalmed.hidden = value < 0.78;
    if (value >= 0.98 && !lastWalkAnnounced) {
      lastWalkAnnounced = true;
      say('Dadu reaches the other side. Nobody honks. The real change was that people stopped stealing time from one another.');
    } else if (value < 0.85) {
      lastWalkAnnounced = false;
    }
  }

  function updateReturnWalkFromScroll() {
    if (!returnChapter || !returnStage) return;
    const rect = returnChapter.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) return;
    const totalScroll = Math.max(1, returnChapter.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / totalScroll, 0, 1);
    setReturnProgress(progress);
  }

  crossingScrubber?.addEventListener('input', () => {
    const targetProgress = Number(crossingScrubber.value) / 100;
    setReturnProgress(targetProgress);
    if (!returnChapter) return;
    const rect = returnChapter.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;
    const scrollDistance = Math.max(0, returnChapter.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: absoluteTop + scrollDistance * targetProgress,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
    });
  });

  // 10 — The commitment note is local to this browser; nothing is uploaded.
  const commitmentChoices = $$('.commitment-choice');
  const commitmentOutput = $('#commitment-output');
  const commitmentHandwriting = $('#commitment-handwriting');
  const notesWallWrap = $('#notes-wall-wrap');
  const notesWall = $('#notes-wall');
  const notesCount = $('#notes-count');
  const empathyLine = $('#empathy-line');
  const localNotesKey = 'fifteen-seconds-local-notes-v1';

  function readLocalNotes() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(localNotesKey) || '[]');
      return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string').slice(-24) : [];
    } catch (error) {
      return [];
    }
  }

  function renderLocalNotes(items) {
    if (!notesWall || !notesCount) return;
    notesWall.replaceChildren();
    const angles = [-1.3, 1.1, -.6, 1.7, -.9, .5];
    items.forEach((item, index) => {
      const note = document.createElement('li');
      note.className = 'notes-wall-note';
      note.textContent = item;
      note.style.setProperty('--note-angle', `${angles[index % angles.length]}deg`);
      notesWall.append(note);
    });
    notesCount.textContent = `${pad(items.length)} / ${items.length === 1 ? 'A SMALL PROMISE' : 'SMALL PROMISES'}`;
  }

  commitmentChoices.forEach((button) => {
    button.addEventListener('click', () => {
      const commitment = button.dataset.commitment;
      if (!commitment) return;
      commitmentChoices.forEach((choice) => {
        const isSelected = choice === button;
        choice.classList.toggle('is-selected', isSelected);
        choice.setAttribute('aria-pressed', String(isSelected));
      });
      if (commitmentHandwriting) commitmentHandwriting.textContent = `“${commitment}”`;
      if (commitmentOutput) commitmentOutput.hidden = false;
      if (notesWallWrap) notesWallWrap.hidden = false;
      if (empathyLine) empathyLine.hidden = false;
      const items = readLocalNotes();
      if (items[items.length - 1] !== commitment) items.push(commitment);
      const safeItems = items.slice(-24);
      try {
        window.localStorage.setItem(localNotesKey, JSON.stringify(safeItems));
      } catch (error) {
        // The chosen promise still appears on the page if storage is unavailable.
      }
      renderLocalNotes(safeItems);
      say(`Your note: ${commitment} Saved only in this browser. Maybe civic sense is empathy made visible.`);
      soundscape.play('tick');
    });
  });

  // Keyboard shortcuts: P for a clean presentation start, E to replay the opening.
  function isTypingTarget(target) {
    return target instanceof HTMLElement && (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
  }

  function setPresentationMode(shouldEnable) {
    if (shouldEnable && !storyEntered) enterStory();
    presentationMode = shouldEnable;
    document.body.classList.toggle('presentation-mode', shouldEnable);
    storyInterface?.setAttribute('aria-hidden', String(shouldEnable));
    if (shouldEnable) storyInterface?.setAttribute('inert', '');
    else if (storyEntered) storyInterface?.removeAttribute('inert');
    chapterReadout?.setAttribute('aria-hidden', String(shouldEnable));
    if (shouldEnable) {
      closeContents(false);
      $('#ch-01')?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      say('Presentation mode. Chapter one. Press P to leave presentation mode.');
    } else {
      say('Presentation mode off.');
    }
  }

  function resetExperience() {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      window.scrollTo(0, 0);
    }
    window.location.reload();
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      closeContents();
      return;
    }
    if (isTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 'p') {
      event.preventDefault();
      setPresentationMode(!presentationMode);
    } else if (key === 'e') {
      event.preventDefault();
      resetExperience();
    }
  });

  $('#enter-again')?.addEventListener('click', resetExperience);

  // Start the reader clock and expose the first panel for a focus entering from the skip link.
  document.addEventListener('focusin', (event) => {
    if (event.target === $('#ch-01') && !storyEntered) enterStory();
  });

  // A resize can change which part of the sticky scenes is in view.
  scheduleScrollUpdate();
})();
