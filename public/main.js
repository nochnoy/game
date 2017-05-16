$(document).ready(function() {

    var mapWidth = 800;
    var mapHeight = 600;

    var commands = [];
    var currentCommand = null;

    var mapView = $('#map');
    var messagesHtml = '';
    var interval;

    var selectedObj;

    var selectionInterval;
    var movementInterval;
    var pauseTimeout;

    // --- Commands ----------------------------------------------

    function onCommandsReceived(s) {
        var a = JSON.parse(s);
        for(var i = 0; i < a.length; i++) {
            var cmd = a[i];
            commands.push(cmd);
        }
        playNextCommand();
    }
    
    /*function playCommands() {
        clearInterval(interval);
        if (commands.length) {
            interval = setInterval(playNextCommand, 10);
            playNextCommand();
        }
    }*/

    function playNextCommand() {
        if (currentCommand)
            return;

        if (!commands.length)
            return;

        currentCommand = commands.shift();
        switch(currentCommand.t) {
            case 'obj':     cmdAddObject(currentCommand);   break;
            case 'message': cmdMessage(currentCommand);     break;
            case 'pause':   cmdPause(currentCommand);       break;
            case 'move':    cmdMove(currentCommand);        break;
        }
    }

    function finishCurrentCommand() {
        currentCommand = null;
        playNextCommand();
    }

    function cmdAddObject(cmd) {
        addObj(cmd);
        finishCurrentCommand();
    }

    function cmdMessage(cmd) {
        messagesHtml += cmd.text + '<br>';
        $('#messages').html(messagesHtml);

        finishCurrentCommand();
    }

    function cmdPause(cmd) {
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(
            function(){
                clearTimeout(pauseTimeout);
                finishCurrentCommand();
            },
            100
        )
    }

    function cmdMove(cmd) {
        var view = $('#' + cmd.id);
        var stepsLeft = 10;
        var currentX = parseFloat(view.attr('x'));
        var currentY = parseFloat(view.attr('y'));
        var targetX = parseFloat(cmd.x);
        var targetY = parseFloat(cmd.y);
        var xStep = (targetX - currentX) / 10;
        var yStep = (targetY - currentY) / 10;

        clearInterval(movementInterval);
        movementInterval = setInterval(
            function() {
                currentX += xStep;
                currentY += yStep;
                view.css('left', currentX);
                view.css('top', currentY);
                stepsLeft--;
                if (stepsLeft < 0) {
                    clearInterval(movementInterval);
                    view.attr('x', targetX);
                    view.attr('y', targetY);
                    finishCurrentCommand();
                }
            },
            100
        );
    }

    // --- Requests ----------------------------------------------

    function requestMoveSelected(x, y) {
        var cmd = {id:selectedObj.attr('id'), x:x, y:y};
        post('move', cmd, function(s) {
            onCommandsReceived(s);
        });
    }

    // --- Objects -----------------------------------------------

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
        v.click(function(event) {
            event.stopImmediatePropagation();
            selectObj(v);
        });

        positionObj(obj);
    }

    function positionObj(obj) {
        var v =  $('#' + obj.id);
        var x = Math.floor((mapWidth / 2) + obj.x - ((obj.w / 2) + obj.px));
        var y = Math.floor((mapHeight / 2) + obj.y - (obj.h -  obj.py));
        v.css('left', x + 'px');
        v.css('top', y + 'px');
        v.attr('x', x);
        v.attr('y', y);
    }

    function selectObj(view) {
        if (view === selectedObj) {
            deselectObj();
            return;
        }
        deselectObj();
        selectedObj = view;
        view.css('opacity', 0);
        selectionInterval = setInterval(
            function() {
                var cur = parseFloat(view.css('opacity'));
                view.css('opacity', cur ? 0 : 1);
            },
            500
        );
    }

    function deselectObj() {
        if (selectedObj) {
            clearInterval(selectionInterval);
            selectedObj.css('opacity', 1);
            selectedObj = null;
        }
    }

    // --- Server -----------------------------------------------------

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
    $('#map').click(function(e) {
        if (selectedObj) {
            var x = e.clientX - $('#map').offset().left;
            var y = e.clientY - $('#map').offset().top;
            requestMoveSelected(x, y);
        }
    });

    post('get', {}, function(s) {
        onCommandsReceived(s);
    });

});