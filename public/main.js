$(document).ready(function() {

    var mapWidth = 800;
    var mapHeight = 600;

    var commands;

    var mapView = $('#map');
    var messagesHtml = '';
    var interval;
    
    function playCommands() {
        clearInterval(interval);
        if (commands.length) {
            interval = setInterval(playNextCommand, 100);
            playNextCommand();
        }
    }

    function playNextCommand() {
        if (commands.length) {
            var cmd = commands.shift();
            switch(cmd.t) {

                case 'message':
                    messagesHtml += cmd.text + '<br>';
                    $('#messages').html(messagesHtml);
                    break;

                case 'obj':
                    addObj(cmd);
                    break;

                case 'pause':
                    break;
            }
        }
    }

    function addObj(obj) {
        obj.x   = parseInt(obj.x) || 0;
        obj.y   = parseInt(obj.y) || 0;
        obj.w   = parseInt(obj.w) || 0;
        obj.h   = parseInt(obj.h) || 0;
        obj.px  = parseInt(obj.px) || 0;
        obj.py  = parseInt(obj.py) || 0;

        mapView.append('<img id="' + obj.id + '">');
        var v =  $('#' + obj.id);
        v.attr('src', 'img/' + obj.src + '.png');
        v.css('width', obj.w + 'px');
        v.css('height', obj.h + 'px');
        positionObj(obj);
    }

    function positionObj(obj) {
        var v =  $('#' + obj.id);
        var x = Math.floor((mapWidth / 2) + obj.x - ((obj.w / 2) + obj.px));
        var y = Math.floor((mapHeight / 2) + obj.y - (obj.h -  obj.py));
        v.css('left', x + 'px');
        v.css('top', y + 'px');
    }

    function post(command, data, callback) {
        $.ajax({
            type: "POST",
            url: 'api/' + command,
            data: data,
            success: callback,
            dataType: 'text'
        });
    }

    function updateScenePos() {
        var sw = $(window).width();
        var sh = $(window).height();
        mapView.css('width', mapWidth + 'px');
        mapView.css('height', mapHeight + 'px');
        mapView.css('left', Math.floor((sw / 2) - (mapWidth / 2)) + 'px');
        mapView.css('top', Math.floor((sh / 2) - (mapHeight / 2)) + 'px');
    }

    function onSendClick() {
        post('say', {message: $('#message').val()}, function(s) {
            showMessages(s);
        });
    }

    // -- go --

    updateScenePos();
    window.addEventListener('resize', updateScenePos);

    post('get', {}, function(s) {
        commands = JSON.parse(s);
        playCommands();
    });

});