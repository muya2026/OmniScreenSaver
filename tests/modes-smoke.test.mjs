import test from "node:test";
import assert from "node:assert/strict";
import { MODES } from "../js/modes/index.js";

class GradientMock {
  addColorStop() {}
}

function makeContext() {
  const calls = { draw: 0 };
  const target = {
    calls,
    globalAlpha: 1,
    font: "16px sans-serif",
    measureText(text) {
      const match = /([\d.]+)px/.exec(this.font);
      const size = Number(match?.[1] || 16);
      return { width: [...String(text)].length * size * 0.58, actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 };
    },
    createLinearGradient() { return new GradientMock(); },
    createRadialGradient() { return new GradientMock(); },
    save() {},
    restore() {},
    setTransform() {},
    fillRect() { calls.draw++; },
    strokeRect() { calls.draw++; },
    fillText() { calls.draw++; },
    strokeText() { calls.draw++; },
    drawImage() { calls.draw++; },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {},
    ellipse() {},
    rect() {},
    roundRect() {},
    fill() { calls.draw++; },
    stroke() { calls.draw++; },
    clip() {},
    translate() {},
    rotate() {},
    scale() {},
    transform() {}
  };
  return new Proxy(target, {
    get(object, key) {
      if (key in object) return object[key];
      return () => {};
    },
    set(object, key, value) {
      object[key] = value;
      return true;
    }
  });
}

class CanvasMock {
  constructor() {
    this.width = 1;
    this.height = 1;
    this.clientWidth = 240;
    this.clientHeight = 80;
    this.context = makeContext();
  }
  getContext(kind) {
    return kind === "2d" ? this.context : null;
  }
  setAttribute() {}
}

const shape = {
  text: "Muya",
  aspect: 3.1,
  graphemes: ["M", "u", "y", "a"],
  points: Array.from({ length: 360 }, (_, index) => {
    const t = index / 359;
    const x = t * 0.96 - 0.48;
    const y = Math.sin(t * Math.PI * 8) * 0.1 + Math.cos(t * Math.PI * 2) * 0.23;
    return { x, y, alpha: 1 };
  })
};

test("every gallery world renders live frames without a still-image fallback", () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement(name) {
      assert.equal(name, "canvas");
      return new CanvasMock();
    }
  };

  try {
    for (const mode of MODES) {
      const canvas = new CanvasMock();
      let soundEvents = 0;
      let renderer;
      assert.doesNotThrow(() => {
        renderer = mode.create({
          canvas,
          name: "Muya",
          shape,
          language: "en",
          showName: true,
          preview: true,
          emitSound: () => soundEvents++
        });
        renderer.resize(240, 80, 1);
      }, `${mode.id}: create/resize`);

      for (let frame = 0; frame < 84; frame++) {
        const time = frame / 10;
        assert.doesNotThrow(() => renderer.frame(1 / 60, time), `${mode.id}: frame ${frame}`);
      }
      for (const time of [9, 12, 15, 18, 22, 26, 30]) {
        assert.doesNotThrow(() => renderer.frame(1 / 60, time), `${mode.id}: cycle ${time}`);
      }
      assert.ok(canvas.context.calls.draw > 0, `${mode.id}: should draw animated frames`);
      assert.doesNotThrow(() => renderer.destroy?.(), `${mode.id}: destroy`);
    }
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
