$(document).ready(function() {

    var mapWidth = 800;
    var mapHeight = 600;

    var commands = [];
    var currentCommand = null;

    var objs = {};

    var mapView = $('#map');
    var logView = $('#log');
    var messagesHtml = '';
    var interval;

    var selectedObj;

    var selectionInterval;
    var movementInterval;

    // --- Obj ----------------------------------------------

    class Obj {
        constructor() {
            this.id = -1;
            this.src = '';
            this.selectable = false;
            this.x = 0;
            this.y = 0;
            this.w = 0;
            this.h = 0;
            this.px = 0;
            this.py = 0;
            this.direction = 1;
            this.type = '';
        }
        deserialize(raw) {
            this.id = raw.id;
            this.src = raw.src;
            this.selectable = (raw.selectable == 'true');
            this.x = parseFloat(raw.x) || 0;
            this.y = parseFloat(raw.y) || 0;
            this.w = parseFloat(raw.w) || 0;
            this.h = parseFloat(raw.h) || 0;
            this.px = parseFloat(raw.px) || 0;
            this.py = parseFloat(raw.py) || 0;
            this.type = raw.type || '';
        }
    }

    // --- Commands ----------------------------------------------

    function onCommandsReceived(s) {
        var a = JSON.parse(s);
        for(var i = 0; i < a.length; i++) {
            var cmd = a[i];
            commands.push(cmd);
        }
        playNextCommand();
    }

    function playNextCommand() {
        if (currentCommand)
            return;

        if (!commands.length)
            return;

        currentCommand = commands.shift();
        switch(currentCommand.t) {
            case 'add':         cmdAddObject(currentCommand);   break;
            case 'del':         cmdDeleteObject(currentCommand);break;
            case 'log':         cmdLog(currentCommand);         break;
            case 'clearlog':    cmdClearLog(currentCommand);    break;
            case 'pause':       cmdPause(currentCommand);       break;
            case 'go':          cmdGo(currentCommand);          break;
            case 'gameover':    cmdGameOver();                  break;
        }
    }

    function finishCurrentCommand() {
        currentCommand = null;
        playNextCommand();
    }

    function cmdAddObject(cmd) {
        addObj(cmd);
        setTimeout(function() {
            finishCurrentCommand();
        }, 100);
    }

    function cmdDeleteObject(cmd) {
        var obj = getObj(cmd.id);
        if (obj) {
            removeObj(obj);
        }
        finishCurrentCommand();
    }

    function cmdLog(cmd) {
        messagesHtml += cmd.text + '<br>';
        $('#log').html(messagesHtml);
        setTimeout(function() {
            finishCurrentCommand();
        }, Math.random() * 50 + 30);
    }

    function cmdClearLog(cmd) {
        messagesHtml = '';
        $('#log').html(messagesHtml);
        setTimeout(function() {
            finishCurrentCommand();
        }, 100);
    }

    function cmdPause(cmd) {
        setTimeout(function() {
            finishCurrentCommand();
        }, (parseFloat(cmd.seconds) || 1) * 1000);
    }

    function cmdGo(cmd) {
        const pixelsPerMillisecond = 0.1;
        const millisecondsPerStep = 25;
        const pixelsPerStep = pixelsPerMillisecond * millisecondsPerStep;

        let obj = getObj(cmd.id);
        let x1 = obj.x;
        let y1 = obj.y;
        let x2 = parseFloat(cmd.x);
        let y2 = parseFloat(cmd.y);
        let xDistance = x2 - x1;
        let yDistance = y2 - y1;
        let distance = Math.hypot(xDistance, yDistance);
        let millisecondsForPath = distance / pixelsPerMillisecond;
        let stepsCount = Math.round(millisecondsForPath / millisecondsPerStep);
        let xStep = (x2 - x1) / stepsCount;
        let yStep = (y2 - y1) / stepsCount;

        if(x2 >= x1)
            obj.direction = 1;
        else
            obj.direction = -1;

        clearInterval(movementInterval);
        movementInterval = setInterval(
            function() {
                if (--stepsCount > 0) {
                    obj.x += xStep;
                    obj.y += yStep;
                    positionObj(obj);
                } else {
                    obj.x = x2;
                    obj.y = y2;
                    clearInterval(movementInterval);
                    positionObj(obj);
                    finishCurrentCommand();
                }
            },
            millisecondsPerStep
        );
    }

    function cmdGameOver() {
        commands.length = 0;
        finishCurrentCommand();
    }

    // --- Requests ----------------------------------------------

    function requestMoveSelected(x, y) {
        if (selectedObj) {
            var cmd = {id:selectedObj.id, x:x, y:y};
            post('move', cmd, function(s) {
                onCommandsReceived(s);
            });
        }
    }

    // --- Objects -----------------------------------------------

    function addObj(raw) {
        if (!raw.id)
            return;

        var obj = new Obj();
        obj.deserialize(raw);

        objs['o' + obj.id] = obj;

        addObjView(obj);
        initObjType(obj);
        updateObj(obj);
    }

    function removeObj(obj) {
        destroyObj(obj);
        removeObjView(obj);
        delete objs['o' + obj.id];
    }

    function addObjView(obj) {
        mapView.append('<div id="' + obj.id + '">');

        var v = getObjView(obj);

        v.css('backgroundImage', 'url(img/' + obj.src + '.png)');
        v.css('backgroundPosition', '0px 0px');

        if (obj.selectable) {
            v.css('cursor', 'pointer');
        } else {
            v.css('cursor', 'auto');
            v.css('pointer-events', 'none');
        }
    }

    function removeObjView(obj) {
        $('#' + obj.id).remove();
    }

    function updateObj(obj) {
        var v =  getObjView(obj);
        v.css('width', obj.w + 'px');
        v.css('height', obj.h + 'px');
        v.click(function(event) {
            event.stopImmediatePropagation();
            selectObj(v);
        });
        positionObj(obj);
    }

    function positionObj(obj) {
        var v =  getObjView(obj);
        var x = Math.floor((mapWidth / 2) + obj.x - ((obj.w / 2) + obj.px));
        var y = Math.floor((mapHeight / 2) + obj.y - (obj.h -  obj.py));
        v.css('left', x + 'px');
        v.css('top', y + 'px');
        v.css('z-index', parseInt(obj.y));
        v.attr('x', x);
        v.attr('y', y);
        v.css('opacity', 1); // Если двинули мигающий объект, то пусть он размигнёт

        if(obj.direction == -1)
            v.css('transform', 'scaleX(-1)');
        else
            v.css('transform', '');
    }

    function initObjType(obj) {
        switch(obj.type) {

            case 'fire1':
                var v = getObjView(obj);
                obj.curFrame = 0;
                clearInterval(obj.fire1Intr);
                obj.fire1Intr = setInterval(function() {
                    v.css('backgroundPosition', '-' + (obj.curFrame * 50) + 'px 0px');
                    obj.curFrame ++;
                    if (obj.curFrame >= 9) {
                        obj.curFrame = 0;
                    }
                }, 100);
                break;

        }
    }

    function destroyObj(obj) {
        switch(obj.type) {

            case 'fire1':
                clearInterval(obj.fire1Intr);
                break;

        }
    }

    function getObj(id) {
        return objs['o' + id];
    }

    function getObjView(obj) {
        return $('#' + obj.id);
    }

    function positionAll() {
        for (var id in objs) {
            positionObj(objs[id]);
        }
    }

    function selectObj(view) {
        var obj = getObj(view.attr('id'));

        if (obj === selectedObj) {
            deselectObj();
            return;
        }

        if (!obj.selectable) {
            return;
        }

        deselectObj();
        selectedObj = obj;
        view.css('opacity', 0);
        selectionInterval = setInterval(
            function() {
                var cur = parseFloat(view.css('opacity'));
                view.css('opacity', (cur && !currentCommand) ? 0 : 1);
            },
            500
        );
    }

    function deselectObj() {
        if (selectedObj) {
            clearInterval(selectionInterval);
            var view = getObjView(selectedObj);
            view.css('opacity', 1);
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

        logView.css('width', mapWidth + 'px');
        logView.css('height', mapHeight + 'px');
        logView.css('left', Math.floor((sw / 2) - (mapWidth / 2)) + 'px');
        logView.css('top', Math.floor((sh / 2) - (mapHeight / 2)) + 'px');

        positionAll();
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
            var x = (e.clientX - $('#map').offset().left) - Math.floor(mapWidth / 2);
            var y = (e.clientY - $('#map').offset().top) - Math.floor(mapHeight / 2);
            requestMoveSelected(x, y);
        }
    });

    post('get', {}, function(s) {
        onCommandsReceived(s);
    });

});