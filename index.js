const {
  app,
  BrowserWindow,
  Menu,
  globalShortcut,
  ipcMain,
  shell,
} = require("electron");
require("dotenv").config({ path: "./config/config.env" });
const os = require("os");
const path = require("path");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");

isDev = process.env.NODE_ENV === "development" ? true : false;
isWindow = process.platform.startsWith("win") ? true : false;
isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutMenuWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    title: "Image Shrink",
    width: isDev ? 800 : 500,
    height: 600,
    icon: "./assets/icons/icon_256x256.png",
    resizable: isDev ? true : false,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // mainWindow.loadURL(`file://${__dirname}/app/index.html`);
  mainWindow.loadFile("./app/index.html");
};

const createAboutMenuWindow = () => {
  aboutMenuWindow = new BrowserWindow({
    title: "About ImageShrink",
    width: 300,
    height: 400,
    icon: "./assets/icons/icon_256x256.png",
    resizable: false,
    backgroundColor: "white",
  });

  aboutMenuWindow.loadFile("./app/about.html");
};

app.on("ready", () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  globalShortcut.register("CmdOrCtrl+R", () => mainWindow.reload());
  globalShortcut.register(isMac ? "Command+Alt+I" : "Control+Shift+I", () =>
    mainWindow.toggleDevTools()
  );

  mainWindow.on("ready", () => (mainWindow = null));
});

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [{ label: "About", click: createAboutMenuWindow }],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggleDevTools" },
          ],
        },
      ]
    : []),

  ...(!isMac
    ? [
        {
          label: "help",
          submenu: [
            {
              label: "About",
              click: createAboutMenuWindow,
            },
          ],
        },
      ]
    : []),
];

ipcMain.on("image:minimize", (e, options) => {
  options.destination = path.join(os.homedir(), "imageShrink");
  shrinkImage(options);
});

const shrinkImage = async ({ imgPath, quality, destination }) => {
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });

    log.info(files);
    shell.openPath(destination);
    mainWindow.webContents.send("image:done");
  } catch (error) {
    log.error(error);
  }
};

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.allowRendererProcessReuse = true;
