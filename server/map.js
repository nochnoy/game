class Map {

  constructor() {
    this.nextObjectId = 0;
    this.objects = new Array();
  }

  addObject(object) {
    this.objects[this.nextObjectId] = object;
    object.id = this.nextObjectId;
    this.nextObjectId++;
  }

}

module.exports = Map;