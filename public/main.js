$(document).ready(function() {
    
    addMessage = function(s) {
        $('#messages').prepend('<p>' + s + '</p>');
    }

    onSendClick = function() {
        $.ajax({
            url: "api/mycommand/myparam",
            context: document.body
        }).done(function(res) {
            addMessage(res);
        });
    }

});