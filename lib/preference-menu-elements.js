const userPreferences = require('./user-preferences');
const path = require('path');

class PreferenceMenuElements {
  constructor() {
    this.icons = ['icon', 'icon2', 'icon3'];
  }

  build() {
    const elements = [];
    elements.push(this.buildIconElements());
    return elements;
  }

  buildIconElements() {
    return {
      label: 'Icon',
      submenu: this.icons.map((icon) => {
        return {
          label: icon,
          icon: path.join(__dirname, `../images/${icon}.png`),
          click: () => { userPreferences.set('icon', icon) }
        };
      })
    };
  }
}

module.exports = new PreferenceMenuElements;
