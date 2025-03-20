$(document).ready(function(){

    $(".cancelar").click(function(){
        $(".box-main-popup").fadeOut('slow');
    });    

    $(".popup #wfb-tabcalc-clear.wfb-tabcalc-standing-buttons").click(function(){
        $(".box-main-popup").fadeOut('slow');
    });     

    $(".layer").click(function(){
        $(".box-main-popup").fadeIn('slow');
    });  

});
