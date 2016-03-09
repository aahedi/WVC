var playback_status = "off"; // on/off

var local_stream = null;
var source = null;
var AudioContext;
var context = null;
var analyser = null;
var frequencyData = null;
var visualisation = null;
var barSpacingPercent = null;
var prebars = null;
var postbars = null;

//experimental
var preanalyser = null;
var prefilter = null;
var postfilter = null;
var lastfilter = null;
var effect = null;

function onPlay() {
    if (playback_status === "off") {
      playback_status = "on";

      AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      analyser = context.createAnalyser();

      //clearing noise: highshelf(f: 500, g: -50) - > lowshelf(f: 100, g: -50)
      postfilter = context.createBiquadFilter();
      postfilter.type = "lowshelf";
      postfilter.frequency.value = 400;
      postfilter.gain.value = -50;

      prefilter = context.createBiquadFilter();
      prefilter.type = "highshelf";
      prefilter.frequency.value = 1000;
      prefilter.gain.value = -50;

      lastfilter = context.createBiquadFilter();
      lastfilter.type = "highshelf";
      lastfilter.frequency.value = 4000;
      lastfilter.gain.value = -50;

      preanalyser = context.createAnalyser();
      effect = context.createScriptProcessor(1024, 1, 1);

      // Give the node a function to process audio events
      effect.onaudioprocess = function (audioProcessingEvent) {
        // The input buffer is the microphone audio input
        var inputBuffer = audioProcessingEvent.inputBuffer;

        // The output buffer contains the samples that will be modified and played
        var outputBuffer = audioProcessingEvent.outputBuffer;

        // Loop through the output channels (in this case there is only one)
        for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          var inputData = inputBuffer.getChannelData(channel);
          var outputData = outputBuffer.getChannelData(channel);

          //resample data
          var downData = resampleFloat(inputData, 0.8);
          //place resampled data on output array
          for (var i = 0; i < outputData.length; i++) {
            var index = i%downData.length;
            outputData[i] = downData[index];
          };
        }
      }

      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        local_stream = stream;
          source = context.createMediaStreamSource(stream);
          
          source.connect(preanalyser);
          //analyser to display intput spectrum
          preanalyser.connect(prefilter);
          //get rid of ambient noise
          prefilter.connect(postfilter);
          postfilter.connect(effect);
          //apply effect
          effect.connect(lastfilter);
          //filter spectrum copies
          lastfilter.connect(analyser);
          //analyser to display output spectrum
          analyser.connect(context.destination); //maybe not
      });

      analyser.fftSize = 512;

      frequencyData = new Uint8Array(analyser.frequencyBinCount);

      // Set up the visualisation elements
      visualisation = $("#INvisualisation");
      barSpacingPercent = 100 / preanalyser.frequencyBinCount;
      for (var i = 0; i < preanalyser.frequencyBinCount; i++) {
      	$("<div/>").css("left", i * barSpacingPercent + "%")
      	.css("background-color", "darkorange")
      	.css("position", "absolute")
      	.css("display", "inline-block")
      	.css("width", "2.5%")
      		.appendTo(visualisation);
      }
      prebars = $("#INvisualisation > div");

      visualisation = $("#OUTvisualisation");
      barSpacingPercent = 100 / analyser.frequencyBinCount;
      for (var i = 0; i < analyser.frequencyBinCount; i++) {
        $("<div/>").css("left", i * barSpacingPercent + "%")
        .css("background-color", "darkorange")
        .css("position", "absolute")
        .css("display", "inline-block")
        .css("width", "2.5%")
          .appendTo(visualisation);
      }
      postbars = $("#OUTvisualisation > div");

      $("#play_icon").toggleClass("glyphicon glyphicon-play", false);
      $("#play_icon").toggleClass("glyphicon glyphicon-pause", true);

      update();
    } else {
      //ideal action below
      /*
      playback_status = "off";
      local_stream.stop();

      $("#play_icon").toggleClass("glyphicon glyphicon-pause", false);
      $("#play_icon").toggleClass("glyphicon glyphicon-play", true);
      */
      // but something is leaking
      //cheap solution:
      location.reload();
    }
}

function update() {

    if (playback_status === "on") {

      // Schedule the next update
      requestAnimationFrame(update);
      // Get the new frequency data
      preanalyser.getByteFrequencyData(frequencyData);
      // Update the visualisation
      prebars.each(function (index, bar) {
          bar.style.height = frequencyData[index] + 'px';
      });
      // Get the new frequency data
      analyser.getByteFrequencyData(frequencyData);
      // Update the visualisation
      postbars.each(function (index, bar) {
          bar.style.height = frequencyData[index] + 'px';
      });

    } else {
      return;
    }
};

function resampleFloat (input, ratio) {
  var bufSize = Math.floor(input.length/ratio);
  var data = 0;
  var out = new Float32Array(bufSize);

  var start = 0;
  var startDec = 0;
  var end = ratio;
  var endDec = 0;
  var iter = Math.floor(ratio)-1;

  for (var i = 0; i < out.length; i++) {
    startDec = Math.ceil(start) - start;
    start = Math.floor(start);
    endDec = end - Math.floor(end);
    end = Math.floor(end);
    data = startDec*input[start];
    for (var j = 0; j < iter; j++) {
      data += input[start+j];
    };
    data += endDec*input[end];
    out[i] = data/ratio;
    start = end+endDec;
    end = start+ratio;
  };

  return out;
}
