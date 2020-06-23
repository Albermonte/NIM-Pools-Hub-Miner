<template>
  <div id="titlebar">
    <div class="info-button">
      <button class="nq-button-s green" @click="openHub">More info at NIM Pools Hub</button>
      <div id="title-bar-btns">
        <div class="icon" @click="minimizeButton">
          <svg style="width:24px;height:24px;" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M17,13H7V11H17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
            />
          </svg>
        </div>
        <div class="icon" @click="closeButton">
          <svg style="width:24px;height:24px" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { ipcRenderer, shell } = require("electron");
const { BrowserWindow } = require("electron").remote;

export default {
  methods: {
    minimizeButton() {
      const win = BrowserWindow.getFocusedWindow();
      win.minimize();
    },
    closeButton() {
      ipcRenderer.send("stopMining");
      const win = BrowserWindow.getFocusedWindow();
      win.destroy();
    },
    openHub() {
      shell.openExternal("https://hub.shortnim.me/");
    }
  }
};
</script>

<style scoped>
#titlebar {
  padding: 10px;
  width: 100%;
  -webkit-app-region: drag;
}

#title-bar-btns {
  -webkit-app-region: no-drag;
  width: 55px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.nq-button-s {
  -webkit-app-region: no-drag;
}

.info-button {
  display: flex;
  justify-content: space-between;
}

.icon {
  cursor: pointer;
  height: 24px;
}
</style>