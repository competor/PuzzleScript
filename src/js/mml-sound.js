function mtof(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
  }
function playNote(e) {
// osc.type
//      1 "sine"
//      2 "square"
//      3 "sawtooth"
//      4 "triangle"
//      5 "custom"
    var t0 = e.playbackTime;
    var t1 = t0 + e.duration * (e.quantize / 100);
    var t2 = t1 + 0.5;
    var osc1 = audioContext.createOscillator();
    var osc2 = audioContext.createOscillator();
    var amp = audioContext.createGain();
    var volume = 0.25 * (e.velocity / 128);

    osc1.frequency.value = mtof(e.noteNumber);
    osc1.type = this.wave || "sine";
    osc1.detune.setValueAtTime(+12, t0);
    osc1.detune.linearRampToValueAtTime(+1, t1);
    osc1.start(t0);
    osc1.stop(t2);
    osc1.connect(amp);

    osc2.frequency.value = mtof(e.noteNumber);
    osc2.type = this.wave || "sine";
    osc2.detune.setValueAtTime(-12, t0);
    osc2.detune.linearRampToValueAtTime(-1, t1);
    osc2.start(t0);
    osc2.stop(t2);
    osc2.connect(amp);

    amp.gain.setValueAtTime(volume, t0);
    amp.gain.setValueAtTime(volume, t1);
    amp.gain.exponentialRampToValueAtTime(1e-3, t2);
    amp.connect(audioContext.destination);
  }