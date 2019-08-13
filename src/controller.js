angular.module('heptawardApp').controller('SchedulerCtrl', function ($scope, Scheduler, TvManagement, Socket, $interval, ChannelHTTP, Notification) { // eslint-disable-line
  /* ------------------------------------- */
  // SCHEDULER
  // TO DO:
  // 2. manage scroll?

  const reassignMouseEvent = (move = null, up = null) => {
    document.onmousemove = move;
    document.onmouseup = up;
    $scope.grabbed = false;
    if (!move) {
      $scope.$apply();
    }
  };

  let currentElem = null;

  const lineTime = (initialize, colour, yPx, screenSizeChange) => {
    const today = new Date();
    const oneCellPx = ($scope.container.y2 - $scope.container.y1) / 12;
    let pXToHour = yPx ? 2 * ((yPx - $scope.container.y1) / oneCellPx) : null;
    pXToHour = pXToHour < 0 ? 0.00 : pXToHour;
    $scope[`${colour}Time`] = yPx
      ? `${Math.floor(pXToHour)}:${Math.floor((pXToHour % 1) * 60) < 10 ? `0${Math.floor((pXToHour % 1) * 60)}` : Math.floor((pXToHour % 1) * 60)}`
      : `${today.getHours()}:${today.getMinutes() < 10 ? `0${today.getMinutes()}` : today.getMinutes()}`;
    const topPx = yPx || ((oneCellPx * (today.getHours() / 2)) + $scope.container.y1) + ((oneCellPx / 120) * (today.getMinutes()));

    const line = document.getElementById(`${colour}Line`);
    const time = document.getElementById(`${colour}Time`);
    if (initialize || !line.style.top) {
      Object.assign(line.style, {
        ...line.style,
        position: 'fixed',
        top: `${topPx}px`,
        left: `${$scope.container.x1}px`,
        width: `${$scope.container.x2 - $scope.container.x1}px`,
        height: '1px',
        'background-color': colour,
        display: true,
      });
      Object.assign(time.style, {
        ...time.style,
        position: 'fixed',
        top: `${topPx - 10}px`,
        left: `${$scope.container.x2 + 3}px`,
        width: `${$scope.container.x2 - $scope.container.x1}px`,
        color: colour,
        display: true,
      });
      $scope.$apply();
    } else {
      if (line.style.display === 'none' || time.style.display === 'none') {
        line.style.display = '';
        time.style.display = '';
      }

      line.style.top = `${topPx < $scope.container.y1 ? $scope.container.y1 : topPx}px`;
      time.style.top = `${(topPx < $scope.container.y1 ? $scope.container.y1 : topPx) - 10}px`;
      if (colour === 'blue') {
        $scope.$apply();
      }
      if (screenSizeChange) {
        line.style.left = `${$scope.container.x1}px`;
        time.style.left = `${$scope.container.x2 + 3}px`;
        $scope.$apply();
      }
    }
  };

  const color = ['primary', 'secondary', 'accent'];

  const initialize = async () => {
    // get all channels available
    $scope.channels = await ChannelHTTP.getAllForTeam();
    $scope.channels.forEach((channel, i) => Object.assign(channel, { className: color[i % 3] }));
    $scope.container = Scheduler.main('container');

    $scope.container.populateDays($scope.device.schedule
      ? $scope.device.schedule.map(s => {
        const channel = $scope.channels.find(c => c._id === s.channelId) || {};
        return { ...s, id: Scheduler.randomToken(), className: channel.className || 'primary' };
      })
      : []);
    lineTime(true, 'red');
    $scope.$apply();
    // }, 100);
  };

  const intervalRedLineTime = $interval(() => {
    lineTime(false, 'red');
  }, 10000);

  const getChannel = (id) => $scope.channels.find(c => c._id === id);

  const onMouseMove = (e) => {
    currentElem.style.top = `${e.clientY - 10}px`;
    currentElem.style.left = `${e.clientX - (currentElem.clientWidth / 2)}px`;
    if ($scope.container.inContainer(e.clientX, e.clientY)) {
      lineTime(false, 'blue', e.clientY - 10);
    }
  };

  const onMouseMoveOutside = (e) => {
    currentElem.style.top = `${e.clientY - 20}px`;
    currentElem.style.left = `${e.clientX - (currentElem.clientWidth / 2)}px`;
    if ($scope.container.inContainer(e.clientX, e.clientY)) {
      lineTime(false, 'blue', e.clientY - 10);
    }
  };

  const onMouseUpInside = (e) => {
    const line = document.getElementById('blueLine');
    line.style.display = 'none';
    const time = document.getElementById('blueTime');
    time.style.display = 'none';
    if ($scope.container.inContainer(e.clientX, e.clientY)) {
      const position = $scope.container.getPosition(e.clientX, e.clientY);
      const done = $scope.container.addDay(
        currentElem.channel,
        position[0],
        position[1] + position[2],
        currentElem.channel.to - (currentElem.channel.from - ((position[1] + position[2]) * 2)),
        currentElem.channel.id
      );
      if (!done) {
        $scope.$apply();
        $scope.container.populateDays([{ ...currentElem.channel }]);
      }
    } else {
      $scope.container.removeById(currentElem.channel.id);
    }

    reassignMouseEvent();
  };

  const onMouseUpOutSide = (e) => {
    const line = document.getElementById('blueLine');
    line.style.display = 'none';
    const time = document.getElementById('blueTime');
    time.style.display = 'none';
    if ($scope.container.inContainer(e.clientX, e.clientY)) {
      const position = $scope.container.getPosition(e.clientX, e.clientY);
      const done = $scope.container.addDay(currentElem.channel, position[0], position[1]);
      // should we alert the user that we didn't add the "day"
    }
    currentElem.parentNode.removeChild(currentElem);
    reassignMouseEvent();
  };

  const copyNode = (node, e) => {
    currentElem = node.cloneNode();
    const channel = getChannel(e.target.id);

    Object.assign(currentElem, {
      fromInside: false,
      channel,
      innerHTML: node.innerHTML,
    });

    Object.assign(currentElem.style, {
      ...node.style,
      width: node.clientWidth,
      height: node.clientHeight,
      position: 'fixed',
      top: `${e.clientY - (node.clientHeight / 2)}px`,
      left: `${e.clientX - (node.clientWidth / 2)}px`,
      'z-index': 2,
      cursor: 'grabbing',
    });
    currentElem.id = 'drag';
  };

  $scope.onMouseDownOutside = (e) => {
    e.preventDefault();
    const node = document.getElementById(e.target.id);
    copyNode(node, e);

    const parent = document.getElementById(node.parentNode.id);
    parent.appendChild(currentElem);
    reassignMouseEvent(onMouseMoveOutside, onMouseUpOutSide);
    $scope.grabbed = true;
  };

  $scope.onMouseDownInside = (e) => {
    e.preventDefault();
    const id = e.target.id || e.target.parentNode.id;
    currentElem = document.getElementById(id);

    currentElem.channel = $scope.container.findOneById(id);
    currentElem.exist = true;

    reassignMouseEvent(onMouseMove, onMouseUpInside);
    $scope.grabbed = true;
  };

  const onMouseChangeSize = (e) => {
    const diff = e.clientY - currentElem.initialY;
    const toAdd = Math.round(diff / currentElem.sizeQuarterCell);
    const newTo = currentElem.channel.to + (toAdd / 2);

    if (!$scope.container.isSizeNotOk(currentElem.channel.id, currentElem.channel.from, newTo, currentElem.channel.day)
    && newTo <= 24
    && currentElem.channel.from + 1 <= newTo) {
      $scope.container.channels[currentElem.index] = {
        ...$scope.container.channels[currentElem.index],
        to: newTo,
        style: $scope.container.calculatePosition({ ...$scope.container.channels[currentElem.index], to: newTo }),
      };
    }

    if ($scope.container.inContainer(e.clientX, e.clientY)) {
      const numbers = Number($scope.container.channels[currentElem.index].style.height.split('px')[0])
        + Number($scope.container.channels[currentElem.index].style.top.split('px')[0]);
      lineTime(false, 'blue', numbers + 1);
    }
    $scope.$apply();
  };

  const onMouseUpSize = () => {
    const line = document.getElementById('blueLine');
    line.style.display = 'none';
    const time = document.getElementById('blueTime');
    time.style.display = 'none';
    reassignMouseEvent();
  };

  $scope.onMouseDownSize = (e) => {
    e.preventDefault();
    const footer = document.getElementById(e.target.id);
    const idElem = footer.parentNode.id;
    currentElem = document.getElementById(idElem);

    if (!this.y2) $scope.container.initializeSize();
    currentElem.sizeQuarterCell = ($scope.container.y2 - $scope.container.y1) / 48;

    currentElem.index = $scope.container.findIndexById(idElem);
    currentElem.channel = $scope.container.channels[currentElem.index];
    currentElem.initialY = currentElem.clientHeight + currentElem.offsetTop;

    reassignMouseEvent(onMouseChangeSize, onMouseUpSize);
  };

  window.onresize = () => {
    $scope.container.initializeSize();
    $scope.container.adaptPosition();
    lineTime(null, 'red', null, true);
    $scope.$apply();
  };

  initialize();


  $scope.onClickSave = async () => {
    const newScheduler = $scope.container.channels.map(channel => {
      const { id, style, className, channelId, ...rest } = channel; // eslint-disable-line
      return { ...rest, channelId };
    });

    await TvManagement.updateSchedule($scope.device._id, newScheduler);
    Notification.success('Schedule updated');
    $scope.onClickScheduler(null, newScheduler);
    $scope.$apply();
  };

  $scope.$on('$destroy', () => {
    $interval.cancel(intervalRedLineTime);
  });
});
