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
        var message = $('#message').val();

        post('say', {message: message}, function(s) {
            showMessages(s);
        });
    }


    // -- go --

    post('get', {}, function(s) {
        showMessages(s); 
    });

});