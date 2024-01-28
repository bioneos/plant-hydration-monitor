$(document).ready(function() {
  const progressbar = $('#progress_bar');
  const rainbow = new Rainbow();
  let value = 0;
  rainbow.setSpectrum('#8A360F', '#DFFF00','green');  

  const loading = function() {
    $.get( '/saturation', function(data) {
      console.log(data);
      value = data.value;
      let decimal = (1023-value)/1023;
      // const decimal = value / 1023;
      const percent = decimal * 100;
      progressbar.val(percent);

      $('.progress-value').html(decimal*100 + '%');
      const $ppc = $('.progress-pie-chart'),
      deg = 360 * decimal;
      if (percent > 50) {
        $ppc.addClass('gt-50');
      }
      else
      {
        $ppc.removeClass('gt-50')
      } 

      $('.ppc-progress-fill').css('transform', 'rotate(' + deg + 'deg)');
      // Set the value into the background color using rainbowvis
      $('.ppc-percents').css("background", '#' + rainbow.colorAt(percent));
    });
  };

  loading();
});
