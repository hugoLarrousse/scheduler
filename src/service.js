angular.module('heptawardApp').factory('Scheduler', () => { // eslint-disable-line
  const DAY = 7;
  const HOUR = 24;
  const CELL_Y = 12;

  const randomToken = () => Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
  const getDay = (str) => str.split('day')[1];


  const main = (name) => {
    return {
      name,
      channels: [],
      initializeSize() {
        const container = $(`#${this.name}`); //eslint-disable-line
        this.x1 = container.offset().left;
        this.x2 = container.offset().left + container.outerWidth();
        this.y1 = container.offset().top;
        this.y2 = container.offset().top + container.outerHeight();
      },
      calculatePosition(channel) {
        return {
          top: `${((channel.from / HOUR) * (this.y2 - this.y1)) + this.y1}px`,
          left: `${((channel.day / DAY) * (this.x2 - this.x1)) + this.x1 + 1}px`,
          width: `${((this.x2 - this.x1) / 7) - 1}px`,
          height: `${((channel.to - channel.from) * ((this.y2 - this.y1) / 24)) - 1}px`,
        };
      },
      adaptPosition() {
        for (const channel of this.channels) {
          channel.style = this.calculatePosition(channel);
        }
      },
      populateDays(args) {
        if (!this.y2) this.initializeSize();
        this.channels.push(...args.map(channel => { return { ...channel, style: this.calculatePosition(channel) }; }));
      },
      setPosition(cell, day, pos2 = 0, channelId) {
        let position1 = cell * 2;
        let diff = 0;
        let dayFound = this.channels.find(d => d.day === day && d.from <= position1 && d.to > position1 && (channelId ? d.id !== channelId : true));

        if (dayFound && (dayFound.to - position1) >= 2) {
          return false;
        } else if (dayFound && (dayFound.to - position1) < 2) {
          diff = dayFound.to - position1;
          position1 += diff;
          dayFound = this.channels.find(d => d.day === day && d.from <= position1 && d.to > position1 && (channelId ? d.id !== channelId : true));
          if (dayFound) return false;
        }

        const position2 = pos2 + diff || (cell * 2) + (cell === 11 ? 2 : 4) + diff;

        if (position2 > 24) return false;

        dayFound = this.channels.find(d => d.day === day && d.from < position2 && d.to >= position2 && (channelId ? d.id !== channelId : true));

        if (!dayFound) {
          const middlePosition = position1 + ((position2 - position1) / 2);
          dayFound = this.channels.find(d => d.day === day && d.from < middlePosition
            && d.to >= middlePosition
            && (channelId ? d.id !== channelId : true));
          if (dayFound) {
            return false;
          }
          return [position1, position2];
        }
        if (dayFound && dayFound.from - position1 < 1) {
          return false;
        }
        return [position1, dayFound.from];
      },
      addDay(channelInfo, day, cell, endElemY, channelTempId) {
        const position = this.setPosition(cell, day, endElemY, channelTempId);
        if (channelTempId) {
          this.removeById(channelTempId);
        }
        if (!position) {
          return false; // maybe need warning message
        }
        this.populateDays([{
          id: channelTempId || randomToken(),
          name: channelInfo.name,
          day,
          from: position[0],
          to: position[1],
          className: channelInfo.className,
          channelId: channelInfo.channelId || channelInfo._id,
        }]);
        return true;
      },
      inContainer(x, y) {
        if (!this.x1) this.initializeSize();
        return x > this.x1 && x < this.x2 && y > this.y1 && y < this.y2;
      },
      getPosition(x, y) {
        const day = Math.floor((x - this.x1) / ((this.x2 - this.x1) / DAY));
        const cell = Math.floor((y - this.y1) / ((this.y2 - this.y1) / CELL_Y));
        const quarterCell = Math.floor((y - this.y1) / ((this.y2 - this.y1) / 48));
        return [day, cell, (quarterCell % 4) / 4];
      },
      findOneById(id) {
        return this.channels.find(d => d.id === id);
      },
      findIndexById(id) {
        return this.channels.findIndex(d => d.id === id);
      },
      isSizeNotOk(id, from, to, day) {
        return this.channels.find(d => d.day === day && d.from > from && to > d.from && d.id !== id);
      },
      removeById(id) {
        return this.channels.splice(this.channels.findIndex(d => d.id === id), 1);
      },
    };
  };

  return {
    main,
    randomToken,
    getDay,
  };
});
