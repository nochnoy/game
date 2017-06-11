$(document).ready(function() {

    var mapWidth = 800;
    var mapHeight = 600;

    var commands = [];
    var currentCommand = null;

    var objs = {};

    var bgView = $('#bg');
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
            this.atlasX = 0;
            this.atlasY = 0;
            this.direction = 1;
            this.type = '';
            this.view = null;
        }
        initView() {}
        animation(a) {}
        draw(xOffset = 0, yOffset = 0) {
            this.view.css('backgroundPosition', '-' + (this.atlasX + (xOffset * this.w)) + 'px -' + (this.atlasY + (yOffset * this.h)) + 'px');
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

    class Man extends Obj {
        constructor() {
            super();
            this.panic = false;
            this.goPhase = 0;
            this.currentAnimation = 'stay';
            this.animationInterval = setInterval(function(that){that.animate()}, 80, this);
        }
        animation(a) {
            this.currentAnimation = a;
        }
        animate() {
            let fistFrame = 0;
            if (this.panic) {
                fistFrame = 3;
            }
            switch(this.currentAnimation) {
                case 'stay':
                    this.draw(fistFrame + 0, 0);
                    break;
                case 'go':
                    this.draw(fistFrame + 1 + this.goPhase, 0);
                    if (++this.goPhase > 1) {
                        this.goPhase = 0;
                    }
                    break;
            }
        }
        setState(stateCmd) {
            if (stateCmd.hasOwnProperty('panic')) {
                this.panic = (stateCmd.panic == 'true');
            }
        }
    }

    class ManTot extends Man {
        constructor() {
            super();
            this.atlasX = 0;
            this.atlasY = 80;
        }
        initView() {
            this.animate();
        }
    }

    class ManKek extends Man {
        constructor() {
            super();
            this.atlasX = 0;
            this.atlasY = 130;
        }
        initView() {
            this.animate();
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
            case 'bg':          cmdBg(currentCommand);          break;
            case 'gameover':    cmdGameOver();                  break;
            case 'select':      cmdSelect(currentCommand);      break;
            case 'state':       cmdState(currentCommand);       break;
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

        obj.animation('go');

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
                    obj.animation('stay');
                    positionObj(obj);
                    finishCurrentCommand();
                }
            },
            millisecondsPerStep
        );
    }

    function cmdGameOver(cmd) {
        commands.length = 0;
        finishCurrentCommand();
    }

    function cmdBg(cmd) {
        $('#bg').empty();
        $('#bg').append('<img src="img/' +cmd.src + '.jpg">');
        $(document.body).css('background-color', cmd.color);
        finishCurrentCommand();
    }

    function cmdSelect(cmd) {
        var obj = getObj(cmd.id);
        if (obj) {
            var v = getObjView(obj);
            if (v) {
                selectObj(v);
            }
        }
        finishCurrentCommand();
    }

    function cmdState(cmd) {
        var obj = getObj(cmd.id);
        if (obj) {
           obj.setState(cmd);
        }
        finishCurrentCommand();
    }

    // --- Requests ----------------------------------------------

    function requestMoveSelected(x, y) {
        if (selectedObj) {
            var cmd = {id:selectedObj.id, x:x, y:y};
            post('go', cmd, function(s) {
                onCommandsReceived(s);
            });
        }
    }

    // --- Objects -----------------------------------------------

    function objFactory(raw) {
        let obj;
        switch (raw.type) {
            case 'man_tot': obj = new ManTot; break;
            case 'man_kek': obj = new ManKek; break;
            default:        obj = new Obj(); break;
        }
        obj.deserialize(raw);
        return obj;
    }

    function addObj(raw) {
        if (!raw.id)
            return;

        var obj = objFactory(raw);
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

        obj.view = v;
        obj.initView();
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
        var v = getObjView(obj);
        if (v) {
            switch(obj.type) {
                case 'fire1':
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

        bgView.css('width', mapWidth + 'px');
        bgView.css('height', mapHeight + 'px');
        bgView.css('left', Math.floor((sw / 2) - (mapWidth / 2)) + 'px');
        bgView.css('top', Math.floor((sh / 2) - (mapHeight / 2)) + 'px');

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