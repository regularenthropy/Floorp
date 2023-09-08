/* eslint-disable no-undef */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const l10n = new Localization(["browser/floorp.ftl"], true);

const WorkspaceUtils = ChromeUtils.importESModule(
  "resource:///modules/WorkspaceUtils.sys.mjs"
);

const workspaceFunctions = {
  eventListeners: {
    tabAddEventListeners: {
      handleTabOpen() {
        const tabs = gBrowser.tabs;
        let lastTab = null;
        let firstTab = null;
      
        document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab");
        document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab");
      
        for (const tab of tabs) {
          const currentWorkspace = Services.prefs.getStringPref(
            WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
          );
      
          if (!tab.hasAttribute("floorpWorkspace")) {
            tab.setAttribute("floorpWorkspace", currentWorkspace);
          }
      
          if (tab.getAttribute("floorpWorkspace") === currentWorkspace) {
            lastTab = tab;
      
            if (firstTab === null) {
              tab.setAttribute("floorp-firstVisibleTab", "true");
              firstTab = tab;
            }
          }
        }
      
        lastTab?.setAttribute("floorp-lastVisibleTab", "true");
        workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
      },

      handleTabClose() {
        window.setTimeout(() => {
          const firstVisibleTab = document.querySelector(`[floorp-firstVisibleTab]`);
          const lastVisibleTab = document.querySelector(`[floorp-lastVisibleTab]`);
          firstVisibleTab?.removeAttribute("floorp-firstVisibleTab");
          lastVisibleTab?.removeAttribute("floorp-lastVisibleTab");
          const visibleTabs = document.querySelectorAll(`tab:not([hidden])`);
          visibleTabs[0].setAttribute("floorp-firstVisibleTab", "true");
          visibleTabs[visibleTabs.length - 1].setAttribute("floorp-lastVisibleTab", "true");
          workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
      
          const currentWorkspace = Services.prefs.getStringPref(
            WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
          );
          const count = workspaceFunctions.manageWorkspaceFunctions.checkWorkspaceTabLength(
            currentWorkspace
          );
          if (count === 0) {
            workspaceFunctions.manageWorkspaceFunctions.deleteworkspace(currentWorkspace);
            workspaceFunctions.manageWorkspaceFunctions.changeWorkspaceToBeforeNext();
          }
        }, 400);
      },

      handleTabObeserver() {
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
      },

      handleTabSelect() {
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
        workspaceFunctions.tabFunctions.addLastShowedWorkspaceTab();
      },

      handleTabMove() {
        workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
        const firstVisibleTab = document.querySelector(`[floorp-firstVisibleTab]`);
        const lastVisibleTab = document.querySelector(`[floorp-lastVisibleTab]`);
        if (firstVisibleTab) {
          firstVisibleTab.removeAttribute("floorp-firstVisibleTab");
        }
        if (lastVisibleTab) {
          lastVisibleTab.removeAttribute("floorp-lastVisibleTab");
        }
        const visibleTabs = document.querySelectorAll(`tab:not([hidden])`);
        if (visibleTabs.length > 0) {
          visibleTabs[0].setAttribute("floorp-firstVisibleTab", "true");
          visibleTabs[visibleTabs.length - 1].setAttribute("floorp-lastVisibleTab", "true");
        }
      }
    },

    prefsEventListeners: {
      handleWorkspacePrefChange() {
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
        workspaceFunctions.WorkspaceContextMenu.setMenuItemCheckCSS();
      },

      handleWorkspaceTabPrefChange() {
        const workspaceButton = document.querySelector("#workspace-button");
        const workspaceTabEnabled = Services.prefs.getBoolPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF
        );
        workspaceButton.style.display = workspaceTabEnabled ? "" : "none";
        if (!workspaceTabEnabled) {
          document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab");
          document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab");
        }
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
      },

      handleWorkspaceManageOnBMSPrefChange() {
        /*
        const manageOnBMS = Services.prefs.getBoolPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_MANAGE_ON_BMS_PREF
        );

        if (manageOnBMS) {
          workspaceFunctions.bmsWorkspaceFunctions.moveWorkspaceManagerToBMS();
        } else {
          // Currently not working
          workspaceFunctions.bmsWorkspaceFunctions.moveWorkspaceManagerToDefault();
        }
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();

        */
      },
    },

    keyboradEventListeners: {
      handle_keydown(event) {
        if (
          Services.prefs.getBoolPref(
            WorkspaceUtils.workspacesPreferences
              .WORKSPACE_CHANGE_WORKSPACE_WITH_DEFAULT_KEY_PREF
          )
        ) {
          if (event.shiftKey && event.key === "ArrowUp") {
            workspaceFunctions.manageWorkspaceFunctions.changeWorkspaceToBeforeNext();
          } else if (event.shiftKey && event.key === "ArrowDown") {
            workspaceFunctions.manageWorkspaceFunctions.changeWorkspaceToAfterNext();
          }
        }
      },
    },
  },

  manageWorkspaceFunctions: {
    initWorkspace() {
      // First run
      if (!Services.prefs.prefHasUserValue(WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF)) {
        const defaultWorkspace = l10n.formatValueSync("workspace-default");
        Services.prefs.setStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF, defaultWorkspace);
        Services.prefs.setStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF, defaultWorkspace);
      }
    
      const tabs = gBrowser.tabs;
      const workspaceTabsPref = Services.prefs.getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_TABS_PREF);
      if (workspaceTabsPref === "[]") {
        for (const tab of tabs) {
          const workspace = Services.prefs.getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF);
          tab.setAttribute("floorpWorkspace", workspace);
        }
      } else if (Services.prefs.getBoolPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_BACKUPED_PREF, false)) {
        console.info("Backuped workspace found. Restoring...");
        const tabsStates = JSON.parse(workspaceTabsPref);
        const arryURLs = tabsStates.map(tabState => tabState[0].url);
    
        for (let i = 0; i < tabs.length; i++) {
          const tab = tabs[i];
          const tabURL = tab.linkedBrowser.currentURI.spec;
          const stateURL = arryURLs[i];
    
          if (tabURL === stateURL && tabsStates[i][i].workspace) {
            const state = tabsStates[i][i].workspace;
            tab.setAttribute("floorpWorkspace", state);
          } else if (arryURLs.includes(tabURL)) {
            const index = arryURLs.indexOf(tabURL);
            const value = tabsStates[index][index].workspace;
            console.info(`Tab ${i} has been set to workspace ${value} because of matching URL(${tabURL}).`);
            tab.setAttribute("floorpWorkspace", value);
            arryURLs.splice(index, 1);
          } else {
            const workspace = Services.prefs.getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF);
            tab.setAttribute("floorpWorkspace", workspace);
            console.info(`Tab ${i} has been set to workspace ${workspace} because of missing URL(${stateURL}).`);
          }
        }
        Services.prefs.setBoolPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_BACKUPED_PREF, false);
      }
    
      const toolbarButtonEle = window.MozXULElement.parseXULToFragment(`
        <toolbarbutton id="workspace-button"
                        class="toolbarbutton-1 chromeclass-toolbar-additional"
                        label="Workspace"
                        tooltiptext="Workspace"
                        type="menu"
                        style="list-style-image: url('chrome://browser/skin/workspace-floorp.png');">
          <menupopup id="workspace-menu" context="workspace-menu-context">
            <toolbarbutton style="list-style-image: url('chrome://global/skin/icons/plus.svg');"
                    id="addNewWorkspaceButton"        data-l10n-id="workspace-add" class="subviewbutton subviewbutton-nav" oncommand="workspaceFunctions.manageWorkspaceFunctions.addNewWorkspace();"/>
          </menupopup>
        </toolbarbutton>
      `);
    
      document.querySelector(".toolbar-items").before(toolbarButtonEle);
      const workspaceTabEnabled = Services.prefs.getBoolPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF);
      document.querySelector("#workspace-button").style.display = workspaceTabEnabled ? "" : "none";
    
      // Add workspace menu
      const workspaceAll = Services.prefs.getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF).split(",");
      for (const label of workspaceAll) {
        workspaceFunctions.WorkspaceContextMenu.addWorkspaceElemToMenu(label);
      }
    
      // Add attribute to tab
      workspaceFunctions.tabFunctions.addLastShowedWorkspaceTab();
      workspaceFunctions.TabContextMenu.addContextMenuToTabContext();
      workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
      workspaceFunctions.WorkspaceContextMenu.setMenuItemCheckCSS();
    },

     addNewWorkspace() {
      const allWorkspace = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      const l10n = new Localization(["browser/floorp.ftl"], true);
      const prompts = Services.prompt;
      const check = { value: false };
      const pattern = /^[\p{L}\p{N}]+$/u;
      const input = { value: "" };
      const result = prompts.prompt(
        null,
        l10n.formatValueSync("workspace-prompt-title"),
        `${l10n.formatValueSync("please-enter-workspace-name")}
        ${l10n.formatValueSync("please-enter-workspace-name-2")}`,
        input,
        null,
        check
      );
    
      if (
        result &&
        !allWorkspace.includes(input.value) &&
        input.value !== "" &&
        input.value.length < 20 &&
        input.value !== l10n.formatValueSync("workspace-default") &&
        pattern.test(input.value)
      ) {
        const label = input.value;
        const workspaceAll = Services.prefs
          .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
          .split(",");
        try {
          workspaceFunctions.WorkspaceContextMenu.addWorkspaceElemToMenu(label);
        } catch (e) {
          prompts.alert(
            null,
            l10n.formatValueSync("workspace-prompt-title"),
            `${l10n.formatValueSync("workspace-error")}
            ${l10n.formatValueSync("workspace-error-discription")}`
          );
        }
        workspaceAll.push(label);
        Services.prefs.setStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF,
          workspaceAll
        );
      } else if (result === false) {
        /* empty */
      } else {
        prompts.alert(
          null,
          l10n.formatValueSync("workspace-prompt-title"),
          `${l10n.formatValueSync("workspace-error")}
          ${l10n.formatValueSync("workspace-error-discription")}`
        );
      }
    },

    deleteWorkspace(workspace) {
      if (workspace === WorkspaceUtils.defaultWorkspaceName) {
        return;
      }
    
      const allWorkspaces = Services.prefs
        .getCharPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      const index = allWorkspaces.indexOf(workspace);
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
    
      // Move to other workspace
      if (currentWorkspace === workspace) {
        workspaceFunctions.manageWorkspaceFunctions.changeWorkspace(allWorkspaces[0]);
        Services.prefs.setStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF,
          WorkspaceUtils.defaultWorkspaceName
        );
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
      }
    
      allWorkspaces.splice(index, 1);
      Services.prefs.setCharPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF,
        allWorkspaces.join(",")
      );
    
      // Delete workspace tabs
      for (const tab of gBrowser.tabs) {
        if (tab.getAttribute("floorpWorkspace") === workspace) {
          gBrowser.removeTab(tab);
        }
      }
    
      // Delete workspace menuitem
      const menuitem = document.getElementById(`workspace-box-${workspace}`);
      menuitem?.remove();
    
      // Rebuild workspace menu
      workspaceFunctions.manageWorkspaceFunctions.rebuildWorkspaceMenu();
    },

     renameWorkspace(label) {
      label = label.replace(/\s+/g, "-");
      const prompts = Services.prompt;
      const l10n = new Localization(["browser/floorp.ftl"], true);
      const check = { value: false };
      const pattern = /^[\p{L}\p{N}\s]+$/u;
      const input = { value: "" };
      const result = prompts.prompt(
        null,
        l10n.formatValueSync("workspace-prompt-title"),
        l10n.formatValueSync("please-enter-workspace-name") +
          "\n" +
          l10n.formatValueSync("please-enter-workspace-name-2"),
        input,
        null,
        check
      );
      
      if (
        result &&
        input.value !== "" &&
        input.value.length < 20 &&
        pattern.test(input.value)
      ) {
        input.value = input.value.replace(/\s+/g, "-");
        const workspaceAll = Services.prefs
          .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
          .split(",");
        const index = workspaceAll.indexOf(label);
        workspaceAll[index] = input.value;
        Services.prefs.setStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF,
          workspaceAll.join(",")
        );
        
        // Update tabs
        const tabs = gBrowser.tabs;
        for (const tab of tabs) {
          if (tab.getAttribute("floorpWorkspace") === label) {
            tab.setAttribute("floorpWorkspace", input.value);
          }
        }
        workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
      
        // Update lastShowWorkspaceTab
        const lastShowWorkspaceTab = document.querySelector(
          `[lastShowWorkspaceTab-${label}]`
        );
        if (lastShowWorkspaceTab) {
          lastShowWorkspaceTab.setAttribute(
            `lastShowWorkspaceTab-${input.value}`,
            "true"
          );
          lastShowWorkspaceTab.removeAttribute(`lastShowWorkspaceTab-${label}`);
        }
      
        // Update menuitem
        const menuitem = document.querySelector(`#workspace-box-${label}`);
        const nextAfterMenuitem = menuitem.nextSibling;
        menuitem.remove();
        workspaceFunctions.WorkspaceContextMenu.addWorkspaceElemToMenu(
          input.value,
          nextAfterMenuitem
        );
        
        // Update currentWorkspace
        const currentWorkspace = Services.prefs.getStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
        );
        if (currentWorkspace === label) {
          Services.prefs.setStringPref(
            WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF,
            input.value
          );
        }
      } else if (result === false) {
        // User cancelled the prompt dialog
      } else {
        const message = l10n.formatValueSync("workspace-error") +
          "\n" +
          l10n.formatValueSync("workspace-error-discription");
        prompts.alert(
          null,
          l10n.formatValueSync("workspace-prompt-title"),
          message
        );
        return;
      }
    
      // Update workspace icon
      const oldIcon = workspaceFunctions.iconFunctions.getWorkspaceIcon(label);
      workspaceFunctions.manageWorkspaceFunctions.addIconToWorkspace(
        input.value,
        oldIcon
      );
      workspaceFunctions.iconFunctions.deleteIcon(label);
      
      // Rebuild workspace menu
      workspaceFunctions.manageWorkspaceFunctions.rebuildWorkspaceMenu();
    },

    // eslint-disable-next-line no-dupe-keys
    addNewWorkspace() {
      let allWorkspace = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      let l10n = new Localization(["browser/floorp.ftl"], true);
      prompts = Services.prompt;
      let check = { value: false };
      const pattern = /^[\p{L}\p{N}\s]+$/u;
      let input = { value: "" };
      let result = prompts.prompt(
        null,
        l10n.formatValueSync("workspace-prompt-title"),
        l10n.formatValueSync("please-enter-workspace-name") +
          "\n" +
          l10n.formatValueSync("please-enter-workspace-name-2"),
        input,
        null,
        check
      );

      if (
        result &&
        !allWorkspace.includes(input.value) &&
        input.value != "" &&
        input.value.length < 20 &&
        input.value != l10n.formatValueSync("workspace-default") &&
        pattern.test(input.value)
      ) {
        let label = input.value;
        label = label.replace(/\s+/g, "-");

        let workspaceAll = Services.prefs
          .getStringPref(
            WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF
          )
          .split(",");
        try {
          workspaceFunctions.WorkspaceContextMenu.addWorkspaceElemToMenu(label);
        } catch (e) {
          prompts.alert(
            null,
            l10n.formatValueSync("workspace-prompt-title"),
            l10n.formatValueSync("workspace-error") +
              "\n" +
              l10n.formatValueSync("workspace-error-discription")
          );
          return;
        }
        workspaceAll.push(label);
        Services.prefs.setStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF,
          workspaceAll
        );
      } else if (result === false) {
        /* empty */
      } else {
        prompts.alert(
          null,
          l10n.formatValueSync("workspace-prompt-title"),
          l10n.formatValueSync("workspace-error") +
            "\n" +
            l10n.formatValueSync("workspace-error-discription")
        );
      }

      //rebuild workspace menu
      workspaceFunctions.manageWorkspaceFunctions.rebuildWorkspaceMenu();
    },

    setCurrentWorkspace() {
      const tabs = gBrowser.tabs;
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
      const showWorkspaceNamePref = Services.prefs.getBoolPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_SHOW_WORKSPACE_NAME_PREF
      );
      const workspaceTabEnabledPref = Services.prefs.getBoolPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF
      );
      const workspaceButton = document.getElementById("workspace-button");
      const workspaceButtonText = document.querySelector(
        "#workspace-button > .toolbarbutton-text"
      );
      let lastTab = null;
      let firstTab = null;
    
      document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab");
      document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab");
    
      for (const tab of tabs) {
        const workspace = tab.getAttribute("floorpWorkspace");
    
        if (workspace === currentWorkspace || !workspaceTabEnabledPref) {
          gBrowser.showTab(tab);
          tab.removeAttribute("hidden");
          tab.style.visibility = "";
          tab.style.display = "";
          lastTab = tab;
    
          if (firstTab === null) {
            tab.setAttribute("floorp-firstVisibleTab", "true");
            firstTab = tab;
          }
        } else {
          gBrowser.hideTab(tab);
        }
      }
    
      if (showWorkspaceNamePref) {
        workspaceButton.setAttribute("label", currentWorkspace.replace(/-/g, " "));
        workspaceButtonText.style.display = "inherit";
      } else {
        workspaceButton.removeAttribute("label");
        workspaceButtonText.style.display = "none";
      }
    
      lastTab?.setAttribute("floorp-lastVisibleTab", "true");
    
      // Set workspace icon
      const iconURL = workspaceFunctions.iconFunctions.getWorkspaceIcon(currentWorkspace);
      workspaceButton.style.listStyleImage = `url(${iconURL})`;
    },

    saveWorkspaceState() {
      let tabs = gBrowser.tabs;
      let tabStateObject = [];

      // delete unmatched tabs
      const allWorkspaces = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF
      );
      const allWorkspacesArray = allWorkspaces.split(",");

      //get all workspace tabs Workspace
      for (const tab of tabs) {
        const tabWorkspace = tab.getAttribute("floorpWorkspace");
        if (!allWorkspacesArray.includes(tabWorkspace)) {
          tab.setAttribute(
            "floorpWorkspace",
            Services.prefs.getStringPref(
              WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
            )
          );
          console.warn("Move default. unmatched tabs found");
        }
      }

      for (const tab of tabs.entries()) {
        const tabState = {
          workspace: tab.getAttribute("floorpWorkspace"),
          url: tab.linkedBrowser.currentURI.spec,
        };
        tabStateObject.push(tabState);
      }

      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_TABS_PREF,
        JSON.stringify(tabStateObject)
      );
    },

    changeWorkspaceToAfterNext() {
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
      const workspaceAll = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      const index = workspaceAll.indexOf(currentWorkspace);
      if (index === workspaceAll.length - 1) {
        return;
      }
      const afterWorkspace = workspaceAll[index + 1];
      workspaceFunctions.manageWorkspaceFunctions.changeWorkspace(afterWorkspace);
      workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
    },

    changeWorkspaceToNext() {
      const allWorkspaces = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
      const index = allWorkspaces.indexOf(currentWorkspace);
      const nextWorkspace = allWorkspaces[(index + 1) % allWorkspaces.length];
    
      workspaceFunctions.manageWorkspaceFunctions.changeWorkspace(nextWorkspace);
    },
    
    changeWorkspaceToBeforeNext() {
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
      const workspaceAll = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      const index = workspaceAll.indexOf(currentWorkspace);
    
      if (index === 0) {
        return;
      }
    
      const beforeWorkspace = workspaceAll[index - 1];
    
      workspaceFunctions.manageWorkspaceFunctions.changeWorkspace(beforeWorkspace);
      workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
    },

    changeWorkspace(label) {
      const tabs = gBrowser.tabs;
      const lastShowWorkspaceTabAttr = `lastShowWorkspaceTab-${label}`;
    
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF,
        label
      );
    
      const workspaceTab = document.querySelector(`[floorpWorkspace="${label}"]`);
      if (workspaceTab && !workspaceTab.hasAttribute(lastShowWorkspaceTabAttr)) {
        workspaceTab.setAttribute(lastShowWorkspaceTabAttr, "true");
      }
    
      const lastShowWorkspaceTab = tabs.find((tab) => tab.getAttribute(lastShowWorkspaceTabAttr) === "true");
      if (lastShowWorkspaceTab) {
        gBrowser.selectedTab = lastShowWorkspaceTab;
      } else {
        const newTabURL = Services.prefs.getStringPref("browser.startup.homepage");
        gBrowser.addTab(newTabURL, {
          skipAnimation: true,
          inBackground: false,
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
      }
    
      workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
      workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
    
      const closeWorkspacePopupAfterClick = Services.prefs.getBoolPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CLOSE_POPUP_AFTER_CLICK_PREF
      );
      if (closeWorkspacePopupAfterClick) {
        document.getElementById("workspace-button").click();
      }
    },
    checkWorkspaceTabLength(name) {
      const data = JSON.parse(
        Services.prefs.getStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_TABS_PREF
        )
      );
      let count = 0;
    
      for (const obj of data) {
        const keys = Object.keys(obj);
        const workspaceValue = obj[keys[0]].workspace;
    
        if (workspaceValue === name) {
          count++;
        }
      }
      return count;
    },

    checkWorkspaceInfoExist(name) {
      const data = JSON.parse(
        Services.prefs.getStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_INFO_PREF
        )
      );
      for (const [i, obj] of data.entries()) {
        const workspaceValue = Object.keys(obj)[0];
        if (workspaceValue === name) {
          return i;
        }
      }
      return false;
    },
    
    rebuildWorkspaceMenu() {
      const allWorkspace = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      const workspaceMenu = document.getElementById("workspace-menu");
      const addNewWorkspaceButton = document.getElementById("addNewWorkspaceButton");
    
      while (workspaceMenu.firstChild !== addNewWorkspaceButton) {
        workspaceMenu.firstChild.remove();
      }
    
      for (const label of allWorkspace) {
        workspaceFunctions.WorkspaceContextMenu.addWorkspaceElemToMenu(label);
      }
    
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
      const iconURL = workspaceFunctions.iconFunctions.getWorkspaceIcon(currentWorkspace);
      document.getElementById("workspace-button").style.listStyleImage = `url(${iconURL})`;
    },

    addIconToWorkspace(workspaceName, iconName) {
      if (workspaceName.wrappedJSObject) {
        iconName = workspaceName.wrappedJSObject.icon;
        workspaceName = workspaceName.wrappedJSObject.name;
      }
    
      const settings = JSON.parse(
        Services.prefs.getStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_INFO_PREF
        )
      );
    
      const targetWorkspace = settings.find(workspace => workspace[workspaceName]);
      const iconURL = iconName.startsWith("resource://") ||
                      iconName.startsWith("chrome://") ||
                      iconName.startsWith("file://") ||
                      iconName.startsWith("data:") ||
                      iconName.startsWith("http://") ||
                      iconName.startsWith("https://")
                        ? iconName
                        : workspaceFunctions.iconFunctions.getIcon(iconName);
    
      if (!targetWorkspace) {
        settings.push({ [workspaceName]: { icon: iconURL } });
      } else {
        targetWorkspace[workspaceName].icon = iconURL;
      }
    
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_INFO_PREF,
        JSON.stringify(settings)
      );
    
      workspaceFunctions.manageWorkspaceFunctions.rebuildWorkspaceMenu();
    }
  },

  iconFunctions: {
    getIcon(iconName) {
      if (!WorkspaceUtils.CONTAINER_ICONS.has(iconName)) {
        throw console.error(`Invalid icon ${iconName} for workspace`);
      }
      return `chrome://browser/skin/workspace-icons/${iconName}.svg`;
    },

    getWorkspaceIcon(workspaceName) {
      const settings = JSON.parse(
        Services.prefs.getStringPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_INFO_PREF
        )
      );
      const targetWorkspace = settings.find(workspace => workspace[workspaceName]);
      const icon = targetWorkspace?.[workspaceName]?.icon;
    
      return icon || "chrome://browser/skin/workspace-floorp.png";
    },

    deleteIcon(workspaceName) {
      const settingsPref = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_INFO_PREF
      );
      const settings = JSON.parse(settingsPref);
      const targetWorkspaceNumber = workspaceFunctions.manageWorkspaceFunctions.checkWorkspaceInfoExist(workspaceName);
    
      if (targetWorkspaceNumber === false) {
        return;
      }
    
      delete settings[targetWorkspaceNumber][workspaceName].icon;
    
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_INFO_PREF,
        JSON.stringify(settings)
      );
    },

    setWorkspaceFromPrompt(label) {
      const parentWindow = Services.wm.getMostRecentWindow("navigator:browser");
      const object = { workspaceName: label };
      if (parentWindow?.document.documentURI === "chrome://browser/content/hiddenWindowMac.xhtml") {
        return;
      }
      const dialogBox = parentWindow?.gDialogBox;
      const url = "chrome://browser/content/preferences/dialogs/manageWorkspace.xhtml";
      if (dialogBox) {
        dialogBox.open(url, object);
      } else {
        Services.ww.openWindow(parentWindow, url, null, "chrome,titlebar,dialog,centerscreen,modal", object);
      }
    },
  },

  tabFunctions: {
    moveTabToOtherWorkspace(tab, workspace) {
      const nextToWorkspaceTab = workspaceFunctions.tabFunctions.getNextToWorkspaceTab();
    
      if (tab === gBrowser.selectedTab && nextToWorkspaceTab) {
        gBrowser.selectedTab = nextToWorkspaceTab;
      }
    
      const willMoveWorkspace = workspace;
    
      for (const selectedTab of gBrowser.selectedTabs) {
        selectedTab.setAttribute("floorpWorkspace", willMoveWorkspace);
      }
    
      if (gBrowser.selectedTabs.length === 1) {
        tab.setAttribute("floorpWorkspace", willMoveWorkspace);
      }
    
      workspaceFunctions.manageWorkspaceFunctions.saveWorkspaceState();
      workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace();
    },

    addLastShowedWorkspaceTab() {
      const currentTab = gBrowser.selectedTab;
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
    
      const tabs = document.querySelectorAll(`[lastShowWorkspaceTab-${currentWorkspace}]`);
      for (const tab of tabs) {
        tab.removeAttribute(`lastShowWorkspaceTab-${currentWorkspace}`);
      }
    
      currentTab.setAttribute(`lastShowWorkspaceTab-${currentWorkspace}`, "true");
    },

    checkTabsLength() {
      const tabs = gBrowser.tabs;
      for (const tab of tabs) {
        if (TabContextMenu.contextTab.getAttribute("firstVisibleTab") === "true") {
          document.getElementById("context_MoveOtherWorkspace").setAttribute("disabled", "true");
          break;
        }
      }
    },

    getNextToWorkspaceTab() {
      const tabs = gBrowser.tabs;
      for (const tab of tabs) {
        if (
          tab.getAttribute("floorpWorkspace") ===
            gBrowser.selectedTab.getAttribute("floorpWorkspace") &&
          tab !== gBrowser.selectedTab
        ) {
          return tab;
        }
      }
      return null;
    },

    checkWorkspaceLastShowedTabAttributeExist(label) {
      const tabs = gBrowser.tabs;
      for (const tab of tabs) {
        if (tab.getAttribute(`lastShowWorkspaceTab-${label}`) === "true") {
          return true;
        }
      }
      return false;
    }
  },

  TabContextMenu: {
    addContextMenuToTabContext() {
      let beforeElem = document.getElementById("context_moveTabOptions");
      let menuitemElem = window.MozXULElement.parseXULToFragment(`
      <menu id="context_MoveOtherWorkspace" data-l10n-id="move-tab-another-workspace" accesskey="D">
          <menupopup id="workspaceTabContextMenu"
                     onpopupshowing="workspaceFunctions.TabContextMenu.CreateWorkspaceContextMenu();"/>
      </menu>
      `);
      beforeElem.before(menuitemElem);
    },

    CreateWorkspaceContextMenu() {
      //delete already exsist items
      let menuElem = document.getElementById("workspaceTabContextMenu");
      while (menuElem.firstChild) {
        menuElem.firstChild.remove();
      }

      //Rebuild context menu
      if (workspaceFunctions.tabFunctions.getNextToWorkspaceTab() == null) {
        let menuItem = window.MozXULElement.parseXULToFragment(`
         <menuitem data-l10n-id="workspace-context-menu-selected-tab" disabled="true"/>
        `);
        let parentElem = document.getElementById("workspaceTabContextMenu");
        parentElem.appendChild(menuItem);
        return;
      }

      let workspaceAll = Services.prefs
        .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
        .split(",");
      for (let i = 0; i < workspaceAll.length; i++) {
        let workspace = workspaceAll[i];
        let menuItem = window.MozXULElement.parseXULToFragment(`
          <menuitem id="workspaceID-${workspace}" class="workspaceContextMenuItems"
                    label="${workspace.replace(
                      /-/g,
                      " "
                    )}"  oncommand="workspaceFunctions.tabFunctions.moveTabToOtherWorkspace(TabContextMenu.contextTab, '${workspace}');"/>
        `);
        let parentElem = document.getElementById("workspaceTabContextMenu");
        if (
          workspace != TabContextMenu.contextTab.getAttribute("floorpWorkspace")
        ) {
          parentElem.appendChild(menuItem);
        }
      }
    },
  },

  WorkspaceContextMenu: {
    addWorkspaceElemToMenu(label, nextElem) {
      let labelDisplay = label.replace(/-/g, " ");
      let workspaceItemElem = window.MozXULElement.parseXULToFragment(`

      <vbox id="workspace-box-${label}" class="workspace-label-box">
       <hbox id="workspace-${label}" class="workspace-item-box">
         <toolbarbutton id="workspace-label" label="${labelDisplay}"
                   class="toolbarbutton-1 workspace-item" workspace="${label}"
                   context="workspace-item-context" oncommand="workspaceFunctions.manageWorkspaceFunctions.changeWorkspace('${label}')"/>
         <toolbarbutton workspace="${labelDisplay}" iconName="${label}"  context="workspace-icon-context" id="workspace-icon" class="workspace-item-icon toolbarbutton-1" oncommand="workspaceFunctions.manageWorkspaceFunctions.changeWorkspace('${label}')" style="list-style-image: url(${workspaceFunctions.iconFunctions.getWorkspaceIcon(
        label
      )})"/>
       </hbox>
       <menuseparator class="workspace-item-separator"/>
      </vbox>
    `);

      if (nextElem) {
        nextElem.before(workspaceItemElem);
      } else {
        document
          .getElementById("addNewWorkspaceButton")
          .before(workspaceItemElem);
      }

      if (
        Services.prefs
          .getStringPref(
            WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF
          )
          .split(",")[0] !== label
      ) {
        let deleteButtonElem = window.MozXULElement.parseXULToFragment(`
            <toolbarbutton id="workspace-delete" class="workspace-item-delete toolbarbutton-1"
                           oncommand="workspaceFunctions.manageWorkspaceFunctions.deleteworkspace('${label}')"/>
        `);
        document
          .getElementById(`workspace-${label}`)
          .appendChild(deleteButtonElem);
      }
    },

    createWorkspacemenuItemContext(e) {
      const oldMenuItems = document.querySelectorAll(".workspace-item-contexts");
      for (const menuItem of oldMenuItems) {
        menuItem.remove();
      }
    
      const menuitemElem = window.MozXULElement.parseXULToFragment(`
        <menuitem class="workspace-item-contexts" id="workspace-item-context-rename" data-l10n-id="workspace-rename" oncommand="workspaceFunctions.manageWorkspaceFunctions.renameWorkspace('${e.explicitOriginalTarget.getAttribute("label")}')"/>
      `);
    
      document.getElementById("workspace-item-context").appendChild(menuitemElem);
    },

    createWorkspaceIconContext(e) {
      const oldMenuItems = document.querySelectorAll(".workspace-icon-context");
    
      for (const menuItem of oldMenuItems) {
        menuItem.remove();
      }
    
      const menuitemElem = window.MozXULElement.parseXULToFragment(`
        <menuitem class="workspace-icon-context" id="workspace-item-context-icon-delete" data-l10n-id="workspace-delete" 
                  oncommand="workspaceFunctions.manageWorkspaceFunctions.deleteworkspace('${e.explicitOriginalTarget.getAttribute(
                    "workspace"
                  )}');"/>
        <menuitem class="workspace-icon-context" id="workspace-item-context-icon-rename" data-l10n-id="workspace-rename" 
                  oncommand="workspaceFunctions.manageWorkspaceFunctions.renameWorkspace('${e.explicitOriginalTarget.getAttribute(
                    "workspace"
                  )}')"/>
        <menuitem class="workspace-icon-context" id="workspace-item-context-icon-change-icon" data-l10n-id="workspace-select-icon"
                  oncommand="workspaceFunctions.iconFunctions.setWorkspaceFromPrompt('${e.explicitOriginalTarget.getAttribute(
                    "workspace"
                  )}')"/>
      `);
    
      if (e.explicitOriginalTarget.getAttribute("workspace") === WorkspaceUtils.defaultWorkspaceName) {
        menuitemElem.firstChild.remove();
      }
    
      document.getElementById("workspace-icon-context").appendChild(menuitemElem);
    },

    setMenuItemCheckCSS() {
      const currentWorkspace = Services.prefs.getStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
      );
      document.getElementById("workspaceMenuItemCheckCSS")?.remove();
    
      const tag = document.createElement("style");
      tag.innerText = `
        .workspace-item[workspace="${currentWorkspace}"] > .toolbarbutton-icon {
          visibility: inherit !important;
        }
        .workspace-item-icon[workspace="${currentWorkspace.replace(/-/g, " ")}"] {
          border-radius: 2px;
          box-shadow: 0 0 0 1px var(--lwt-accent-color) !important;
          background-color: var(--lwt-accent-color) !important;
        }
      `;
      tag.setAttribute("id", "workspaceMenuItemCheckCSS");
      document.head.appendChild(tag);
    }
  },

  bmsWorkspaceFunctions: {
    moveWorkspaceManagerToBMS() {
      const moveTargetElemID = "workspace-menu";
      const movedAfterElem = document.getElementById("panelBox");

      movedAfterElem.before(document.getElementById(moveTargetElemID));
      workspaceFunctions.bmsWorkspaceFunctions.changeElementTag(
        moveTargetElemID,
        "vbox"
      );

      const styleElem = document.createElement("style");
      const modifyCSS = `
      #workspace-label {
        display: none !important;
      }
      #workspace-delete {
        display: none !important;
      }
      .workspace-item-separator {
        display: none !important;
      }
      #addNewWorkspaceButton > .toolbarbutton-text {
        display: none !important;
      }
      #workspace-menu {
        margin: 0 !important;
      }
      .workspace-item-box {
        margin: 0 !important;
      }
      .workspace-item-icon {
        appearance: none;
        -moz-context-properties: fill, fill-opacity;
        border-radius: 4px;
        color: inherit;
        fill: currentColor;
        margin: 1px 2px 5px 5px;
        padding: 7px;
        scale: 1.0;
      }

      #addNewWorkspaceButton {
        appearance: none;
        -moz-context-properties: fill, fill-opacity;
        border-radius: 4px;
        color: inherit;
        fill: currentColor;
        margin: 1px 2px 5px 4px;
        padding: 9px;
        scale: 1.0;
        width: 33px !important;
        height: 31px !important;
      }

      #addNewWorkspaceButton > .toolbarbutton-icon {
        scale: 1.2;
      }

      #workspace-icon > .toolbarbutton-icon {
        scale: 1.3;
      }

      @media not (prefers-contrast) {
        .workspace-item-icon:hover {
          box-shadow: 0 0 4px rgba(0,0,0,.4) ;
          background-color: var(--tab-selected-bgcolor, var(--toolbar-bgcolor));
        }
        .workspace-item-icon[checked="true"]{
        background-color: color-mix(in srgb, currentColor 20%, transparent) ;
        box-shadow: 0 0 4px rgba(0,0,0,.4) ;
        }
        .workspace-item-icon:not([checked="true"]):active, .workspace-item-icon:active {
          background-color: color-mix(in srgb, currentColor 20%, transparent);
          box-shadow: 0 0 4px rgba(0,0,0,.4);
        }
      }
      
      @media (prefers-contrast) {
        .workspace-item-icon:hover {
          outline: 1px solid currentColor;
        }
      }
      `;
      styleElem.innerText = modifyCSS;
      styleElem.id = "workspaceManagerBMSStyle";
      document.head.appendChild(styleElem);

      const spacer = window.MozXULElement.parseXULToFragment(`
        <spacer flex="1" id="workspace-spacer"/>
      `);

      document.getElementById(moveTargetElemID).after(spacer);
    },

    moveWorkspaceManagerToDefault() {
      const moveTargetElemID = "workspace-menu";
      const appendElem = document.getElementById("workspace-button");

      appendElem.appendChild(document.getElementById(moveTargetElemID));
      workspaceFunctions.bmsWorkspaceFunctions.changeElementTag(
        moveTargetElemID,
        "menupopup"
      );
      document.getElementById("workspaceManagerBMSStyle").remove();
    },

    changeElementTag(elementId, newTagName) {
      const originalElement = document.getElementById(elementId);
    
      if (!originalElement) {
        console.error(`Element with id "${elementId}" not found.`);
        return;
      }
    
      const newTag = document.createElement(newTagName);
    
      for (const { name, value } of originalElement.attributes) {
        newTag.setAttribute(name, value);
      }
    
      while (originalElement.firstChild) {
        newTag.appendChild(originalElement.firstChild);
      }
    
      originalElement.replaceWith(newTag);
    }
  },

  Backup: {
  async  backupWorkspace() {
  // Backup workspace tabs url
    const tabs = gBrowser.tabs;
    const tabsURL = [];
    for (const tab of tabs) {
      const tabURL = tab.linkedBrowser.currentURI.spec;
      tabsURL.push(tabURL);
    }

    const timeStamps = new Date().getTime();
    const tabsURLString = tabsURL.join(",");
    const workspaceState = Services.prefs.getStringPref(
      WorkspaceUtils.workspacesPreferences.WORKSPACE_TABS_PREF
    );
    const workspaceAll = Services.prefs.getStringPref(
      WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF
    );
    const currentWorkspace = Services.prefs.getStringPref(
      WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF
    );

    const backupDataObject = {
      [timeStamps]: {
        tabsURL: tabsURLString,
        workspaceState,
        workspaceAll,
        currentWorkspace,
      },
    };

    const backupDataString = JSON.stringify(backupDataObject);

    // File tools
    const file = FileUtils.getFile("ProfD", ["floorp-workspace-backup.json"]);

    // Path tools
    const PROFILE_DIR = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
    const path = PathUtils.join(PROFILE_DIR, "floorp-workspace-backup.json");

    const encoder = new TextEncoder("UTF-8");
    const decoder = new TextDecoder("UTF-8");

    if (file.exists()) {
      // Check lines
      const read = await IOUtils.read(path);
      const inputStream = decoder.decode(read);
      let lines = inputStream.split("\r");

      if (lines.length > 9) {
        lines.shift();
        inputStream = lines.join("\r");
        const doc = inputStream + backupDataString;
        const data = encoder.encode(doc);
        await IOUtils.write(path, data);
      }

      // Append backupDataString to the file content and overwrite the file
      const doc = inputStream + "\r" + backupDataString;
      const data = encoder.encode(doc);
      await IOUtils.write(path, data);
      return;
    }

    // Save backup data
    const data = encoder.encode(backupDataString);
    await IOUtils.write(path, data);
  },

     restoreWorkspace(lineNum) {
      // Check if lineNum is an object and extract the line number
      if (typeof lineNum === "object") {
        lineNum = lineNum.wrappedJSObject.lineNum;
      }
    
      // Set the WORKSPACE_BACKUPED_PREF preference to true
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_BACKUPED_PREF,
        true
      );
    
      // Hide all elements
      const displayNoneCSS = ` #browser, #statusBar  {display: none !important;}`;
      const tagElem = document.createElement("style");
      tagElem.textContent = displayNoneCSS;
      document.head.appendChild(tagElem);
    
      // Read the backup data from the file
      const decoder = new TextDecoder("UTF-8");
      const PROFILE_DIR = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
      const path = PathUtils.join(PROFILE_DIR, "floorp-workspace-backup.json");
      const read = IOUtils.read(path);
      const inputStream = decoder.decode(read);
    
      // Parse the backup data
      const lines = inputStream.split("\r");
      const backupDataObject = JSON.parse(lines[lineNum]);
      const tabsURL = backupDataObject[Object.keys(backupDataObject)[0]].tabsURL.split(",");
      const workspaceState = backupDataObject[Object.keys(backupDataObject)[0]].workspaceState;
      const workspaceAll = backupDataObject[Object.keys(backupDataObject)[0]].workspaceAll;
      const currentWorkspace = backupDataObject[Object.keys(backupDataObject)[0]].currentWorkspace;
    
      // Restore tabs
      const tabs = gBrowser.tabs;
      for (const tab of tabs) {
        tab.remove();
      }
      tabsURL.forEach((url) => {
        window.setTimeout(() => {
          gBrowser.addTab(url, {
            skipAnimation: true,
            inBackground: true,
            skipLoad: false,
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
          });
        }, 100);
      });
    
      // Restore workspace
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_TABS_PREF,
        workspaceState
      );
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF,
        workspaceAll
      );
      Services.prefs.setStringPref(
        WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF,
        currentWorkspace
      );
    }
  },
};

const setEvenyListeners = function () {
  gBrowser.tabContainer.addEventListener(
    "TabOpen",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabOpen
  );
  gBrowser.tabContainer.addEventListener(
    "TabClose",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabClose
  );
  gBrowser.tabContainer.addEventListener(
    "TabMove",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabMove
  );
  gBrowser.tabContainer.addEventListener(
    "TabSelect",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabSelect
  );

  gBrowser.tabContainer.addEventListener(
    "TabAttrModified",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "TabHide",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "TabShow",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "TabPinned",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "TabUnpinned",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "transitionend",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "dblclick",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "click",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "click",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver,
    true
  );

  gBrowser.tabContainer.addEventListener(
    "keydown",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver,
    { mozSystemGroup: true }
  );

  gBrowser.tabContainer.addEventListener(
    "dragstart",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "dragover",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "drop",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "dragend",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  gBrowser.tabContainer.addEventListener(
    "dragleave",
    workspaceFunctions.eventListeners.tabAddEventListeners.handleTabObeserver
  );

  Services.prefs.addObserver(
    WorkspaceUtils.workspacesPreferences.WORKSPACE_CURRENT_PREF,
    workspaceFunctions.eventListeners.prefsEventListeners
      .handleWorkspacePrefChange
  );
  Services.prefs.addObserver(
    WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF,
    workspaceFunctions.eventListeners.prefsEventListeners
      .handleWorkspaceTabPrefChange
  );

  /*
  Services.prefs.addObserver(
    WorkspaceUtils.workspacesPreferences.WORKSPACE_MANAGE_ON_BMS_PREF,
    workspaceFunctions.eventListeners.prefsEventListeners
       .handleWorkspaceManageOnBMSPrefChange
  );
  */

  document.addEventListener(
    "keydown",
    workspaceFunctions.eventListeners.keyboradEventListeners.handle_keydown
  );
};

const startWorkspace = function () {
  let list = Services.wm.getEnumerator("navigator:browser");
  while (list.hasMoreElements()) {
    if (list.getNext() != window) {
      return;
    }
  }

  //use from about:prerferences
  Services.obs.addObserver(
    workspaceFunctions.Backup.restoreWorkspace,
    "backupWorkspace"
  );

  Services.obs.addObserver(
    workspaceFunctions.manageWorkspaceFunctions.addIconToWorkspace,
    "addIconToWorkspace"
  );

  // run code
  SessionStore.promiseInitialized.then(() => {
    // Bail out if the window has been closed in the meantime.
    if (window.closed) {
      return;
    }
    window.setTimeout(() => {
      Promise.all([
        workspaceFunctions.Backup.backupWorkspace(),
        workspaceFunctions.manageWorkspaceFunctions.initWorkspace(),
        workspaceFunctions.manageWorkspaceFunctions.setCurrentWorkspace(),
      ]).then(() => {
        setEvenyListeners();
        const manageOnBMS = Services.prefs.getBoolPref(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_MANAGE_ON_BMS_PREF
        );
        if (manageOnBMS) {
          workspaceFunctions.bmsWorkspaceFunctions.moveWorkspaceManagerToBMS();
        }
      });
    }, 500);
  });
};

// If you want to enable workspaces by default, Remove these lines. "checkTabGroupAddonInstalledAndStartWorkspace();" is enough.
const tempDisabled = "floorp.browser.workspaces.disabledBySystem";

function disableWorkspacesByDefaultCheck() {
  const allWorkspaces = Services.prefs
    .getStringPref(WorkspaceUtils.workspacesPreferences.WORKSPACE_ALL_PREF)
    .split(",");
  if (allWorkspaces.length > 1) {
    Services.prefs.setBoolPref(tempDisabled, false);
    startWorkspace();
  } else if (tempDisabled && !Services.prefs.prefHasUserValue(tempDisabled)) {
    Services.prefs.setBoolPref(
      WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF,
      false
    );

    Services.prefs.addObserver(
      WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF,
      function () {
        Services.prefs.setBoolPref(tempDisabled, false);
        Services.prefs.removeObserver(
          WorkspaceUtils.workspacesPreferences.WORKSPACE_TAB_ENABLED_PREF
        );
      }
    );
  } else {
    Services.prefs.setBoolPref(tempDisabled, false);
    startWorkspace();
  }
}

disableWorkspacesByDefaultCheck();
