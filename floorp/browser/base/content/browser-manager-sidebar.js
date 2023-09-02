/* eslint-disable no-undef */
/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let { BrowserManagerSidebar } = ChromeUtils.importESModule("resource:///modules/BrowserManagerSidebar.sys.mjs");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

/*---------------------------------------------------------------- browser manager sidebar ----------------------------------------------------------------*/
const STATIC_SIDEBAR_DATA = BrowserManagerSidebar.STATIC_SIDEBAR_DATA;

let BROWSER_SIDEBAR_DATA = JSON.parse(
  Services.prefs.getStringPref(`floorp.browser.sidebar2.data`, undefined)
);

const sidebar_icons = [
  "sidebar2-back",
  "sidebar2-forward",
  "sidebar2-reload",
  "sidebar2-go-index",
];

const bmsController = {
  eventFunctions: {
    sidebarButtons: action => {
      const modeValuePref = bmsController.nowPage;
      const webpanel = document.getElementById(`webpanel${modeValuePref}`);
      
      switch (action) {
        case 0:
          webpanel.goBack();
          break;
        case 1:
          webpanel.goForward();
          break;
        case 2:
          webpanel.reloadWithFlags(Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE);
          break;
        case 3:
          webpanel.gotoIndex();
          break;
      }
    },
    keepWidth: () => {
      const pref = bmsController.nowPage;
      const sidebar2Box = document.getElementById("sidebar2-box");
      const width = sidebar2Box.clientWidth;
      BROWSER_SIDEBAR_DATA.data[pref].width = width;
      Services.prefs.setStringPref("floorp.browser.sidebar2.data", JSON.stringify(BROWSER_SIDEBAR_DATA));
    },
    keepWidthForGlobal: () => {
      Services.prefs.setIntPref(
        "floorp.browser.sidebar2.global.webpanel.width",
        document.getElementById("sidebar2-box").width
      );
    },
    servicesObs: data_ => {
      const { eventType, id } = data_.wrappedJSObject;
      const selectNode = document.getElementById(id.replace("BSB-", "select-"));
      switch (eventType) {
        case "mouseOver":
          selectNode.style.border = "1px solid blue";
          bmsController.controllFunctions.setUserContextColorLine(id.replace("BSB-", ""));
          break;
        case "mouseOut":
          selectNode.style.border = "";
          bmsController.controllFunctions.setUserContextColorLine(id.replace("BSB-", ""));
          break;
      }
    },
    setFlexOrder: () => {
      const fxSidebarPositionPref = Services.prefs.getBoolPref("sidebar.position_start");
      const floorpSidebarPositionPref = Services.prefs.getBoolPref("floorp.browser.sidebar.right");
      const fxSidebar = document.getElementById("sidebar-box");
      const fxSidebarSplitter = document.getElementById("sidebar-splitter");
      const floorpSidebar = document.getElementById("sidebar2-box");
      const floorpSidebarSplitter = document.getElementById("sidebar-splitter2");
      const floorpSidebarSelectBox = document.getElementById("sidebar-select-box");
      const browserBox = document.getElementById("appcontent");
      
      if (fxSidebarPositionPref && floorpSidebarPositionPref) {
        // Firefox's sidebar position: left, Floorp's sidebar position: right
        fxSidebar.style.order = "0";
        fxSidebarSplitter.style.order = "1";
        browserBox.style.order = "2";
        floorpSidebarSplitter.style.order = "3";
        floorpSidebar.style.order = "4";
        floorpSidebarSelectBox.style.order = "5";
      } else if (fxSidebarPositionPref && !floorpSidebarPositionPref) {
        // Firefox's sidebar position: left, Floorp's sidebar position: left
        floorpSidebarSelectBox.style.order = "0";
        floorpSidebar.style.order = "1";
        floorpSidebarSplitter.style.order = "2";
        fxSidebar.style.order = "3";
        fxSidebarSplitter.style.order = "4";
        browserBox.style.order = "5";
      } else if (!fxSidebarPositionPref && floorpSidebarPositionPref) {
        // Firefox's sidebar position: right, Floorp's sidebar position: right
        browserBox.style.order = "0";
        fxSidebarSplitter.style.order = "1";
        fxSidebar.style.order = "2";
        floorpSidebarSplitter.style.order = "3";
        floorpSidebar.style.order = "4";
        floorpSidebarSelectBox.style.order = "5";
      } else {
        // Firefox's sidebar position: right, Floorp's sidebar position: left
        floorpSidebarSelectBox.style.order = "0";
        floorpSidebar.style.order = "1";
        floorpSidebarSplitter.style.order = "2";
        browserBox.style.order = "3";
        fxSidebarSplitter.style.order = "4";
        fxSidebar.style.order = "5";
      }
    },
    selectSidebarItem: (event) => {
      const customUrlId = event.target.id.replace("select-", "");
      const isCurrentPage = bmsController.nowPage === customUrlId;
      
      if (isCurrentPage) {
        bmsController.controllFunctions.changeVisibleWenpanel();
      } else {
        bmsController.nowPage = customUrlId;
        bmsController.controllFunctions.visibleWebpanel();
      }
    },
    sidebarItemMouse: {
      mouseOver: event =>
        Services.obs.notifyObservers(
          {
            eventType: "mouseOver",
            id: event.target.id,
          },
          "obs-panel"
        ),
      mouseOut: event =>
        Services.obs.notifyObservers(
          {
            eventType: "mouseOut",
            id: event.target.id,
          },
          "obs-panel"
        ),
      dragStart: event =>
        event.dataTransfer.setData("text/plain", event.target.id),
      dragOver: event => {
        event.preventDefault();
        event.currentTarget.style.borderTop = "2px solid blue";
      },
      dragLeave: event => (event.currentTarget.style.borderTop = ""),
      drop: event => {
        event.preventDefault();
        let id = event.dataTransfer.getData("text/plain");
        let elm_drag = document.getElementById(id);
        event.currentTarget.parentNode.insertBefore(
          elm_drag,
          event.currentTarget
        );
        event.currentTarget.style.borderTop = "";
        BROWSER_SIDEBAR_DATA.index.splice(0);
        for (let elem of document.querySelectorAll(".sicon-list")) {
          BROWSER_SIDEBAR_DATA.index.push(elem.id.replace("select-", ""));
        }
        Services.prefs.setStringPref(
          `floorp.browser.sidebar2.data`,
          JSON.stringify(BROWSER_SIDEBAR_DATA)
        );
      },
    },
    contextMenu: {
      show: event => {
        clickedWebpanel = event.target.id;
        webpanel = clickedWebpanel.replace("select-", "webpanel");
        contextWebpanel = document.getElementById(webpanel);
        needLoadedWebpanels = document.getElementsByClassName("needLoadedWebpanel");
        
        for (const needLoadedWebpanel of needLoadedWebpanels) {
          needLoadedWebpanel.disabled = contextWebpanel === null;
        }
      },
      unloadWebpanel: () => {
        bmsController.controllFunctions.unloadWebpanel(
          clickedWebpanel.replace("select-", "")
        );
      },
      changeUserAgent: () => {
        const clickedWebpanel = event.target.id;
        const webpanel = clickedWebpanel.replace("select-", "webpanel");
        const contextWebpanel = document.getElementById(webpanel);
        const needLoadedWebpanels = document.getElementsByClassName("needLoadedWebpanel");
        for (const needLoadedWebpanel of needLoadedWebpanels) {
          needLoadedWebpanel.disabled = contextWebpanel === null;
        }
      },
      deleteWebpanel: () => {
        const sidebarSplitter2 = document.getElementById("sidebar-splitter2");
        const isSidebarHidden = sidebarSplitter2.getAttribute("hidden") === "true";
        if (!isSidebarHidden) {
          bmsController.controllFunctions.changeVisibleWenpanel();
        }
        const clickedWebpanelId = clickedWebpanel.replace("select-", "");
        const index = BROWSER_SIDEBAR_DATA.index.indexOf(clickedWebpanelId);
        BROWSER_SIDEBAR_DATA.index.splice(index, 1);
        delete BROWSER_SIDEBAR_DATA.data[clickedWebpanelId];
        Services.prefs.setStringPref("floorp.browser.sidebar2.data", JSON.stringify(BROWSER_SIDEBAR_DATA));
        const contextWebpanel = document.getElementById(webpanelId);
        if (contextWebpanel) {
          contextWebpanel.remove();
        }
        const clickedWebpanel = document.getElementById(clickedWebpanel);
        if (clickedWebpanel) {
          clickedWebpanel.remove();
        }
      },
      muteWebpanel: () => {
        if (contextWebpanel.audioMuted) {
          contextWebpanel.unmute();
        } else {
          contextWebpanel.mute();
        }
        bmsController.eventFunctions.contextMenu.setMuteIcon();
      },
      setMuteIcon: () => {
        const clickedWebpanelElement = document.getElementById(clickedWebpanel);
        if (contextWebpanel && clickedWebpanelElement) {
          if (contextWebpanel.audioMuted) {
            clickedWebpanelElement.setAttribute("muted", "true");
          } else {
            clickedWebpanelElement.removeAttribute("muted");
          }
        }
      },
    },
  },
  controllFunctions: {
    visiblePanelBrowserElem: () => {
      const modeValuePref = bmsController.nowPage;
      const selectedWebpanel = document.getElementById(`webpanel${modeValuePref}`);
      const selectedURL = BROWSER_SIDEBAR_DATA.data[modeValuePref]?.url || "";
      bmsController.controllFunctions.changeVisibleCommandButton(selectedURL.startsWith("floorp//"));
      for (const elem of document.getElementsByClassName("webpanels")) {
        elem.hidden = true;
        if (elem.classList.contains("isFloorp") || elem.classList.contains("isExtension")) {
          elem.src = "";
          elem.src = elem.getAttribute("src");
        }
      }
      const isSplitterHidden = document.getElementById("sidebar-splitter2").getAttribute("hidden") === "true";
      bmsController.controllFunctions.changeCheckPanel(!isSplitterHidden);
      if (isSplitterHidden) {
        bmsController.controllFunctions.changeVisibleWenpanel();
      }
      if (selectedWebpanel) {
        selectedWebpanel.hidden = false;
      }
    },
    unloadWebpanel: id => {
      const sidebarsplit2 = document.getElementById("sidebar-splitter2");
      const webpanel = document.getElementById(`webpanel${id}`);
      const selectNode = document.getElementById(`select-${id}`);
      if (id === bmsController.nowPage) {
        bmsController.nowPage = null;
        if (sidebarsplit2.hidden === false) {
          bmsController.controllFunctions.changeVisibleWenpanel();
        }
      }
      webpanel.remove();
      selectNode.removeAttribute("muted");
    },
    setUserContextColorLine: id => {
      const webpanelUserContext = BROWSER_SIDEBAR_DATA.data[id]?.usercontext ?? 0;
      const containerList = ContextualIdentityService.getPublicIdentities();
      const selectedNode = document.getElementById(`select-${id}`);
      
      if (webpanelUserContext !== 0) {
        const container = containerList.find(e => e.userContextId === webpanelUserContext);
        if (container) {
          const containerColor = container.color === "toolbar" ? "var(--toolbar-field-color)" : container.color;
          selectedNode.style.borderLeft = `solid 2px ${containerColor}`;
        }
      } else if (selectedNode.style.border !== "1px solid blue") {
        selectedNode.style.borderLeft = "";
      }
    },
    changeCheckPanel: doChecked => {
      const sidepanelIcons = document.getElementsByClassName("sidepanel-icon");
      for (let icon of sidepanelIcons) {
        icon.setAttribute("checked", "false");
      }
      if (doChecked) {
        const selectedNode = document.querySelector(`#select-${bmsController.nowPage}`);
        if (selectedNode) {
          selectedNode.setAttribute("checked", "true");
        }
      }
    },
    changeVisibleBrowserManagerSidebar: doVisible => {
      const html = document.querySelector("html");
      if (doVisible) {
        html.removeAttribute("invisibleBMS");
      } else {
        html.setAttribute("invisibleBMS", "true");
      }
    },
    changeVisibleCommandButton: hidden => {
      for (let elem of sidebar_icons) {
        document.getElementById(elem).hidden = hidden;
      }
    },
    changeVisibleWenpanel: () => {
      const siderbar2header = document.getElementById("sidebar2-header");
      const sidebarsplit2 = document.getElementById("sidebar-splitter2");
      const sidebar2box = document.getElementById("sidebar2-box");
      const sidebarSetting = {
        true: ["auto", "", "", "false"],
        false: ["0", "0", "none", "true"],
      };
      const doDisplay = sidebarsplit2.getAttribute("hidden") == "true";
      
      sidebar2box.style.minWidth = sidebarSetting[doDisplay][0];
      sidebar2box.style.maxWidth = sidebarSetting[doDisplay][1];
      siderbar2header.style.display = sidebarSetting[doDisplay][2];
      sidebarsplit2.setAttribute("hidden", sidebarSetting[doDisplay][3]);
      
      bmsController.controllFunctions.changeCheckPanel(doDisplay);
      Services.prefs.setBoolPref("floorp.browser.sidebar.is.displayed", doDisplay);    
    },
    setSidebarWidth: webpanel_id => {
      const webpanelId = BROWSER_SIDEBAR_DATA.index.includes(webpanel_id) ? webpanel_id : null;
      if (!webpanelId) {
        const panelWidth = BROWSER_SIDEBAR_DATA.data[webpanelId].width ?? Services.prefs.getIntPref("floorp.browser.sidebar2.global.webpanel.width", undefined);
        document.getElementById("sidebar2-box").style.width = `${panelWidth}px`;
      }
    },
    visibleWebpanel: () => {
      const webpanelId = bmsController.nowPage;
      const isWebpanelValid = webpanelId != null && BROWSER_SIDEBAR_DATA.index.includes(webpanelId);
      if (isWebpanelValid) {
        bmsController.controllFunctions.makeWebpanel(webpanelId);
      }
    },
    makeWebpanel: webpanel_id => {
      const webpandata = BROWSER_SIDEBAR_DATA.data[webpanel_id];
      const webpanelURL = webpandata.url.startsWith("floorp//") ? STATIC_SIDEBAR_DATA[webpandata.url].url : webpandata.url.split(",")[3];
      const isFloorp = webpandata.url.startsWith("floorp//");
      const webpanobject = document.getElementById(`webpanel${webpanel_id}`);
      const isWeb = !isFloorp;
      const wibpanel_usercontext = webpandata.usercontext ?? 0;
      const webpanel_userAgent = webpandata.userAgent ?? false;
      const webpanelElem = window.MozXULElement.parseXULToFragment(`
        <browser 
          id="webpanel${webpanel_id}"
          class="webpanels${isFloorp ? " isFloorp" : " isWeb"}"
          flex="1"
          xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
          disablehistory="true"
          disablefullscreen="true"
          tooltip="aHTMLTooltip"
          autoscroll="false"
          disableglobalhistory="true"
          messagemanagergroup="browsers"
          autocompletepopup="PopupAutoComplete"
          initialBrowsingContextGroupId="40"
          ${isWeb ? `
            usercontextid="${wibpanel_usercontext}"
            changeuseragent="${webpanel_userAgent}"
            webextension-view-type="sidebar"
            type="content"
            remote="true"
            maychangeremoteness="true"
            context=""
          ` : ""}
        />
      `);
      
      if (webpanobject) {
        const shouldRemove = (
          (webpanobject.getAttribute("changeuseragent") !== "" && !webpanel_userAgent) ||
          (webpanobject.getAttribute("usercontextid") !== "" && wibpanel_usercontext === 0) ||
          (webpanobject.getAttribute("changeuseragent") !== String(webpanel_userAgent)) ||
          (webpanobject.getAttribute("usercontextid") !== String(wibpanel_usercontext)) ||
          (webpanobject.className.includes("isFloorp") && isWeb) ||
          (webpanobject.className.includes("isFloorp") && webpanobject.className.includes("isWeb")) ||
          (webpanobject.className.includes("isWeb") && isFloorp)
        );
        
        if (shouldRemove) {
          webpanobject.remove();
        } else {
          webpanobject.setAttribute("src", webpanelURL);
        }
      }
      
      if (!webpanobject) {
        if (webpanelURL.startsWith("extension")) {
          webpanelElem.firstChild.setAttribute("src", webpanelURL.split(",")[3]);
        } else {
          webpanelElem.firstChild.setAttribute("src", webpanelURL);
        }
        
        document.getElementById("sidebar2-box").appendChild(webpanelElem);
      }
      bmsController.controllFunctions.setSidebarWidth(webpanel_id);
      bmsController.controllFunctions.visiblePanelBrowserElem();    
    },
    makeSidebarIcon: () => {
      for (let elem of BROWSER_SIDEBAR_DATA.index) {
        if (document.getElementById(`select-${elem}`) == null) {
          let sidebarItem = document.createXULElement("toolbarbutton");
          sidebarItem.id = `select-${elem}`;
          sidebarItem.classList.add("sidepanel-icon");
          sidebarItem.classList.add("sicon-list");
          sidebarItem.setAttribute(
            "oncommand",
            "bmsController.eventFunctions.selectSidebarItem(event)"
          );
          if (BROWSER_SIDEBAR_DATA.data[elem].url.slice(0, 8) == "floorp//") {
            if (BROWSER_SIDEBAR_DATA.data[elem].url in STATIC_SIDEBAR_DATA) {
              //0~4 - StaticModeSetter | Browser Manager, Bookmark, History, Downloads
              sidebarItem.setAttribute(
                "data-l10n-id",
                "show-" +
                  STATIC_SIDEBAR_DATA[BROWSER_SIDEBAR_DATA.data[elem].url].l10n
              );
              sidebarItem.setAttribute("context", "all-panel-context");
            }
          } else {
            //5~ CustomURLSetter | Custom URL have l10n, Userangent, Delete panel & etc...
            sidebarItem.classList.add("webpanel-icon");
            sidebarItem.setAttribute("context", "webpanel-context");
            sidebarItem.setAttribute(
              "tooltiptext",
              BROWSER_SIDEBAR_DATA.data[elem].url
            );
          }

          if (BROWSER_SIDEBAR_DATA.data[elem].url.slice(0, 9) == "extension") {
            sidebarItem.setAttribute(
              "tooltiptext",
              BROWSER_SIDEBAR_DATA.data[elem].url.split(",")[1]
            );
            sidebarItem.className += " extension-icon";
            let listTexts =
              "chrome://browser/content/BMS-extension-needs-white-bg.txt";
            fetch(listTexts)
              .then(response => {
                return response.text();
              })
              .then(text => {
                let lines = text.split(/\r?\n/);
                for (let line of lines) {
                  if (
                    line == BROWSER_SIDEBAR_DATA.data[elem].url.split(",")[2]
                  ) {
                    sidebarItem.className += " extension-icon-add-white";
                    break;
                  }
                }
              });
          } else {
            sidebarItem.style.listStyleImage = "";
          }

          sidebarItem.onmouseover =
            bmsController.eventFunctions.sidebarItemMouse.mouseOver;
          sidebarItem.onmouseout =
            bmsController.eventFunctions.sidebarItemMouse.mouseOut;
          sidebarItem.ondragstart =
            bmsController.eventFunctions.sidebarItemMouse.dragStart;
          sidebarItem.ondragover =
            bmsController.eventFunctions.sidebarItemMouse.dragOver;
          sidebarItem.ondragleave =
            bmsController.eventFunctions.sidebarItemMouse.dragLeave;
          sidebarItem.ondrop =
            bmsController.eventFunctions.sidebarItemMouse.drop;
          let sidebarItemImage = document.createXULElement("image");
          sidebarItemImage.classList.add("toolbarbutton-icon");
          sidebarItem.appendChild(sidebarItemImage);
          let sidebarItemLabel = document.createXULElement("label");
          sidebarItemLabel.classList.add("toolbarbutton-text");
          sidebarItemLabel.setAttribute("crop", "right");
          sidebarItemLabel.setAttribute("flex", "1");
          sidebarItem.appendChild(sidebarItemLabel);
          document
            .getElementById("panelBox")
            .insertBefore(sidebarItem, document.getElementById("add-button"));
        } else {
          sidebarItem = document.getElementById(`select-${elem}`);
          if (BROWSER_SIDEBAR_DATA.data[elem].url.slice(0, 8) == "floorp//") {
            if (BROWSER_SIDEBAR_DATA.data[elem].url in STATIC_SIDEBAR_DATA) {
              sidebarItem.classList.remove("webpanel-icon");
              sidebarItem.setAttribute(
                "data-l10n-id",
                "show-" +
                  STATIC_SIDEBAR_DATA[BROWSER_SIDEBAR_DATA.data[elem].url].l10n
              );
              sidebarItem.setAttribute("context", "all-panel-context");
            }
          } else {
            sidebarItem.classList.add("webpanel-icon");
            sidebarItem.removeAttribute("data-l10n-id");
            sidebarItem.setAttribute("context", "webpanel-context");
          }
          document
            .getElementById("panelBox")
            .insertBefore(sidebarItem, document.getElementById("add-button"));
        }
      }
      let siconAll = document.querySelectorAll(".sicon-list");
      let sicon = siconAll.length;
      let side = BROWSER_SIDEBAR_DATA.index.length;
      if (sicon > side) {
        for (let i = 0; i < sicon - side; i++) {
          if (
            document.getElementById(
              siconAll[i].id.replace("select-", "webpanel")
            ) != null
          ) {
            let sidebarsplit2 = document.getElementById("sidebar-splitter2");
            if (
              bmsController.nowPage == siconAll[i].id.replace("select-", "")
            ) {
              bmsController.nowPage = null;
              bmsController.controllFunctions.visibleWebpanel();
              if (sidebarsplit2.getAttribute("hidden") != "true") {
                bmsController.controllFunctions.changeVisibleWenpanel();
              }
            }
            document
              .getElementById(siconAll[i].id.replace("select-", "webpanel"))
              .remove();
          }
          siconAll[i].remove();
        }
      }
      for (let elem of document.querySelectorAll(".sidepanel-icon")) {
        if (elem.className.includes("webpanel-icon")) {
          let sbar_url = BROWSER_SIDEBAR_DATA.data[elem.id.slice(7)].url;
          BrowserManagerSidebar.getFavicon(
            sbar_url,
            document.getElementById(`${elem.id}`)
          );
          bmsController.controllFunctions.setUserContextColorLine(
            elem.id.slice(7)
          );
        } else {
          elem.style.removeProperty("--BMSIcon");
        }
      }
    },
  },
  nowPage: null,
};
(async () => {
  // Context Menu
  addContextBox(
    "bsb-context-add",
    "bsb-context-add",
    "fill-login",
    `
           BrowserManagerSidebar.addPanel(gContextMenu.browser.currentURI.spec,gContextMenu.browser.getAttribute("usercontextid") ?? 0)
           `,
    "context-viewsource",
    function () {
      document.getElementById("bsb-context-add").hidden =
        document.getElementById("context-viewsource").hidden ||
        !document.getElementById("context-viewimage").hidden;
    }
  );
  addContextBox(
    "bsb-context-link-add",
    "bsb-context-link-add",
    "context-sep-sendlinktodevice",
    `
           BrowserManagerSidebar.addPanel(gContextMenu.linkURL,gContextMenu.browser.getAttribute("usercontextid") ?? 0)
           `,
    "context-openlink",
    function () {
      document.getElementById("bsb-context-link-add").hidden =
        document.getElementById("context-openlink").hidden;
    }
  );
  Services.prefs.addObserver(
    "floorp.browser.sidebar2.global.webpanel.width",
    () => bmsController.controllFunctions.setSidebarWidth(bmsController.nowPage)
  );
  Services.prefs.addObserver("floorp.browser.sidebar.enable", () =>
    bmsController.controllFunctions.changeVisibleBrowserManagerSidebar(
      Services.prefs.getBoolPref("floorp.browser.sidebar.enable", true)
    )
  );
  bmsController.controllFunctions.changeVisibleBrowserManagerSidebar(
    Services.prefs.getBoolPref("floorp.browser.sidebar.enable", true)
  );
  Services.prefs.addObserver(`floorp.browser.sidebar2.data`, function () {
    let TEMP_BROWSER_SIDEBAR_DATA = JSON.parse(
      JSON.stringify(BROWSER_SIDEBAR_DATA)
    );
    BROWSER_SIDEBAR_DATA = JSON.parse(
      Services.prefs.getStringPref(`floorp.browser.sidebar2.data`, undefined)
    );
    for (let elem of BROWSER_SIDEBAR_DATA.index) {
      if (
        document.querySelector(`#webpanel${elem}`) &&
        JSON.stringify(BROWSER_SIDEBAR_DATA.data[elem]) !=
          JSON.stringify(TEMP_BROWSER_SIDEBAR_DATA.data[elem])
      ) {
        if (
          bmsController.nowPage == elem &&
          !(sidebarsplit2.getAttribute("hidden") == "true")
        ) {
          bmsController.controllFunctions.makeWebpanel(elem);
        } else {
          bmsController.controllFunctions.unloadWebpanel(elem);
        }
      }
    }
    bmsController.controllFunctions.makeSidebarIcon();
  });
  Services.obs.addObserver(
    bmsController.eventFunctions.servicesObs,
    "obs-panel-re"
  );
  Services.obs.addObserver(
    bmsController.controllFunctions.changeVisibleWenpanel,
    "floorp-change-panel-show"
  );
  let addbutton = document.getElementById("add-button");
  addbutton.ondragover = bmsController.eventFunctions.sidebarItemMouse.dragOver;
  addbutton.ondragleave =
    bmsController.eventFunctions.sidebarItemMouse.dragLeave;
  addbutton.ondrop = bmsController.eventFunctions.sidebarItemMouse.drop;
  //startup functions
  bmsController.controllFunctions.makeSidebarIcon();
  // sidebar display
  let sidebarsplit2 = document.getElementById("sidebar-splitter2");
  if (!(sidebarsplit2.getAttribute("hidden") == "true")) {
    bmsController.controllFunctions.changeVisibleWenpanel();
  }
  window.bmsController = bmsController;

  // Override Firefox's sidebar position & Floorp sidebar position.
  // Listen to "sidebarcommand" event.
  // Firefox pref: true = left, false = right
  // Floorp pref: true = right, false = left
  const fxSidebarPosition = "sidebar.position_start";
  const floorpSidebarPosition = "floorp.browser.sidebar.right";
  Services.prefs.addObserver(
    fxSidebarPosition,
    bmsController.eventFunctions.setFlexOrder
  );
  Services.prefs.addObserver(
    floorpSidebarPosition,
    bmsController.eventFunctions.setFlexOrder
  );
  // Run function when browser start.
  SessionStore.promiseInitialized.then(() => {
    bmsController.eventFunctions.setFlexOrder();
  });
})();
