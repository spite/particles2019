import Easings from '../modules/easings.js';

class Twixt {

  constructor() {
    this.count = 0;
    this.values = {};
    this.autoUpdate = true;
    this._update = this.update.bind(this);
    this._update();
  }

  create(value, easing) {
    const v = new TwixtValue(value, easing);
    v.id = this.count;
    this.count++;
    this.values[v.id] = v;
    return v;
  }

  destroy(v) {
    if (this.values[v.id]) {
      delete this.values[v.id];
    }
  }

  update() {
    const time = performance.now();
    Object.keys(this.values).forEach(v => {
      const value = this.values[v];
      this.updateValue(value, time);
    });
    if (this.autoUpdate) requestAnimationFrame(this._update);
  }

  updateValue(value, time, delay = 0) {
    if (value.reached) { return; }
    let nValue;
    let reached = false;
    if (value.duration === 0) {
      nValue = value.target;
      reached = true;
    } else {
      const fn = value.easing;
      let t = time - value.startTime - value.delayTime;
      t /= value.duration;
      if (t < 0) {
        nValue = value.origin;
      } else if (t >= 1) {
        nValue = value.target;
        reached = true;
      } else {
        t = fn(t);
        nValue = value.origin + t * (value.target - value.origin);
      }
    }
    value.value = nValue;
    if (reached && value.reached === false) {
      value.reached = true;
      if (value.onReached) {
        value.onReached();
        value.onReached = function() {};
      }
    }
  }
}

export class TwixtValue {

  constructor(value, easing) {
    this.value = value || 0;
    this.origin = value || 0;
    this.target = value || 0;
    this.easing = easing ? Easings[easing] : Easings.Linear;
    this.startTime = 0;
    this.delayTime = 0;
    this.duration = 0;
    this.reached = false;
    this.onReached = function() {}
  }

  to(target, duration, easing, delay) {
    this.origin = this.value;
    this.startTime = performance.now();
    this.delayTime = delay || 0;
    this.easing = easing ? Easings[easing] || this.easing : this.easing;
    this.target = target;
    this.duration = duration || 0;
    this.reached = false;
    const value = this;
    return new Promise((resolve, reject) => {
      value.onReached = resolve;
    });
  }

}

export { Twixt }