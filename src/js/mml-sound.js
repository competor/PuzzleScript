var whitenoiseData = new Float32Array(44100 * 5);
var whitenoiseBuffer = null;
var pinknoiseData = new Float32Array(44100 * 5);
var pinknoiseBuffer = null;
b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
for (var i = 0, imax = whitenoiseData.length; i < imax; i++) {
  whitenoiseData[i] = Math.random() * 2 - 1;

  b0 = 0.99886 * b0 + whitenoiseData[i] * 0.0555179;
  b1 = 0.99332 * b1 + whitenoiseData[i] * 0.0750759;
  b2 = 0.96900 * b2 + whitenoiseData[i] * 0.1538520;
  b3 = 0.86650 * b3 + whitenoiseData[i] * 0.3104856;
  b4 = 0.55000 * b4 + whitenoiseData[i] * 0.5329522;
  b5 = -0.7616 * b5 - whitenoiseData[i] * 0.0168980;
  pinknoiseData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + whitenoiseData[i] * 0.5362;
  pinknoiseData[i] *= 0.11;
  b6 = whitenoiseData[i] * 0.115926;
}

function whiteNoiseNode(audioContext) {
  if (whitenoiseBuffer === null) {
    whitenoiseBuffer = audioContext.createBuffer(1, whitenoiseData.length, audioContext.sampleRate);
    whitenoiseBuffer.getChannelData(0).set(whitenoiseData);
  }
  var bufferSource = audioContext.createBufferSource();

  bufferSource.buffer = whitenoiseBuffer;
  bufferSource.loop = true;

  return bufferSource;
}

function pinkNoiseNode(audioContext) {
  if (pinknoiseBuffer === null) {
    pinknoiseBuffer = audioContext.createBuffer(1, whitenoiseData.length, audioContext.sampleRate);
    pinknoiseBuffer.getChannelData(0).set(pinknoiseData);
  }

  var bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = pinknoiseBuffer;
  bufferSource.loop = true;

  return bufferSource;
}

function mtof(noteNumber) {
  return 440 * Math.pow(2, (noteNumber - 69) / 12);
}

function mtof2(noteNumber){
  var f = mtof(noteNumber);
  console.log("noise frequency:" + f);
  if(f < 0){
    f=0;
  }
  else if(f > 24000){
    f = 24000;
  }
  return f;
}

function playOscNote(e) {
  var osc = audioContext.createOscillator();

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
  }

  var amp = audioContext.createGain();
  var playbackTime = e.playbackTime;
  var sustainTime = playbackTime + e.duration * (e.quantize / 100);
  var releaseTime = sustainTime + 0.005; //to avoid glitch noise
  var volume = 0.25 * (e.velocity / 100);

  if (muted){
    volume = 0;
  }

  osc.frequency.value = mtof(e.noteNumber);
  amp.gain.setValueAtTime(volume, playbackTime);
  amp.gain.setValueAtTime(volume, sustainTime);
  amp.gain.exponentialRampToValueAtTime(1e-3, releaseTime);
  osc.start(playbackTime);
  osc.stop(releaseTime); // sound won't stop without this
  osc.connect(amp);
  amp.connect(audioContext.destination);
}

function playNoiseNote(e) {
  switch (e.wave){
    case 5: // WhiteNoiseNode
      var osc = new whiteNoiseNode(audioContext);
      break;
    case 6: // pinkNoiseNode
      var osc = new pinkNoiseNode(audioContext);
      break;
  }

  var amp = audioContext.createGain();
  var playbackTime = e.playbackTime;
  var sustainTime = playbackTime + e.duration * (e.quantize / 100);
  var releaseTime = sustainTime + 0.005; //to avoid glitch noise
  var volume = 0.25 * (e.velocity / 100);

  var filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = mtof2(e.noteNumber);
  filter.Q.value = 2; //The greater the Q value, the larger the frequency band. default value of 1 and a nominal range of 0.0001 to 1000.

  amp.gain.setValueAtTime(volume, playbackTime);
  amp.gain.setValueAtTime(volume, sustainTime);
  amp.gain.exponentialRampToValueAtTime(1e-3, releaseTime);
  osc.start(playbackTime);
  osc.stop(releaseTime); // sound won't stop without this
  
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(audioContext.destination);
}

function playNote(e) {
  switch (e.wave){
    case 1:
    case 2:
    case 3:
    case 4:
      playOscNote(e);
      break;
    case 5: // WhiteNoiseNode
    case 6: // pinkNoiseNode
      playNoiseNote(e)
      break;
    default :
      console.log("wave type error: "+ e);
      osc.type = "sine";
      break;
  }
}