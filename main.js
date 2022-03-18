"use strict";

const VM_STATUS_RUNNING = 'running';
const VM_STATUS_STOPPED = 'stopped';
const { app, Tray, Menu, nativeImage } = require("electron");
const exec = require('child_process').exec;
const path = require('path');
const PRLCTL_COMMAND_PATH = process.env['PRLCTL_PATH'] || '/usr/local/bin/prlctl';
const userDataPath = app.getPath('userData');
const userPreferences = require('./lib/user-preferences');
const preferenceMenuElements = require('./lib/preference-menu-elements');

let top = {}; // prevent gc to keep windows

function toggleLoadingMenu() {
  const menu = Menu.buildFromTemplate(
    [
      { label: "Refreshing..." },
      {role: "quit", label: 'Quit'}
    ]
  );
  top.tray.setContextMenu(menu);
  top.tray.setTitle('Refreshing...');
}

function refreshMenu() {
  toggleLoadingMenu();
  prlctl("list --all -o name,status -j").then(
    (output) => {
      const vmList = JSON.parse(output.trim());

      const promises = [];
      vmList.forEach((vmListElement) => {
        promises.push(
          new Promise((resolve, reject) => {
            resolve(vmListElement);
          })
        );
      });

      Promise.all(promises).then((vms) => {
        const menuElements = [
          { label: '🔄 Refresh List', click: refreshMenu },
          { type: "separator" }
        ];
        vms.forEach((vm) => {
          let labelIcon = null;
          switch (vm.status) {
            case VM_STATUS_RUNNING:
              labelIcon = '🟢';
              break;
            case VM_STATUS_STOPPED:
              labelIcon = '🛑';
              break;
          }

          const submenuElements = [];

          switch (vm.status) {
            case VM_STATUS_RUNNING:
              submenuElements.push(
                {
                  label: '🛑 Stop',
                  click: (item, window, event) => {
                    toggleLoadingMenu();

                    prlctl(`stop ${vm.name}`).then(() => {
                      VMUtils.waitStatus(vm.name, VM_STATUS_STOPPED).then(() => {
                        refreshMenu();
                      });
                    });
                  }
                }
              );
              break;

            case VM_STATUS_STOPPED:
              submenuElements.push(
                {
                  label: '▶️ Start',
                  click: (item, window, event) => {
                    toggleLoadingMenu();

                    prlctl(`start ${vm.name}`).then(() => {
                      VMUtils.waitStatus(vm.name, VM_STATUS_RUNNING).then(() => {
                        refreshMenu();
                      });
                    });
                  }
                }
              );
              break;
          }

          menuElements.push(
            {
              label: `${labelIcon} ${vm.name} (${vm.status.toUpperCase()})`,
              submenu: submenuElements
            }
          );
        });

        menuElements.push({type: "separator"});
        menuElements.push(
          {
            label: 'Preferences',
            submenu: preferenceMenuElements.build()
          }
        );
        menuElements.push({type: "separator"});
        menuElements.push({role: "quit", label: 'Quit'});

        const menu = Menu.buildFromTemplate(menuElements);
        top.tray.setContextMenu(menu);
        top.tray.setTitle(
          vms.filter((vm) => { return vm.status == VM_STATUS_RUNNING; }).length.toString()
        );
      });
    }
  );
}

/**
 *
 * @param {*} command
 * @param {*} callback
 * @returns {Promise<string>}
 */
 function execute(command){
  return new Promise((resolve, reject) => {
    exec(
      command,
      function(error, stdout, stderr){
        if (error) { reject(error) }
        else { resolve(stdout); }
      }
    );
  });
}

function prlctl(...args) {
  return execute(`${PRLCTL_COMMAND_PATH} ${args.join(' ')}`);
}

const VMUtils = {
  waitStatus: function(vmName, statusName) {
    return new Promise((resolve, reject) => {
      function poll() {
        prlctl(`status ${vmName}`).then((output) => {
          const result = output.trim();
          if (result.includes('running') && statusName == VM_STATUS_RUNNING) {
            return resolve();
          } else if(result.includes('stopped') && statusName == VM_STATUS_STOPPED) {
            return resolve();
          } else {
            poll();
          }
        });
      }
      poll();
    });
  }
};

app.whenReady().then(() => {
  // hide dock icon
  app.dock.hide();

  process.on("SIGINT", () => {
    app.exit(0);
  });

  const tray = new Tray(nativeImage.createEmpty());
  tray.setImage(path.join(__dirname, `images/${userPreferences.get('icon', 'icon3')}.png`));
  userPreferences.onChange((data) => {
    tray.setImage(path.join(__dirname, `images/${userPreferences.get('icon', 'icon3')}.png`));
  });
  top.tray = tray;

  refreshMenu();
});

app.on("before-quit", ev => {
    // release windows
    top = null;
});
