console.log("yeet");

$(document).ready(function() {
    $(".form-group").hide();


    $('h2').mouseover(function(){
        console.log($(this).css("font-size"));
        var newSize = parseInt($(this).css("font-size")) + 5;
        $(this).css("font-size", newSize + "px");

        $(this).click(function(){
           $(this).next("form").children().show();
        });

    });
  
    $('h2').mouseout(function(){
        console.log($(this).css("font-size"));

        var newSize = parseInt($(this).css("font-size")) - 5;

        $(this).css("font-size", newSize + "px");

    });


    
   

});