function mtof(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
  }
function playNote(e) {

    var osc = audioContext.createOscillator();
    var amp = audioContext.createGain();

    var playbackTime = e.playbackTime;
    var sustainTime = playbackTime + e.duration * (e.quantize / 100);
    var releaseTime = sustainTime + 0.2;
    var volume = 0.25 * (e.velocity / 100);

    if (muted){
      volume = 0;
    }
  
    osc.frequency.value = mtof(e.noteNumber);
    switch (e.wave){
      case 1:
        osc.type = "sine";
        break;
      case 2:
        osc.type = "square";
        break;
      case 3:
        osc.type = "sawtooth";
        break;
      case 4:
        osc.type = "triangle";
        break;
      default :
          console.log("wave type error: "+ e);
          osc.type = "sine";
        break;
    }
   
 
    amp.gain.setValueAtTime(volume, playbackTime);
    amp.gain.setValueAtTime(volume, sustainTime);
    amp.gain.exponentialRampToValueAtTime(1e-3, releaseTime);
    osc.start(playbackTime);
    osc.stop(releaseTime); // sound won't stop without this
    osc.connect(amp);
    amp.connect(audioContext.destination);


    //old
    // var t0 = e.playbackTime;
    // var t1 = t0 + e.duration * (e.quantize / 100);
    // var t2 = t1 + 0.5;
    // var osc1 = audioContext.createOscillator();
    // var osc2 = audioContext.createOscillator();
    // var amp = audioContext.createGain();
    // var volume = 0.25 * (e.velocity / 128);

    // osc1.frequency.value = mtof(e.noteNumber);
    // osc1.type = this.wave || "sine";
    // osc1.detune.setValueAtTime(+12, t0);
    // osc1.detune.linearRampToValueAtTime(+1, t1);
    // osc1.start(t0);
    // osc1.stop(t2);
    // osc1.connect(amp);

    // osc2.frequency.value = mtof(e.noteNumber);
    // osc2.type = this.wave || "sine";
    // osc2.detune.setValueAtTime(-12, t0);
    // osc2.detune.linearRampToValueAtTime(-1, t1);
    // osc2.start(t0);
    // osc2.stop(t2);
    // osc2.connect(amp);

    // amp.gain.setValueAtTime(volume, t0);
    // amp.gain.setValueAtTime(volume, t1);
    // amp.gain.exponentialRampToValueAtTime(1e-3, t2);
    // amp.connect(audioContext.destination);
  }