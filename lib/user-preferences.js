const electron = require('electron');
const path = require('path');
const fs = require('fs');

class UserPreferences {
  constructor() {
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    this.path = path.join(userDataPath, 'settings.json');

    try {
      this.data = JSON.parse(fs.readFileSync(this.path));
    } catch(error) {
      this.data = {};
    }
    this.callbacks = { change: [] };
  }

  // This will just return the property on the `data` object
  get(key, defaultValue = null) {
    return this.data[key] || defaultValue;
  }

  onChange(callback) {
    this.callbacks.change.push(callback);
  }

  set(key, val) {
    this.data[key] = val;

    fs.writeFileSync(this.path, JSON.stringify(this.data));
    this.callbacks.change.forEach((callback) => {
      callback(this.data);
    })
  }
}

module.exports = new UserPreferences;
