/**
 * LexiLand — Smart Retry helper (shared, per-round).
 * Queue of missed items that resurface after 3-5 other questions.
 * Pure logic, no DOM. Each game owns one instance per session.
 *
 * Usage:
 *   this.retry = EGL_Retry.create({ gap: 4, maxRetries: 2 });
 *   this.retry.noteAsked();                    // call when a NEW question is shown
 *   this.retry.schedule(key);                  // call on wrong answer
 *   const due = this.retry.due();              // key ready to resurface, or null
 *   const item = this.retry.takeDue();         // consume the due key
 *   this.retry.resolve(key, true/false);       // on retry answer
 *   this.retry.stats();                        // { fixed, stillWrong, pending }
 *
 * Rules:
 * - A missed key resurfaces only after `gap` other questions (adaptive when few remain).
 * - Correct on retry removes it permanently. Wrong re-queues at the back with attempts+1.
 * - Each key retries at most `maxRetries` times, then it is dropped (still counted as wrong).
 * - Keys are word strings; comparison is exact. No new questions are created.
 */
const EGL_Retry = (() => {
  const DEFAULT_GAP = 4;
  const DEFAULT_MAX_RETRIES = 2;

  function create(options) {
    const o = options || {};
    const gap = Math.max(1, o.gap || DEFAULT_GAP);
    const maxRetries = Math.max(1, o.maxRetries || DEFAULT_MAX_RETRIES);
    return new RetryQueue(gap, maxRetries);
  }

  function RetryQueue(gap, maxRetries) {
    this.gap = gap;
    this.maxRetries = maxRetries;
    this.pending = [];       // [{ key, attempts, wait }]
    this.fixed = 0;          // fixed on retry
    this.stillWrong = 0;     // exhausted retries
    this.firstTryCorrect = 0;
    this.firstTryWrong = 0;
  }

  RetryQueue.prototype.noteAsked = function () {
    // Kept for API compatibility; wait counters advance inside due().
  };

  RetryQueue.prototype.has = function (key) {
    return this.pending.some(e => e.key === key);
  };

  RetryQueue.prototype.schedule = function (key) {
    if (key == null) return;
    if (this.has(key)) return; // already queued
    this.firstTryWrong += 1;
    // wait counts down once per advance() decision; the miss itself consumed
    // one decision slot, so wait = gap + 1 surfaces the item after `gap`
    // further questions.
    this.pending.push({ key: key, attempts: 0, wait: this.gap + 1 });
  };

  RetryQueue.prototype.noteFirstTryCorrect = function () {
    this.firstTryCorrect += 1;
  };

  // Effective gap shrinks when the round is almost over so retries still surface.
  // need = max(1, min(gap, remainingNew)) but never below 1; when no new
  // questions remain (0), retries surface immediately.
  RetryQueue.prototype.effectiveGap = function (remainingNew) {
    if (typeof remainingNew !== 'number' || remainingNew < 0) return this.gap;
    if (remainingNew <= 0) return 1;
    if (remainingNew <= 1) return 1;
    if (remainingNew <= 3) return 2;
    return this.gap;
  };

  // A queued item is due when enough other questions have passed.
  // remainingNew: how many unseen questions remain (for adaptive gap).
  // Call once per next-question decision. Each call advances the wait
  // counters by one shown question.
  // Wait accounting: schedule() sets wait = gap + 1. Each due() call ticks
  // wait -= 1, then item is due when waited (= gap + 1 - wait) >= need.
  // With need = gap, the item surfaces after exactly `gap` further
  // decisions. With need = 1 (tail), it surfaces on the next decision.
  RetryQueue.prototype.due = function (remainingNew) {
    if (!this.pending.length) return null;
    const need = this.effectiveGap(remainingNew);
    this.pending.forEach(e => { e.wait -= 1; });
    for (let i = 0; i < this.pending.length; i++) {
      const waited = (this.gap + 1) - this.pending[i].wait;
      // need > 1: surface AFTER `need` other questions (strictly greater,
      // so the N+1-th decision shows the retry). need == 1 (tail drain):
      // surface on the very next decision.
      const isDue = (need <= 1) ? (waited >= need) : (waited > need);
      if (isDue) return this.pending[i].key;
    }
    return null;
  };

  RetryQueue.prototype.takeDue = function (key) {
    const i = this.pending.findIndex(e => e.key === key);
    if (i === -1) return null;
    const entry = this.pending[i];
    this.pending.splice(i, 1);
    return entry;
  };

  RetryQueue.prototype.resolve = function (key, isCorrect, entry) {
    const e = entry || { key: key, attempts: 0 };
    if (isCorrect) {
      this.fixed += 1;
      return 'fixed';
    }
    e.attempts += 1;
    if (e.attempts >= this.maxRetries) {
      this.stillWrong += 1;
      return 'dropped';
    }
    // Re-queue at the back with a fresh wait.
    this.pending.push({ key: e.key, attempts: e.attempts, wait: this.gap + 1 });
    return 'requeued';
  };

  RetryQueue.prototype.stats = function () {
    return {
      fixed: this.fixed,
      stillWrong: this.stillWrong,
      pending: this.pending.length,
      firstTryCorrect: this.firstTryCorrect,
      firstTryWrong: this.firstTryWrong
    };
  };

  return { create: create, RetryQueue: RetryQueue, DEFAULT_GAP: DEFAULT_GAP, DEFAULT_MAX_RETRIES: DEFAULT_MAX_RETRIES };
})();
