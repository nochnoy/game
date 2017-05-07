$(document).ready(function() {
    
    showMessages = function(s) {
        $('#messages').html(s);
    }

    post = function(command, data, callback) {
        $.ajax({
            type: "POST",
            url: 'api/' + command,
            data: data,
            success: callback,
            dataType: 'text'
        });
    }

    onSendClick = function() {
        post('say', {message: $('#message').val()}, function(s) {
            showMessages(s);
        });
    }

    // -- go --

    post('get', {}, function(s) {
        showMessages(s); 
    });

});