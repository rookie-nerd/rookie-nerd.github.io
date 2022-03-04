$(function(){
    $("#gotop").click(function(){
        jQuery("html,body").animate({
            scrollTop:0
        }, 500);
    });
    $(window).load(function() {
		$('#gotop').hide();
    })
    
    $(window).scroll(function() {
        if ( $(this).scrollTop() > 300){
            $('#gotop').fadeIn("fast");
        } else {
            $('#gotop').stop().fadeOut("fast");
        }

        if ( $(this).scrollTop() > 200 ){
            $('#toc').css({top: "10px"});
        } else {
            $('#toc').css({top: "200px"});
        }
    });

    $(document).ready(function() {
        $('#toc').toc({title: ''});
    });
});