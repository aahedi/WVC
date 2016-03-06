var playback_status = "off"; // on/off

var local_stream = null;
var source = null;
var AudioContext;
var context = null;
var analyser = null;
var frequencyData = null;
var visualisation = null;
var barSpacingPercent = null;

function onPlay() {
    if (playback_status === "off") {
      playback_status = "on";

      AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      analyser = context.createAnalyser();

      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
        local_stream = stream;
          source = context.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.connect(context.destination); //maybe not
      });

      analyser.fftSize = 1024;

      frequencyData = new Uint8Array(analyser.frequencyBinCount);

      // Set up the visualisation elements
      visualisation = $("#INvisualisation");
      barSpacingPercent = 100 / analyser.frequencyBinCount;
      for (var i = 0; i < analyser.frequencyBinCount; i++) {
      	$("<div/>").css("left", i * barSpacingPercent + "%")
      	.css("background-color", "darkorange")
      	.css("position", "absolute")
      	.css("display", "inline-block")
      	.css("width", "2.5%")
      		.appendTo(visualisation);
      }
      var bars = $("#INvisualisation > div");

      function update() {

          if (playback_status === "on") {

            // Schedule the next update
            requestAnimationFrame(update);
            // Get the new frequency data
            analyser.getByteFrequencyData(frequencyData);
            // Update the visualisation
            bars.each(function (index, bar) {
                bar.style.height = frequencyData[index] + 'px';
            });

          } else {
            return;
          }
      };

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
